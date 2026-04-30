# WUC Admission Portal - Production Deployment Checklist

## 🔴 CRITICAL - Must Do Before Production

### 1. Security & Secrets
- [ ] **Rotate ALL secrets in `.env`** (JWT, encryption keys, AWS keys)
- [ ] **Generate new AWS IAM credentials** (current ones exposed in git history)
- [ ] **Set strong database password** (not `wuc123`)
- [ ] **Add Flutterwave production keys** (replace test keys)
- [ ] **Add Flutterwave webhook secret hash**
- [ ] **Remove test files from git history** (test-db-connection.js, etc.)
- [ ] **Verify `.gitignore` is working** - no `.env` files in git

### 2. Database
- [ ] **Create production database** on AWS RDS or similar
- [ ] **Run schema.sql** to initialize tables
- [ ] **Run migration_v2.sql** for latest updates
- [ ] **Create database backups schedule** (daily recommended)
- [ ] **Set up connection pooling** (already configured, verify limits)
- [ ] **Enable SSL for database connection** (set `DB_SSL=true`)

### 3. AWS Services Setup
- [ ] **AWS SES**: Verify domain `wuc.edu.gh` for email sending
- [ ] **AWS SES**: Move out of sandbox mode (request production access)
- [ ] **AWS SNS**: Configure for SMS sending
- [ ] **AWS S3**: Create bucket `wuc-admissions-documents`
- [ ] **AWS S3**: Set proper bucket policies (private, signed URLs)
- [ ] **AWS IAM**: Create dedicated user with minimal permissions
- [ ] **AWS CloudWatch**: Set up logging and monitoring

### 4. Payment Gateway
- [ ] **Flutterwave**: Switch to production keys
- [ ] **Flutterwave**: Configure webhook URL: `https://api.wuc.edu.gh/api/webhooks/flutterwave`
- [ ] **Flutterwave**: Test live payment flow
- [ ] **Flutterwave**: Set up payment reconciliation process

### 5. Email & SMS
- [ ] **Test email delivery** with production SES
- [ ] **Test SMS delivery** with production SNS
- [ ] **Verify sender ID** `WUC-ADM` is approved
- [ ] **Set up email templates** in SES (optional)
- [ ] **Configure bounce/complaint handling**

