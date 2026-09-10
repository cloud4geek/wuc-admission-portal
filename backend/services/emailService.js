const nodemailer = require('nodemailer');

const emailTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d3748; margin: 0; padding: 0; background: #f0f2f5; }
    .wrapper { max-width: 640px; margin: 0 auto; padding: 20px; }
    .container { background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #003366 0%, #004a8f 100%); color: white; padding: 28px 30px; text-align: center; }
    .header img { width: 80px; height: 80px; border-radius: 50%; margin-bottom: 12px; object-fit: cover; border: 3px solid rgba(255,255,255,0.3); }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header p { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.7); letter-spacing: 0.5px; text-transform: uppercase; }
    .accent-bar { height: 4px; background: linear-gradient(90deg, #c9a84c 0%, #e8c84c 50%, #c9a84c 100%); }
    .content { padding: 32px 30px; background: #ffffff; }
    .content h2 { color: #003366; margin-top: 0; font-size: 20px; }
    .content p { margin: 12px 0; color: #4a5568; }
    .content ul { color: #4a5568; }
    .content ul li { margin-bottom: 8px; }
    .voucher-code { background: linear-gradient(135deg, #003366 0%, #004a8f 100%); color: white; padding: 18px; font-size: 26px; text-align: center; margin: 24px 0; border-radius: 8px; letter-spacing: 3px; font-weight: 700; }
    .button { display: inline-block; background: linear-gradient(135deg, #003366 0%, #004a8f 100%); color: white !important; padding: 14px 36px; text-decoration: none; border-radius: 6px; margin: 18px 0; font-weight: 600; font-size: 14px; }
    .footer { background: #f7f8fa; padding: 24px 30px; text-align: center; border-top: 1px solid #e8ecf0; }
    .footer p { margin: 6px 0; color: #718096; font-size: 12px; }
    .footer a { color: #003366; text-decoration: none; }
    .confidential { background: #fff8e6; border: 1px solid #f0e4b8; border-radius: 6px; padding: 12px 16px; margin-top: 16px; text-align: center; }
    .confidential p { margin: 0; font-size: 11px; color: #8b6914; font-weight: 500; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="http://wuc.edu.gh/wp-content/uploads/2025/05/WC-logo-on-white-1.jpg" alt="WUC Logo" />
        <h1>Withrow University College</h1>
        <p>Admissions Office</p>
      </div>
      <div class="accent-bar"></div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p><strong>Withrow University College</strong></p>
        <p>Agona-Asamang, Ashanti, Ghana</p>
        <p>Email: <a href="mailto:admissions@wuc.edu.gh">admissions@wuc.edu.gh</a> | Phone: +233 53 519 7436</p>
        <p>Website: <a href="https://www.wuc.edu.gh">www.wuc.edu.gh</a></p>
        <p style="margin-top: 12px; color: #a0aec0;">Accredited by GTEC &amp; NMC</p>
        <div class="confidential">
          <p>🔒 CONFIDENTIAL: This email and any attachments are intended solely for the named recipient(s). If you have received this message in error, please notify the sender immediately and delete it. Unauthorized use, disclosure, or copying is strictly prohibited.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
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
    console.log(`📧 Sending email to ${to} via Gmail (port 465)...`);
    
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"WUC Admissions" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html
    };
    
    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully - ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email failed:`, error.message);
    console.error('Full error:', error);
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
    <p>Best regards,<br><strong>WUC Admissions Office</strong><br>Withrow University College, Agona-Asamang</p>
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
