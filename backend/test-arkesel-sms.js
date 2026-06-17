require('dotenv').config();
const axios = require('axios');

/**
 * Test Arkesel SMS API
 * Usage: node test-arkesel-sms.js
 */

const ARKESEL_API_URL = 'https://sms.arkesel.com/sms/api';

async function testArkeselSMS() {
  console.log('========================================');
  console.log('Testing Arkesel SMS API');
  console.log('========================================\n');

  // Check if API key is set
  if (!process.env.ARKESEL_API_KEY || process.env.ARKESEL_API_KEY === 'your_arkesel_api_key') {
    console.log('❌ ERROR: ARKESEL_API_KEY not set in .env file');
    console.log('\nPlease add to backend/.env:');
    console.log('ARKESEL_API_KEY=your_actual_api_key');
    console.log('SMS_SENDER_ID=WUC-ADM\n');
    return;
  }

  console.log('✅ API Key found');
  console.log('Sender ID:', process.env.SMS_SENDER_ID || 'WUC-ADM');
  console.log('');

  // Get phone number from command line or use default
  const testPhone = process.argv[2] || '233241234567';
  const testMessage = 'Test message from WUC Admission Portal. Your voucher code is WUC12345678. Valid for 30 days.';

  console.log('Sending test SMS...');
  console.log('To:', testPhone);
  console.log('Message:', testMessage);
  console.log('');

  try {
    const response = await axios.get(ARKESEL_API_URL, {
      params: {
        action: 'send-sms',
        api_key: process.env.ARKESEL_API_KEY,
        to: testPhone,
        from: process.env.SMS_SENDER_ID || 'WUC-ADM',
        sms: testMessage
      },
      timeout: 10000
    });

    console.log('Response:', response.data);
    console.log('');

    // Check response
    if (response.data.code === '200' || 
        response.data.code === 200 || 
        response.data.code === 'ok' ||
        response.data.message === 'Successfully Sent' ||
        (typeof response.data === 'string' && response.data.includes('successfully'))) {
      console.log('✅ SUCCESS! SMS sent successfully');
      console.log('');
      console.log('Check your phone for the message.');
      console.log('Also check Arkesel dashboard: https://sms.arkesel.com/dashboard');
    } else {
      console.log('❌ FAILED! SMS not sent');
      console.log('Error:', response.data.message || response.data);
    }
  } catch (error) {
    console.log('❌ ERROR!');
    console.log('');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    } else if (error.request) {
      console.log('No response received from Arkesel');
      console.log('Check your internet connection');
    } else {
      console.log('Error:', error.message);
    }
    
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Check API key is correct');
    console.log('2. Check you have SMS credits in Arkesel account');
    console.log('3. Check phone number format (233XXXXXXXXX)');
    console.log('4. Check Sender ID is approved');
  }

  console.log('');
  console.log('========================================');
}

// Run test
testArkeselSMS();
