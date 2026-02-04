# WUC Admission Portal - AWS Lightsail Deployment Guide

## Server Details
- **IP Address**: 107.20.160.131
- **Platform**: AWS Lightsail
- **OS**: Ubuntu (assumed)
- **Domain**: wuc.edu.gh

## Quick Deployment

### Option 1: Automated Deployment
```bash
# Make script executable
chmod +x deploy-to-lightsail.sh

# Run deployment (requires SSH key setup)
./deploy-to-lightsail.sh
```

### Option 2: Manual Deployment

#### Step 1: Connect to Server
```bash
ssh ubuntu@107.20.160.131
```

#### Step 2: Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx
sudo apt install nginx -y

# Install PM2
sudo npm install -g pm2
```

#### Step 3: Upload Project
```bash
# From your local machine
scp -r wuc-admission-portal ubuntu@107.20.160.131:/home/ubuntu/
```

#### Step 4: Setup Database
```bash
# On server
sudo -u postgres createdb wuc_admissions_prod
sudo -u postgres createuser wuc_admin
sudo -u postgres psql -c "ALTER USER wuc_admin WITH PASSWORD 'wuc1234';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE wuc_admissions_prod TO wuc_admin;"

# Import schema
sudo -u postgres psql -d wuc_admissions_prod -f /home/ubuntu/wuc-admission-portal/database/schema.sql
```

#### Step 5: Install Project Dependencies
```bash
# Backend
cd /home/ubuntu/wuc-admission-portal/backend
npm install

# Frontend
cd ../frontend
npm install
npm run build
```

#### Step 6: Configure Nginx
```bash
# Copy nginx config
sudo cp /home/ubuntu/wuc-admission-portal/deployment/nginx-lightsail.conf /etc/nginx/sites-available/wuc-admission-portal

# Enable site
sudo ln -s /etc/nginx/sites-available/wuc-admission-portal /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 7: Start Application with PM2
```bash
# Create logs directory
mkdir -p /home/ubuntu/logs

# Start application
cd /home/ubuntu/wuc-admission-portal
pm2 start deployment/ecosystem.config.json

# Save PM2 configuration
pm2 save
pm2 startup
```

## Environment Configuration

Update `.env` file on server:
```bash
nano /home/ubuntu/wuc-admission-portal/backend/.env
```

Key settings for production:
```env
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_NAME=wuc_admissions_prod
DB_USER=wuc_admin
DB_PASSWORD=wuc1234

# Update URLs to use your IP/domain
APP_URL=http://107.20.160.131
API_URL=http://107.20.160.131/api
```

## SSL Certificate Setup (Optional)

### Using Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate (replace with your domain)
sudo certbot --nginx -d wuc.edu.gh -d www.wuc.edu.gh

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22  # SSH
sudo ufw enable
```

## Monitoring and Maintenance

### PM2 Commands
```bash
pm2 status          # Check application status
pm2 logs wuc-backend # View logs
pm2 restart wuc-backend # Restart application
pm2 reload wuc-backend  # Zero-downtime reload
```

### Nginx Commands
```bash
sudo systemctl status nginx   # Check nginx status
sudo systemctl reload nginx   # Reload configuration
sudo nginx -t                 # Test configuration
```

### Database Backup
```bash
# Create backup
pg_dump -h localhost -U wuc_admin wuc_admissions_prod > backup.sql

# Restore backup
psql -h localhost -U wuc_admin wuc_admissions_prod < backup.sql
```

## Access Points

After deployment:
- **Frontend**: http://107.20.160.131
- **API**: http://107.20.160.131/api
- **Health Check**: http://107.20.160.131/api/health

## Troubleshooting

### Common Issues

1. **Port 5000 blocked**
   ```bash
   sudo ufw allow 5000
   ```

2. **Database connection failed**
   ```bash
   sudo systemctl status postgresql
   sudo -u postgres psql -c "\l"  # List databases
   ```

3. **Nginx 502 error**
   ```bash
   pm2 status  # Check if backend is running
   sudo nginx -t  # Check nginx config
   ```

4. **File permissions**
   ```bash
   sudo chown -R ubuntu:ubuntu /home/ubuntu/wuc-admission-portal
   chmod +x /home/ubuntu/wuc-admission-portal/backend/server.js
   ```

## Performance Optimization

### Enable Gzip (already in nginx config)
### Database Indexing (already in schema)
### Static File Caching (configured in nginx)

## Security Checklist

- ✅ Firewall configured
- ✅ Database user with limited privileges
- ✅ Environment variables secured
- ✅ Nginx security headers
- ⚠️  SSL certificate (optional but recommended)
- ⚠️  Regular backups setup

## Support

For deployment issues:
- Check PM2 logs: `pm2 logs`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check system logs: `sudo journalctl -f`