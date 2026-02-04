const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS with existing credentials
AWS.config.update({
  accessKeyId: 'AKIAWRU6VR7OUXBKDQNL',
  secretAccessKey: '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',
  region: 'us-east-1'
});

const ses = new AWS.SES();
const iam = new AWS.IAM();

async function configureSES() {
  console.log('🚀 Auto-configuring AWS SES for WUC Admission Portal...');
  
  try {
    // Step 1: Verify email identity
    console.log('📧 Verifying email identity: admissions@wuc.edu.gh');
    await ses.verifyEmailIdentity({
      EmailAddress: 'admissions@wuc.edu.gh'
    }).promise();
    console.log('✅ Email verification initiated');

    // Step 2: Create SMTP user
    console.log('👤 Creating SMTP user...');
    const userName = 'wuc-ses-smtp-user';
    
    try {
      await iam.createUser({
        UserName: userName,
        Path: '/ses/'
      }).promise();
      console.log('✅ SMTP user created');
    } catch (error) {
      if (error.code === 'EntityAlreadyExists') {
        console.log('ℹ️  SMTP user already exists');
      } else {
        throw error;
      }
    }

    // Step 3: Attach SES policy
    console.log('🔐 Attaching SES permissions...');
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'ses:SendEmail',
            'ses:SendRawEmail'
          ],
          Resource: '*'
        }
      ]
    };

    await iam.putUserPolicy({
      UserName: userName,
      PolicyName: 'WUC-SES-SendEmail',
      PolicyDocument: JSON.stringify(policyDocument)
    }).promise();
    console.log('✅ SES permissions attached');

    // Step 4: Create access keys
    console.log('🔑 Creating SMTP credentials...');
    let accessKey;
    try {
      const keyResult = await iam.createAccessKey({
        UserName: userName
      }).promise();
      accessKey = keyResult.AccessKey;
      console.log('✅ SMTP credentials created');
    } catch (error) {
      if (error.code === 'LimitExceeded') {
        console.log('⚠️  Access key limit reached, using existing keys');
        const keys = await iam.listAccessKeys({ UserName: userName }).promise();
        if (keys.AccessKeyMetadata.length > 0) {
          console.log('ℹ️  Using existing access key');
          accessKey = { AccessKeyId: keys.AccessKeyMetadata[0].AccessKeyId };
        }
      } else {
        throw error;
      }
    }

    // Step 5: Generate SMTP password (AWS SES specific algorithm)
    let smtpPassword = '';
    if (accessKey && accessKey.SecretAccessKey) {
      const crypto = require('crypto');
      const message = 'SendRawEmail';
      const version = Buffer.from([0x02]);
      const secretKey = accessKey.SecretAccessKey;
      
      const signature = crypto.createHmac('sha256', secretKey).update(message).digest();
      const signatureAndVersion = Buffer.concat([version, signature]);
      smtpPassword = signatureAndVersion.toString('base64');
    }

    // Step 6: Update .env file
    console.log('📝 Updating .env file...');
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    if (accessKey) {
      envContent = envContent.replace(
        /SMTP_USER=your_aws_ses_smtp_username/,
        `SMTP_USER=${accessKey.AccessKeyId}`
      );
      
      if (smtpPassword) {
        envContent = envContent.replace(
          /SMTP_PASS=your_aws_ses_smtp_password/,
          `SMTP_PASS=${smtpPassword}`
        );
      }
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file updated');

    // Step 7: Check sending quota
    console.log('📊 Checking SES sending quota...');
    const quota = await ses.getSendQuota().promise();
    console.log(`📈 Daily sending quota: ${quota.Max24HourSend}`);
    console.log(`📉 Sent in last 24h: ${quota.SentLast24Hours}`);
    console.log(`⚡ Max send rate: ${quota.MaxSendRate} emails/second`);

    // Step 8: Request production access if in sandbox
    const attributes = await ses.getAccountSendingEnabled().promise();
    if (!attributes) {
      console.log('⚠️  Account may be in sandbox mode');
      console.log('📝 To request production access:');
      console.log('   1. Go to AWS SES Console');
      console.log('   2. Click "Request production access"');
      console.log('   3. Fill out the form with WUC details');
    }

    console.log('\n🎉 AWS SES configuration completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Check email: admissions@wuc.edu.gh for verification');
    console.log('2. Click the verification link');
    console.log('3. Test email functionality');
    console.log('4. Request production access if needed');
    
    if (accessKey) {
      console.log('\n🔐 SMTP Credentials:');
      console.log(`Username: ${accessKey.AccessKeyId}`);
      console.log(`Password: ${smtpPassword ? '***configured***' : 'Check AWS Console'}`);
    }

  } catch (error) {
    console.error('❌ SES configuration failed:', error.message);
    
    if (error.code === 'InvalidUserID.NotFound') {
      console.error('🔑 AWS credentials may be invalid');
    } else if (error.code === 'AccessDenied') {
      console.error('🚫 Insufficient permissions - need SES and IAM access');
    }
    
    process.exit(1);
  }
}

configureSES();