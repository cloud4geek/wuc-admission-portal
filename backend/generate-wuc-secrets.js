const crypto = require('crypto');
const fs = require('fs');

console.log('🔐 Generating WUC Admission Portal Secrets 🔐');
console.log('==============================================\n');

const secrets = {
  // JWT for authentication
  JWT_SECRET: crypto.randomBytes(64).toString('hex'),
  
  // Refresh tokens (for longer sessions)
  JWT_REFRESH_SECRET: crypto.randomBytes(64).toString('hex'),
  
  // Admin JWT (different secret for admin routes)
  JWT_ADMIN_SECRET: crypto.randomBytes(64).toString('hex'),
  
  // Encryption for sensitive data
  ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
  
  // Session management
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
  
  // For password reset tokens
  RESET_TOKEN_SECRET: crypto.randomBytes(32).toString('hex'),
  
  // For email verification tokens
  EMAIL_VERIFICATION_SECRET: crypto.randomBytes(32).toString('hex'),
  
  // Timestamp
  GENERATED_AT: new Date().toISOString()
};

// Display secrets
Object.entries(secrets).forEach(([key, value]) => {
  if (!key.includes('GENERATED')) {
    console.log(`${key}=${value}`);
  }
});

console.log('\n📋 Copy these into your .env file!');
console.log('⚠️  NEVER commit .env to GitHub!');

// Create .env.example
const envTemplate = `# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ADMIN_SECRET=your_admin_jwt_secret_here

# Encryption
ENCRYPTION_KEY=your_32_char_encryption_key_here
SESSION_SECRET=your_session_secret_here

# Token Secrets
RESET_TOKEN_SECRET=your_reset_token_secret_here
EMAIL_VERIFICATION_SECRET=your_email_verification_secret_here

# Application
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wuc_admissions
DB_USER=wuc_admin
DB_PASSWORD=your_secure_db_password_here

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=wuc-admissions-documents

# Email
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_ses_smtp_user
SMTP_PASS=your_ses_smtp_password
SMTP_FROM=admissions@wuc.edu.gh

# Payment (Flutterwave)
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxxxxxxxxxxxxxxxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxxxxxxxxxxxxxxxxxx
FLUTTERWAVE_ENCRYPTION_KEY=xxxxxxxxxxxx

# SMS (HubTel Ghana)
SMS_API_KEY=your_hubtel_api_key
SMS_SENDER_ID=WUC-ADM

# URLs
APP_URL=https://apply.wuc.edu.gh
API_URL=https://api.apply.wuc.edu.gh`;

fs.writeFileSync('.env.example', envTemplate);
console.log('\n✅ Created .env.example template');
