const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const sendSMS = async (phone, message) => {
  // Dev mode — log to console instead of sending via SNS
  if (process.env.NODE_ENV === 'development' || process.env.AWS_ACCESS_KEY_ID === 'REPLACE_WITH_NEW_KEY') {
    console.log(`📱 [DEV SMS] To: ${phone} — ${message}`);
    return { success: true, messageId: `DEV-SMS-${Date.now()}` };
  }

  try {
    const command = new PublishCommand({
      PhoneNumber: phone,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: 'WUC-ADM'
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional'
        }
      }
    });

    const result = await snsClient.send(command);
    console.log(`✅ SMS sent to ${phone}`);
    return { success: true, messageId: result.MessageId };
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
