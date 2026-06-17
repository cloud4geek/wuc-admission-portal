const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const jwtUtil = require('../utils/jwt');
const logger = require('../utils/logger');
const { lecturerLogin, getMyCourses, getCourseStudents, submitGrades, publishGrades, getLecturerProfile, exportStudentsCSV, importGradesCSV } = require('../controllers/lecturerController');

/* ── Lecturer Auth Middleware ── */
const authenticateLecturer = (req, res, next) => {
  try {
    // Support ?token= query param for export endpoints (window.open)
    if (!req.headers.authorization && req.query.token) {
      req.headers.authorization = `Bearer ${req.query.token}`;
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Access denied' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwtUtil.verifyToken(token);
    if (decoded.role !== 'lecturer') {
      return res.status(403).json({ success: false, error: 'Lecturer access required' });
    }
    req.lecturer = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid lecturer token', { ip: req.ip });
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

/* ── Public ── */
router.post('/login', [
  body('staffId').trim().notEmpty().withMessage('Staff ID required'),
  body('password').notEmpty().withMessage('Password required'),
], validate, lecturerLogin);

/* ── Setup Password (public — for new staff) ── */
router.post('/setup-password', [
  body('token').notEmpty().withMessage('Setup token required'),
  body('staffId').trim().notEmpty().withMessage('Staff ID required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number'),
], validate, async (req, res) => {
  const { token, staffId, password } = req.body;
  const { pool } = require('../config/database');
  const bcrypt = require('bcryptjs');
  try {
    const result = await pool.query(
      'SELECT id FROM lecturers WHERE staff_id = $1 AND reset_token = $2 AND reset_token_expires > NOW()',
      [staffId.toUpperCase().trim(), token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired setup link. Please contact administration.' });
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE lecturers SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, is_active = true WHERE id = $2',
      [hash, result.rows[0].id]
    );
    res.json({ success: true, message: 'Password set successfully! You can now log in with your Staff ID.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Setup failed' });
  }
});

/* ── Protected ── */
router.use(authenticateLecturer);

router.get('/profile', getLecturerProfile);
router.get('/courses', getMyCourses);
router.get('/courses/:courseId/students', getCourseStudents);

router.post('/courses/:courseId/grades', [
  body('grades').isArray({ min: 1 }).withMessage('Grades array required'),
], validate, submitGrades);

router.post('/courses/:courseId/publish', publishGrades);
router.get('/courses/:courseId/export', exportStudentsCSV);
router.post('/courses/:courseId/import', importGradesCSV);

module.exports = router;
