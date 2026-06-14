const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const crypto = require('crypto');
const { purchaseVoucher, verifyVoucher, resendVoucher, recoverVoucher } = require('../controllers/voucherController');
const { authenticateAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { pool } = require('../config/database');
const { sendVoucherEmail } = require('../services/emailService');
const { sendVoucherSMS } = require('../services/smsService');
const logger = require('../utils/logger');

const purchaseRules = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('paymentMethod')
    .isIn(['mtn', 'telecel', 'at_money', 'visa', 'mastercard', 'mobile_money'])
    .withMessage('Invalid payment method'),
];

const verifyRules = [
  body('voucherCode').trim().notEmpty().withMessage('Voucher code is required'),
];

const resendRules = [
  body('voucherId').trim().notEmpty().withMessage('Voucher ID is required'),
];

router.post('/purchase', purchaseRules, validate, purchaseVoucher);
router.post('/verify', verifyRules, validate, verifyVoucher);
router.post('/resend', authenticateAdmin, resendRules, validate, resendVoucher);

// Public — recover lost voucher by email + phone
router.post(
  '/recover',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
  ],
  validate,
  recoverVoucher
);

/**
 * POST /api/vouchers/webhook/paystack
 * Paystack sends event notifications here when payment status changes.
 * Verifies the signature to ensure the request is genuinely from Paystack.
 * On successful payment, creates a voucher if one doesn't already exist for this reference.
 */
router.post('/webhook/paystack', async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return res.sendStatus(200);

    // Verify Paystack signature using the raw body string
    const rawBody = JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      logger.warn('Paystack webhook: invalid signature', { ip: req.ip });
      return res.sendStatus(400);
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;
      const email = data.customer?.email;
      const amount = data.amount / 100; // Convert from pesewas to GHS
      const metadata = data.metadata?.custom_fields || [];
      const nameField = metadata.find(f => f.variable_name === 'applicant_name');
      const phoneField = metadata.find(f => f.variable_name === 'phone');
      const methodField = metadata.find(f => f.variable_name === 'payment_method');

      // Check if voucher already exists for this reference (idempotency)
      const existing = await pool.query(
        'SELECT voucher_code FROM vouchers WHERE payment_reference=$1', [reference]
      );
      if (existing.rows.length > 0) {
        // Already processed — respond 200 to stop Paystack retrying
        return res.sendStatus(200);
      }

      // Create voucher
      const voucherCode = `WUC${Date.now().toString().slice(-8)}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const names = (nameField?.value || '').split(' ');
      const firstName = names[0] || 'Applicant';
      const lastName = names.slice(1).join(' ') || '';
      const phone = phoneField?.value || '';
      const paymentMethod = methodField?.value || 'mobile_money';

      await pool.query(
        `INSERT INTO vouchers (voucher_code, first_name, last_name, email, phone, payment_method, payment_reference, amount, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [voucherCode, firstName, lastName, email || '', phone, paymentMethod, reference, amount, expiresAt]
      );

      // Send notifications
      if (email) sendVoucherEmail(email, voucherCode, firstName).catch(() => {});
      if (phone) sendVoucherSMS(phone, voucherCode).catch(() => {});

      logger.info('Paystack webhook: voucher created', { reference, voucherCode, email });
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error('Paystack webhook error', { error: error.message });
    res.sendStatus(200); // Always respond 200 to prevent Paystack from retrying
  }
});

module.exports = router;
