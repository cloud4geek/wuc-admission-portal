const { pool } = require('../config/database');
const { initiatePayment, verifyPayment } = require('../services/paymentService');
const { sendVoucherEmail } = require('../services/emailService');
const { sendVoucherSMS } = require('../services/smsService');
const logger = require('../utils/logger');

const generateVoucherCode = () => `WUC${Date.now().toString().slice(-8)}`;

/**
 * Notify user of voucher via email and SMS.
 * Failures are isolated — they log but never crash the purchase flow.
 */
const notifyVoucher = (email, phone, voucherCode, firstName) => {
  sendVoucherEmail(email, voucherCode, firstName).catch((e) =>
    logger.error('Voucher email failed', { email, voucherCode, error: e.message })
  );
  sendVoucherSMS(phone, voucherCode).catch((e) =>
    logger.error('Voucher SMS failed', { phone, voucherCode, error: e.message })
  );
};

const purchaseVoucher = async (req, res, next) => {
  const { firstName, lastName, email, phone, paymentMethod, reference } = req.body;

  try {
    // If a Paystack reference is provided, verify the payment first
    if (reference) {
      const verification = await verifyPayment(reference);
      if (!verification.success) {
        return res.status(400).json({ success: false, message: 'Payment verification failed. Please try again.' });
      }
    } else {
      // No reference — initialize payment (returns URL for redirect or dev-mode success)
      const paymentResult = await initiatePayment({
        email, phone, amount: 220, paymentMethod, firstName, lastName,
      });

      if (!paymentResult.success) {
        return res.status(400).json({ success: false, message: 'Payment initiation failed: ' + (paymentResult.error || '') });
      }

      // If there's an authorization_url, return it for frontend redirect
      if (paymentResult.data.authorization_url) {
        return res.json({
          success: true,
          requiresRedirect: true,
          paymentUrl: paymentResult.data.authorization_url,
          reference: paymentResult.data.reference,
          message: 'Redirect to payment page',
        });
      }
      // Dev mode — no redirect needed, fall through to create voucher
    }

    // Payment verified or dev mode — create the voucher
    const voucherCode = generateVoucherCode();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO vouchers (voucher_code, first_name, last_name, email, phone, payment_method, payment_reference, amount, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [voucherCode, firstName, lastName, email, phone, paymentMethod, reference || `DEV-${Date.now()}`, 220, expiresAt]
    );

    notifyVoucher(email, phone, voucherCode, firstName);

    res.json({
      success: true,
      voucherCode,
      message: 'Voucher purchased successfully',
    });
  } catch (error) {
    next(error);
  }
};

const verifyVoucher = async (req, res, next) => {
  const { voucherCode } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM vouchers WHERE voucher_code = $1',
      [voucherCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid voucher code' });
    }

    const voucher = result.rows[0];

    if (voucher.status === 'used') {
      return res.status(400).json({ success: false, message: 'Voucher already used' });
    }

    if (new Date(voucher.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Voucher expired' });
    }

    res.json({ success: true, voucher });
  } catch (error) {
    next(error);
  }
};

const resendVoucher = async (req, res, next) => {
  const { voucherId } = req.body;

  try {
    const result = await pool.query('SELECT * FROM vouchers WHERE id = $1', [voucherId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }

    const voucher = result.rows[0];
    notifyVoucher(voucher.email, voucher.phone, voucher.voucher_code, voucher.first_name);

    res.json({ success: true, message: 'Voucher resent successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Recover lost voucher — applicant provides email + phone used during purchase.
 * If both match, the voucher code is resent via email and SMS.
 */
const recoverVoucher = async (req, res, next) => {
  const { email, phone } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM vouchers
       WHERE LOWER(email) = LOWER($1) AND phone = $2
       ORDER BY created_at DESC`,
      [email.trim(), phone.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No voucher found matching that email and phone number. Please check your details and try again.',
      });
    }

    // Return all vouchers for this email+phone combo
    const vouchers = result.rows.map(v => ({
      voucherCode: v.voucher_code,
      status: v.status,
      purchasedAt: v.created_at,
      expiresAt: v.expires_at,
    }));

    // Resend the most recent unused voucher via email/SMS
    const activeVoucher = result.rows.find(v => v.status === 'unused' && new Date(v.expires_at) > new Date());
    if (activeVoucher) {
      notifyVoucher(activeVoucher.email, activeVoucher.phone, activeVoucher.voucher_code, activeVoucher.first_name);
    }

    res.json({
      success: true,
      message: activeVoucher
        ? `Voucher found! The code has been resent to ${email} and ${phone}.`
        : 'Voucher(s) found but none are currently active (used or expired).',
      vouchers,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { purchaseVoucher, verifyVoucher, resendVoucher, recoverVoucher };
