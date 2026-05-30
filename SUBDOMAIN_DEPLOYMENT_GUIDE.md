# WUC Admission Portal - Subdomain Deployment Guide
## Deploy to admissions.wuc.edu.gh

**Estimated Time:** 3-4 hours  
**Cost:** $10-20/month (Lightsail instance)

---

## Architecture Overview

```
wuc.edu.gh (WordPress)          admissions.wuc.edu.gh (Admission Portal)
        ↓                                      ↓
Lightsail Instance 1                  Lightsail Instance 2
(Existing WordPress)                  (New - React + Node.js)
        ↓                                      ↓
        └──────────── Cloudflare DNS ─────────┘
                    (SSL + CDN + DDoS)
```

---

## Phase 1: Create New Lightsail Instance (30 mins)

### Step 1: Launch Lightsail Instance

1. Go to: https://lightsail.aws.amazon.com/
2. Click **Create instance**
3. Select:
   - **Region:** Same as your WordPress instance (for lower latency)
   - **Platform:** Linux/Unix
   - **Blueprint:** OS Only → **Ubuntu 22.04 LTS**
   - **Plan:** $10/month (2GB RAM, 1 vCPU, 60GB SSD) - Minimum
   - **Plan:** $20/month (4GB RAM, 2 vCPU, 80GB SSD) - Recommended for production
4. **Instance name:** `wuc-admission-portal`
5. Click **Create instance**
6. Wait 2-3 minutes for instance to start

### Step 2: Attach Static IP

1. Go to **Networking** tab
2. Click **Create static IP**
3. Select instance: `wuc-admission-portal`
4. Name: `wuc-admission-portal-ip`
5. Click **Create**
6. **Copy the static IP** (e.g., `18.XXX.XXX.XXX`)

### Step 3: Configure Firewall

1. Go to **Networking** tab
2. Click **Add rule** for each:
   ```
   Application: Custom
   Protocol: TCP
   Port: 80
   
   Application: Custom
   Protocol: TCP
   Port: 443
   
   Application: Custom
   Protocol: TCP
   Port: 5000 (API)
   ```
3. Click **Create**

---

## Phase 2: Configure Cloudflare DNS (10 mins)

### Step 1: Add DNS Record

1. Login to Cloudflare: https://dash.cloudflare.com/
2. Select domain: **wuc.edu.gh**
3. Go to **DNS** → **Records**
4. Click **Add record**
5. Configure:
   ```
   Type: A
   Name: admissions
   IPv4 address: <your-lightsail-static-ip>
   Proxy status: Proxied (orange cloud ON)
   TTL: Auto
   ```
6. Click **Save**

### Step 2: Configure SSL/TLS

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode: **Full (strict)**
3. Go to **SSL/TLS** → **Edge Certificates**
4. Enable:
   - ✅ Always Use HTTPS
   - ✅ Automatic HTTPS Rewrites
   - ✅ Minimum TLS Version: 1.2

### Step 3: Verify DNS Propagation

```bash
# Wait 2-5 minutes, then test:
nslookup admissions.wuc.edu.gh
# Should return your Lightsail static IP
```

---

## Phase 3: Server Setup (45 mins)

### Step 1: Connect to Instance

1. Go to Lightsail console
2. Click on `wuc-admission-portal`
3. Click **Connect using SSH** (browser-based)

### Step 2: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 3: Install Node.js 18

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v18.x
npm --version
```

### Step 4: Install PostgreSQL 14

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 5: Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 6: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### Step 7: Install Certbot (SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## Phase 4: Database Setup (15 mins)

### Step 1: Create Database User

```bash
sudo -u postgres psql
```

```sql
-- Create user
CREATE USER wuc_admin WITH PASSWORD 'CHANGE_THIS_PASSWORD_123!';

-- Create database
CREATE DATABASE wuc_admissions OWNER wuc_admin;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE wuc_admissions TO wuc_admin;

-- Exit
\q
```

### Step 2: Configure PostgreSQL for Remote Access (Optional)

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Find and change:
```
listen_addresses = 'localhost'
```

```bash
sudo systemctl restart postgresql
```

### Step 3: Test Connection

```bash
psql -U wuc_admin -d wuc_admissions -h localhost
# Enter password when prompted
\q
```

---

## Phase 5: Deploy Application (60 mins)

### Step 1: Create Application Directory

```bash
sudo mkdir -p /var/www/wuc-admission-portal
sudo chown -R ubuntu:ubuntu /var/www/wuc-admission-portal
cd /var/www/wuc-admission-portal
```

### Step 2: Clone Repository

```bash
git clone https://github.com/cloud4geek/wuc-admission-portal.git .
```

### Step 3: Setup Backend

```bash
cd backend
npm install --production
```

### Step 4: Create Production .env

```bash
nano .env
```

Paste and update:
```env
# Application
NODE_ENV=production
PORT=5000

# JWT Secrets (GENERATE NEW ONES!)
JWT_SECRET=GENERATE_NEW_SECRET_HERE
JWT_REFRESH_SECRET=GENERATE_NEW_SECRET_HERE
JWT_ADMIN_SECRET=GENERATE_NEW_SECRET_HERE

