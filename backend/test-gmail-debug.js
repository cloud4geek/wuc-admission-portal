require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('\n🔍 Gmail Configuration Debug\n');
console.log('GMAIL_USER:', process.env.GMAIL_USER);
console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '***' + process.env.GMAIL_APP_PASSWORD.slice(-4) : 'NOT SET');
console.log('Password length:', process.env.GMAIL_APP_PASSWORD?.length);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  debug: true,
  logger: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

console.log('\n📧 Testing connection...\n');

transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Connection failed:', error);
  } else {
    console.log('✅ Server is ready to send emails');
  }
});
