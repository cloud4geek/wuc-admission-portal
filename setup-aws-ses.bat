@echo off
echo Setting up AWS SES for WUC Admission Portal...

REM Check if AWS CLI is installed
aws --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing AWS CLI...
    echo Please download and install AWS CLI from: https://aws.amazon.com/cli/
    echo After installation, run this script again.
    pause
    exit /b 1
)

echo Configuring AWS credentials...
aws configure

echo Verifying domain wuc.edu.gh in SES...
aws ses verify-domain-identity --domain wuc.edu.gh --region us-east-1

echo Verifying email address admissions@wuc.edu.gh...
aws ses verify-email-identity --email-address admissions@wuc.edu.gh --region us-east-1

echo Creating SMTP credentials...
aws iam create-user --user-name wuc-ses-smtp
aws iam attach-user-policy --user-name wuc-ses-smtp --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess
aws iam create-access-key --user-name wuc-ses-smtp

echo Setting up sending quota...
aws ses put-sending-quota --max-send-rate 10 --max-24-hour-send 1000 --region us-east-1

echo Creating configuration set...
aws ses create-configuration-set --configuration-set Name=wuc-admission-emails --region us-east-1

echo.
echo ✅ AWS SES setup completed!
echo.
echo Next steps:
echo 1. Check your email for domain verification
echo 2. Update .env file with SMTP credentials
echo 3. Request production access if needed
echo 4. Configure DNS records for domain verification

pause