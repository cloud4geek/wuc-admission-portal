# WUC Admission Portal - Production Operations Guide

## Quick Commands Reference

### Server Management

**Check API Status**
```bash
curl https://api.apply.wuc.edu.gh/api/health
pm2 status
```

**View Logs**
```bash
pm2 logs wuc-api
pm2 logs wuc-api --lines 100
tail -f /var/log/wuc/api-error.log
```

**Restart Server**
```bash
pm2 restart wuc-api
pm2 reload wuc-api  # Zero-downtime reload
```

**Stop/Start Server**
```bash
pm2 stop wuc-api
pm2 start wuc-api
```

**Monitor Resources**
```bash
pm2 monit
htop
```

### Database Operations

**Connect to Database**
```bash
psql -h localhost -U wuc_admin -d wuc_admissions
```

**Backup Database**
```bash
./backup-database.sh
# Or manually:
pg_dump -U wuc_admin -d wuc_admissions > backup_$(date +%Y%m%d).sql
```

**Restore Database**
```bash
psql -U wuc_admin -d wuc_admissions < backup_20240101.sql
```

**Check Database Size**
```sql
SELECT pg_size_pretty(pg_database_size('wuc_admissions'));
```

**View Active Connections**
```sql
SELECT * FROM pg_stat_activity WHERE datname = 'wuc_admissions';
```

### Application Queries

**Count Applications**
```sql
SELECT status, COUNT(*) FROM applications GROUP BY status;
```

**Recent Applications**
```sql
SELECT application_id, first_name, last_name, status, created_at 
FROM applications 
ORDER BY created_at DESC 
LIMIT 10;
```

**Voucher Statistics**
```sql
SELECT status, COUNT(*), SUM(amount) 
FROM vouchers 
GROUP BY status;
```

**Failed Payments**
```sql
SELECT * FROM vouchers 
WHERE payment_status = 'failed' 
ORDER BY created_at DESC;
```

### File Management

**Check Upload Directory Size**
```bash
du -sh /var/www/wuc-admission-portal/backend/uploads/*
```

**Clean Old Temporary Files**
```bash
find /var/www/wuc-admission-portal/backend/uploads/temp -mtime +7 -delete
```

**List Recent Uploads**
```bash
ls -lht /var/www/wuc-admission-portal/backend/uploads/documents/ | head -20
```

### SSL Certificate Management

**Check Certificate Expiry**
```bash
certbot certificates
```

**Renew Certificate**
```bash
certbot renew
systemctl reload nginx
```

**Auto-renewal Test**
```bash
certbot renew --dry-run
```

### Nginx Management

**Test Configuration**
```bash
nginx -t
```

**Reload Nginx**
```bash
systemctl reload nginx
```

**View Nginx Logs**
```bash
tail -f /var/log/nginx/wuc-frontend-access.log
tail -f /var/log/nginx/wuc-frontend-error.log
```

### Deployment

**Deploy New Version**
```bash
cd /var/www/wuc-admission-portal
git pull origin main
cd backend
npm install --production
pm2 reload wuc-api
```

**Rollback to Previous Version**
```bash
git log --oneline -5  # Find commit hash
git checkout <commit-hash>
cd backend
npm install --production
pm2 reload wuc-api
```

### Monitoring & Debugging

**Check Disk Space**
```bash
df -h
```

**Check Memory Usage**
```bash
free -h
```

**Check CPU Usage**
```bash
top
htop
```

**View System Logs**
```bash
journalctl -u wuc-api -f
```

**Check Failed Login Attempts**
```bash
grep "Failed login" /var/log/wuc/api-error.log | tail -20
```

### Security

**Check Open Ports**
```bash
netstat -tulpn | grep LISTEN
```

**View Firewall Rules**
```bash
ufw status
```

**Check Failed SSH Attempts**
```bash
grep "Failed password" /var/log/auth.log | tail -20
```

### AWS Operations

**List S3 Files**
```bash
aws s3 ls s3://wuc-admissions-documents/
```

**Upload to S3**
```bash
aws s3 cp file.pdf s3://wuc-admissions-documents/documents/
```

**Check SES Sending Statistics**
```bash
aws ses get-send-statistics --region us-east-1
```

**View CloudWatch Logs**
```bash
aws logs tail /aws/wuc/api --follow
```

### Emergency Procedures

**Server Not Responding**
1. Check if process is running: `pm2 status`
2. Check logs: `pm2 logs wuc-api --lines 50`
3. Restart: `pm2 restart wuc-api`
4. If still failing: `pm2 delete wuc-api && pm2 start ecosystem.config.js`

**Database Connection Issues**
1. Check if PostgreSQL is running: `systemctl status postgresql`
2. Test connection: `psql -U wuc_admin -d wuc_admissions`
3. Check connection pool: `pm2 logs wuc-api | grep "database"`
4. Restart PostgreSQL: `systemctl restart postgresql`

**High Memory Usage**
1. Check PM2 status: `pm2 status`
2. Restart app: `pm2 reload wuc-api`
3. Check for memory leaks: `pm2 monit`

**Disk Full**
1. Check disk usage: `df -h`
2. Find large files: `du -sh /var/www/wuc-admission-portal/backend/uploads/*`
3. Clean old logs: `pm2 flush`
4. Archive old uploads to S3

### Maintenance Mode

**Enable Maintenance Mode**
```bash
# Create maintenance page
cat > /var/www/maintenance.html <<EOF
<!DOCTYPE html>
<html>
<head><title>Maintenance</title></head>
<body>
  <h1>System Maintenance</h1>
  <p>We'll be back shortly. Thank you for your patience.</p>
</body>
</html>
EOF

# Update nginx config to serve maintenance page
# Then: systemctl reload nginx
```

**Disable Maintenance Mode**
```bash
# Restore original nginx config
systemctl reload nginx
```

### Performance Optimization

**Clear PM2 Logs**
```bash
pm2 flush
```

**Optimize Database**
```sql
VACUUM ANALYZE;
REINDEX DATABASE wuc_admissions;
```

**Clear Old Sessions**
```sql
DELETE FROM sessions WHERE expires_at < NOW();
```

### Backup & Recovery

**Full System Backup**
```bash
# Database
./backup-database.sh

# Application files
tar -czf wuc-app-backup-$(date +%Y%m%d).tar.gz /var/www/wuc-admission-portal

# Uploads
tar -czf wuc-uploads-backup-$(date +%Y%m%d).tar.gz /var/www/wuc-admission-portal/backend/uploads
```

**Restore from Backup**
```bash
# Stop application
pm2 stop wuc-api

# Restore database
psql -U wuc_admin -d wuc_admissions < backup.sql

# Restore files
tar -xzf wuc-app-backup.tar.gz -C /

# Start application
pm2 start wuc-api
```

---

## Support Contacts

- **Technical Lead**: [contact]
- **Database Admin**: [contact]
- **AWS Support**: [account details]
- **Flutterwave Support**: support@flutterwave.com
- **Emergency Hotline**: [number]

---

**Last Updated**: 2024
