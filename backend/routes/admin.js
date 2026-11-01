const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticateAdmin } = require('../middleware/auth');
const { pool } = require('../config/database');
const {
  getAllApplications, getApplicationDetail, approveApplication, rejectApplication,
  bulkAction, updateNotes, emailApplicant, regenerateLetter,
  getAllVouchers, cancelVoucher,
  getDashboardStats, verifyDocument, deleteDocument, exportApplications, getAuditLogs,
  getAdminUsers, createAdminUser, toggleAdminUser,
  getAllFees, createFee, updateFee, deleteFee, lookupFee,
  getTemplate, uploadTemplate, updateTemplateFields, deleteTemplate,
  updateRegistrar, uploadSignature,
  manualEnrol,
} = require('../controllers/adminController');

const multer = require('multer');
const path = require('path');
const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'templates')),
  filename: (req, file, cb) => cb(null, `admission-template-${Date.now()}${path.extname(file.originalname)}`),
});
const templateUpload = multer({
  storage: templateStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|png|jpg|jpeg)$/i;
    if (!allowed.test(file.originalname)) return cb(new Error('Only PDF, PNG, or JPG files allowed'));
    cb(null, true);
  },
});

// Inject token from query param for routes that use window.open (can't set headers)
router.use((req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
});

router.use(authenticateAdmin);

/* Dashboard */
router.get('/dashboard/stats', getDashboardStats);

/* Applications */
router.get('/applications', getAllApplications);
router.get('/applications/:applicationId', getApplicationDetail);
router.post('/applications/:applicationId/approve', approveApplication);
router.post('/applications/:applicationId/reject', [body('reason').optional().trim()], validate, rejectApplication);
router.post('/applications/:applicationId/notes', [body('notes').trim()], validate, updateNotes);
router.post('/applications/:applicationId/email', [body('subject').trim().notEmpty(), body('message').trim().notEmpty()], validate, emailApplicant);
router.post('/applications/:applicationId/regenerate-letter', regenerateLetter);
router.post('/applications/bulk-action', [body('applicationIds').isArray({ min: 1 }), body('action').isIn(['approve', 'reject'])], validate, bulkAction);

/* Documents */
router.post('/documents/:documentId/verify', verifyDocument);
router.delete('/documents/:documentId', deleteDocument);

/* Vouchers */
router.get('/vouchers', getAllVouchers);
router.post('/vouchers/:voucherId/cancel', cancelVoucher);

/* Export */
router.get('/export/applications', exportApplications);

/* Audit logs — super_admin only */
const superAdminOnly = (req, res, next) => {
  if (req.admin?.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Super admin access required' });
  }
  next();
};
router.get('/audit-logs', superAdminOnly, getAuditLogs);

/* Admin user management — super_admin only */
router.get('/users', superAdminOnly, getAdminUsers);
router.post('/users', superAdminOnly, [body('username').trim().notEmpty(), body('email').isEmail(), body('password').isLength({ min: 8 })], validate, createAdminUser);
router.post('/users/:adminUserId/toggle', superAdminOnly, toggleAdminUser);

/* Programme Fees */
router.get('/fees', getAllFees);
router.get('/fees/lookup', lookupFee);
router.post('/fees', createFee);
router.put('/fees/:feeId', updateFee);
router.delete('/fees/:feeId', deleteFee);

/* Admission Letter Template */
router.get('/template', getTemplate);
router.post('/template/upload', templateUpload.single('template'), uploadTemplate);
router.put('/template/fields', updateTemplateFields);
router.delete('/template', deleteTemplate);

/* Registrar */
const signatureStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'templates')),
  filename: (req, file, cb) => cb(null, `registrar-signature-${Date.now()}${path.extname(file.originalname)}`),
});
const signatureUpload = multer({
  storage: signatureStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/\.(png|jpg|jpeg)$/i.test(file.originalname)) return cb(new Error('Image files only'));
    cb(null, true);
  },
});
router.put('/registrar', updateRegistrar);
router.post('/registrar/signature', signatureUpload.single('signature'), uploadSignature);

/* Manual Enrolment (super_admin only) */
router.post('/enrolments/manual', [
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').trim().notEmpty().withMessage('Phone required'),
  body('dateOfBirth').isDate().withMessage('Valid date of birth required'),
  body('gender').isIn(['Male', 'Female']).withMessage('Gender required'),
  body('hometown').trim().notEmpty().withMessage('Hometown required'),
  body('postalAddress').trim().notEmpty().withMessage('Postal address required'),
  body('enrollmentOption').isIn(['Regular', 'Weekend', 'Sandwich']).withMessage('Enrollment option required'),
  body('programmeId').trim().notEmpty().withMessage('Programme required'),
  body('programmeLabel').trim().notEmpty().withMessage('Programme label required'),
], validate, manualEnrol);