# Encryption
ENCRYPTION_KEY=GENERATE_NEW_KEY_HERE
SESSION_SECRET=GENERATE_NEW_SECRET_HERE

# Token Secrets
RESET_TOKEN_SECRET=GENERATE_NEW_SECRET_HERE
EMAIL_VERIFICATION_SECRET=GENERATE_NEW_SECRET_HERE

# CORS
CORS_ORIGINS=https://admissions.wuc.edu.gh

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wuc_admissions
DB_USER=wuc_admin
DB_PASSWORD=YOUR_DATABASE_PASSWORD
DB_SSL=false
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000

# Email (Gmail)
GMAIL_USER=cloud4geek@gmail.com
GMAIL_APP_PASSWORD=oewgbfvfsblhnbzo

# SMS (Arkesel)
ARKESEL_API_KEY=S3JTbGZydmpndUV2a0Cvek9vSnk
SMS_SENDER_ID=WUC-ADM

# Payment (Flutterwave - PRODUCTION KEYS!)
FLUTTERWAVE_PUBLIC_KEY=YOUR_PRODUCTION_PUBLIC_KEY
FLUTTERWAVE_SECRET_KEY=YOUR_PRODUCTION_SECRET_KEY
FLUTTERWAVE_ENCRYPTION_KEY=YOUR_PRODUCTION_ENCRYPTION_KEY
FLUTTERWAVE_SECRET_HASH=YOUR_WEBHOOK_SECRET

# URLs
APP_URL=https://admissions.wuc.edu.gh
API_URL=https://admissions.wuc.edu.gh/api

