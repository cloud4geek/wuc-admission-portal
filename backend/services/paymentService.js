/**
 * Paystack Payment Service
 * Handles payment initialization and verification for voucher purchases.
 * Paystack docs: https://paystack.com/docs/api/transaction/
 */
const axios = require('axios');

const PAYSTACK_BASE = 'https://api.paystack.co';
const PAYSTACK_SECRET = () => process.env.PAYSTACK_SECRET_KEY || '';

/**
 * Initialize a Paystack transaction.
 * Returns an authorization_url for the user to complete payment.
 */
const initiatePayment = async (paymentData) => {
  const { email, amount, firstName, lastName, phone, paymentMethod } = paymentData;

  // Dev/test mode — skip actual payment if no key configured
  if (process.env.NODE_ENV === 'development' && (!PAYSTACK_SECRET() || PAYSTACK_SECRET().includes('test_placeholder'))) {
    console.log('💳 Dev mode: Simulating Paystack payment success');
    return {
      success: true,
      data: {
        authorization_url: null,
        access_code: `DEV_${Date.now()}`,
        reference: `WUC-DEV-${Date.now()}`,
      },
    };
  }

  try {
    // Amount in pesewas (kobo equivalent for GHS) — Paystack uses smallest currency unit
    const amountInPesewas = Math.round((amount || 220) * 100);

    const payload = {
      email,
      amount: amountInPesewas,
      currency: 'GHS',
      reference: `WUC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      callback_url: `${process.env.APP_URL || 'http://localhost:3000'}/payment/callback`,
      metadata: {
        custom_fields: [
          { display_name: 'Applicant Name', variable_name: 'applicant_name', value: `${firstName} ${lastName}` },
          { display_name: 'Phone', variable_name: 'phone', value: phone },
          { display_name: 'Payment Method', variable_name: 'payment_method', value: paymentMethod },
        ],
      },
      channels: getChannels(paymentMethod),
    };

    const response = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, payload, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET()}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.status) {
      return {
        success: true,
        data: {
          authorization_url: response.data.data.authorization_url,
          access_code: response.data.data.access_code,
          reference: response.data.data.reference,
        },
      };
    }

    return { success: false, error: response.data.message || 'Payment initialization failed' };
  } catch (error) {
    console.error('Paystack init error:', error.response?.data?.message || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

/**
 * Verify a Paystack transaction by reference.
 */
const verifyPayment = async (reference) => {
  if (process.env.NODE_ENV === 'development' && (!PAYSTACK_SECRET() || PAYSTACK_SECRET().includes('test_placeholder'))) {
    return { success: true, data: { status: 'success', amount: 22000, currency: 'GHS' } };
  }

  try {
    const response = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET()}` },
    });

    if (response.data.status && response.data.data.status === 'success') {
      return {
        success: true,
        data: {
          status: 'success',
          amount: response.data.data.amount,
          currency: response.data.data.currency,
          reference: response.data.data.reference,
          paid_at: response.data.data.paid_at,
        },
      };
    }

    return { success: false, error: `Payment not successful: ${response.data.data.status}` };
  } catch (error) {
    console.error('Paystack verify error:', error.response?.data?.message || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

/**
 * Map payment method to Paystack channels.
 */
function getChannels(method) {
  switch (method) {
    case 'mtn':
    case 'telecel':
    case 'at_money':
    case 'mobile_money':
      return ['mobile_money'];
    case 'visa':
    case 'mastercard':
    case 'card':
      return ['card'];
    default:
      return ['mobile_money'];
  }
}

module.exports = { initiatePayment, verifyPayment };
