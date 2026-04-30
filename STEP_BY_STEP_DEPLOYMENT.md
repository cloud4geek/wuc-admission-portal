# WUC Admission Portal - Step-by-Step Production Deployment Guide

Follow these steps in order. Do not skip any step.

---

## PHASE 1: PRE-DEPLOYMENT PREPARATION (Local Machine)

### Step 1: Security Audit
**Time: 10 minutes**

```bash
# Run security audit
bash security-audit.sh
```

**Fix any critical issues found before proceeding.**

---

### Step 2: Generate New Secrets
**Time: 5 minutes**

Open terminal and generate new secrets:

```bash
# Generate JWT secrets (run 3 times for 3 different secrets)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate encryption keys (run 4 times)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save these values - you'll need them in Step 4.**

---

### Step 3: AWS Account Setup
**Time: 30 minutes**

#### 3.1 Create New IAM User
1. Go to AWS Console → IAM → Users → Add User
2. Username: `wuc-admission-app`
3. Access type: Programmatic access
4. Attach policies:
   - `AmazonSESFullAccess`
   - `AmazonSNSFullAccess`
   - `AmazonS3FullAccess`
5. Save Access Key ID and Secret Access Key

#### 3.2 Create S3 Bucket
1. Go to S3 → Create Bucket
2. Bucket name: `wuc-admissions-documents`
3. Region: `us-east-1`
4. Block all public access: ✅ Enabled
5. Create bucket

#### 3.3 Configure SES for Email
1. Go to SES → Verified Identities → Create Identity
2. Identity type: Domain
3. Domain: `wuc.edu.gh`
4. Follow DNS verification steps (add TXT records to your domain)
5. Request production access:
   - SES → Account Dashboard → Request production access
   - Fill form explaining your use case
   - Wait for approval (24-48 hours)

#### 3.4 Configure SNS for SMS
1. Go to SNS → Text messaging (SMS) → Sandbox destinations
2. Add phone numbers for testing
3. Request production access if needed

---

### Step 4: Create Production Environment File
**Time: 10 minutes**

```bash
cd backend
cp .env.production.template .env.production
```

Edit `backend/.env.production` with your values:

```env
# Application
NODE_ENV=production
PORT=5000

# CORS
CORS_ORIGINS=https://apply.wuc.edu.gh

# Database (you'll get these values in Step 7)
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=wuc_admissions
DB_USER=wuc_admin
DB_PASSWORD=STRONG_PASSWORD_HERE_MIN_16_CHARS
DB_SSL=true
DB_MAX_CONNECTIONS=50
DB_IDLE_TIMEOUT=30000

# JWT Secrets (use values from Step 2)
JWT_SECRET=paste_64_char_hex_here
JWT_REFRESH_SECRET=paste_64_char_hex_here
JWT_ADMIN_SECRET=paste_64_char_hex_here

# Encryption (use values from Step 2)
ENCRYPTION_KEY=paste_32_char_hex_here
SESSION_SECRET=paste_64_char_hex_here
RESET_TOKEN_SECRET=paste_64_char_hex_here
EMAIL_VERIFICATION_SECRET=paste_64_char_hex_here

# AWS (use values from Step 3.1)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=wuc-admissions-documents

# Email (AWS SES)
EMAIL_PROVIDER=ses
AWS_SES_REGION=us-east-1
SES_FROM_EMAIL=admissions@wuc.edu.gh
SES_REPLY_TO=admissions@wuc.edu.gh

# SMS (AWS SNS)
AWS_SNS_REGION=us-east-1
SMS_SENDER_ID=WUC-ADM

# Payment (get from Flutterwave dashboard)
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-...
FLUTTERWAVE_SECRET_KEY=FLWSECK-...
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK3-...
FLUTTERWAVE_SECRET_HASH=...

# URLs (update with your actual domains)
APP_URL=https://apply.wuc.edu.gh
API_URL=https://api.apply.wuc.edu.gh

# SSL
SSL_ENABLED=false  # We'll use nginx for SSL
```

**DO NOT commit this file to git!**

---

### Step 5: Flutterwave Production Setup
**Time: 15 minutes**

1. Login to Flutterwave Dashboard: https://dashboard.flutterwave.com
2. Switch to "Live" mode (top right)
3. Go to Settings → API Keys
4. Copy:
   - Public Key (starts with FLWPUBK-)
   - Secret Key (starts with FLWSECK-)
   - Encryption Key (starts with FLWSECK3-)
5. Go to Settings → Webhooks
6. Add webhook URL: `https://api.apply.wuc.edu.gh/api/webhooks/flutterwave`
7. Copy the Secret Hash
8. Update these values in `.env.production`