# SSL
SSL_ENABLED=false
```

Save: `Ctrl+X`, `Y`, `Enter`

### Step 5: Initialize Database

```bash
psql -U wuc_admin -d wuc_admissions -h localhost -f ../database/schema.sql
# Enter password when prompted
```

### Step 6: Start Backend with PM2

```bash
pm2 start server.js --name wuc-api
pm2 save
pm2 startup
# Copy and run the command it outputs
```

### Step 7: Build Frontend

```bash
cd ../frontend
npm install
```

Update API URL:
```bash
nano src/config.js
```

Change to:
```javascript
export const API_URL = 'https://admissions.wuc.edu.gh/api';
```

Build:
```bash
npm run build
```

### Step 8: Move Build to Nginx Directory

```bash
sudo rm -rf /var/www/html/*
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
```

---

## Phase 6: Configure Nginx (30 mins)

### Step 1: Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/wuc-admission-portal
```

Paste:
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name admissions.wuc.edu.gh;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name admissions.wuc.edu.gh;

    # SSL Configuration (Cloudflare Origin Certificate)
    ssl_certificate /etc/ssl/certs/cloudflare-origin.pem;
    ssl_certificate_key /etc/ssl/private/cloudflare-origin.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Root directory
    root /var/www/html;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;

    # API Proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React Router - SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # File upload size limit
    client_max_body_size 10M;
}
```

Save: `Ctrl+X`, `Y`, `Enter`

### Step 2: Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/wuc-admission-portal /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## Phase 7: SSL Certificate Setup (20 mins)

### Option A: Cloudflare Origin Certificate (Recommended)

1. Go to Cloudflare Dashboard → **SSL/TLS** → **Origin Server**
2. Click **Create Certificate**
3. Select:
   - Private key type: RSA (2048)
   - Hostnames: `admissions.wuc.edu.gh`, `*.wuc.edu.gh`
   - Validity: 15 years
4. Click **Create**
5. Copy **Origin Certificate** and **Private Key**

On server:
```bash
sudo nano /etc/ssl/certs/cloudflare-origin.pem
# Paste Origin Certificate
# Save: Ctrl+X, Y, Enter

sudo nano /etc/ssl/private/cloudflare-origin.key
# Paste Private Key
# Save: Ctrl+X, Y, Enter

sudo chmod 600 /etc/ssl/private/cloudflare-origin.key
sudo systemctl restart nginx
```

### Option B: Let's Encrypt (Alternative)

```bash
sudo certbot --nginx -d admissions.wuc.edu.gh
# Follow prompts
# Select: Redirect HTTP to HTTPS
```

---

## Phase 8: Link from WordPress Site (15 mins)

### Method 1: Add Menu Item

1. Login to WordPress admin: https://wuc.edu.gh/wp-admin
2. Go to **Appearance** → **Menus**
3. Click **Custom Links**
4. Add:
   - URL: `https://admissions.wuc.edu.gh`
   - Link Text: `Apply Now` or `Admissions Portal`
5. Click **Add to Menu**
6. Click **Save Menu**

### Method 2: Add Button to Homepage

Edit homepage and add:
```html
<a href="https://admissions.wuc.edu.gh" class="btn btn-primary" style="background: #003366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
    🎓 Apply for Admission
</a>
```

### Method 3: Add Widget

1. Go to **Appearance** → **Widgets**
2. Add **Custom HTML** widget
3. Paste:
```html
<div style="text-align: center; padding: 20px; background: #f0f0f0; border-radius: 8px;">
    <h3>Start Your Application</h3>
    <p>Apply for admission to Withrow University College</p>
    <a href="https://admissions.wuc.edu.gh" style="background: #003366; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Apply Now →</a>
</div>
```

---

## Phase 9: Testing & Verification (30 mins)

### Step 1: Test DNS Resolution

```bash
nslookup admissions.wuc.edu.gh
ping admissions.wuc.edu.gh
```

### Step 2: Test SSL Certificate

Visit: https://www.ssllabs.com/ssltest/analyze.html?d=admissions.wuc.edu.gh

Should get **A** or **A+** rating

### Step 3: Test Application

1. **Homepage:** https://admissions.wuc.edu.gh
2. **Voucher Purchase:** https://admissions.wuc.edu.gh/voucher-purchase
3. **Application Form:** https://admissions.wuc.edu.gh/apply
4. **Status Check:** https://admissions.wuc.edu.gh/application-status
5. **Admin Login:** https://admissions.wuc.edu.gh/admin

### Step 4: Test API Endpoints

```bash
curl https://admissions.wuc.edu.gh/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Step 5: Test Email & SMS

1. Purchase a test voucher
2. Verify email received
3. Verify SMS received

### Step 6: Test Payment (Sandbox)

1. Use Flutterwave test cards
2. Verify payment flow
3. Check webhook delivery

---

## Phase 10: Monitoring & Maintenance

### Setup PM2 Monitoring

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### View Logs

```bash
# Backend logs
pm2 logs wuc-api

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Setup Automated Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-wuc-db.sh
```

Paste:
```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U wuc_admin -h localhost wuc_admissions > $BACKUP_DIR/wuc_db_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "wuc_db_*.sql" -mtime +7 -delete

echo "Backup completed: wuc_db_$DATE.sql"
```

Make executable:
```bash
sudo chmod +x /usr/local/bin/backup-wuc-db.sh
```

Setup cron job:
```bash
crontab -e
```

Add:
```
0 2 * * * /usr/local/bin/backup-wuc-db.sh >> /var/log/wuc-backup.log 2>&1
```

---

## Troubleshooting

### Issue: 502 Bad Gateway

```bash
# Check backend is running
pm2 status
pm2 restart wuc-api

# Check nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Issue: Database Connection Failed

```bash
# Check PostgreSQL
sudo systemctl status postgresql
sudo systemctl restart postgresql

# Test connection
psql -U wuc_admin -d wuc_admissions -h localhost
```

### Issue: SSL Certificate Error

```bash
# Check certificate files
sudo ls -la /etc/ssl/certs/cloudflare-origin.pem
sudo ls -la /etc/ssl/private/cloudflare-origin.key

# Restart nginx
sudo systemctl restart nginx
```

### Issue: Email Not Sending

```bash
# Check backend logs
pm2 logs wuc-api

# Test SMTP connectivity
telnet smtp.gmail.com 465
```

---

## Security Checklist

- [ ] Changed all default passwords
- [ ] Generated new JWT secrets
- [ ] Enabled Cloudflare proxy (orange cloud)
- [ ] SSL/TLS set to "Full (strict)"
- [ ] Firewall rules configured
- [ ] Database not exposed to internet
- [ ] .env file permissions: 600
- [ ] PM2 running as non-root user
- [ ] Nginx security headers enabled
- [ ] Rate limiting configured (Cloudflare)
- [ ] Automated backups enabled
- [ ] Monitoring setup

---

## Performance Optimization

### Enable Cloudflare Caching

1. Go to Cloudflare → **Caching** → **Configuration**
2. Set **Caching Level:** Standard
3. Enable **Auto Minify:** HTML, CSS, JavaScript
4. Enable **Brotli** compression

### Enable Cloudflare Argo (Optional - $5/month)

Reduces latency by 30% on average

---

## Cost Breakdown

| Service | Cost |
|---------|------|
| Lightsail Instance ($20/month plan) | $20/month |
| Cloudflare DNS + SSL | Free |
| Domain (already owned) | $0 |
| **Total** | **$20/month** |

---

## Support & Maintenance

**Monthly Tasks:**
- Check Arkesel SMS credits
- Review error logs
- Update dependencies
- Test backup restoration

**Quarterly Tasks:**
- Security audit
- Performance review
- Update Node.js/PostgreSQL
- Review Cloudflare analytics

---

## Next Steps After Deployment

1. ✅ Test all features thoroughly
2. ✅ Train admin staff
3. ✅ Update WordPress site with admission link
4. ✅ Announce portal to students
5. ✅ Monitor first week closely
6. ✅ Collect feedback and iterate

---

## Emergency Contacts

- **Lightsail Support:** AWS Support Console
- **Cloudflare Support:** https://support.cloudflare.com
- **Developer:** cloud4geek@gmail.com

---

**Deployment Complete! 🎉**

Your admission portal is now live at: **https://admissions.wuc.edu.gh**
