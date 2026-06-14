# Production Launch Checklist

## ✅ Pre-Launch (Do These First)

### 1. Database Setup
```bash
# Create production database
createdb wuc_admissions_prod

# Run schema
psql -d wuc_admissions_prod -f database/schema.sql

# Verify tables created
psql -d wuc_admissions_prod -c "\dt"
# Should see 15 tables
```

### 2. Environment Variables
```bash
cd backend
cp .env.example .env
nano .env  # or use your preferred editor
```

**Required values:**
```env
# Database
DB_HOST=localhost  # or RDS endpoint
DB_PASSWORD=<strong-password>

# Paystack
PAYSTACK_SECRET_KEY=sk_live_<your-key>

# Gmail
GMAIL_USER=admissions@wuc.edu.gh
GMAIL_APP_PASSWORD=<16-char-app-password>

# SMS
SMSONLINEGH_API_KEY=<your-api-key>
SMS_SENDER_ID=WUC

# URLs
APP_URL=https://apply.wuc.edu.gh
CORS_ORIGINS=https://apply.wuc.edu.gh
```

### 3. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

## 🧪 Testing (Verify Everything Works)

### 1. Start Services
```bash
# Terminal 1: Backend
cd backend
npm start
# Should see: ✅ WUC API running on port 5000

# Terminal 2: Frontend
cd frontend
npm start
# Browser opens at http://localhost:3000
```

### 2. Test Flow
1. **Buy Voucher**
   - Go to "Purchase Voucher"
   - Fill form
   - Select payment method (MTN/Telecel/Card)
   - Complete payment
   - ✅ Should receive voucher code via email & SMS

2. **Apply**
   - Go to "Apply Now" (Regular or Top-Up)
   - Enter voucher code
   - Fill all sections
   - Upload documents
   - Submit
   - ✅ Should receive confirmation email & SMS

3. **Check Status**
   - Go to "Check Status"
   - Search by application ID, email, or voucher
   - ✅ Should see application details

4. **Admin Approval**
   - Go to http://localhost:3000/admin/login
   - Login: admin / Admin@WUC2025
   - View application
   - Click "Approve"
   - ✅ Admission letter should generate
   - ✅ Applicant receives email with download link

5. **Download Letter**
   - Applicant checks status page
   - Click "Download Admission Letter"
   - ✅ PDF downloads successfully

---

## 🚀 Deployment

### Option 1: Quick Deploy (Vercel + Railway)
**Frontend (Vercel):**
```bash
cd frontend
npm install -g vercel
vercel login
vercel
# Follow prompts, deploy to production
```

**Backend (Railway):**
1. Go to railway.app
2. "New Project" → "Deploy from GitHub"
3. Select your repository
4. Add environment variables
5. Deploy!

### Option 2: Self-Hosted (Ubuntu Server)
```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Install PostgreSQL
sudo apt install postgresql

# 3. Install PM2
sudo npm install -g pm2

# 4. Clone repository
git clone <your-repo-url>
cd wuc-admission-portal

# 5. Setup backend
cd backend
npm install
pm2 start server.js --name wuc-api
pm2 save
pm2 startup

# 6. Setup frontend (build)
cd ../frontend
npm install
npm run build

# 7. Install nginx
sudo apt install nginx

# 8. Configure nginx
sudo nano /etc/nginx/sites-available/wuc
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name apply.wuc.edu.gh;

    # Frontend
    location / {
        root /var/www/wuc-admission-portal/frontend/build;
        try_files $uri /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/wuc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install SSL (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d apply.wuc.edu.gh
```

---

## 📧 Email Setup

