# WUC ADMISSION PORTAL - BACKUP & MONITORING SETUP

**Date:** 2026-06-14
**Status:** ✅ FULLY CONFIGURED AND OPERATIONAL

---

## 🎯 OVERVIEW

Your WUC Admission Portal now has:
1. ✅ **Automated Daily Backups** (Database + Uploads + Config)
2. ✅ **Real-time Health Monitoring** (Every 5 minutes)
3. ✅ **Email Alerts** (When issues detected)
4. ✅ **Automatic Recovery** (Failed processes auto-restart)
5. ✅ **Log Rotation** (PM2 logs managed automatically)
6. ✅ **30-Day Backup Retention** (Auto-cleanup)

---

## 📦 AUTOMATED BACKUPS

### What Gets Backed Up
```
✅ Database (PostgreSQL)          → Full SQL dump, compressed
✅ Uploaded Documents             → Photos, certificates, letters
✅ Configuration Files            → .env, nginx config
✅ Admission Letters              → Generated PDFs
✅ Application Forms              → Generated PDFs
```

### Backup Schedule
```
Daily at 2:00 AM UTC (automatic)
```

### Backup Location
```
Server: wuc-server
Directory: ~/backups/
  ├── database/
  │   ├── wuc-db-20260614_121525.sql.gz
  │   ├── wuc-env-20260614_121525.backup
  │   └── nginx-config-20260614_121525.backup
  └── uploads/
      └── wuc-uploads-20260614_121525.tar.gz
```

### Retention Policy
```
✅ Keeps last 30 days of backups
✅ Automatically deletes older backups
✅ Daily cleanup runs with backup job
```

### Backup Sizes
```
Database:  ~7 KB (compressed, empty DB)
           Will grow with applications
Uploads:   ~900 KB (compressed)
           Will grow significantly
Total:     ~1.1 MB (current)
```

---

## 📊 HEALTH MONITORING

### What's Monitored

| Component | Check Frequency | Action on Failure |
|-----------|-----------------|-------------------|
| **Backend API** | Every 5 minutes | Email alert |
| **PM2 Process** | Every 5 minutes | Auto-restart + alert |
| **Database** | Every 5 minutes | Email alert |
| **Disk Space** | Every 5 minutes | Alert at 85% |
| **Memory Usage** | Every 5 minutes | Alert at 90% |
| **SSL Certificate** | Every 5 minutes | Alert 7 days before expiry |
| **Nginx Web Server** | Every 5 minutes | Auto-restart + alert |

### Current Health Status
```
✅ API Check: PASSED
✅ PM2 Check: PASSED
✅ Database Check: PASSED
✅ Disk Space: 23% used (GOOD)
✅ Memory Usage: 48% used (GOOD)
✅ SSL Certificate: 76 days remaining (GOOD)
✅ Nginx Check: PASSED
```

### Alert Configuration
```
Email: admissions@wuc.edu.gh
Frequency: Max 1 alert per hour (prevents spam)
Log Location: ~/backups/monitor.log
```

---

## 🔔 EMAIL ALERTS

### When You'll Receive Alerts

**🚨 CRITICAL (Immediate action required):**
- Backend API not responding
- PM2 process crashed
- Database connection failed
- Nginx web server down
- SSL certificate expiring within 7 days

**⚠️ WARNING (Check soon):**
- Disk space above 85%
- Memory usage above 90%

### Alert Throttling
```
✅ Maximum 1 alert per hour for same issue
✅ Prevents email spam during outages
✅ Allows time for recovery
```

---

## 🛠️ MAINTENANCE COMMANDS

### Check Backup Status
```bash
ssh wuc-server "ls -lh ~/backups/database/ ~/backups/uploads/"
```

### View Monitoring Log
```bash
ssh wuc-server "tail -50 ~/backups/monitor.log"
```

### View Backup Log
```bash
ssh wuc-server "tail -50 ~/backups/backup.log"
```

### Manual Backup (Anytime)
```bash
ssh wuc-server "~/backups/backup-wuc.sh"
```

### Manual Health Check (Anytime)
```bash
ssh wuc-server "~/backups/monitor-wuc.sh && cat ~/backups/monitor.log | tail -20"
```

### List All Backups
```bash
ssh wuc-server "find ~/backups -name 'wuc-*' -type f -exec ls -lh {} \;"
```

---

## 🔄 RESTORE FROM BACKUP

### Restore Database (Interactive)
```bash
ssh wuc-server
cd ~/backups
./restore-wuc.sh
# Follow prompts to select backup and confirm
```

### Restore Specific Backup
```bash
ssh wuc-server "
# Stop backend
pm2 stop wuc-backend

# Drop and recreate database
dropdb wuc_admissions
createdb wuc_admissions

# Restore from specific backup
gunzip -c ~/backups/database/wuc-db-20260614_121525.sql.gz | psql wuc_admissions

# Restart backend
pm2 restart wuc-backend
"
```

### Restore Uploads
```bash
ssh wuc-server "
tar -xzf ~/backups/uploads/wuc-uploads-20260614_121525.tar.gz \
  -C ~/wuc-admission-portal/backend/
"
```

---

## 📋 CRON JOBS

### View Active Cron Jobs
```bash
ssh wuc-server "crontab -l"
```

### Current Schedule
```
# Daily Backup at 2:00 AM UTC
0 2 * * * /home/admin/backups/backup-wuc.sh >> /home/admin/backups/backup.log 2>&1

# Health Monitoring every 5 minutes
*/5 * * * * /home/admin/backups/monitor-wuc.sh
```