---

### Step 6: Test Local Build
**Time: 5 minutes**

```bash
# Test backend
cd backend
npm install
node -e "require('dotenv').config({path:'.env.production'}); console.log('✅ Env loaded')"

# Test frontend build
cd ../frontend
npm install
npm run build
```

**Fix any errors before proceeding.**

---

## PHASE 2: SERVER SETUP

### Step 7: Provision Production Server
**Time: 30 minutes**

**Option A: AWS EC2 (Recommended)**

1. Go to EC2 → Launch Instance
2. Choose Ubuntu 22.04 LTS
3. Instance type: t3.medium (2 vCPU, 4GB RAM minimum)
4. Configure security group:
   - SSH (22) - Your IP only
   - HTTP (80) - Anywhere
   - HTTPS (443) - Anywhere
   - PostgreSQL (5432) - Same VPC only
5. Create and download key pair
6. Launch instance
7. Note the public IP address

**Option B: DigitalOcean Droplet**

1. Create Droplet
2. Ubuntu 22.04 LTS
3. Size: 2GB RAM minimum
4. Add SSH key
5. Create
6. Note the IP address

---

### Step 8: Setup Production Database
**Time: 20 minutes**

**Option A: AWS RDS (Recommended)**

1. Go to RDS → Create Database
2. Engine: PostgreSQL 14+
3. Template: Production
4. DB instance identifier: `wuc-admissions-db`
5. Master username: `wuc_admin`
6. Master password: (use strong password from Step 4)
7. Instance class: db.t3.micro (can scale later)
8. Storage: 20GB SSD
9. Enable automated backups (7 days retention)
10. Create database
11. Wait for status: Available
12. Copy the endpoint URL
13. Update `DB_HOST` in `.env.production`

**Option B: Database on Same Server**

```bash
# SSH into server
ssh -i your-key.pem ubuntu@your-server-ip

# Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql

CREATE USER wuc_admin WITH PASSWORD 'your_strong_password';
CREATE DATABASE wuc_admissions OWNER wuc_admin;
GRANT ALL PRIVILEGES ON DATABASE wuc_admissions TO wuc_admin;
\q

# Update .env.production with:
# DB_HOST=localhost
# DB_USER=wuc_admin
# DB_PASSWORD=your_strong_password
```

---

### Step 9: Connect to Server
**Time: 5 minutes**

```bash
# SSH into your server
ssh -i your-key.pem ubuntu@your-server-ip

# Or if using password
ssh root@your-server-ip
```

---

### Step 10: Install Server Dependencies
**Time: 10 minutes**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install other dependencies
sudo apt install -y nginx certbot python3-certbot-nginx postgresql-client git

# Install PM2 globally
sudo npm install -g pm2

# Verify installations
node --version  # Should be v18.x
npm --version
pm2 --version
nginx -v
```

---

### Step 11: Setup Application Directory
**Time: 5 minutes**

```bash
# Create directory
sudo mkdir -p /var/www/wuc-admission-portal
sudo chown -R $USER:$USER /var/www/wuc-admission-portal

# Create log directory
sudo mkdir -p /var/log/wuc
sudo chown -R $USER:$USER /var/log/wuc
```

---

### Step 12: Deploy Application Files
**Time: 10 minutes**

**Option A: Using Git (Recommended)**

```bash
cd /var/www/wuc-admission-portal

# Clone repository (use your actual repo URL)
git clone https://github.com/your-org/wuc-admission-portal.git .

# Or if private repo
git clone git@github.com:your-org/wuc-admission-portal.git .
```

**Option B: Using SCP (from local machine)**

```bash
# From your local machine
cd /path/to/wuc-admission-portal

# Copy backend
scp -i your-key.pem -r backend ubuntu@your-server-ip:/var/www/wuc-admission-portal/

