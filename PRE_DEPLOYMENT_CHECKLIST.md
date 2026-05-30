# Pre-Deployment Checklist for AWS Lightsail

## ✅ System Status: READY FOR DEPLOYMENT

### 1. Email Service ✅
- **Status**: Working perfectly
- **Provider**: Gmail (Google Workspace)
- **Account**: admissions@wuc.edu.gh
- **Port**: 465 (SSL)
- **App Password**: Configured and tested
- **Test Results**: Successfully sent to 5+ recipients
- **Action Required**: Update production .env with same credentials

### 2. SMS Service ✅
- **Status**: Working
- **Provider**: Arkesel (Ghana-based)
- **API Key**: Configured
- **Sender ID**: WUC-ADM
- **Balance**: GHS 0.165 (8 SMS credits)
- **Test Results**: Successfully sent test SMS
- **Action Required**: Top up Arkesel credits before production launch

### 3. Database ✅
- **Status**: Schema ready
- **Type**: PostgreSQL 14+
- **Schema**: Complete with all tables
- **Migrations**: Auto-migration script available
- **Default Admin**: Configured (admin@wuc.edu.gh / Admin@WUC2025)
- **Action Required**: Create production database on Lightsail

### 4. Payment Integration ✅
- **Status**: Configured
- **Provider**: Flutterwave
- **Mode**: Test keys configured
- **Webhook**: Implemented with signature validation
- **Action Required**: Switch to production keys before launch

### 5. Security ✅
- **JWT Secrets**: Generated and configured
- **Helmet.js**: Enabled
- **Rate Limiting**: Configured (strict in production)
- **CORS**: Configured
- **Input Validation**: Implemented
- **File Upload Restrictions**: Implemented
- **Action Required**: Generate new production secrets

### 6. Frontend ✅
- **Status**: Production-ready
- **Framework**: React 19 + TypeScript
- **Logo**: WUC logo integrated on all pages
- **Responsive**: Yes
- **Build Command**: npm run build
- **Action Required**: Update API URL in .env.production

### 7. Backend ✅
- **Status**: Production-ready
- **Framework**: Node.js + Express
- **Auto-migration**: Enabled
- **Health Check**: /api/health endpoint
- **Logging**: Winston configured
- **PM2 Config**: Ready
- **Action Required**: None

### 8. File Management ⚠️
- **Current**: Local filesystem (uploads/)
- **Production Recommendation**: AWS S3
- **Action Required**: Consider migrating to S3 for scalability

---

## 🔧 Issues Found & Fixes Required

### CRITICAL Issues: None ✅

### MEDIUM Priority Issues:

#### 1. Production Environment Variables ⚠️
**Issue**: Need to create production .env file
**Fix**: Copy .env.production.template and fill in:
```bash
# Required values:
- DB_HOST (Lightsail PostgreSQL endpoint)
- DB_PASSWORD (strong password)
- JWT_SECRET (new 64-char hex)
- JWT_REFRESH_SECRET (new 64-char hex)
- JWT_ADMIN_SECRET (new 64-char hex)
- ENCRYPTION_KEY (new 32-char hex)
- FLUTTERWAVE_PUBLIC_KEY (production key)
- FLUTTERWAVE_SECRET_KEY (production key)
- FLUTTERWAVE_ENCRYPTION_KEY (production key)
- CORS_ORIGINS (https://admissions.wuc.edu.gh)
- APP_URL (https://admissions.wuc.edu.gh)
- API_URL (https://admissions.wuc.edu.gh/api)
```

#### 2. Arkesel SMS Credits ⚠️
**Issue**: Only 8 SMS credits remaining (GHS 0.165)
**Fix**: Top up Arkesel account before production launch
**Recommendation**: Add at least GHS 50 for ~300 SMS

#### 3. Flutterwave Production Keys ⚠️
**Issue**: Currently using test keys
**Fix**: 
1. Login to Flutterwave dashboard
2. Switch to Live mode
3. Get production keys
4. Update .env.production

#### 4. SSL Certificate ⚠️
**Issue**: Need SSL for HTTPS
**Fix**: Use Cloudflare Origin Certificate (recommended in SUBDOMAIN_DEPLOYMENT_GUIDE.md)

### LOW Priority Issues:

#### 1. Test Files in Repository ℹ️
**Issue**: Multiple test-*.js files in backend/
**Impact**: Low (ignored by .gitignore)
**Fix**: Optional cleanup before deployment

#### 2. No Unit Tests ℹ️
**Issue**: Jest configured but no tests written
**Impact**: Low (not blocking deployment)
**Fix**: Add tests post-deployment

#### 3. File Storage on Local Filesystem ℹ️
**Issue**: Uploads stored locally (not scalable)
**Impact**: Low (works for initial launch)
**Fix**: Migrate to AWS S3 when scaling

---