/* Students Management */
router.get('/students', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const where = [];
    const params = [];
    let idx = 1;
    if (search) {
      where.push(`(s.student_id ILIKE $${idx} OR s.first_name ILIKE $${idx} OR s.last_name ILIKE $${idx} OR s.email ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const countResult = await pool.query(`SELECT COUNT(*) FROM students s ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      `SELECT s.student_id, s.first_name, s.last_name, s.email, s.phone,
              s.programme_label, s.enrollment_option, s.application_type,
              s.status, s.last_login, s.created_at
       FROM students s ${whereClause}
       ORDER BY s.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, students: result.rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { next(error); }
});

/* Announcements */
router.get('/announcements', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.*, au.username as created_by_name FROM announcements a
       LEFT JOIN admin_users au ON au.id = a.created_by
       ORDER BY a.created_at DESC`
    );
    res.json({ success: true, announcements: result.rows });
  } catch (error) { next(error); }
});

router.post('/announcements', [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('content').trim().notEmpty().withMessage('Content required'),
  body('priority').optional().isIn(['normal', 'important', 'urgent']),
  body('target').optional().isIn(['all', 'regular', 'topup']),
], validate, async (req, res, next) => {
  const { title, content, priority = 'normal', target = 'all' } = req.body;
  try {
    await pool.query(
      `INSERT INTO announcements (title, content, priority, target, created_by) VALUES ($1,$2,$3,$4,$5)`,
      [title, content, priority, target, req.admin?.adminId || null]
    );
    res.status(201).json({ success: true, message: 'Announcement created' });
  } catch (error) { next(error); }
});

router.put('/announcements/:id', async (req, res, next) => {
  const { title, content, priority, target, isActive } = req.body;
  try {
    await pool.query(
      `UPDATE announcements SET title=COALESCE($1,title), content=COALESCE($2,content),
       priority=COALESCE($3,priority), target=COALESCE($4,target),
       is_active=COALESCE($5,is_active), updated_at=NOW() WHERE id=$6`,
      [title || null, content || null, priority || null, target || null, isActive, req.params.id]
    );
    res.json({ success: true, message: 'Announcement updated' });
  } catch (error) { next(error); }
});

router.delete('/announcements/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) { next(error); }
});

/* ══════════════════════════════════════════════════════════
   STAFF / LECTURER ENROLMENT
   ══════════════════════════════════════════════════════════ */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendEmail, emailTemplate } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');

