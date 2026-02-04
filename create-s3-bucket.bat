@echo off
echo Creating S3 bucket for WUC Admission Portal...

REM Set AWS credentials as environment variables
set AWS_ACCESS_KEY_ID=AKIAWRU6VR7OUXBKDQNL
set AWS_SECRET_ACCESS_KEY=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
set AWS_DEFAULT_REGION=us-east-1

REM Create S3 bucket
echo Creating bucket wuc-admissions-documents...
aws s3 mb s3://wuc-admissions-documents --region us-east-1

REM Set bucket policy for secure access
echo Setting bucket policy...
echo {
echo   "Version": "2012-10-17",
echo   "Statement": [
echo     {
echo       "Sid": "AllowWUCAppAccess",
echo       "Effect": "Allow",
echo       "Principal": {"AWS": "*"},
echo       "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
echo       "Resource": "arn:aws:s3:::wuc-admissions-documents/*"
echo     }
echo   ]
echo } > bucket-policy.json

aws s3api put-bucket-policy --bucket wuc-admissions-documents --policy file://bucket-policy.json

REM Enable versioning
echo Enabling versioning...
aws s3api put-bucket-versioning --bucket wuc-admissions-documents --versioning-configuration Status=Enabled

REM Set CORS configuration
echo Setting CORS configuration...
echo {
echo   "CORSRules": [
echo     {
echo       "AllowedHeaders": ["*"],
echo       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
echo       "AllowedOrigins": ["*"],
echo       "MaxAgeSeconds": 3000
echo     }
echo   ]
echo } > cors-config.json

aws s3api put-bucket-cors --bucket wuc-admissions-documents --cors-configuration file://cors-config.json

REM Clean up temporary files
del bucket-policy.json
del cors-config.json

echo ✅ S3 bucket wuc-admissions-documents created successfully!
echo ✅ Bucket policy configured
echo ✅ Versioning enabled
echo ✅ CORS configured

pause