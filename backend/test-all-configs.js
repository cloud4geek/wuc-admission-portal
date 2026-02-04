require('dotenv').config();
const nodemailer = require('nodemailer');

// Alternative configuration - try different ports and settings
const configs = [
  {
    name: 'Port 465 SSL',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  },
  {
    name: 'Port 587 TLS',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { ciphers: 'SSLv3' }
  },
  {
    name: 'Gmail Relay',
    host: 'smtp-relay.gmail.com',
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  }
];

async function testConfig(config, testEmail) {
  console.log(`\n--- Testing: ${config.name} ---`);
  try {
    const transporter = nodemailer.createTransport(config);
    
    await transporter.verify();
    console.log('✅ Connection verified');
    
    const info = await transporter.sendMail({
      from: `"WUC Admissions" <${process.env.SMTP_USER}>`,
      to: testEmail,
      subject: `Test from ${config.name} - ${new Date().toLocaleTimeString()}`,
      html: `<h2>Test Email</h2><p>Sent via ${config.name}</p><p>Time: ${new Date().toLocaleString()}</p>`
    });
    
    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.message);
    return false;
  }
}

async function findWorkingConfig() {
  const testEmail = process.argv[2] || '233cyber@gmail.com';
  console.log('Testing email configurations for:', testEmail);
  console.log('This will try multiple SMTP settings to find what works.\n');
  
  for (const config of configs) {
    const success = await testConfig(config, testEmail);
    if (success) {
      console.log('\n✅ WORKING CONFIGURATION FOUND!');
      console.log('Update your emailService.js with these settings:');
      console.log(JSON.stringify(config, null, 2));
      return;
    }
  }
  
  console.log('\n❌ None of the configurations worked.');
  console.log('\nPossible issues:');
  console.log('1. DKIM not enabled in Google Workspace Admin Console');
  console.log('2. SMTP relay not configured in Google Workspace');
  console.log('3. App password expired - generate new one');
  console.log('4. 2-Step Verification disabled');
  console.log('\nCheck Gmail Sent folder: https://mail.google.com/mail/u/0/#sent');
  console.log('If emails are there, the issue is with recipient filtering, not sending.');
}

findWorkingConfig();
