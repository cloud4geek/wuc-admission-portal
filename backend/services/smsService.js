/**
 * SMS Service — SMSOnlineGH (portal.smsonlinegh.com)
 * API Docs: https://dev.smsonlinegh.com
 * Endpoint: https://api.smsonlinegh.com/v5/message/sms/send
 */
const axios = require('axios');

const API_URL = 'https://api.smsonlinegh.com/v5/message/sms/send';
const API_KEY = () => process.env.SMSONLINEGH_API_KEY || '';
const SENDER_ID = () => process.env.SMS_SENDER_ID || 'WUC-ADM';

/**
 * Send SMS via SMSOnlineGH API
 */
const sendSMS = async (phone, message) => {
  const key = API_KEY();
  if (!key || key === 'your_smsonlinegh_api_key') {
    console.log(`📱 [DEV SMS] To: ${phone} | Message: ${message}`);
    return { success: true, messageId: `DEV-SMS-${Date.now()}` };
  }

  try {
    // Format phone: remove spaces, ensure 233 prefix
    let formattedPhone = phone.replace(/[\s\-()]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '233' + formattedPhone.substring(1);
    }
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }

    const response = await axios.post(API_URL, {
      messages: [
        {
          text: message,
          type: 0,
          sender: SENDER_ID(),
          destinations: [formattedPhone],
        },
      ],
    }, {
      headers: {
        'Authorization': `key ${key}`,
        'Content-Type': 'application/json',
        'Host': 'api.smsonlinegh.com',
      },
      timeout: 15000,
    });

    const data = response.data;
    if (data && (data.status === 200 || data.handshake === 'sent')) {
      console.log(`✅ SMS sent to ${phone} via SMSOnlineGH`);
      return { success: true, messageId: data.messageId || `SMSONLINE-${Date.now()}`, response: data };
    } else {
      console.error('❌ SMSOnlineGH error:', data);
      return { success: false, error: data?.message || 'SMS sending failed' };
    }
  } catch (error) {
    console.error('❌ SMS error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

/**
 * Send voucher code via SMS
 */
const sendVoucherSMS = async (phone, voucherCode) => {
  const message = `WUC Admission: Your voucher code is ${voucherCode}. Valid for 30 days. Apply at ${process.env.APP_URL || 'https://apply.wuc.edu.gh'}/apply`;
  return sendSMS(phone, message);
};

/**
 * Send application confirmation via SMS
 */
const sendApplicationSMS = async (phone, applicationId) => {
  const message = `WUC Admission: Application ${applicationId} received successfully. Track status at ${process.env.APP_URL || 'https://apply.wuc.edu.gh'}/application-status`;
  return sendSMS(phone, message);
};

/**
 * Send admission approval via SMS
 */
const sendAdmissionSMS = async (phone, applicationId) => {
  const message = `Congratulations! Your WUC admission application ${applicationId} has been APPROVED. Download your admission letter at ${process.env.APP_URL || 'https://apply.wuc.edu.gh'}/application-status`;
  return sendSMS(phone, message);
};

module.exports = {
  sendSMS,
  sendVoucherSMS,
  sendApplicationSMS,
  sendAdmissionSMS,
};
