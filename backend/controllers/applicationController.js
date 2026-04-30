const { pool } = require('../config/database');
const { sendApplicationConfirmation } = require('../services/emailService');
const { sendApplicationSMS } = require('../services/smsService');
const logger = require('../utils/logger');

const VALID_SEARCH_TYPES = ['application', 'email', 'voucher'];

const generateApplicationId = (type) =>
  `${type === 'topup' ? 'TUP' : 'APP'}${Date.now().toString().slice(-6)}`;

const notifyApplication = (email, phone, applicationId, firstName) => {
  sendApplicationConfirmation(email, applicationId, firstName).catch((e) =>
    logger.error('Application confirmation email failed', { email, applicationId, error: e.message })
  );
  sendApplicationSMS(phone, applicationId).catch((e) =>
    logger.error('Application confirmation SMS failed', { phone, applicationId, error: e.message })
  );
};

/* ── sub-insert helpers ── */
const insertProgrammeChoices = async (client, appUUID, choices) => {
  if (!Array.isArray(choices) || choices.length === 0) return;
  for (const c of choices) {
    await client.query(
      `INSERT INTO programme_choices
         (application_id, programme_id, programme_label, preference)
       VALUES ($1,$2,$3,$4)`,
      [appUUID, c.id, c.label, parseInt(c.preference)]
    );
  }
};

const insertInstitutions = async (client, appUUID, institutions) => {
  if (!Array.isArray(institutions)) return;
  let order = 1;
  for (const inst of institutions) {
    const name = inst.name || inst.institution_name;
    if (!name) continue;
    await client.query(
      `INSERT INTO institutions_attended
         (application_id, sort_order, institution_name, date_from, date_to, certificate_awarded)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [appUUID, order++, name,
       inst.from || inst.dateFrom || null,
       inst.to   || inst.dateTo   || null,
       inst.certificate || inst.certificateAwarded || null]
    );
  }
};

const insertAcademicGrades = async (client, appUUID, coreGrades, electiveGrades) => {
  if (Array.isArray(coreGrades)) {
    for (const g of coreGrades) {
      if (!g.subject) continue;
      await client.query(
        `INSERT INTO academic_grades
           (application_id, subject_type, subject_name, index_no, exam_type, date_taken, grade)
         VALUES ($1,'core',$2,$3,$4,$5,$6)`,
        [appUUID, g.subject, g.indexNo || null, g.examType || null, g.dateTaken || null, g.grade || null]
      );
    }
  }
  if (Array.isArray(electiveGrades)) {
    for (const g of electiveGrades) {
      if (!g.subject) continue;
      await client.query(
        `INSERT INTO academic_grades
           (application_id, subject_type, subject_name, index_no, exam_type, date_taken, grade)
         VALUES ($1,'elective',$2,$3,$4,$5,$6)`,
        [appUUID, g.subject, g.indexNo || null, g.examType || null, g.dateTaken || null, g.grade || null]
      );
    }
  }
};

const insertDiplomaQuals = async (client, appUUID, quals) => {
  if (!Array.isArray(quals)) return;
  let order = 1;
  for (const q of quals) {
    if (!q.qualification) continue;
    await client.query(
      `INSERT INTO diploma_qualifications
         (application_id, sort_order, qualification, subject_studied, date_obtained, grade)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [appUUID, order++, q.qualification,
       q.subject || q.subjectStudied || null,
       q.dateObtained || null,
       q.grade || null]
    );
  }
};

