require('dotenv').config();
const AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_SES_REGION || process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const ses = new AWS.SES();

async function testSES() {
  console.log('=== AWS SES Diagnostic ===\n');
  console.log('Region:', process.env.AWS_SES_REGION || process.env.AWS_REGION);
  console.log('From:', process.env.SES_FROM_EMAIL);
  console.log('\n--- Step 1: Check SES Account Status ---');
  
  try {
    const quota = await ses.getSendQuota().promise();
    console.log('✅ SES Account Active');
    console.log('   Max 24h send:', quota.Max24HourSend);
    console.log('   Sent last 24h:', quota.SentLast24Hours);
    console.log('   Max send rate:', quota.MaxSendRate, 'per second');
  } catch (error) {
    console.error('❌ Cannot access SES:', error.message);
    return;
  }

  console.log('\n--- Step 2: Check Verified Identities ---');
  try {
    const identities = await ses.listIdentities().promise();
    console.log('✅ Verified identities:');
    identities.Identities.forEach(id => console.log('   -', id));
    
    if (!identities.Identities.includes('wuc.edu.gh') && 
        !identities.Identities.includes(process.env.SES_FROM_EMAIL)) {
      console.log('\n⚠️  WARNING: wuc.edu.gh or admissions@wuc.edu.gh not verified!');
      console.log('   Go to SES Console and verify the domain/email first.');
      return;
    }
  } catch (error) {
    console.error('❌ Cannot list identities:', error.message);
    return;
  }

  console.log('\n--- Step 3: Send Test Email ---');
  const testEmail = process.argv[2] || '233cyber@gmail.com';
  console.log('Sending to:', testEmail);
  
  const params = {
    Source: process.env.SES_FROM_EMAIL,
    Destination: { ToAddresses: [testEmail] },
    Message: {
      Subject: { Data: 'WUC Test Email - ' + new Date().toLocaleTimeString() },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial; padding: 20px;">
              <h2 style="color: #003366;">Withrow University College</h2>
              <p>This is a test email from AWS SES.</p>
              <p>If you receive this, SES is working correctly!</p>
              <p>Time: ${new Date().toLocaleString()}</p>
            </div>
          `
        }
      }
    }
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', result.MessageId);
    console.log('\n📬 Check inbox (and spam folder) of:', testEmail);
    console.log('\nIf email doesn\'t arrive:');
    console.log('1. Verify', testEmail, 'in SES Console (if in sandbox mode)');
    console.log('2. Check AWS SES Console → Suppression list');
    console.log('3. Request production access if still in sandbox');
  } catch (error) {
    console.error('❌ Failed to send email');
    console.error('Error:', error.message);
    
    if (error.code === 'MessageRejected') {
      console.log('\n⚠️  Email address not verified!');
      console.log('In Sandbox mode, you must verify recipient email:');
      console.log('1. Go to SES Console → Verified identities');
      console.log('2. Create identity → Email address →', testEmail);
      console.log('3. Check inbox and click verification link');
    }
  }
}

testSES();
