const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body, query } = require('express-validator');
const { submitApplication, getApplicationStatus, uploadDocuments } = require('../controllers/applicationController');
const validate = require('../middleware/validate');

/* ── File upload config ── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Separate folder for passport photos
    const dest = file.fieldname === 'photo' ? 'uploads/photos/' : 'uploads/documents/';
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const DOC_MIME = /^(image\/(jpeg|jpg|png)|application\/pdf)$/;
const DOC_EXT  = /\.(jpg|jpeg|png|pdf)$/i;

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'photo') {
      // Accept any image format for passport photos
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Passport photo must be an image file.'));
      }
      return cb(null, true);
    }
    const valid = DOC_MIME.test(file.mimetype) && DOC_EXT.test(file.originalname);
    valid ? cb(null, true) : cb(new Error('Documents must be JPEG, PNG, or PDF.'));
  },
});

/* ── Validation rules ── */
const submitRules = [
  body('voucherCode').trim().notEmpty().withMessage('Voucher code is required'),
  body('applicationType')
    .optional()
    .isIn(['regular', 'topup'])
    .withMessage('applicationType must be regular or topup'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name (surname) is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('dateOfBirth').isDate().withMessage('Valid date of birth is required'),
  body('gender')
    .isIn(['Male', 'Female', 'male', 'female'])
    .withMessage('Gender must be Male or Female'),
  body('hometown').trim().notEmpty().withMessage('Hometown is required'),
  body('postalAddress').trim().notEmpty().withMessage('Postal address is required'),
  body('enrollmentOption')
    .isIn(['Regular', 'Weekend', 'Sandwich'])
    .withMessage('Enrollment option must be Regular, Weekend, or Sandwich'),
  body('programmeChoices')
    .isArray({ min: 1, max: 3 })
    .withMessage('Select between 1 and 3 programmes'),
  body('guardianName').trim().notEmpty().withMessage('Guardian name is required'),
  body('guardianPhone').trim().notEmpty().withMessage('Guardian phone is required'),
];

const statusRules = [
  query('searchType')
    .isIn(['application', 'email', 'voucher'])
    .withMessage('searchType must be application, email, or voucher'),
  query('searchValue').trim().notEmpty().withMessage('searchValue is required'),
];

/* ── Routes ── */
router.post('/submit', submitRules, validate, submitApplication);
router.get('/status', statusRules, validate, getApplicationStatus);

router.post(
  '/:applicationId/documents',
  upload.fields([
    { name: 'photo',          maxCount: 1 },
    { name: 'birthCert',      maxCount: 1 },
    { name: 'certificates',   maxCount: 1 },
    { name: 'transcripts',    maxCount: 1 },
    { name: 'wassce',         maxCount: 1 },
    { name: 'nmcPin',         maxCount: 1 },
    { name: 'recommendation', maxCount: 1 },
  ]),
  uploadDocuments
);

// Download admission letter by application ID
router.get('/:applicationId/admission-letter', async (req, res) => {
  const { pool } = require('../config/database');
  const fs = require('fs');
  try {
    const result = await pool.query(
      `SELECT application_id, admission_letter_url, status FROM applications WHERE application_id = $1`,
      [req.params.applicationId.toUpperCase()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    const app = result.rows[0];
    if (app.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Admission letter not available' });
    }
    // Always look for the PDF by application ID — don't rely on the stored URL
    const filePath = path.join(__dirname, '..', 'uploads', 'admission-letters', `${app.application_id}.pdf`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Admission letter file not found. Please ask admin to regenerate it.' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=WUC-Admission-Letter-${app.application_id}.pdf`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Download failed' });
  }
});

// Print/download application form summary PDF
router.get('/:applicationId/application-form', async (req, res) => {
  const { pool } = require('../config/database');
  const { generateApplicationForm, FORMS_DIR } = require('../services/applicationFormService');
  const fs = require('fs');
  try {
    const appId = req.params.applicationId.toUpperCase();
    const appResult = await pool.query('SELECT * FROM applications WHERE application_id = $1', [appId]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    const application = appResult.rows[0];

    const [choices, institutions, grades, diplomas, employments] = await Promise.all([
      pool.query('SELECT * FROM programme_choices WHERE application_id=$1 ORDER BY preference', [application.id]),
      pool.query('SELECT * FROM institutions_attended WHERE application_id=$1 ORDER BY sort_order', [application.id]),
      pool.query('SELECT * FROM academic_grades WHERE application_id=$1 ORDER BY subject_type, id', [application.id]),
      pool.query('SELECT * FROM diploma_qualifications WHERE application_id=$1 ORDER BY sort_order', [application.id]),
      pool.query('SELECT * FROM employment_history WHERE application_id=$1 ORDER BY sort_order', [application.id]),
    ]);

    // Always regenerate to reflect latest data
    await generateApplicationForm(
      application,
      choices.rows,
      institutions.rows,
      grades.rows,
      diplomas.rows,
      employments.rows
    );

    const formPath = path.join(FORMS_DIR, `${appId}-form.pdf`);
    if (!fs.existsSync(formPath)) {
      return res.status(500).json({ success: false, message: 'Form generation failed' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    // inline so browser opens it for printing rather than forcing download
    res.setHeader('Content-Disposition', `inline; filename=WUC-Application-Form-${appId}.pdf`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    fs.createReadStream(formPath).pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed: ' + error.message });
  }
});

module.exports = router;
