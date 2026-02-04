require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Testing Gmail SMTP Configuration...\n');
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('\n---\n');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  debug: true,
  logger: true
});

async function testEmail() {
  try {
    console.log('Step 1: Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified!\n');

    console.log('Step 2: Sending test email...');
    const testEmail = process.argv[2] || process.env.SMTP_USER;
    console.log('Sending to:', testEmail);
    
    const info = await transporter.sendMail({
      from: `"WUC Admissions" <${process.env.SMTP_USER}>`,
      to: testEmail,
      subject: 'WUC Test Email - ' + new Date().toLocaleString(),
      text: 'This is a test email from WUC Admission Portal',
      html: '<h1>WUC Admission Portal</h1><p>If you receive this, Gmail SMTP is working correctly!</p><p>Sent at: ' + new Date().toLocaleString() + '</p>'
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testEmail();
