# WUC Admission Portal - AWS Lightsail Deployment Guide

## Overview
- **Main Site**: wuc.edu.gh (WordPress on Lightsail)
- **Admission Portal**: apply.wuc.edu.gh (This application on new Lightsail instance)
- **API**: api.apply.wuc.edu.gh (Backend on same Lightsail instance)

---

## PHASE 1: LIGHTSAIL INSTANCE SETUP

### Step 1: Access Your Lightsail Instance
**Time: 2 minutes**

1. Go to AWS Lightsail Console: https://lightsail.aws.amazon.com
2. Click on your new instance
3. Click "Connect using SSH" (browser-based terminal)

**Or use SSH key:**
```bash
# Download SSH key from Lightsail console
ssh -i LightsailDefaultKey-*.pem ubuntu@YOUR_INSTANCE_IP
```

---

### Step 2: Update System & Install Dependencies
**Time: 10 minutes**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install other dependencies
sudo apt install -y nginx certbot python3-certbot-nginx postgresql postgresql-contrib git

# Install PM2 globally
sudo npm install -g pm2

# Verify installations
node --version  # Should show v18.x
npm --version
nginx -v
psql --version
```

---

### Step 3: Configure Lightsail Firewall
**Time: 3 minutes**

In Lightsail Console → Your Instance → Networking tab:

**Add these firewall rules:**
- SSH (22) - Already enabled
- HTTP (80) - Add if not present
- HTTPS (443) - Add if not present
- Custom TCP (5000) - Add for backend API (temporary, will use nginx proxy)

Click "Add rule" for each.

---

### Step 4: Setup PostgreSQL Database
**Time: 10 minutes**

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE USER wuc_admin WITH PASSWORD 'YourStrongPassword123!';
CREATE DATABASE wuc_admissions OWNER wuc_admin;
GRANT ALL PRIVILEGES ON DATABASE wuc_admissions TO wuc_admin;

# Exit postgres
\q

# Test connection
psql -U wuc_admin -d wuc_admissions -h localhost
# Enter password when prompted
# Type \q to exit
```

**Save these credentials - you'll need them later:**
- DB_HOST: localhost
- DB_USER: wuc_admin
- DB_PASSWORD: YourStrongPassword123!
- DB_NAME: wuc_admissions

---

### Step 5: Create Application Directory
**Time: 2 minutes**

```bash
# Create directories
sudo mkdir -p /var/www/wuc-admission-portal
sudo chown -R ubuntu:ubuntu /var/www/wuc-admission-portal

# Create log directory
sudo mkdir -p /var/log/wuc
sudo chown -R ubuntu:ubuntu /var/log/wuc
```

---

## PHASE 2: DEPLOY APPLICATION

### Step 6: Clone Repository
**Time: 5 minutes**

```bash
cd /var/www/wuc-admission-portal

# Clone from GitHub
git clone https://github.com/cloud4geek/wuc-admission-portal.git .

# Verify files
ls -la
```

---

### Step 7: Create Production Environment File
**Time: 10 minutes**

```bash
cd /var/www/wuc-admission-portal/backend

# Create .env file
nano .env
```

**Paste this configuration (update the values):**

```env
# Application
NODE_ENV=production
PORT=5000

# CORS
CORS_ORIGINS=https://apply.wuc.edu.gh,https://wuc.edu.gh

# Database (Local PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wuc_admissions
DB_USER=wuc_admin
DB_PASSWORD=YourStrongPassword123!
DB_SSL=false
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000

# JWT Secrets - GENERATE NEW ONES
# Run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=PASTE_64_CHAR_HEX_HERE
JWT_REFRESH_SECRET=PASTE_64_CHAR_HEX_HERE
JWT_ADMIN_SECRET=PASTE_64_CHAR_HEX_HERE

# Encryption Keys - GENERATE NEW ONES
ENCRYPTION_KEY=PASTE_32_CHAR_HEX_HERE
SESSION_SECRET=PASTE_64_CHAR_HEX_HERE
RESET_TOKEN_SECRET=PASTE_64_CHAR_HEX_HERE
EMAIL_VERIFICATION_SECRET=PASTE_64_CHAR_HEX_HERE

# AWS Configuration - CREATE NEW IAM USER
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AWS_S3_BUCKET=wuc-admissions-documents

# Email (AWS SES)
EMAIL_PROVIDER=ses
AWS_SES_REGION=us-east-1
SES_FROM_EMAIL=admissions@wuc.edu.gh
SES_REPLY_TO=admissions@wuc.edu.gh

# SMS (AWS SNS)
AWS_SNS_REGION=us-east-1
SMS_SENDER_ID=WUC-ADM

# Payment (Flutterwave Production)
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-your-production-key
FLUTTERWAVE_SECRET_KEY=FLWSECK-your-production-key
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK3-your-encryption-key
FLUTTERWAVE_SECRET_HASH=your-webhook-secret

# URLs
APP_URL=https://apply.wuc.edu.gh
API_URL=https://api.apply.wuc.edu.gh

# SSL (nginx will handle SSL)
SSL_ENABLED=false
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

---

### Step 8: Generate Secrets
**Time: 5 minutes**

```bash
# Generate JWT secrets (run 3 times)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate encryption keys (run 4 times)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy each output and paste into .env file
nano .env
```

---

### Step 9: Install Backend Dependencies
**Time: 5 minutes**

```bash
cd /var/www/wuc-admission-portal/backend
npm install --production
```

---

### Step 10: Initialize Database
**Time: 3 minutes**

```bash
cd /var/www/wuc-admission-portal