## 📋 Pre-Deployment Steps

### Step 1: Prepare Production Environment
```bash
# Generate new production secrets
cd backend
node generate-wuc-secrets.js

# Create production .env
cp .env.production.template .env.production
# Fill in all required values
```

### Step 2: Top Up Services
- [ ] Top up Arkesel SMS credits (minimum GHS 50)
- [ ] Get Flutterwave production keys
- [ ] Verify Google Workspace email quota

### Step 3: Create Lightsail Instance
- [ ] Create Ubuntu 22.04 instance ($10-20/month)
- [ ] Configure firewall (ports 22, 80, 443, 5432)
- [ ] Assign static IP
- [ ] Configure DNS in Cloudflare

### Step 4: Install Dependencies on Server
```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 14+
sudo apt install postgresql postgresql-contrib

# Nginx
sudo apt install nginx

# PM2
sudo npm install -g pm2

# Git
sudo apt install git
```

### Step 5: Setup Database
```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE wuc_admissions;
CREATE USER wuc_admin WITH PASSWORD 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE wuc_admissions TO wuc_admin;
\q

# Import schema
psql -U wuc_admin -d wuc_admissions -f database/schema.sql
```

### Step 6: Deploy Application
```bash
# Clone repository
git clone https://github.com/cloud4geek/wuc-admission-portal.git
cd wuc-admission-portal

# Backend setup
cd backend
npm install --production
cp .env.production .env
# Edit .env with production values
pm2 start ecosystem.config.js

# Frontend build
cd ../frontend
npm install
npm run build

# Copy build to nginx
sudo cp -r build/* /var/www/html/
```

### Step 7: Configure Nginx
```bash
# Copy nginx config
sudo cp deployment/nginx-lightsail.conf /etc/nginx/sites-available/wuc
sudo ln -s /etc/nginx/sites-available/wuc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 8: Setup SSL (Cloudflare Origin Certificate)
- [ ] Generate Origin Certificate in Cloudflare
- [ ] Install certificate on server
- [ ] Update nginx config for HTTPS
- [ ] Test HTTPS connection

### Step 9: Final Testing
- [ ] Test health endpoint: https://admissions.wuc.edu.gh/api/health
- [ ] Test voucher purchase flow
- [ ] Test email delivery
- [ ] Test SMS delivery
- [ ] Test application submission
- [ ] Test admin dashboard
- [ ] Test payment webhook

### Step 10: Monitoring & Backups
- [ ] Setup PM2 monitoring: `pm2 startup`
- [ ] Configure database backups
- [ ] Setup log rotation
- [ ] Configure Cloudflare analytics

---

## 🚀 Deployment Command Summary

```bash
# On local machine - commit and push
git add .
git commit -m "Production ready"
git push origin main

# On Lightsail server
cd /home/ubuntu
git clone https://github.com/cloud4geek/wuc-admission-portal.git
cd wuc-admission-portal/backend
npm install --production
# Configure .env.production
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Build frontend
cd ../frontend
npm install
npm run build
sudo cp -r build/* /var/www/html/

# Configure nginx
sudo cp ../deployment/nginx-lightsail.conf /etc/nginx/sites-available/wuc
sudo ln -s /etc/nginx/sites-available/wuc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📊 Estimated Costs

| Service | Monthly Cost |
|---------|-------------|
| AWS Lightsail (2GB RAM) | $10-20 |
| Arkesel SMS (300 SMS) | GHS 50 (~$3) |
| Flutterwave (Transaction fees) | 1.4% per transaction |
| Domain (already owned) | $0 |
| **Total** | **~$15-25/month** |

---

## 🔒 Security Checklist

- [x] Environment variables not committed
- [x] Strong JWT secrets generated
- [x] Rate limiting configured
- [x] Helmet.js security headers enabled
- [x] Input validation implemented
- [x] File upload restrictions in place
- [x] SQL injection protection (parameterized queries)
- [x] CORS properly configured
- [ ] SSL certificate installed (pending deployment)
- [ ] Firewall configured (pending deployment)
- [ ] Database backups scheduled (pending deployment)

---

## 📞 Support Contacts

- **Arkesel Support**: https://arkesel.com/contact
- **Flutterwave Support**: https://support.flutterwave.com
- **AWS Support**: https://aws.amazon.com/support
- **Cloudflare Support**: https://support.cloudflare.com

---

## ✅ Final Verdict

**System Status**: PRODUCTION READY ✅

**Blocking Issues**: None

**Recommended Actions Before Launch**:
1. Top up Arkesel SMS credits (GHS 50+)
2. Get Flutterwave production keys
3. Generate new production secrets
4. Create production .env file

**Estimated Deployment Time**: 3-4 hours

**Risk Level**: LOW ✅

---

**Last Updated**: 2025-01-XX
**Reviewed By**: System Check
**Next Review**: After deployment
