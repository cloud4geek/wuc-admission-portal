@echo off
echo 🚀 Auto-configuring AWS SES for WUC Admission Portal...

REM Set AWS credentials
set AWS_ACCESS_KEY_ID=AKIAWRU6VR7OUXBKDQNL
set AWS_SECRET_ACCESS_KEY=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
set AWS_DEFAULT_REGION=us-east-1

echo 📧 Verifying email identity: admissions@wuc.edu.gh
aws ses verify-email-identity --email-address admissions@wuc.edu.gh --region us-east-1

echo 👤 Creating SMTP user...
aws iam create-user --user-name wuc-ses-smtp-user --path /ses/ 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ SMTP user created
) else (
    echo ℹ️  SMTP user may already exist
)

echo 🔐 Creating SES policy...
echo {
echo   "Version": "2012-10-17",
echo   "Statement": [
echo     {
echo       "Effect": "Allow",
echo       "Action": [
echo         "ses:SendEmail",
echo         "ses:SendRawEmail"
echo       ],
echo       "Resource": "*"
echo     }
echo   ]
echo } > ses-policy.json

aws iam put-user-policy --user-name wuc-ses-smtp-user --policy-name WUC-SES-SendEmail --policy-document file://ses-policy.json

echo 🔑 Creating SMTP credentials...
aws iam create-access-key --user-name wuc-ses-smtp-user > smtp-credentials.json 2>nul

echo 📊 Checking SES sending quota...
aws ses get-send-quota --region us-east-1

echo 📈 Getting SES sending statistics...
aws ses get-send-statistics --region us-east-1

echo 🎯 Setting up configuration set...
aws ses create-configuration-set --configuration-set Name=wuc-admission-emails --region us-east-1 2>nul

echo 📝 Updating .env file with SES configuration...
powershell -Command "(Get-Content .env) -replace 'SMTP_HOST=.*', 'SMTP_HOST=email-smtp.us-east-1.amazonaws.com' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'SMTP_PORT=.*', 'SMTP_PORT=587' | Set-Content .env"

REM Clean up temporary files
del ses-policy.json 2>nul
del smtp-credentials.json 2>nul

echo.
echo 🎉 AWS SES configuration completed!
echo.
echo 📋 Next steps:
echo 1. Check email: admissions@wuc.edu.gh for verification
echo 2. Click the verification link in the email
echo 3. Go to AWS SES Console to get SMTP credentials
echo 4. Update .env file with SMTP username and password
echo 5. Request production access if needed
echo.
echo 🔗 AWS SES Console: https://console.aws.amazon.com/ses/
echo 📖 SMTP Credentials: Go to SES Console → SMTP Settings → Create SMTP Credentials

pause