require('dotenv').config();
const { sendVoucherSMS } = require('./services/smsService');

console.log('Testing SMS service...\n');
console.log('AWS Config:');
console.log('- Region:', process.env.AWS_REGION);
console.log('- Access Key:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 10) + '...');
console.log('\nSending test SMS to +233241234567...\n');

sendVoucherSMS('+233241234567', 'TEST12345678')
  .then(result => {
    console.log('\n✅ Result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
