#!/bin/bash
# AWS Lightsail Deployment Script for WUC Admission Portal

echo "🚀 Deploying WUC Admission Portal to AWS Lightsail..."
echo "📍 Target Server: 107.20.160.131"

# Server configuration
SERVER_IP="107.20.160.131"
SERVER_USER="ubuntu"  # Default for Ubuntu instances
PROJECT_NAME="wuc-admission-portal"
DOMAIN="wuc.edu.gh"

echo "📦 Preparing deployment package..."

# Create deployment directory
mkdir -p deployment-package
cd deployment-package

# Copy project files (excluding node_modules and sensitive files)
rsync -av --exclude='node_modules' --exclude='.git' --exclude='ssl' --exclude='*.log' ../ ./

echo "📤 Uploading to Lightsail instance..."

# Upload project to server
scp -r ./ ${SERVER_USER}@${SERVER_IP}:/home/${SERVER_USER}/${PROJECT_NAME}/

echo "🔧 Configuring server..."

# SSH into server and setup
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    # Update system
    sudo apt update && sudo apt upgrade -y
    
    # Install Node.js 18
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Install PostgreSQL
    sudo apt install postgresql postgresql-contrib -y
    
    # Install Nginx
    sudo apt install nginx -y
    
    # Install PM2 for process management
    sudo npm install -g pm2
    
    # Setup project
    cd /home/ubuntu/wuc-admission-portal/backend
    npm install
    
    cd ../frontend
    npm install
    npm run build
    
    # Setup database
    sudo -u postgres createdb wuc_admissions_prod
    sudo -u postgres createuser wuc_admin
    sudo -u postgres psql -c "ALTER USER wuc_admin WITH PASSWORD 'wuc1234';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE wuc_admissions_prod TO wuc_admin;"
    
    # Import database schema
    sudo -u postgres psql -d wuc_admissions_prod -f /home/ubuntu/wuc-admission-portal/database/schema.sql
    
    echo "✅ Server setup completed"
ENDSSH

echo "✅ Deployment completed!"
echo "🌐 Your application should be accessible at: http://107.20.160.131"