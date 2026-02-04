# Email Setup Guide

## Option 1: Gmail (Easiest - Recommended for Testing)

### Get Gmail App Password:
1. Go to: https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Search "App passwords"
4. Generate password for "Mail" app
5. Copy the 16-character password

### Update backend/.env:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_app_password
SMTP_FROM=your_email@gmail.com
```

## Option 2: AWS SES (Production - Recommended)

### Setup:
1. Go to AWS Console → SES
2. Verify your domain (wuc.edu.gh)
3. Create SMTP credentials
4. Get SMTP username and password

### Update backend/.env:
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_aws_smtp_username
SMTP_PASS=your_aws_smtp_password
SMTP_FROM=admissions@wuc.edu.gh
```

## Option 3: Other Providers

### SendGrid:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
SMTP_FROM=admissions@wuc.edu.gh
```

### Mailgun:
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your_mailgun_username
SMTP_PASS=your_mailgun_password
SMTP_FROM=admissions@wuc.edu.gh
```

## Test Email

After configuration, restart backend and test:
```bash
cd backend
npm start
```

Purchase a voucher at http://localhost:3000/purchase-voucher
Check your email for the voucher code!

## Troubleshooting

### "Invalid login"
- Make sure 2-Step Verification is enabled
- Use App Password, not your regular Gmail password
- Remove spaces from app password

### "Connection timeout"
- Check firewall settings
- Try port 465 with SSL instead of 587

### Emails not sending
- Check spam folder
- Verify SMTP credentials
- Check backend console for errors
