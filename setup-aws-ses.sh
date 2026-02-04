#!/bin/bash
# AWS SES Setup Script for WUC Admission Portal

echo "Setting up AWS SES for WUC Admission Portal..."

# Install AWS CLI if not present
if ! command -v aws &> /dev/null; then
    echo "Installing AWS CLI..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
fi

# Configure AWS credentials (interactive)
echo "Configuring AWS credentials..."
aws configure

# Verify domain in SES
echo "Verifying domain wuc.edu.gh in SES..."
aws ses verify-domain-identity --domain wuc.edu.gh --region us-east-1

# Verify email address
echo "Verifying email address admissions@wuc.edu.gh..."
aws ses verify-email-identity --email-address admissions@wuc.edu.gh --region us-east-1

# Create SMTP credentials
echo "Creating SMTP credentials..."
aws ses create-smtp-credentials --user-name wuc-ses-smtp --region us-east-1

# Set up sending quota (optional - for production)
echo "Setting up sending quota..."
aws ses put-sending-quota --max-send-rate 10 --max-24-hour-send 1000 --region us-east-1

# Create configuration set for tracking
echo "Creating configuration set..."
aws ses create-configuration-set --configuration-set Name=wuc-admission-emails --region us-east-1

echo "✅ AWS SES setup completed!"
echo ""
echo "Next steps:"
echo "1. Check your email for domain verification"
echo "2. Update .env file with SMTP credentials"
echo "3. Request production access if needed"
echo "4. Configure DNS records for domain verification"