# Copy frontend build
scp -i your-key.pem -r frontend/build ubuntu@your-server-ip:/var/www/wuc-admission-portal/frontend/
```

---

### Step 13: Upload Environment File
**Time: 2 minutes**

**From your local machine:**

```bash
# Upload .env.production to server
scp -i your-key.pem backend/.env.production ubuntu@your-server-ip:/var/www/wuc-admission-portal/backend/.env
```

**Verify on server:**

```bash
# SSH into server
cd /var/www/wuc-admission-portal/backend
cat .env  # Should show production values
```

---

### Step 14: Install Backend Dependencies
**Time: 5 minutes**

```bash
cd /var/www/wuc-admission-portal/backend
npm install --production
```

---

### Step 15: Initialize Database
**Time: 5 minutes**

```bash
cd /var/www/wuc-admission-portal

# If using RDS
psql -h your-rds-endpoint.rds.amazonaws.com -U wuc_admin -d wuc_admissions -f database/schema.sql
psql -h your-rds-endpoint.rds.amazonaws.com -U wuc_admin -d wuc_admissions -f database/migration_v2.sql

# If using local PostgreSQL
psql -U wuc_admin -d wuc_admissions -f database/schema.sql
psql -U wuc_admin -d wuc_admissions -f database/migration_v2.sql

# Verify tables created
psql -h your-db-host -U wuc_admin -d wuc_admissions -c "\dt"
```

---

### Step 16: Create Upload Directories
**Time: 2 minutes**

```bash
cd /var/www/wuc-admission-portal/backend