### 6. SSL/HTTPS
- [ ] **Obtain SSL certificate** (Let's Encrypt or AWS Certificate Manager)
- [ ] **Configure SSL in server** or use reverse proxy (nginx)
- [ ] **Update APP_URL** to `https://apply.wuc.edu.gh`
- [ ] **Update API_URL** to `https://api.apply.wuc.edu.gh`
- [ ] **Force HTTPS redirect** in production

### 7. Frontend Configuration
- [ ] **Update API endpoint** in frontend to production URL
- [ ] **Build production bundle**: `npm run build`
- [ ] **Test production build locally**
- [ ] **Configure CORS_ORIGINS** to production domain only
- [ ] **Remove console.logs** from production code

### 8. File Storage
- [ ] **Move uploads to AWS S3** (recommended for production)
- [ ] **Update file upload paths** to use S3
- [ ] **Set up S3 lifecycle policies** (archive old files)
- [ ] **Configure CDN** (CloudFront) for faster delivery

### 9. Server Configuration
- [ ] **Set NODE_ENV=production**
- [ ] **Configure process manager** (PM2 recommended)
- [ ] **Set up auto-restart** on crash
- [ ] **Configure log rotation**
- [ ] **Set up firewall rules** (allow 80, 443, 5432 only)
- [ ] **Disable unnecessary ports**

### 10. Monitoring & Logging
- [ ] **Set up error tracking** (Sentry or similar)
- [ ] **Configure CloudWatch alarms** (CPU, memory, errors)
- [ ] **Set up uptime monitoring** (Pingdom, UptimeRobot)
- [ ] **Create admin notification system** for critical errors
- [ ] **Set up database query monitoring**

### 11. Testing
- [ ] **Test voucher purchase flow** (all payment methods)
- [ ] **Test application submission** (all document types)
- [ ] **Test admin approval workflow**
- [ ] **Test admission letter generation**
- [ ] **Test email/SMS delivery**
- [ ] **Load test API endpoints** (simulate 100+ concurrent users)
- [ ] **Test on mobile devices**
- [ ] **Test with slow internet connection**

### 12. Documentation
- [ ] **Update README.md** with production setup
- [ ] **Document API endpoints** (Swagger/Postman)
- [ ] **Create admin user guide**
- [ ] **Create applicant user guide**
- [ ] **Document backup/restore procedures**
- [ ] **Create incident response plan**

### 13. Legal & Compliance
- [ ] **Add Privacy Policy** page
- [ ] **Add Terms & Conditions** page
- [ ] **GDPR compliance** (if applicable)
- [ ] **Data retention policy**
- [ ] **Cookie consent** (if using analytics)

### 14. Backup & Recovery
- [ ] **Test database backup** and restore
- [ ] **Set up automated backups** (daily)
- [ ] **Store backups offsite** (different region)
- [ ] **Document recovery procedures**
- [ ] **Test disaster recovery plan**

### 15. Performance Optimization
- [ ] **Enable gzip compression**
- [ ] **Optimize images** (compress logo, photos)
- [ ] **Enable caching** (Redis recommended)
- [ ] **Minify CSS/JS** (already done in build)
- [ ] **Set up CDN** for static assets

---

## 🟡 RECOMMENDED - Should Do

- [ ] Set up staging environment (test before production)
- [ ] Configure rate limiting per IP (already configured, verify)
- [ ] Add application analytics (Google Analytics)
- [ ] Set up A/B testing for conversion optimization
- [ ] Create admin training materials
- [ ] Set up automated testing (Jest, Cypress)
- [ ] Configure database read replicas (for scaling)
- [ ] Add multi-language support (if needed)
- [ ] Set up automated security scanning
- [ ] Create API documentation portal

---

## 🟢 NICE TO HAVE - Future Enhancements

- [ ] Mobile app (React Native)
- [ ] WhatsApp notifications
- [ ] Bulk SMS for admission updates
- [ ] Online interview scheduling
- [ ] Payment installment plans
- [ ] Referral program
- [ ] Alumni portal integration
- [ ] Student portal after admission

---

## Quick Commands

### Generate New Secrets
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Build Frontend
```bash
cd frontend
npm run build
```

### Start Backend with PM2
```bash
cd backend
pm2 start server.js --name wuc-api
pm2 save
pm2 startup
```

### Database Backup
```bash
pg_dump -U wuc_admin -d wuc_admissions > backup_$(date +%Y%m%d).sql
```

### Check Server Health
```bash
curl https://api.wuc.edu.gh/api/health
```

---

## Environment Variables Checklist

**Backend `.env` must have:**
- ✅ All JWT secrets (3 different ones)
- ✅ Database credentials (production)
- ✅ AWS credentials (new, not exposed)
- ✅ Flutterwave production keys
- ✅ Flutterwave webhook secret
- ✅ SES email configuration
- ✅ SNS SMS configuration
- ✅ Production URLs (HTTPS)
- ✅ NODE_ENV=production
- ✅ CORS_ORIGINS (production domain only)

---

## Post-Deployment

- [ ] Monitor logs for first 24 hours
- [ ] Test all features in production
- [ ] Verify email/SMS delivery
- [ ] Check payment processing
- [ ] Monitor database performance
- [ ] Review error logs
- [ ] Test backup restoration
- [ ] Update DNS records (if needed)
- [ ] Announce launch to stakeholders
- [ ] Train admin users

---

## Emergency Contacts

- **Database Issues**: [DBA contact]
- **AWS Issues**: [AWS admin contact]
- **Payment Issues**: Flutterwave support
- **Email Issues**: AWS SES support
- **Server Issues**: [Hosting provider]

---

**Last Updated**: 2024
**Deployment Target**: Q2 2024
