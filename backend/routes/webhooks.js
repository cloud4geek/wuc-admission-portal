const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../config/database');
const { verifyPayment } = require('../services/paymentService');
const logger = require('../utils/logger');

/**
 * Flutterwave webhook endpoint
 * Receives payment status updates from Flutterwave
 */
router.post('/flutterwave', async (req, res) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
    const signature = req.headers['verif-hash'];

    // Verify webhook signature
    if (!signature || signature !== secretHash) {
      logger.warn('Invalid webhook signature', { signature });
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const payload = req.body;
    const { event, data } = payload;

    logger.info('Webhook received', { event, txRef: data?.tx_ref });

    // Handle successful payment
    if (event === 'charge.completed' && data.status === 'successful') {
      const { tx_ref, amount, customer } = data;

      // Verify payment with Flutterwave
      const verification = await verifyPayment(data.id);
      
      if (!verification.success || verification.data.data.status !== 'successful') {
        logger.error('Payment verification failed', { txRef: tx_ref });
        return res.status(400).json({ success: false, message: 'Verification failed' });
      }

      // Update voucher payment status
      const result = await pool.query(
        `UPDATE vouchers 
         SET payment_status = 'completed', 
             transaction_id = $1,
             updated_at = NOW()
         WHERE voucher_code LIKE $2
         RETURNING *`,
        [data.id, `%${tx_ref.slice(-8)}%`]
      );

      if (result.rows.length > 0) {
        logger.info('Payment confirmed', { 
          voucherCode: result.rows[0].voucher_code,
          amount,
          txRef: tx_ref 
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Webhook error', { error: error.message });
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

/**
 * Payment callback page (redirect after payment)
 */
router.get('/callback', async (req, res) => {
  const { status, tx_ref, transaction_id } = req.query;

  if (status === 'successful') {
    res.redirect(`${process.env.APP_URL}/payment-success?ref=${tx_ref}`);
  } else {
    res.redirect(`${process.env.APP_URL}/payment-failed?ref=${tx_ref}`);
  }
});

module.exports = router;
