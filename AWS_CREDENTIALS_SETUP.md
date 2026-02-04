# AWS Configuration Guide for WUC Admission Portal

## Current Configuration Status
✅ AWS Region: us-east-1 (configured)
⚠️  AWS Access Key ID: Example placeholder (needs real credentials)
⚠️  AWS Secret Access Key: Example placeholder (needs real credentials)

## How to Get Real AWS Credentials

### Step 1: Create AWS Account
1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Complete registration process

### Step 2: Create IAM User for SES
1. Login to AWS Console
2. Go to IAM service
3. Click "Users" → "Create user"
4. Username: `wuc-ses-user`
5. Select "Programmatic access"

### Step 3: Attach Permissions
Attach these policies to the user:
- `AmazonSESFullAccess`
- `AmazonS3FullAccess` (for file uploads)

### Step 4: Get Credentials
1. After creating user, download the CSV file
2. Copy the Access Key ID and Secret Access Key
3. Update your .env file with real credentials

### Step 5: Update .env File
Replace the example values in your .env file:

```env
# Replace these with your real AWS credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_REAL_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_REAL_SECRET_ACCESS_KEY
AWS_S3_BUCKET=wuc-admissions-documents
```

## Security Best Practices

⚠️  **NEVER commit real AWS credentials to version control**
✅ Use IAM users with minimal required permissions
✅ Rotate credentials regularly
✅ Enable MFA on your AWS account
✅ Monitor usage in CloudTrail

## Current .env Status
The .env file has been configured with:
- ✅ Correct AWS region (us-east-1)
- ⚠️  Example credentials (replace with real ones)
- ✅ SES email configuration
- ✅ S3 bucket name

## Next Steps
1. Create AWS account if you don't have one
2. Create IAM user with SES permissions
3. Replace example credentials in .env with real ones
4. Test email functionality
5. Verify domain in SES console