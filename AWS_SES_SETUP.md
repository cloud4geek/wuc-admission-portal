# AWS SES Configuration for WUC Admission Portal

## Overview
Amazon Simple Email Service (SES) provides reliable, scalable email delivery for the WUC admission portal.

## Setup Process

### 1. Automated Setup
```bash
chmod +x setup-aws-ses.sh
./setup-aws-ses.sh
```

### 2. Manual Setup

#### Step 1: AWS Account Setup
1. Create AWS account at https://aws.amazon.com
2. Navigate to SES console
3. Select US East (N. Virginia) region

#### Step 2: Domain Verification
1. In SES console, go to "Verified identities"
2. Click "Create identity" → "Domain"
3. Enter: `wuc.edu.gh`
4. Choose "Easy DKIM" for authentication
5. Add DNS records provided by AWS to your domain

#### Step 3: Email Address Verification
1. Verify `admissions@wuc.edu.gh`
2. Check email for verification link

#### Step 4: SMTP Credentials
1. Go to "SMTP settings" in SES console
2. Click "Create SMTP credentials"
3. Username: `wuc-ses-smtp`
4. Save the generated credentials

#### Step 5: Production Access (Optional)
- By default, SES is in sandbox mode (can only send to verified emails)
- Request production access to send to any email address
- Go to "Account dashboard" → "Request production access"

## Environment Configuration

Update your `.env` file:
```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
AWS_SES_REGION=us-east-1

# Email Configuration
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_ses_smtp_username
SMTP_PASS=your_ses_smtp_password
SMTP_FROM=admissions@wuc.edu.gh
```

## DNS Records Required

Add these DNS records to your domain:

### DKIM Records (for authentication)
```
Type: CNAME
Name: [provided-by-aws]._domainkey.wuc.edu.gh
Value: [provided-by-aws].dkim.amazonses.com
```

### Domain Verification
```
Type: TXT
Name: _amazonses.wuc.edu.gh
Value: [verification-token-from-aws]
```

### SPF Record (recommended)
```
Type: TXT
Name: wuc.edu.gh
Value: "v=spf1 include:amazonses.com ~all"
```

### DMARC Record (recommended)
```
Type: TXT
Name: _dmarc.wuc.edu.gh
Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@wuc.edu.gh"
```

## Features Enabled

✅ **High Deliverability** - 99%+ delivery rate
✅ **Bounce/Complaint Handling** - Automatic management
✅ **Analytics** - Email sending statistics
✅ **Cost Effective** - $0.10 per 1,000 emails
✅ **Scalable** - Handle thousands of emails
✅ **DKIM Signing** - Email authentication
✅ **Reputation Management** - AWS manages IP reputation

## Monitoring & Analytics

### CloudWatch Metrics
- Send rate
- Bounce rate
- Complaint rate
- Delivery rate

### SES Dashboard
- Sending statistics
- Reputation metrics
- Suppression list management

## Cost Estimation

**Free Tier:** 62,000 emails/month (if sent from EC2)
**Paid:** $0.10 per 1,000 emails after free tier

**Monthly estimates for WUC:**
- 1,000 applications: ~$0.50/month
- 5,000 applications: ~$2.50/month
- 10,000 applications: ~$5.00/month

## Troubleshooting

### Common Issues

1. **Domain not verified**
   - Check DNS records are properly configured
   - Wait up to 72 hours for DNS propagation

2. **Emails going to spam**
   - Ensure DKIM, SPF, and DMARC are configured
   - Warm up your sending reputation gradually

3. **Sending quota exceeded**
   - Request quota increase in SES console
   - Monitor sending rate limits

4. **Bounce/complaint rates high**
   - Clean email lists regularly
   - Use double opt-in for subscriptions

### Support
- AWS SES Documentation: https://docs.aws.amazon.com/ses/
- AWS Support: https://aws.amazon.com/support/

## Security Best Practices

1. **IAM Permissions** - Use least privilege access
2. **Credential Rotation** - Rotate SMTP credentials regularly
3. **Monitoring** - Set up CloudWatch alarms
4. **Encryption** - Use TLS for email transmission
5. **Suppression Lists** - Respect bounce/complaint lists

## Testing

Test email functionality:
```bash
# Install dependencies
npm install aws-sdk

# Test email sending
node -e "
const { sendEmail } = require('./backend/services/emailService');
sendEmail('test@example.com', 'Test Subject', '<h1>Test Email</h1>')
  .then(result => console.log('Result:', result))
  .catch(err => console.error('Error:', err));
"
```