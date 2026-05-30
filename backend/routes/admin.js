const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticateAdmin } = require('../middleware/auth');
const {
  getAllApplications, getApplicationDetail, approveApplication, rejectApplication,
  bulkAction, updateNotes, emailApplicant, regenerateLetter,
  getAllVouchers, cancelVoucher,
  getDashboardStats, verifyDocument, exportApplications, getAuditLogs,
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

/* Vouchers */
router.get('/vouchers', getAllVouchers);
router.post('/vouchers/:voucherId/cancel', cancelVoucher);

/* Export — accepts token from query param for window.open downloads */
router.get('/export/applications', (req, res, next) => {
  // Allow token from query param as fallback for window.open
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, exportApplications);

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

module.exports = router;