# Run schema
psql -U wuc_admin -d wuc_admissions -h localhost -f database/schema.sql

# Run migrations
psql -U wuc_admin -d wuc_admissions -h localhost -f database/migration_v2.sql

# Verify tables
psql -U wuc_admin -d wuc_admissions -h localhost -c "\dt"
```

---

### Step 11: Create Upload Directories
**Time: 1 minute**

```bash
cd /var/www/wuc-admission-portal/backend
mkdir -p uploads/{documents,photos,admission-letters,application-forms,templates}
chmod 755 uploads
chmod 755 uploads/*
```

---

### Step 12: Start Backend with PM2
**Time: 3 minutes**

```bash
cd /var/www/wuc-admission-portal/backend

# Start application
pm2 start server.js --name wuc-api --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it outputs

# Check status
pm2 status
pm2 logs wuc-api --lines 20
```

---

### Step 13: Test Backend
**Time: 2 minutes**

```bash
# Test locally
curl http://localhost:5000/api/health

# Should return: {"status":"healthy","database":"connected",...}
```

---

## PHASE 3: CONFIGURE DNS & NGINX

### Step 14: Get Lightsail Static IP
**Time: 3 minutes**

1. Go to Lightsail Console → Networking tab
2. Click "Create static IP"
3. Attach to your instance
4. Note the static IP address (e.g., 3.123.45.67)

---

### Step 15: Configure DNS Records
**Time: 10 minutes**

Go to your domain registrar (where you manage wuc.edu.gh):

**Add these A records:**
```
apply.wuc.edu.gh    →    YOUR_LIGHTSAIL_STATIC_IP
api.apply.wuc.edu.gh →   YOUR_LIGHTSAIL_STATIC_IP
```

**Wait 5-10 minutes for DNS propagation.**

**Test DNS:**
```bash
ping apply.wuc.edu.gh
ping api.apply.wuc.edu.gh
```

---

### Step 16: Configure Nginx for Backend API
**Time: 5 minutes**

```bash
sudo nano /etc/nginx/sites-available/wuc-api
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    server_name api.apply.wuc.edu.gh;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for file uploads
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

**Enable and test:**
```bash
sudo ln -s /etc/nginx/sites-available/wuc-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### Step 17: Build & Deploy Frontend
**Time: 10 minutes**

**On your local machine:**

```bash
cd frontend

# Update API URL
cat > src/config.ts <<EOF
export const API_URL = 'https://api.apply.wuc.edu.gh';
export const APP_URL = 'https://apply.wuc.edu.gh';
EOF

# Build
npm install
npm run build
```

**Upload to Lightsail:**

```bash
# From local machine
scp -i LightsailDefaultKey-*.pem -r build/* ubuntu@YOUR_LIGHTSAIL_IP:/tmp/frontend-build/
```

**On Lightsail instance:**

```bash
# Create frontend directory
sudo mkdir -p /var/www/wuc-frontend
sudo chown -R ubuntu:ubuntu /var/www/wuc-frontend

# Move files
mv /tmp/frontend-build/* /var/www/wuc-frontend/
```

---

### Step 18: Configure Nginx for Frontend
**Time: 5 minutes**

```bash
sudo nano /etc/nginx/sites-available/wuc-frontend
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    server_name apply.wuc.edu.gh;

    root /var/www/wuc-frontend;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

**Enable and test:**
```bash
sudo ln -s /etc/nginx/sites-available/wuc-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### Step 19: Install SSL Certificates
**Time: 10 minutes**

```bash
# Install SSL for API
sudo certbot --nginx -d api.apply.wuc.edu.gh

# Install SSL for Frontend
sudo certbot --nginx -d apply.wuc.edu.gh

# Follow prompts:
# - Enter email: your-email@wuc.edu.gh
# - Agree to terms: Y
# - Share email: N (optional)
# - Redirect HTTP to HTTPS: 2 (Yes)
```

**Test auto-renewal:**
```bash
sudo certbot renew --dry-run
```

---

### Step 20: Test Production URLs
**Time: 5 minutes**

**In browser, test:**
1. https://api.apply.wuc.edu.gh/api/health
2. https://apply.wuc.edu.gh

**Both should load with green padlock (valid SSL).**

---

## PHASE 4: LINK TO WORDPRESS SITE

### Step 21: Add Link to WordPress Site
**Time: 5 minutes**

**Option A: Add to WordPress Menu**

1. Login to WordPress admin: https://wuc.edu.gh/wp-admin
2. Go to Appearance → Menus
3. Add Custom Link:
   - URL: `https://apply.wuc.edu.gh`
   - Link Text: "Apply for Admission"
4. Save Menu

**Option B: Add Button to Homepage**

1. Edit homepage in WordPress
2. Add HTML block with:

```html
<div style="text-align: center; margin: 40px 0;">
    <a href="https://apply.wuc.edu.gh" 
       style="background: #1e3a8a; color: white; padding: 15px 40px; 
              text-decoration: none; border-radius: 5px; font-size: 18px; 
              font-weight: bold; display: inline-block;">
        🎓 Apply for Admission
    </a>
</div>
```

3. Update page

---

### Step 22: Create Admin User
**Time: 3 minutes**

```bash
# Generate password hash
node -e "console.log(require('bcrypt').hashSync('AdminPassword123!', 10))"

# Connect to database
psql -U wuc_admin -d wuc_admissions -h localhost

# Create admin user
INSERT INTO admin_users (username, email, password_hash, role, created_at)
VALUES (
  'admin',
  'admin@wuc.edu.gh',
  'PASTE_HASH_HERE',
  'super_admin',
  NOW()
);

# Exit
\q
```

**Test admin login:**
https://apply.wuc.edu.gh/admin

---

### Step 23: Setup Automated Backups
**Time: 5 minutes**

```bash
# Create backup script
sudo nano /usr/local/bin/backup-wuc-db.sh
```

**Paste:**

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PGPASSWORD=YourStrongPassword123! pg_dump -U wuc_admin -d wuc_admissions -h localhost > $BACKUP_DIR/wuc_$TIMESTAMP.sql
gzip $BACKUP_DIR/wuc_$TIMESTAMP.sql
find $BACKUP_DIR -name "wuc_*.sql.gz" -mtime +7 -delete
echo "Backup completed: $TIMESTAMP"
```

**Make executable and schedule:**

```bash
sudo chmod +x /usr/local/bin/backup-wuc-db.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /usr/local/bin/backup-wuc-db.sh >> /var/log/wuc/backup.log 2>&1
```

---

### Step 24: Configure Lightsail Snapshots
**Time: 3 minutes**

1. Go to Lightsail Console → Your Instance
2. Click "Snapshots" tab
3. Click "Create snapshot"
4. Enable automatic snapshots (daily recommended)

---

## PHASE 5: FINAL TESTING

### Step 25: Complete Testing Checklist
**Time: 20 minutes**

Test each feature:

- [ ] Homepage loads: https://apply.wuc.edu.gh
- [ ] API health: https://api.apply.wuc.edu.gh/api/health
- [ ] Link from wuc.edu.gh works
- [ ] Purchase voucher (test mode)
- [ ] Receive voucher email
- [ ] Submit application
- [ ] Upload documents
- [ ] Check application status
- [ ] Admin login works
- [ ] Approve application
- [ ] Generate admission letter
- [ ] Download admission letter

---

## MONITORING & MAINTENANCE

### Daily Commands

**Check Application Status:**
```bash
pm2 status
pm2 logs wuc-api --lines 50
```

**Check Disk Space:**
```bash
df -h
```

**Check Database:**
```bash
psql -U wuc_admin -d wuc_admissions -h localhost -c "SELECT COUNT(*) FROM applications;"
```

**View Recent Applications:**
```bash
psql -U wuc_admin -d wuc_admissions -h localhost -c "SELECT application_id, first_name, last_name, status, created_at FROM applications ORDER BY created_at DESC LIMIT 10;"
```

**Restart Application:**
```bash
pm2 restart wuc-api
```

**Update Application:**
```bash
cd /var/www/wuc-admission-portal
git pull origin main
cd backend
npm install --production
pm2 restart wuc-api
```

---

## TROUBLESHOOTING

### Application won't start
```bash
pm2 logs wuc-api --lines 100
# Check for database connection errors
```

### Database connection failed
```bash
# Test connection
psql -U wuc_admin -d wuc_admissions -h localhost

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### SSL certificate issues
```bash
sudo certbot certificates
sudo certbot renew
sudo systemctl restart nginx
```

### High memory usage
```bash
pm2 restart wuc-api
free -h
```

---

## COST OPTIMIZATION

**Lightsail Instance Recommendations:**
- **Development/Testing**: $10/month (1GB RAM)
- **Production (Low Traffic)**: $20/month (2GB RAM)
- **Production (Medium Traffic)**: $40/month (4GB RAM)

**Additional Costs:**
- Static IP: Free (included)
- Snapshots: ~$0.05/GB/month
- Data transfer: 1-3TB included

---

## SUPPORT

- **Lightsail Documentation**: https://lightsail.aws.amazon.com/ls/docs
- **AWS Support**: https://console.aws.amazon.com/support
- **Application Logs**: `/var/log/wuc/`
- **PM2 Logs**: `pm2 logs wuc-api`

---

**Deployment Complete! 🎉**

**Estimated Total Time:** 2-3 hours

**Your admission portal is now live at:**
- Frontend: https://apply.wuc.edu.gh
- API: https://api.apply.wuc.edu.gh
- Linked from: https://wuc.edu.gh
