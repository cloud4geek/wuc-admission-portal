const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMS = async (phone, message) => {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    console.log(`✅ SMS sent to ${phone}`);
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('❌ SMS error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendVoucherSMS = async (phone, voucherCode) => {
  const message = `WUC Admission: Your voucher code is ${voucherCode}. Valid for 30 days. Apply at ${process.env.APP_URL}/apply`;
  return sendSMS(phone, message);
};

const sendApplicationSMS = async (phone, applicationId) => {
  const message = `WUC Admission: Application ${applicationId} received. Track at ${process.env.APP_URL}/application-status`;
  return sendSMS(phone, message);
};

module.exports = { sendSMS, sendVoucherSMS, sendApplicationSMS };
