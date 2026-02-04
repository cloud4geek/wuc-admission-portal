require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('=== WUC Email Diagnostic Tool ===\n');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function diagnose() {
  try {
    // Step 1: Verify connection
    console.log('1. Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful\n');

    // Step 2: Send to same domain (should always work)
    console.log('2. Sending test email to same domain (admissions@wuc.edu.gh)...');
    const info1 = await transporter.sendMail({
      from: `"WUC Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: 'Test 1: Same Domain - ' + new Date().toLocaleTimeString(),
      html: '<h1>Test Email</h1><p>This email is sent to the same domain.</p>'
    });
    console.log('✅ Sent to same domain - Message ID:', info1.messageId);
    console.log('   Check: https://mail.google.com/mail/u/0/#sent\n');

    // Step 3: Send to external domain
    const testEmail = process.argv[2] || '233cyber@gmail.com';
    console.log(`3. Sending test email to external domain (${testEmail})...`);
    const info2 = await transporter.sendMail({
      from: `"WUC Admissions" <${process.env.SMTP_USER}>`,
      to: testEmail,
      subject: 'WUC Test Email - ' + new Date().toLocaleTimeString(),
      html: `
        <div style="font-family: Arial; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #003366;">Withrow University College</h2>
            <p>This is a test email from WUC Admissions Portal.</p>
            <p>If you receive this, email delivery is working correctly!</p>
            <p>Time: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    });
    console.log('✅ Sent to external domain - Message ID:', info2.messageId);
    console.log('   Response:', info2.response);
    
    console.log('\n=== Diagnostic Complete ===');
    console.log('\nIMPORTANT: Check these locations for the email:');
    console.log('1. Inbox of', testEmail);
    console.log('2. Spam/Junk folder of', testEmail);
    console.log('3. Gmail Sent folder: https://mail.google.com/mail/u/0/#sent');
    console.log('\nIf email is in Sent folder but not received:');
    console.log('- SPF/DKIM records may not be propagated yet (wait 10-30 minutes)');
    console.log('- Check DNS: nslookup -type=txt wuc.edu.gh');
    console.log('- Recipient server may be filtering emails from new domains');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Verify app password is correct in .env file');
    console.error('- Check 2-Step Verification is enabled in Google Account');
    console.error('- Ensure SMTP is not blocked by firewall');
  }
}

diagnose();