const insertEmploymentHistory = async (client, appUUID, employments) => {
  if (!Array.isArray(employments)) return;
  let order = 1;
  for (const e of employments) {
    if (!e.employer) continue;
    await client.query(
      `INSERT INTO employment_history
         (application_id, sort_order, employer, position_held, date_from, date_to)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [appUUID, order++, e.employer,
       e.position || e.positionHeld || null,
       e.from || e.dateFrom || null,
       e.to   || e.dateTo   || null]
    );
  }
};

/* ══════════════════════════════════════════════════════════
   POST /api/applications/submit
   ══════════════════════════════════════════════════════════ */
const submitApplication = async (req, res, next) => {
  const {
    applicationType = 'regular',
    voucherCode,
    title, firstName, lastName, otherNames, dateOfBirth, gender,
    nationality, hometown, postalAddress, email, phone, physicalChallenge,
    enrollmentOption, financing,
    guardianName, guardianPhone, guardianEmail,
    guardianRelationship, guardianOccupation, guardianPostalAddress,
    candidateType = 'wassce',
    programmeChoices,
    institutions,
    coreGrades, electiveGrades,
    matureQuals,
    diplomaQuals,
    employments, totalYearsWorked,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Validate voucher
    const voucherResult = await client.query(
      `SELECT * FROM vouchers
       WHERE voucher_code = $1 AND status = 'unused' AND expires_at > NOW()`,
      [voucherCode]
    );
    if (voucherResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid, already used, or expired voucher code',
      });
    }
    const voucher = voucherResult.rows[0];

    // 2. Core application record
    const applicationId = generateApplicationId(applicationType);
    const guardianJson = JSON.stringify({
      name: guardianName, phone: guardianPhone, email: guardianEmail,
      relationship: guardianRelationship, occupation: guardianOccupation,
      postalAddress: guardianPostalAddress,
    });

    const appResult = await client.query(
      `INSERT INTO applications (
         application_id, voucher_id, application_type,
         title, first_name, last_name, other_names, date_of_birth,
         gender, nationality, hometown, postal_address, email, phone, physical_challenge,
         enrollment_option, financing, candidate_type, total_years_worked, admin_notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING id`,
      [
        applicationId, voucher.id, applicationType,
        title || null, firstName, lastName, otherNames || null, dateOfBirth,
        gender, nationality || 'Ghanaian', hometown, postalAddress, email, phone,
        physicalChallenge || null,
        enrollmentOption || null,
        JSON.stringify(Array.isArray(financing) ? financing : []),
        candidateType,
        totalYearsWorked ? parseInt(totalYearsWorked) : null,
        guardianJson,
      ]
    );
    const appUUID = appResult.rows[0].id;

    // 3. Programme choices
    await insertProgrammeChoices(client, appUUID, programmeChoices);

    // 4. Institutions attended
    await insertInstitutions(client, appUUID, institutions);

    // 5. Academic performance
    if (applicationType === 'regular') {
      if (candidateType === 'wassce') {
        await insertAcademicGrades(client, appUUID, coreGrades, electiveGrades);
      } else {
        // mature — qualifications stored as diploma_qualifications
        await insertDiplomaQuals(client, appUUID, matureQuals);
      }
    }

    if (applicationType === 'topup') {
      await insertDiplomaQuals(client, appUUID, diplomaQuals);
      // optional WASSCE section
      if (Array.isArray(coreGrades) && coreGrades.some((g) => g.grade)) {
        await insertAcademicGrades(client, appUUID, coreGrades, electiveGrades);
      }
      await insertEmploymentHistory(client, appUUID, employments);
    }

    // 6. Mark voucher used
    await client.query(
      `UPDATE vouchers SET status = 'used', used_at = NOW() WHERE id = $1`,
      [voucher.id]
    );

    await client.query('COMMIT');

    notifyApplication(email, phone, applicationId, firstName);

    res.status(201).json({
      success: true,
      applicationId,
      applicationType,
      message: 'Application submitted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/* ══════════════════════════════════════════════════════════
   GET /api/applications/status
   ══════════════════════════════════════════════════════════ */
const getApplicationStatus = async (req, res, next) => {
  const { searchType, searchValue } = req.query;

  if (!VALID_SEARCH_TYPES.includes(searchType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid search type. Must be one of: ${VALID_SEARCH_TYPES.join(', ')}`,
    });
  }
  if (!searchValue || !searchValue.trim()) {
    return res.status(400).json({ success: false, message: 'searchValue is required' });
  }

  try {
    let query, params;
    if (searchType === 'application') {
      query = 'SELECT * FROM applications WHERE application_id = $1';
      params = [searchValue.trim().toUpperCase()];
    } else if (searchType === 'email') {
      query = `SELECT * FROM applications WHERE LOWER(email) = LOWER($1)
               ORDER BY submitted_at DESC`;
      params = [searchValue.trim()];
    } else {
      query = `SELECT a.* FROM applications a
               JOIN vouchers v ON a.voucher_id = v.id
               WHERE v.voucher_code = $1`;
      params = [searchValue.trim().toUpperCase()];
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const application = result.rows[0];

    const [choices, institutions, grades, diplomas, employment] = await Promise.all([
      pool.query(
        'SELECT * FROM programme_choices WHERE application_id=$1 ORDER BY preference',
        [application.id]
      ),
      pool.query(
        'SELECT * FROM institutions_attended WHERE application_id=$1 ORDER BY sort_order',
        [application.id]
      ),
      pool.query(
        'SELECT * FROM academic_grades WHERE application_id=$1 ORDER BY subject_type, id',
        [application.id]
      ),
      pool.query(
        'SELECT * FROM diploma_qualifications WHERE application_id=$1 ORDER BY sort_order',
        [application.id]
      ),
      pool.query(
        'SELECT * FROM employment_history WHERE application_id=$1 ORDER BY sort_order',
        [application.id]
      ),
    ]);

    res.json({
      success: true,
      application: {
        ...application,
        programmeChoices: choices.rows,
        institutionsAttended: institutions.rows,
        academicGrades: grades.rows,
        diplomaQualifications: diplomas.rows,
        employmentHistory: employment.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ══════════════════════════════════════════════════════════
   POST /api/applications/:applicationId/documents
   ══════════════════════════════════════════════════════════ */
const uploadDocuments = async (req, res, next) => {
  const { applicationId } = req.params;
  const files = req.files;

  if (!files || Object.keys(files).length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded' });
  }

  try {
    const appResult = await pool.query(
      'SELECT id FROM applications WHERE application_id = $1',
      [applicationId.toUpperCase()]
    );
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const docTypeMap = {
      photo:          'photo',
      birthCert:      'birth_cert',
      certificates:   'certificates',
      transcripts:    'transcripts',
      wassce:         'wassce',
      nmcPin:         'nmc_pin',
      recommendation: 'recommendation',
    };

    for (const [fieldName, fileArray] of Object.entries(files)) {
      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
      const dbDocType = docTypeMap[fieldName] || fieldName;
      await pool.query(
        `INSERT INTO documents
           (application_id, document_type, document_name, file_path, file_size, mime_type)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [appResult.rows[0].id, dbDocType, file.originalname, file.path, file.size, file.mimetype]
      );
    }

    res.json({ success: true, message: 'Documents uploaded successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitApplication, getApplicationStatus, uploadDocuments };