// Generate unique staff ID: WUC/STF/001 or WUC/LEC/001
async function generateStaffId(role) {
  const prefix = role === 'lecturer' ? 'LEC' : 'STF';
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM lecturers WHERE staff_id LIKE $1`,
    [`WUC/${prefix}/%`]
  );
  const seq = (parseInt(countResult.rows[0].count) + 1).toString().padStart(3, '0');
  return `WUC/${prefix}/${seq}`;
}

/* GET /api/admin/staff — list all staff/lecturers */
router.get('/staff', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const where = [];
    const params = [];
    let idx = 1;
    if (search) {
      where.push(`(staff_id ILIKE $${idx} OR first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const countResult = await pool.query(`SELECT COUNT(*) FROM lecturers ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      `SELECT id, staff_id, first_name, last_name, email, phone, department, title, is_active, last_login, created_at
       FROM lecturers ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, staff: result.rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { next(error); }
});

/* POST /api/admin/staff — enrol new staff/lecturer */
router.post('/staff', [
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').trim().notEmpty().withMessage('Phone required'),
  body('department').trim().notEmpty().withMessage('Department required'),
  body('title').optional().trim(),
  body('role').optional().isIn(['lecturer', 'staff']),
], validate, async (req, res, next) => {
  const { firstName, lastName, email, phone, department, title, role = 'lecturer' } = req.body;
  try {
    // Check if email already exists
    const existing = await pool.query('SELECT id FROM lecturers WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'A staff member with this email already exists' });
    }

    // Generate staff ID
    const staffId = await generateStaffId(role);

    // Generate a setup token (they will create their own password)
    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    // Create with a random temporary password hash (they can't login until they set their password)
    const tempHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    await pool.query(
      `INSERT INTO lecturers (staff_id, first_name, last_name, email, phone, department, title, password_hash, reset_token, reset_token_expires)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [staffId, firstName, lastName, email, phone, department, title || (role === 'lecturer' ? 'Mr.' : 'Mr.'), tempHash, setupToken, setupExpires]
    );

    // Send email with setup link
    const setupUrl = `${process.env.APP_URL || 'http://localhost:3000'}/lecturer/setup-password?token=${setupToken}&staffId=${encodeURIComponent(staffId)}`;
    const emailContent = `
      <h2>Welcome to Withrow University College</h2>
      <p>Dear ${title || 'Mr./Ms.'} ${firstName} ${lastName},</p>
      <p>You have been enrolled as <strong>${role === 'lecturer' ? 'a Lecturer' : 'Staff'}</strong> at Withrow University College.</p>
      <div style="background: #f0f4f8; border: 2px solid #003366; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your Staff ID</p>
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #003366;">${staffId}</p>
      </div>
      <p>Please click the button below to set up your password and activate your account. This link expires in 72 hours.</p>
      <p style="text-align: center;">
        <a href="${setupUrl}" class="button">Set Up Your Password</a>
      </p>
      <p><strong>Department:</strong> ${department}</p>
      <p>Once your password is set, you can log in at the Lecturer Portal to manage courses, upload grades, and more.</p>
      <p>Best regards,<br><strong>WUC Administration</strong></p>
    `;
    sendEmail(email, `Welcome to WUC — Staff ID: ${staffId}`, emailTemplate(emailContent)).catch(() => {});

    // Send SMS
    const smsMsg = `WUC Staff Enrolment: Your Staff ID is ${staffId}. Check your email (${email}) for a link to set your password and activate your account. Portal: ${process.env.APP_URL || 'https://apply.wuc.edu.gh'}/lecturer/login`;
    sendSMS(phone, smsMsg).catch(() => {});

    res.status(201).json({
      success: true,
      message: `Staff enrolled successfully. Setup link sent to ${email} and SMS to ${phone}.`,
      staffId,
    });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ success: false, message: 'Staff ID or email already exists' });
    next(error);
  }
});

/* POST /api/admin/staff/:id/toggle — activate/deactivate */
router.post('/staff/:id/toggle', async (req, res, next) => {
  try {
    await pool.query('UPDATE lecturers SET is_active = NOT is_active WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Staff status updated' });
  } catch (error) { next(error); }
});

/* POST /api/admin/staff/:id/resend — resend setup email */
router.post('/staff/:id/resend', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM lecturers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Staff not found' });
    const staff = result.rows[0];

    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupExpires = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await pool.query('UPDATE lecturers SET reset_token = $1, reset_token_expires = $2 WHERE id = $3', [setupToken, setupExpires, staff.id]);

    const setupUrl = `${process.env.APP_URL || 'http://localhost:3000'}/lecturer/setup-password?token=${setupToken}&staffId=${encodeURIComponent(staff.staff_id)}`;
    const emailContent = `
      <h2>Password Setup Reminder</h2>
      <p>Dear ${staff.title} ${staff.first_name},</p>
      <p>Your Staff ID is: <strong>${staff.staff_id}</strong></p>
      <p>Please click below to set up your password. This link expires in 72 hours.</p>
      <p style="text-align: center;"><a href="${setupUrl}" class="button">Set Up Password</a></p>
      <p>Best regards,<br><strong>WUC Administration</strong></p>
    `;
    sendEmail(staff.email, `WUC — Set Up Your Password [${staff.staff_id}]`, emailTemplate(emailContent)).catch(() => {});
    sendSMS(staff.phone, `WUC: A new password setup link has been sent to your email (${staff.email}). Staff ID: ${staff.staff_id}`).catch(() => {});

    res.json({ success: true, message: `Setup link resent to ${staff.email}` });
  } catch (error) { next(error); }
});

/* ── Paystack Key Management ─────────────────────────────────────────── */
const paystackKeyService = require('../services/paystackKeyService');

// GET /api/admin/settings/paystack-key — check current key status
router.get('/settings/paystack-key', authenticateAdmin, (req, res) => {
  const status = paystackKeyService.getStatus();
  res.json({
    success: true,
    keyPrefix: status.keyPrefix ? status.keyPrefix + '...' : null,
    valid: status.valid,
    isLive: status.isLive || false,
    checkedAt: status.checkedAt,
    reason: status.reason || null,
  });
});

// PUT /api/admin/settings/paystack-key — update key (hot-swap + persist to disk)
router.put('/settings/paystack-key', authenticateAdmin, async (req, res, next) => {
  try {
    const { secretKey, publicKey } = req.body;
    if (!secretKey || typeof secretKey !== 'string' || !secretKey.startsWith('sk_')) {
      return res.status(400).json({ success: false, message: 'Invalid secret key format. Must start with sk_live_ or sk_test_' });
    }
    const result = await paystackKeyService.updateKey(secretKey.trim(), publicKey?.trim());
    res.json(result);
  } catch (error) { next(error); }
});

module.exports = router;
