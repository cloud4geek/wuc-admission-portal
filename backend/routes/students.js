const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticateStudent } = require('../middleware/auth');
const {
  studentLogin,
  getProfile,
  updateProfile,
  changePassword,
  getFeeInfo,
} = require('../controllers/studentController');

/* ── Public routes ── */
router.post('/login', [
  body('studentId').trim().notEmpty().withMessage('Student ID is required'),
  body('password').notEmpty().withMessage('Password is required'),
], validate, studentLogin);

/* ── Password Reset (public) ── */
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('studentId').trim().notEmpty().withMessage('Student ID is required'),
], validate, async (req, res) => {
  const { email, studentId } = req.body;
  const { pool } = require('../config/database');
  const crypto = require('crypto');
  const { sendStudentPasswordReset } = require('../services/emailService');
  const logger = require('../utils/logger');
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, student_id FROM students WHERE student_id = $1 AND email = $2 AND status = $3',
      [studentId.toUpperCase().trim(), email, 'active']
    );
    // Always respond the same way — don't reveal if account exists
    if (result.rows.length === 0) {
      return res.json({ success: true, message: 'If that account exists, a reset link has been sent to your email.' });
    }
    const student = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await pool.query(
      'UPDATE students SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, student.id]
    );
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/student/reset-password?token=${token}`;
    sendStudentPasswordReset(student.email, student.first_name, resetUrl).catch(e =>
      logger.error('Student password reset email failed', { email: student.email, error: e.message })
    );
    res.json({ success: true, message: 'If that account exists, a reset link has been sent to your email.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Request failed' });
  }
});

router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
], validate, async (req, res) => {
  const { token, password } = req.body;
  const { pool } = require('../config/database');
  const bcrypt = require('bcryptjs');
  try {
    const result = await pool.query(
      'SELECT id FROM students WHERE reset_token = $1 AND reset_token_expires > NOW() AND status = $2',
      [token, 'active']
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE students SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, must_change_password = false, updated_at = NOW() WHERE id = $2',
      [hash, result.rows[0].id]
    );
    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Reset failed' });
  }
});

/* ── Inject token from query param for routes that use window.open ── */
router.use((req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
});

/* ── Protected routes (require student auth) ── */
router.use(authenticateStudent);

router.get('/profile', getProfile);
router.put('/profile', [
  body('phone').optional().trim(),
  body('postalAddress').optional().trim(),
], validate, updateProfile);

router.post('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
], validate, changePassword);

router.get('/fees', getFeeInfo);

// ── Student Portal Features ──
const {
  getAvailableCourses, getRegisteredCourses, registerCourses, dropCourse,
  getResults, getTimetable,
  getDocumentRequests, createDocumentRequest,
  getSupportTickets, createSupportTicket,
  getResources, getExamSchedule, getStudentPhoto,
} = require('../controllers/studentPortalController');

// Course Registration
router.get('/courses/available', getAvailableCourses);
router.get('/courses/registered', getRegisteredCourses);
router.post('/courses/register', [
  body('courseIds').isArray({ min: 1 }).withMessage('Select at least one course'),
  body('semester').optional().isInt({ min: 1, max: 2 }),
  body('academicYear').optional().trim(),
], validate, registerCourses);
router.delete('/courses/drop/:registrationId', dropCourse);

// Results
router.get('/results', getResults);

// Timetable
router.get('/timetable', getTimetable);

// Document Requests
router.get('/document-requests', getDocumentRequests);
router.post('/document-requests', [
  body('documentType').isIn(['transcript', 'recommendation_letter', 'enrollment_letter', 'introduction_letter', 'certificate']).withMessage('Invalid document type'),
  body('reason').optional().trim(),
  body('copies').optional().isInt({ min: 1, max: 5 }),
], validate, createDocumentRequest);

// Support Tickets
router.get('/support-tickets', getSupportTickets);
router.post('/support-tickets', [
  body('subject').trim().notEmpty().withMessage('Subject required'),
  body('category').isIn(['academic', 'fees', 'facilities', 'IT', 'general']).withMessage('Invalid category'),
  body('message').trim().notEmpty().withMessage('Message required'),
  body('priority').optional().isIn(['normal', 'high', 'urgent']),
], validate, createSupportTicket);

// Resources / Library
router.get('/resources', getResources);

// Exam Schedule
router.get('/exams', getExamSchedule);

// Student Photo
router.get('/photo', getStudentPhoto);

// Get active announcements for this student
router.get('/announcements', async (req, res) => {
  const { pool } = require('../config/database');
  try {
    const student = await pool.query('SELECT application_type FROM students WHERE id = $1', [req.student.studentId]);
    const appType = student.rows[0]?.application_type || 'regular';
    const result = await pool.query(
      `SELECT id, title, content, priority, created_at FROM announcements
       WHERE is_active = true AND (target = 'all' OR target = $1)
       ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'important' THEN 2 ELSE 3 END, created_at DESC
       LIMIT 10`,
      [appType]
    );
    res.json({ success: true, announcements: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load announcements' });
  }
});

module.exports = router;
