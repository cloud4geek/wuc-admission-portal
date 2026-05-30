# Google Workspace Email Setup for WUC Admission Portal

## Step 1: Enable 2-Step Verification (if not already enabled)

1. Go to https://myaccount.google.com/security
2. Click on "2-Step Verification"
3. Follow the prompts to enable it

## Step 2: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)**
4. Enter name: **WUC Admission Portal**
5. Click **Generate**
6. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

## Step 3: Update .env File

Add these lines to `backend/.env`:

```env
# Gmail/Google Workspace Configuration
GMAIL_USER=admissions@wuc.edu.gh
GMAIL_APP_PASSWORD=your_16_character_app_password
```

Replace:
- `admissions@wuc.edu.gh` with your Google Workspace email
- `your_16_character_app_password` with the app password from Step 2 (remove spaces)

## Step 4: Switch to Gmail Service

```bash
cd backend
copy services\emailService.js services\emailService-aws.js
copy services\emailService-gmail.js services\emailService.js
```

## Step 5: Install nodemailer (if not installed)

```bash
npm install nodemailer
```

## Step 6: Test Email Service

```bash
node test-gmail.js your-email@example.com
```

## Troubleshooting

### "Invalid login" error
- Verify 2-Step Verification is enabled
- Regenerate App Password
- Remove spaces from app password in .env

### "Less secure app" error
- Use App Password (not regular password)
- App Passwords bypass "less secure app" restrictions

### Emails going to spam
- Add SPF record: `v=spf1 include:_spf.google.com ~all`
- Add DKIM in Google Workspace Admin Console
- Add DMARC record: `v=DMARC1; p=none; rua=mailto:admin@wuc.edu.gh`

## Production Checklist

- [ ] Use Google Workspace email (not free Gmail)
- [ ] Enable 2-Step Verification
- [ ] Generate App Password
- [ ] Configure SPF/DKIM/DMARC records
- [ ] Test email delivery
- [ ] Check spam folder
- [ ] Monitor email logs

## Email Limits

**Google Workspace:**
- 2,000 emails per day (per user)
- 10,000 emails per day (per domain)

**Free Gmail:**
- 500 emails per day
- Not recommended for production

## Support

If emails still fail:
1. Check Google Workspace Admin Console > Reports > Email Log Search
2. Verify domain ownership in Google Workspace
3. Contact Google Workspace support
