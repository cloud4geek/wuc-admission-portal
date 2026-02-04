# Google Workspace Email Setup for WUC Admission Portal

## Configuration Status
✅ **Email Address**: admissions@wuc.edu.gh (configured)
✅ **SMTP Host**: smtp.gmail.com (configured)
✅ **SMTP Port**: 587 (configured)
⚠️  **App Password**: Needs to be generated

## Setup Steps

### Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Sign in with admissions@wuc.edu.gh
3. Enable 2-Step Verification if not already enabled

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" as the app
3. Select "Other" as the device
4. Enter: "WUC Admission Portal"
5. Click "Generate"
6. Copy the 16-character app password

### Step 3: Update .env File
Replace `your_google_app_password` in your .env file with the generated app password:

```env
SMTP_PASS=your_16_character_app_password
```

### Step 4: Test Email Configuration
Run this test to verify email is working:

```bash
cd backend
node -e "
const { sendEmail } = require('./services/emailService');
sendEmail('test@example.com', 'Test Email', '<h1>Test from WUC Portal</h1>')
  .then(result => console.log('✅ Email test result:', result))
  .catch(err => console.error('❌ Email test error:', err));
"
```

## Google Workspace Benefits

✅ **Professional Email**: Uses wuc.edu.gh domain
✅ **High Deliverability**: Google's reputation ensures emails reach inbox
✅ **Reliable Service**: 99.9% uptime guarantee
✅ **Security**: Built-in spam and malware protection
✅ **Integration**: Works seamlessly with existing Google services
✅ **Cost Effective**: Part of Google Workspace subscription

## Email Limits

**Google Workspace Limits:**
- 2,000 emails per day per user
- 500 recipients per email
- 25MB attachment limit

**For WUC Portal Usage:**
- Voucher confirmations: ~100-500/day
- Application confirmations: ~50-200/day
- Admission letters: ~20-100/day
- **Total**: Well within Google's limits

## Security Best Practices

✅ **Use App Passwords**: Never use the main account password
✅ **Enable 2FA**: Required for app password generation
✅ **Monitor Usage**: Check Google Admin Console for email activity
✅ **Regular Updates**: Rotate app passwords periodically
✅ **Backup Admin**: Have multiple admins for the Google Workspace

## Troubleshooting

### Common Issues:

1. **"Invalid credentials" error**
   - Ensure 2FA is enabled
   - Generate new app password
   - Check for typos in app password

2. **"Less secure app access" error**
   - Use app password instead of regular password
   - This error shouldn't occur with app passwords

3. **Emails going to spam**
   - Ensure SPF record includes Google: `v=spf1 include:_spf.google.com ~all`
   - Set up DKIM in Google Admin Console
   - Configure DMARC record

### DNS Records for Better Deliverability:

**SPF Record:**
```
Type: TXT
Name: wuc.edu.gh
Value: "v=spf1 include:_spf.google.com ~all"
```

**DMARC Record:**
```
Type: TXT
Name: _dmarc.wuc.edu.gh
Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@wuc.edu.gh"
```

## Current Configuration

Your .env file is now configured with:
- ✅ Google Workspace SMTP settings
- ✅ Professional email address (admissions@wuc.edu.gh)
- ⚠️  App password placeholder (needs real password)

## Next Steps

1. **Generate App Password** following Step 2 above
2. **Update .env** with the real app password
3. **Test Email** functionality
4. **Configure DNS** records for better deliverability
5. **Monitor Usage** in Google Admin Console

## Support

- Google Workspace Admin Help: https://support.google.com/a/
- WUC IT Support: Contact your Google Workspace administrator