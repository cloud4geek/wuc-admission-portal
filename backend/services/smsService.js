/**
 * SMS Service — SMSOnlineGH (portal.smsonlinegh.com)
 * Uses v4 API: https://api.smsonlinegh.com/v4/message/sms/send
 * Sender ID must be registered on the SMSOnlineGH portal before use.
 */
const axios = require('axios');

const API_URL = 'https://api.smsonlinegh.com/v4/message/sms/send';
const API_KEY = () => process.env.SMSONLINEGH_API_KEY || '';
const SENDER_ID = () => process.env.SMS_SENDER_ID || 'WUC';

/**
 * Send SMS via SMSOnlineGH v4 API
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

    const response = await axios.get(API_URL, {
      params: {
        key,
        text: message,
        type: 0,
        sender: SENDER_ID(),
        to: formattedPhone,
      },
      timeout: 15000,
    });

    const data = response.data;
    const dest = data?.data?.messages?.[0]?.destinations?.[0];
    const status = dest?.status;

    if (data.handshake?.label === 'HSHK_OK' && status?.id !== 2128) {
      console.log(`✅ SMS sent to ${phone} via SMSOnlineGH | ID: ${dest?.messageId}`);
      return { success: true, messageId: dest?.messageId || `SMSONLINE-${Date.now()}` };
    } else {
      const errMsg = status?.label || data.handshake?.label || 'Unknown error';
      console.error(`❌ SMSOnlineGH: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  } catch (error) {
    console.error('❌ SMS error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

/** Send voucher code via SMS */
const sendVoucherSMS = async (phone, voucherCode) => {
  const message = `WUC Admission: Your voucher code is ${voucherCode}. Valid for 30 days. Apply at ${process.env.APP_URL || 'https://apply.wuc.edu.gh'}/apply`;
  return sendSMS(phone, message);
};

/** Send application confirmation via SMS */
const sendApplicationSMS = async (phone, applicationId) => {
  const message = `WUC Admission: Application ${applicationId} received. Track at ${process.env.APP_URL || 'https://apply.wuc.edu.gh'}/application-status`;
  return sendSMS(phone, message);
};

/** Send admission approval via SMS */
const sendAdmissionSMS = async (phone, applicationId) => {
  const message = `Congratulations! WUC application ${applicationId} APPROVED. Download letter at ${process.env.APP_URL || 'https://apply.wuc.edu.gh'}/application-status`;
  return sendSMS(phone, message);
};

module.exports = { sendSMS, sendVoucherSMS, sendApplicationSMS, sendAdmissionSMS };
