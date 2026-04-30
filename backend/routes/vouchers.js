const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { purchaseVoucher, verifyVoucher, resendVoucher, recoverVoucher } = require('../controllers/voucherController');
const { authenticateAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

const purchaseRules = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('paymentMethod')
    .isIn(['mtn', 'telecel', 'visa', 'mastercard'])
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

module.exports = router;
