require('dotenv').config();
const { sendVoucherEmail } = require('./services/emailService');

const testEmail = process.argv[2] || 'test@example.com';
const testVoucherCode = 'WUC' + Math.floor(Math.random() * 100000000);

console.log('\n🧪 Testing Gmail Email Service...\n');
console.log(`📧 Sending test voucher email to: ${testEmail}`);
console.log(`🎫 Voucher Code: ${testVoucherCode}\n`);

sendVoucherEmail(testEmail, testVoucherCode, 'Test User')
  .then(result => {
    if (result.success) {
      console.log('\n✅ Email sent successfully!');
      console.log(`📬 Message ID: ${result.messageId}`);
      console.log('\n✅ Check your inbox (and spam folder) for the email.\n');
    } else {
      console.log('\n❌ Email failed to send');
      console.log(`Error: ${result.error}\n`);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  });
