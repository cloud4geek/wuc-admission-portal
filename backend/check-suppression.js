require('dotenv').config();
const AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_SES_REGION || process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const sesv2 = new AWS.SESV2();

async function checkSuppression() {
  const email = process.argv[2] || '233cyber@gmail.com';
  
  console.log('Checking if', email, 'is on SES suppression list...\n');
  
  try {
    const result = await sesv2.getSuppressedDestination({
      EmailAddress: email
    }).promise();
    
    console.log('❌ Email IS on suppression list!');
    console.log('Reason:', result.SuppressedDestination.Reason);
    console.log('Last update:', result.SuppressedDestination.LastUpdateTime);
    console.log('\nTo remove:');
    console.log('1. Go to AWS SES Console → Suppression list');
    console.log('2. Find', email, 'and remove it');
    console.log('3. Or run: aws sesv2 delete-suppressed-destination --email-address', email);
  } catch (error) {
    if (error.code === 'NotFoundException') {
      console.log('✅ Email is NOT on suppression list - good!');
      console.log('\nIf emails still not arriving, check:');
      console.log('1. Spam/Junk folder in', email);
      console.log('2. Gmail filters (Settings → Filters)');
      console.log('3. Search "from:admissions@wuc.edu.gh" in Gmail');
      console.log('4. Check "All Mail" folder');
    } else {
      console.error('Error checking suppression:', error.message);
    }
  }
}

checkSuppression();
