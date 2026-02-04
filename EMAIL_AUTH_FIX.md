# Google App Password Authentication Fix

## Current Issue
❌ **Error**: "Invalid login: Username and Password not accepted"
❌ **Cause**: App password authentication failure

## Steps to Fix

### Step 1: Verify 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Sign in with admissions@wuc.edu.gh
3. Ensure "2-Step Verification" is **ON**
4. If not enabled, enable it first

### Step 2: Generate New App Password
1. Go to https://myaccount.google.com/apppasswords
2. Sign in with admissions@wuc.edu.gh
3. If you see "App passwords", click it
4. If you see "This setting is not available", enable 2FA first
5. Select "Mail" as the app
6. Select "Other (Custom name)"
7. Enter: "WUC Admission Portal"
8. Click "Generate"
9. Copy the 16-character password (format: xxxx xxxx xxxx xxxx)

### Step 3: Update .env File
Replace the current app password with the new one:

```env
SMTP_PASS=yournewapppassword
```

### Step 4: Alternative - Use OAuth2 (Recommended)
If app passwords don't work, we can switch to OAuth2:

1. Go to https://console.cloud.google.com/
2. Create a new project: "WUC Admission Portal"
3. Enable Gmail API
4. Create OAuth2 credentials
5. Update email service to use OAuth2

## Common Issues

### Issue 1: "App passwords" option not available
**Solution**: Enable 2-Factor Authentication first

### Issue 2: App password still doesn't work
**Solution**: 
- Try generating a new app password
- Wait 5-10 minutes after generation
- Check if account has admin restrictions

### Issue 3: Google Workspace restrictions
**Solution**: Contact your Google Workspace admin to:
- Enable "Less secure app access" (if available)
- Allow app passwords for the domain
- Check security policies

## Quick Test Commands

Test with new app password:
```bash
cd backend
node test-email.js
```

## Alternative Email Services

If Google continues to have issues, we can switch to:
1. **Outlook/Hotmail SMTP**
2. **SendGrid** (recommended for production)
3. **Mailgun**
4. **AWS SES** (we already have AWS credentials)

Would you like me to:
1. Help you generate a new app password?
2. Switch to a different email service?
3. Set up OAuth2 authentication?