const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const jwtUtil = require('../utils/jwt');
const { pool } = require('../config/database');
const { sendPasswordResetEmail } = require('../services/emailService');
const logger = require('../utils/logger');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

// Admin login
router.post(
  '/admin/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await pool.query(
        'SELECT id, username, email, password_hash, role FROM admin_users WHERE email = $1 AND is_active = true',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const admin = result.rows[0];
      const valid = await bcrypt.compare(password, admin.password_hash);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [admin.id]);

      const token = jwtUtil.generateAdminToken({
        adminId: admin.id,
        email: admin.email,
        username: admin.username,
        role: admin.role,
      });

      res.json({
        success: true,
        token,
        admin: { id: admin.id, username: admin.username, email: admin.email, role: admin.role },
      });
    } catch (error) {
      logger.error('Admin login error', { error: error.message });
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  }
);

// Forgot password — sends reset link to admin email
router.post(
  '/admin/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email required')],
  validate,
  async (req, res) => {
    const { email } = req.body;
    try {
      const result = await pool.query(
        'SELECT id, email, username FROM admin_users WHERE email = $1 AND is_active = true',
        [email]
      );

      // Always respond the same way — don't reveal if email exists
      if (result.rows.length === 0) {
        return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
      }

      const admin = result.rows[0];
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await pool.query(
        'UPDATE admin_users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
        [token, expires, admin.id]
      );

      const resetUrl = `${process.env.APP_URL}/admin/reset-password?token=${token}`;
      sendPasswordResetEmail(admin.email, admin.username, resetUrl).catch((e) =>
        logger.error('Password reset email failed', { email: admin.email, error: e.message })
      );

      res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    } catch (error) {
      logger.error('Forgot password error', { error: error.message });
      res.status(500).json({ success: false, message: 'Request failed' });
    }
  }
);

// Reset password — validates token and sets new password
router.post(
  '/admin/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number'),
  ],
  validate,
  async (req, res) => {
    const { token, password } = req.body;
    try {
      const result = await pool.query(
        'SELECT id FROM admin_users WHERE reset_token = $1 AND reset_token_expires > NOW() AND is_active = true',
        [token]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      }

      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE admin_users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
        [hash, result.rows[0].id]
      );

      res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
      logger.error('Reset password error', { error: error.message });
      res.status(500).json({ success: false, message: 'Reset failed' });
    }
  }
);

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    
    const decoded = jwtUtil.verifyRefreshToken(refreshToken);
    
    // Generate new access token
    const newAccessToken = jwtUtil.generateToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });
    
    res.json({
      success: true,
      accessToken: newAccessToken
    });
    
  } catch (error) {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

module.exports = router;