### Disable Backups (If Needed)
```bash
ssh wuc-server "
# Comment out backup cron job
crontab -l | grep -v 'backup-wuc.sh' | crontab -
"
```

### Re-enable Backups
```bash
ssh wuc-server "
(crontab -l; echo '0 2 * * * /home/admin/backups/backup-wuc.sh >> /home/admin/backups/backup.log 2>&1') | crontab -
"
```

---

## 📊 PM2 LOG ROTATION

### Configuration
```
Max Log Size: 10 MB
Retention: 30 files
Compression: Enabled
Rotation: Daily at midnight
```

### View PM2 Log Settings
```bash
ssh wuc-server "pm2 conf pm2-logrotate"
```

### Manual Log Rotation
```bash
ssh wuc-server "pm2 flush wuc-backend"
```

---

## 🚨 DISASTER RECOVERY

### Scenario 1: Database Corrupted
```bash
# 1. Stop backend
ssh wuc-server "pm2 stop wuc-backend"

# 2. Restore from latest backup
ssh wuc-server "~/backups/restore-wuc.sh"
# Select "latest" when prompted

# 3. Verify restoration
ssh wuc-server "psql -d wuc_admissions -c 'SELECT COUNT(*) FROM applications;'"

# 4. Restart backend
ssh wuc-server "pm2 restart wuc-backend"
```

### Scenario 2: Server Crash / Total Loss
```bash
# 1. Set up new server

# 2. Copy backups from old server
scp -r old-server:~/backups/ ~/backups/

# 3. Install dependencies
# (Follow original installation guide)

# 4. Restore database
gunzip -c ~/backups/database/wuc-db-latest.sql.gz | psql wuc_admissions

# 5. Restore uploads
tar -xzf ~/backups/uploads/wuc-uploads-latest.tar.gz -C ~/wuc-admission-portal/backend/

# 6. Restore .env configuration
cp ~/backups/database/wuc-env-latest.backup ~/wuc-admission-portal/backend/.env

# 7. Start services
pm2 start wuc-backend
```

### Scenario 3: Accidental Data Deletion
```bash
# Restore specific table from backup
ssh wuc-server "
gunzip -c ~/backups/database/wuc-db-20260614_121525.sql.gz | \
  psql wuc_admissions -c 'COPY applications FROM STDIN CSV'
"
```

---

## 📈 MONITORING DASHBOARD

### Quick Status Check
```bash
ssh wuc-server "
echo '=== SYSTEM STATUS ===' && \
pm2 list && \
echo '' && \
curl -s https://apply.wuc.edu.gh/api/health | jq && \
echo '' && \
df -h / && \
echo '' && \
free -h
"
```

---

## 🔧 TROUBLESHOOTING

### Backup Not Running
```bash
# Check cron logs
ssh wuc-server "grep CRON /var/log/syslog | tail -20"

# Check backup script exists
ssh wuc-server "ls -la ~/backups/backup-wuc.sh"

# Check cron job exists
ssh wuc-server "crontab -l | grep backup"

# Run backup manually to test
ssh wuc-server "~/backups/backup-wuc.sh"
```

### Monitoring Not Sending Alerts
```bash
# Check if mailutils is installed
ssh wuc-server "which mail"

# Test email sending
ssh wuc-server "echo 'Test alert' | mail -s 'Test' admissions@wuc.edu.gh"

# Check monitoring log
ssh wuc-server "tail -50 ~/backups/monitor.log"

# Run monitoring manually
ssh wuc-server "~/backups/monitor-wuc.sh"
```

### PM2 Logrotate Not Working
```bash
# Check module is installed
ssh wuc-server "pm2 list | grep logrotate"

# Check module configuration
ssh wuc-server "pm2 conf pm2-logrotate"

# Reinstall if needed
ssh wuc-server "pm2 uninstall pm2-logrotate && pm2 install pm2-logrotate"
```

### Disk Space Full
```bash
# Find large files
ssh wuc-server "du -sh ~/wuc-admission-portal/* | sort -h"

# Clean old backups manually
ssh wuc-server "find ~/backups -name 'wuc-*' -mtime +30 -delete"

# Clean PM2 logs
ssh wuc-server "pm2 flush"
```

---

## 📞 SUPPORT

**For backup/monitoring issues:**
1. Check logs: `~/backups/backup.log`, `~/backups/monitor.log`
2. Run manual test: `~/backups/backup-wuc.sh`
3. Contact system administrator

**Emergency restore:**
1. SSH to server: `ssh wuc-server`
2. Run restore script: `~/backups/restore-wuc.sh`
3. Select backup and confirm

---

## ✅ VERIFICATION CHECKLIST

- [x] Automated backups configured (daily at 2 AM)
- [x] Health monitoring active (every 5 minutes)
- [x] Email alerts configured
- [x] PM2 log rotation enabled
- [x] Backup retention policy set (30 days)
- [x] Restore script created
- [x] First backup completed successfully
- [x] All health checks passing
- [x] Cron jobs verified and active

---

## 📊 STATISTICS

**Current Status:**
- Backups: 1 completed (7 KB database, 900 KB uploads)
- Monitoring: Active (last check: passing)
- Disk Usage: 23%
- Memory Usage: 48%
- SSL Certificate: 76 days remaining
- System Uptime: 13 days

---

**✅ BACKUP & MONITORING FULLY OPERATIONAL**

Your WUC Admission Portal is now protected with:
- Automated daily backups
- Real-time health monitoring
- Automatic failure recovery
- Email alerts for issues
- 30-day backup history
- Complete disaster recovery capability

**No manual intervention required!** 🚀