### Option 1: Gmail (Easiest)
1. Go to https://myaccount.google.com/security
2. Enable 2-Factor Authentication
3. Go to "App Passwords"
4. Generate password for "Mail"
5. Copy 16-character password
6. Add to `.env`:
```env
GMAIL_USER=admissions@wuc.edu.gh
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

### Option 2: AWS SES (Production)
```bash
cd backend
node setup-aws-ses.sh
# Follow prompts to verify domain
```

---

## 📱 SMS Setup

### SMSOnlineGH
1. Go to https://portal.smsonlinegh.com/register
2. Create account
3. Buy credits (GHS 50+ recommended)
4. Get API key from dashboard
5. Register Sender ID "WUC" (approval takes 1-2 days)
6. Add to `.env`:
```env
SMSONLINEGH_API_KEY=your-api-key
SMS_SENDER_ID=WUC
```

---

## 💳 Payment Setup

### Paystack
1. Go to https://paystack.com/signup
2. Complete business verification
3. Go to Settings → API Keys & Webhooks
4. Copy "Live Secret Key"
5. Add to `.env`:
```env
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
```
6. Set webhook URL: `https://api.wuc.edu.gh/api/webhooks/paystack`
7. Request "Go Live" (submit business docs)

---

## 🔐 Security Checklist

- [ ] Change default admin password
  ```sql
  -- In psql
  UPDATE admin_users 
  SET password_hash = '$2a$10$<new-bcrypt-hash>'
  WHERE username = 'admin';
  ```

- [ ] Generate new JWT secrets
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] Set strong database password

- [ ] Enable SSL/HTTPS

- [ ] Configure firewall (allow 80, 443, 5432 only)

- [ ] Set NODE_ENV=production

- [ ] Restrict CORS to production domain only

---

## 📊 Monitoring Setup

### Basic Monitoring
```bash
# Check if API is running
curl https://api.wuc.edu.gh/api/health

# Check PM2 status
pm2 status

# View logs
pm2 logs wuc-api

# Monitor database
psql -d wuc_admissions_prod -c "SELECT COUNT(*) FROM applications;"
```

### Advanced Monitoring (Optional)
1. **Sentry** (error tracking)
   - Sign up at sentry.io
   - Install: `npm install @sentry/node`
   - Add to `server.js`

2. **UptimeRobot** (uptime monitoring)
   - Sign up at uptimerobot.com
   - Add monitor for https://api.wuc.edu.gh/api/health

3. **CloudWatch** (AWS metrics)
   - Enable in AWS Console for RDS + EC2

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check logs
npm start
# Look for error messages

# Common issues:
# 1. Database connection failed
#    → Verify DB_HOST, DB_PASSWORD in .env
# 2. Port 5000 in use
#    → Change PORT in .env
# 3. Missing dependencies
#    → Run: npm install
```

### Frontend build fails
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Payment not working
```bash
# Check Paystack logs in dashboard
# Verify webhook URL is correct
# Test with Paystack test cards first
```

### Emails not sending
```bash
# Test email config
cd backend
node test-email.js
# Check for error messages
```

### SMS not sending
```bash
# Test SMS config
cd backend
node test-sms.js
# Check credit balance in SMS portal
```

---

## ✅ Launch Day Checklist

- [ ] Database backup created
- [ ] All services tested (payment, email, SMS)
- [ ] SSL certificate installed and working
- [ ] Admin accounts created
- [ ] Default password changed
- [ ] Monitoring setup
- [ ] Error tracking enabled
- [ ] Team trained on admin dashboard
- [ ] Applicant guide published
- [ ] Support email active (admissions@wuc.edu.gh)
- [ ] Test application submitted and approved
- [ ] Admission letter downloaded successfully

---

## 📞 Support Contacts

**Technical Issues:**
- Developer: [Your contact]
- Database: [DBA contact]
- Hosting: [Provider support]

**Service Issues:**
- Paystack: support@paystack.com
- SMS: support@smsonlinegh.com
- Email: Google Workspace support

**Emergency:**
- Server down: [On-call contact]
- Payment issues: [Finance contact]
- Database corruption: [Backup admin]

---

## 🎉 Post-Launch

### Day 1-7
- [ ] Monitor logs daily
- [ ] Check email/SMS delivery
- [ ] Verify payments processing
- [ ] Review application submissions
- [ ] Respond to support emails

### Week 2-4
- [ ] Review analytics (applications/day)
- [ ] Optimize slow queries
- [ ] Update documentation based on feedback
- [ ] Train additional admin users
- [ ] Plan for peak enrollment period

---

**Last Updated:** 2025-01-18
**Status:** Ready for Production Launch 🚀
