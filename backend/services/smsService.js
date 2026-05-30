const axios = require('axios');

const ARKESEL_API_URL = 'https://sms.arkesel.com/sms/api';

/**
 * Send SMS via Arkesel API
 * API Format: https://sms.arkesel.com/sms/api?action=send-sms&api_key=KEY&to=PHONE&from=SENDER&sms=MESSAGE
 */
const sendSMS = async (phone, message) => {
  // Check if API key is configured
  if (!process.env.ARKESEL_API_KEY || process.env.ARKESEL_API_KEY === 'your_arkesel_api_key') {
    console.log(`📱 [DEV SMS - No API Key] To: ${phone}`);
    console.log(`📱 [DEV SMS - No API Key] Message: ${message}`);
    return { success: true, messageId: `DEV-SMS-${Date.now()}` };
  }

  try {
    // Format phone number (remove spaces, keep + or add 233 prefix)
    let formattedPhone = phone.replace(/\s/g, '');
    
    // If starts with 0, replace with 233
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '233' + formattedPhone.substring(1);
    }
    // Remove + if present
    formattedPhone = formattedPhone.replace('+', '');

    const response = await axios.get(ARKESEL_API_URL, {
      params: {
        action: 'send-sms',
        api_key: process.env.ARKESEL_API_KEY,
        to: formattedPhone,
        from: process.env.SMS_SENDER_ID || 'WUC-ADM',
        sms: message
      },
      timeout: 10000
    });

    // Arkesel returns different response formats
    const responseData = response.data;
    
    // Check for success (response can be string or object)
    if (responseData.code === '200' || 
        responseData.code === 200 || 
        responseData.code === 'ok' ||
        responseData.message === 'Successfully Sent' ||
        (typeof responseData === 'string' && responseData.includes('successfully'))) {
      console.log(`✅ SMS sent to ${phone} via Arkesel`);
      return { 
        success: true, 
        messageId: responseData.message_id || `ARKESEL-${Date.now()}`,
        response: responseData
      };
    } else {
      console.error('❌ Arkesel SMS error:', responseData);
      return { success: false, error: responseData.message || 'SMS sending failed' };
    }
  } catch (error) {
    console.error('❌ SMS error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
};

/**
 * Send voucher code via SMS
 */
const sendVoucherSMS = async (phone, voucherCode) => {
  const message = `WUC Admission: Your voucher code is ${voucherCode}. Valid for 30 days. Apply at ${process.env.APP_URL}/apply`;
  return sendSMS(phone, message);
};

/**
 * Send application confirmation via SMS
 */
const sendApplicationSMS = async (phone, applicationId) => {
  const message = `WUC Admission: Application ${applicationId} received successfully. Track status at ${process.env.APP_URL}/application-status`;
  return sendSMS(phone, message);
};

/**
 * Send admission approval via SMS
 */
const sendAdmissionSMS = async (phone, applicationId) => {
  const message = `Congratulations! Your WUC admission application ${applicationId} has been APPROVED. Download your admission letter at ${process.env.APP_URL}/application-status`;
  return sendSMS(phone, message);
};

module.exports = { 
  sendSMS, 
  sendVoucherSMS, 
  sendApplicationSMS,
  sendAdmissionSMS 
};
