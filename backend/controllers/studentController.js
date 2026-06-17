const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../utils/jwt');
const logger = require('../utils/logger');
const crypto = require('crypto');

/* ── Helper: Generate Student ID ── */
const generateStudentId = async (applicationType) => {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = applicationType === 'topup' ? 'TU' : 'RG';
  // Format: WUC/RG/25/0001 or WUC/TU/25/0001
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM students WHERE student_id LIKE $1`,
    [`WUC/${prefix}/${year}/%`]
  );
  const seq = (parseInt(countResult.rows[0].count) + 1).toString().padStart(4, '0');
  return `WUC/${prefix}/${year}/${seq}`;
};

/* ── Helper: Generate random password ── */
const generatePassword = () => {
  // 8 chars: uppercase + lowercase + digits
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/* ── Create student account (called when application is approved) ── */
const createStudentAccount = async (application, programmeChoices) => {
  // Check if student account already exists for this application
  const existing = await pool.query(
    'SELECT student_id FROM students WHERE application_id = $1',
    [application.id]
  );
  if (existing.rows.length > 0) {
    return { studentId: existing.rows[0].student_id, password: null, alreadyExists: true };
  }

  const studentId = await generateStudentId(application.application_type);
  const plainPassword = generatePassword();
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const programme = programmeChoices
    .filter(c => c.programme_id !== 'mature-access' && !/mature access/i.test(c.programme_label || ''))
    .sort((a, b) => a.preference - b.preference)[0];

  await pool.query(
    `INSERT INTO students (
      student_id, application_id, first_name, last_name, other_names,
      email, phone, date_of_birth, gender, nationality, hometown, postal_address,
      programme_id, programme_label, enrollment_option, application_type,
      password_hash, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'active')`,
    [
      studentId, application.id,
      application.first_name, application.last_name, application.other_names || null,
      application.email, application.phone,
      application.date_of_birth, application.gender,
      application.nationality || 'Ghanaian', application.hometown, application.postal_address,
      programme?.programme_id || null, programme?.programme_label || null,
      application.enrollment_option || 'Regular', application.application_type || 'regular',
      passwordHash,
    ]
  );

  return { studentId, password: plainPassword, alreadyExists: false };
};

/* ── POST /api/students/login ── */
const studentLogin = async (req, res) => {
  const { studentId, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM students WHERE student_id = $1 AND status != $2',
      [studentId.toUpperCase().trim(), 'suspended']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid student ID or password' });
    }

    const student = result.rows[0];
    const valid = await bcrypt.compare(password, student.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid student ID or password' });
    }

    // Update last login
    await pool.query('UPDATE students SET last_login = NOW() WHERE id = $1', [student.id]);

    const token = jwtUtil.generateToken({
      studentId: student.id,
      studentNumber: student.student_id,
      email: student.email,
      role: 'student',
    }, '7d');

    res.json({
      success: true,
      token,
      student: {
        id: student.id,
        studentId: student.student_id,
        firstName: student.first_name,
        lastName: student.last_name,
        email: student.email,
        programme: student.programme_label,
        enrollmentOption: student.enrollment_option,
        mustChangePassword: student.must_change_password,
      },
    });
  } catch (error) {
    logger.error('Student login error', { error: error.message });
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

/* ── GET /api/students/profile ── */
const getProfile = async (req, res) => {
  try {
    const student = await pool.query(
      `SELECT s.*, a.application_id, a.submitted_at, a.reviewed_at, a.admission_letter_url
       FROM students s
       LEFT JOIN applications a ON a.id = s.application_id
       WHERE s.id = $1`,
      [req.student.studentId]
    );

    if (student.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const s = student.rows[0];
    res.json({
      success: true,
      profile: {
        studentId: s.student_id,
        firstName: s.first_name,
        lastName: s.last_name,
        otherNames: s.other_names,
        email: s.email,
        phone: s.phone,
        dateOfBirth: s.date_of_birth,
        gender: s.gender,
        nationality: s.nationality,
        hometown: s.hometown,
        postalAddress: s.postal_address,
        programme: s.programme_label,
        programmeId: s.programme_id,
        enrollmentOption: s.enrollment_option,
        applicationType: s.application_type,
        status: s.status,
        applicationId: s.application_id,
        admissionLetterUrl: s.admission_letter_url,
        submittedAt: s.submitted_at,
        approvedAt: s.reviewed_at,
        createdAt: s.created_at,
      },
    });
  } catch (error) {
    logger.error('Get profile error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to load profile' });
  }
};

/* ── PUT /api/students/profile ── */
const updateProfile = async (req, res) => {
  const { phone, postalAddress } = req.body;
  try {
    const updates = [];
    const params = [];
    let idx = 1;

    if (phone) { updates.push(`phone = $${idx++}`); params.push(phone); }
    if (postalAddress) { updates.push(`postal_address = $${idx++}`); params.push(postalAddress); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(req.student.studentId);

    await pool.query(
      `UPDATE students SET ${updates.join(', ')} WHERE id = $${idx}`,
      params
    );

    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    logger.error('Update profile error', { error: error.message });
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

/* ── POST /api/students/change-password ── */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await pool.query('SELECT password_hash FROM students WHERE id = $1', [req.student.studentId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE students SET password_hash = $1, must_change_password = false, updated_at = NOW() WHERE id = $2',
      [hash, req.student.studentId]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error', { error: error.message });
    res.status(500).json({ success: false, message: 'Password change failed' });
  }
};

/* ── GET /api/students/fees ── */
const getFeeInfo = async (req, res) => {
  try {
    const student = await pool.query(
      'SELECT programme_id, enrollment_option, application_type FROM students WHERE id = $1',
      [req.student.studentId]
    );

    if (student.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const s = student.rows[0];
    const feeResult = await pool.query(
      `SELECT * FROM programme_fees
       WHERE programme_id = $1 AND enrollment_option = $2 AND application_type = $3 AND is_active = true
       ORDER BY academic_year DESC LIMIT 1`,
      [s.programme_id, s.enrollment_option, s.application_type]
    );

    if (feeResult.rows.length === 0) {
      return res.json({ success: true, fees: null, message: 'Fee structure not yet available for your programme' });
    }

    const fee = feeResult.rows[0];
    res.json({
      success: true,
      fees: {
        programmeLabel: fee.programme_label,
        academicYear: fee.academic_year,
        enrollmentOption: fee.enrollment_option,
        durationYears: fee.duration_years,
        breakdown: {
          tuitionFee: parseFloat(fee.tuition_fee),
          facilityFee: parseFloat(fee.facility_fee),
          libraryFee: parseFloat(fee.library_fee),
          ictFee: parseFloat(fee.ict_fee),
          examinationFee: parseFloat(fee.examination_fee),
          registrationFee: parseFloat(fee.registration_fee),
          otherFees: parseFloat(fee.other_fees),
          otherFeesLabel: fee.other_fees_label,
        },
        totalFee: parseFloat(fee.total_fee),
        payment: {
          bankName: fee.bank_name,
          bankBranch: fee.bank_branch,
          bankAccountNo: fee.bank_account_no,
          bankAccountName: fee.bank_account_name,
          initialPaymentPercent: fee.initial_payment_percent,
          initialPaymentDeadline: fee.initial_payment_deadline,
          balancePaymentDeadline: fee.balance_payment_deadline,
          programmeStartDate: fee.programme_start_date,
        },
      },
    });
  } catch (error) {
    logger.error('Get fees error', { error: error.message });
    res.status(500).json({ success: false, message: 'Failed to load fee information' });
  }
};

/* ── GET /api/students/admission-letter ── */
const getAdmissionLetter = async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  try {
    const result = await pool.query(
      `SELECT a.application_id, a.admission_letter_url, a.status
       FROM students s
       JOIN applications a ON a.id = s.application_id
       WHERE s.id = $1`,
      [req.student.studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const app = result.rows[0];
    if (app.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Admission letter not available' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', 'admission-letters', `${app.application_id}.pdf`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Admission letter file not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=WUC-Admission-Letter-${app.application_id}.pdf`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    logger.error('Download admission letter error', { error: error.message });
    res.status(500).json({ success: false, message: 'Download failed' });
  }
};

module.exports = {
  createStudentAccount,
  generateStudentId,
  studentLogin,
  getProfile,
  updateProfile,
  changePassword,
  getFeeInfo,
};
