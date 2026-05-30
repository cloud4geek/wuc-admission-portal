const nodemailer = require('nodemailer');

const emailTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #003366; color: white; padding: 20px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .voucher-code { background: #003366; color: white; padding: 15px; font-size: 24px; text-align: center; margin: 20px 0; border-radius: 5px; }
    .button { display: inline-block; background: #003366; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Withrow University College</h1>
      <p>Admissions Office</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Withrow University College, Ghana</p>
      <p>Email: admissions@wuc.edu.gh | Website: www.wuc.edu.gh</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`;

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

const sendEmail = async (to, subject, html) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('\n' + '='.repeat(60));
    console.log(`📧 [DEV EMAIL] To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body preview: ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)}...`);
    console.log('='.repeat(60) + '\n');
    return { success: true, messageId: `DEV-${Date.now()}` };
  }

  try {
    console.log(`📧 Sending email to ${to} via Gmail...`);
    
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"WUC Admissions" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html
    });

    console.log(`✅ Email sent successfully - ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email failed:`, error.message);
    return { success: false, error: error.message };
  }
};

const sendVoucherEmail = async (email, voucherCode, firstName) => {
  const content = `
    <h2>Your Application Voucher</h2>
    <p>Dear ${firstName},</p>
    <p>Thank you for your interest in Withrow University College. Your application voucher has been generated successfully.</p>
    <div class="voucher-code">${voucherCode}</div>
    <p><strong>Important Information:</strong></p>
    <ul>
      <li>This voucher is valid for 30 days from the date of purchase</li>
      <li>Use this code to complete your online application</li>
      <li>Keep this code safe - you will need it to access the application form</li>
    </ul>
    <p style="text-align: center;">
      <a href="${process.env.APP_URL}/apply" class="button">Start Your Application</a>
    </p>
    <p>If you have any questions, please contact our admissions office.</p>
    <p>Best regards,<br><strong>WUC Admissions Team</strong></p>
  `;
  return sendEmail(email, 'WUC Application Voucher - ' + voucherCode, emailTemplate(content));
};

const sendApplicationConfirmation = async (email, applicationId, firstName, applicationType = 'regular') => {
  const isTopUp = applicationType === 'topup';
  const typeLabel = isTopUp ? 'Top-Up / Access Programme' : 'Undergraduate';

  const content = `
    <h2>Application Received Successfully</h2>
    <p>Dear ${firstName},</p>
    <p>We are pleased to confirm that your <strong>${typeLabel}</strong> application to Withrow University College
       has been received and is now under review.</p>
    <div class="voucher-code">${applicationId}</div>
    <p><strong>What happens next?</strong></p>
    <ul>
      <li>Our admissions team will review your application and supporting documents</li>
      <li>You will receive an email notification once a decision is made</li>
      <li>You can track your application status online at any time</li>
    </ul>
    <p style="text-align: center;">
      <a href="${process.env.APP_URL}/application-status" class="button">Track Application Status</a>
    </p>
    <p>Please save your Application ID: <strong>${applicationId}</strong> for future reference.</p>
    <p>Best regards,<br><strong>WUC Admissions Office</strong><br>Withrow University College, Agona-Asamangah</p>
  `;
  return sendEmail(email, `Application Confirmation [${applicationId}] — WUC`, emailTemplate(content));
};

const sendAdmissionLetter = async (email, firstName, admissionLetterUrl) => {
  const content = `
    <h2>🎉 Congratulations!</h2>
    <p>Dear ${firstName},</p>
    <p>We are delighted to inform you that your application to Withrow University College has been <strong>APPROVED</strong>!</p>
    <p>This is a significant achievement, and we look forward to welcoming you to our academic community.</p>
    <p style="text-align: center;">
      <a href="${admissionLetterUrl}" class="button">Download Admission Letter</a>
    </p>
    <p><strong>Next Steps:</strong></p>
    <ul>
      <li>Download and print your admission letter</li>
      <li>Complete the registration process</li>
      <li>Pay the required fees</li>
      <li>Attend orientation (details in admission letter)</li>
    </ul>
    <p>Welcome to WUC!</p>
    <p>Best regards,<br><strong>WUC Admissions Team</strong></p>
  `;
  return sendEmail(email, '🎉 Admission Approved - Welcome to WUC!', emailTemplate(content));
};

const sendPasswordResetEmail = async (email, username, resetUrl) => {
  const content = `
    <h2>Password Reset Request</h2>
    <p>Dear ${username},</p>
    <p>We received a request to reset your admin account password. Click the button below to set a new password.</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </p>
    <p>This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.</p>
    <p>Best regards,<br><strong>WUC System</strong></p>
  `;
  return sendEmail(email, 'Admin Password Reset - WUC Portal', emailTemplate(content));
};

module.exports = { sendEmail, emailTemplate, sendVoucherEmail, sendApplicationConfirmation, sendAdmissionLetter, sendPasswordResetEmail };
