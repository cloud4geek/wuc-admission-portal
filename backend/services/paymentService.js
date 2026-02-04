const axios = require('axios');

const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

const initiatePayment = async (paymentData) => {
  const { email, phone, amount, paymentMethod, firstName, lastName } = paymentData;
  
  // Test mode - skip actual payment processing
  if (process.env.NODE_ENV === 'development' || !process.env.FLUTTERWAVE_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY.includes('test-xxx')) {
    console.log('💳 Test mode: Simulating payment success');
    return { 
      success: true, 
      data: { 
        status: 'success',
        message: 'Test payment successful',
        data: { 
          link: '#',
          tx_ref: `WUC-TEST-${Date.now()}`
        }
      } 
    };
  }
  
  try {
    const payload = {
      tx_ref: `WUC-${Date.now()}`,
      amount: amount || 200,
      currency: 'GHS',
      redirect_url: `${process.env.APP_URL}/payment/callback`,
      customer: { email, phonenumber: phone, name: `${firstName} ${lastName}` },
      customizations: {
        title: 'WUC Admission Voucher',
        description: 'Application Form Purchase',
        logo: 'https://www.wuc.edu.gh/logo.png'
      }
    };

    if (paymentMethod === 'mtn' || paymentMethod === 'telecel') {
      payload.payment_options = 'mobilemoney';
    } else if (paymentMethod === 'visa' || paymentMethod === 'mastercard') {
      payload.payment_options = 'card';
    }

    const response = await axios.post(`${FLUTTERWAVE_BASE_URL}/payments`, payload, {
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Payment error:', error.message);
    return { success: false, error: error.message };
  }
};

const verifyPayment = async (transactionId) => {
  // Test mode
  if (process.env.NODE_ENV === 'development' || !process.env.FLUTTERWAVE_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY.includes('test-xxx')) {
    return { success: true, data: { status: 'success', message: 'Test verification' } };
  }
  
  try {
    const response = await axios.get(`${FLUTTERWAVE_BASE_URL}/transactions/${transactionId}/verify`, {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Verification error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { initiatePayment, verifyPayment };