mkdir -p uploads/{documents,photos,admission-letters,application-forms,templates}
chmod 755 uploads
chmod 755 uploads/*
```

---

### Step 17: Start Backend with PM2
**Time: 5 minutes**

```bash
cd /var/www/wuc-admission-portal/backend

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it outputs

# Check status
pm2 status
pm2 logs wuc-api --lines 20
```

**Expected output:** Application should be running on port 5000

---

### Step 18: Test Backend API
**Time: 2 minutes**

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Should return: {"status":"healthy","database":"connected",...}
```

**If you see errors, check logs:**
```bash
pm2 logs wuc-api
```

---

## PHASE 3: FRONTEND & SSL SETUP

### Step 19: Build Frontend
**Time: 5 minutes**

**On your local machine:**

```bash
cd frontend

# Update API URL in code
cat > src/config.ts <<EOF
export const API_URL = 'https://api.apply.wuc.edu.gh';
export const APP_URL = 'https://apply.wuc.edu.gh';
EOF

# Build
npm run build
```

---

### Step 20: Deploy Frontend
**Time: 5 minutes**

**Option A: Upload to Server**

```bash
# From local machine
scp -i your-key.pem -r frontend/build/* ubuntu@your-server-ip:/var/www/wuc-frontend/
```

**On server:**

```bash
sudo mkdir -p /var/www/wuc-frontend
sudo chown -R $USER:$USER /var/www/wuc-frontend
```

**Option B: Deploy to Vercel (Easier)**

```bash
cd frontend
npm install -g vercel
vercel --prod

# Follow prompts
# Set environment variable: REACT_APP_API_URL=https://api.apply.wuc.edu.gh
```

---

### Step 21: Configure DNS
**Time: 10 minutes**

Go to your domain registrar (e.g., GoDaddy, Namecheap) and add:

**A Records:**
- `apply.wuc.edu.gh` → Your server IP
- `api.apply.wuc.edu.gh` → Your server IP

**Wait 5-10 minutes for DNS propagation.**

Test:
```bash
ping apply.wuc.edu.gh
ping api.apply.wuc.edu.gh
```

---

### Step 22: Configure Nginx for Backend API
**Time: 5 minutes**

```bash
# On server
sudo nano /etc/nginx/sites-available/wuc-api
```

Paste this configuration:

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
    }
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/wuc-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### Step 23: Configure Nginx for Frontend
**Time: 5 minutes**

```bash
sudo nano /etc/nginx/sites-available/wuc-frontend
```

Paste the configuration from `nginx-frontend.conf` (without SSL parts for now).

```bash
sudo ln -s /etc/nginx/sites-available/wuc-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### Step 24: Install SSL Certificates
**Time: 10 minutes**

```bash
# Install SSL for API
sudo certbot --nginx -d api.apply.wuc.edu.gh

# Install SSL for Frontend
sudo certbot --nginx -d apply.wuc.edu.gh

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose: Redirect HTTP to HTTPS (option 2)
```

**Test auto-renewal:**
```bash
sudo certbot renew --dry-run
```

---

### Step 25: Test Production URLs
**Time: 5 minutes**

```bash
# Test API
curl https://api.apply.wuc.edu.gh/api/health

# Test Frontend (in browser)
# Open: https://apply.wuc.edu.gh
```

**Expected:** Both should load with valid SSL certificates (green padlock).

---

## PHASE 4: FINAL CONFIGURATION

### Step 26: Create Admin User
**Time: 3 minutes**

```bash
# Connect to database
psql -h your-db-host -U wuc_admin -d wuc_admissions

# Create admin user (update with real values)
INSERT INTO admin_users (username, email, password_hash, role, created_at)
VALUES (
  'admin',
  'admin@wuc.edu.gh',
  '$2b$10$...',  -- Generate with: node -e "console.log(require('bcrypt').hashSync('YourPassword123', 10))"
  'super_admin',
  NOW()
);

\q
```

**Generate password hash on server:**
```bash
node -e "console.log(require('bcrypt').hashSync('YourAdminPassword123', 10))"
```

---

### Step 27: Setup Database Backups
**Time: 5 minutes**

```bash
# Copy backup script to server
sudo cp /var/www/wuc-admission-portal/backup-database.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/backup-database.sh

# Create backup directory
sudo mkdir -p /var/backups/wuc-admissions

# Setup cron job (daily at 2 AM)
sudo crontab -e

# Add this line:
0 2 * * * DB_PASSWORD=your_db_password /usr/local/bin/backup-database.sh >> /var/log/wuc/backup.log 2>&1
```

---

### Step 28: Configure Firewall
**Time: 3 minutes**

```bash
# Enable firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

---

### Step 29: Setup Monitoring
**Time: 10 minutes**

```bash
# Install monitoring tools
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Setup monitoring dashboard (optional)
pm2 link your-pm2-key your-pm2-secret
```

---

### Step 30: Final Testing Checklist
**Time: 20 minutes**

Test each feature:

- [ ] **Homepage loads:** https://apply.wuc.edu.gh
- [ ] **API health check:** https://api.apply.wuc.edu.gh/api/health
- [ ] **Purchase voucher** (use test payment)
- [ ] **Receive voucher email**
- [ ] **Receive voucher SMS**
- [ ] **Submit application**
- [ ] **Upload documents**
- [ ] **Check application status**
- [ ] **Admin login:** https://apply.wuc.edu.gh/admin
- [ ] **Approve application**
- [ ] **Generate admission letter**
- [ ] **Download admission letter**

---

## PHASE 5: GO LIVE

### Step 31: Announce Launch
**Time: Variable**

1. Send email to stakeholders
2. Update main website with link
3. Post on social media
4. Train admin staff

---

### Step 32: Monitor First 24 Hours
**Time: Ongoing**

```bash
# Watch logs continuously
pm2 logs wuc-api --lines 100

# Monitor resources
pm2 monit

# Check for errors
tail -f /var/log/nginx/error.log
```

---

## TROUBLESHOOTING

### Backend won't start
```bash
pm2 logs wuc-api
# Check for database connection errors
# Verify .env file exists and has correct values
```

### Database connection failed
```bash
# Test connection
psql -h your-db-host -U wuc_admin -d wuc_admissions

# Check security group allows connection
# Verify DB_HOST, DB_USER, DB_PASSWORD in .env
```

### SSL certificate error
```bash
# Check certificate status
sudo certbot certificates

# Renew if needed
sudo certbot renew
```

### Frontend not loading
```bash
# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Verify files exist
ls -la /var/www/wuc-frontend/

# Test nginx config
sudo nginx -t
```

---

## EMERGENCY CONTACTS

- **Technical Lead:** [Your contact]
- **AWS Support:** https://console.aws.amazon.com/support
- **Flutterwave Support:** support@flutterwave.com
- **Domain Registrar:** [Your registrar support]

---

## NEXT STEPS AFTER DEPLOYMENT

1. Monitor application for 48 hours
2. Set up automated testing
3. Create staging environment
4. Document any issues encountered
5. Train additional admin users
6. Plan for scaling (if needed)

---

**Deployment Complete! 🎉**

**Estimated Total Time:** 4-6 hours

**Last Updated:** 2024
