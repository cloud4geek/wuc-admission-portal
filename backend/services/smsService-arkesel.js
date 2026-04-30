const axios = require('axios');

const ARKESEL_API_URL = 'https://sms.arkesel.com/api/v2/sms/send';

/**
 * Send SMS via Arkesel API
 * Docs: https://developers.arkesel.com/sms-api/send-sms
 */
const sendSMS = async (phone, message) => {
  // Dev mode — log to console instead of sending real SMS
  if (process.env.NODE_ENV === 'development' || !process.env.ARKESEL_API_KEY || process.env.ARKESEL_API_KEY === 'your_arkesel_api_key') {
    console.log(`📱 [DEV SMS] To: ${phone}`);
    console.log(`📱 [DEV SMS] Message: ${message}`);
    return { success: true, messageId: `DEV-SMS-${Date.now()}` };
  }

  try {
    // Format phone number for Ghana (remove + and spaces)
    const formattedPhone = phone.replace(/[\s+]/g, '');

    const response = await axios.post(
      ARKESEL_API_URL,
      {
        sender: process.env.SMS_SENDER_ID || 'WUC-ADM',
        message: message,
        recipients: [formattedPhone]
      },
      {
        headers: {
          'api-key': process.env.ARKESEL_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code === '200' || response.data.code === 200) {
      console.log(`✅ SMS sent to ${phone} via Arkesel`);
      return { 
        success: true, 
        messageId: response.data.data?.id || `ARKESEL-${Date.now()}`,
        response: response.data
      };
    } else {
      console.error('❌ Arkesel SMS error:', response.data.message);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.error('❌ SMS error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
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
