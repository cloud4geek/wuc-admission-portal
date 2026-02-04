#!/bin/bash
# Server setup script for WUC Admission Portal

echo "🔧 Setting up WUC Admission Portal on Lightsail..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
echo "🗄️ Installing PostgreSQL..."
sudo apt install postgresql postgresql-contrib -y

# Install Nginx
echo "🌐 Installing Nginx..."
sudo apt install nginx -y

# Install PM2
echo "⚙️ Installing PM2..."
sudo npm install -g pm2

# Setup project directory
PROJECT_DIR="/home/ubuntu/wuc-admission-portal"
cd $PROJECT_DIR

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production

# Install frontend dependencies and build
echo "🏗️ Building frontend..."
cd ../frontend
npm install
npm run build

# Setup database
echo "🗄️ Setting up database..."
sudo -u postgres createdb wuc_admissions_prod 2>/dev/null || echo "Database already exists"
sudo -u postgres createuser wuc_admin 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "ALTER USER wuc_admin WITH PASSWORD 'wuc1234';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE wuc_admissions_prod TO wuc_admin;"

# Import database schema
echo "📊 Importing database schema..."
sudo -u postgres psql -d wuc_admissions_prod -f $PROJECT_DIR/database/schema.sql

# Setup Nginx
echo "🌐 Configuring Nginx..."
sudo cp $PROJECT_DIR/deployment/nginx-lightsail.conf /etc/nginx/sites-available/wuc-admission-portal
sudo ln -sf /etc/nginx/sites-available/wuc-admission-portal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    echo "✅ Nginx configured successfully"
else
    echo "❌ Nginx configuration error"
fi

# Create logs directory
mkdir -p /home/ubuntu/logs

# Setup PM2
echo "⚙️ Starting application with PM2..."
cd $PROJECT_DIR
pm2 delete wuc-backend 2>/dev/null || true
pm2 start deployment/ecosystem.config.json

# Save PM2 configuration
pm2 save
pm2 startup ubuntu -u ubuntu --hp /home/ubuntu

# Setup firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Create startup script
echo "🚀 Creating startup script..."
cat > /home/ubuntu/start-wuc.sh << 'EOF'
#!/bin/bash
cd /home/ubuntu/wuc-admission-portal
pm2 start deployment/ecosystem.config.json
sudo systemctl start nginx
echo "WUC Admission Portal started"
EOF

chmod +x /home/ubuntu/start-wuc.sh

# Final status check
echo "📊 Checking services status..."
echo "Nginx status:"
sudo systemctl status nginx --no-pager -l

echo "PM2 status:"
pm2 status

echo "Database status:"
sudo systemctl status postgresql --no-pager -l

echo "🎉 Deployment completed successfully!"
echo "🌐 Frontend: http://107.20.160.131"
echo "🔗 API: http://107.20.160.131/api"
echo "💚 Health: http://107.20.160.131/api/health"