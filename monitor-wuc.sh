#!/bin/bash
# WUC Admission Portal - Health Monitoring Script
# Checks system health and sends alerts if issues detected

ALERT_EMAIL="admissions@wuc.edu.gh"
APP_URL="https://apply.wuc.edu.gh"
API_URL="https://apply.wuc.edu.gh/api/health"

LOG_FILE=~/backups/monitor.log
ALERT_FILE=~/backups/last_alert.txt

echo "=== Health Check: $(date) ===" >> $LOG_FILE

# Function to send alert
send_alert() {
    local subject="$1"
    local message="$2"
    
    # Check if we already sent alert in last hour (prevent spam)
    if [ -f "$ALERT_FILE" ]; then
        last_alert=$(cat $ALERT_FILE)
        current_time=$(date +%s)
        time_diff=$((current_time - last_alert))
        
        # If less than 1 hour (3600 seconds), skip alert
        if [ $time_diff -lt 3600 ]; then
            echo "⚠️ Alert skipped (too soon since last alert)" >> $LOG_FILE
            return
        fi
    fi
    
    # Send email alert
    echo "$message" | mail -s "$subject" $ALERT_EMAIL 2>/dev/null
    
    # Save timestamp
    date +%s > $ALERT_FILE
    
    echo "🚨 ALERT SENT: $subject" >> $LOG_FILE
}

# 1. Check Backend API
echo "Checking API..." >> $LOG_FILE
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL --max-time 10)

if [ "$API_RESPONSE" != "200" ]; then
    send_alert "🚨 WUC API DOWN" "The WUC Admission Portal API is not responding. HTTP Code: $API_RESPONSE. Check immediately!"
    echo "❌ API Check FAILED (HTTP $API_RESPONSE)" >> $LOG_FILE
else
    echo "✅ API Check PASSED" >> $LOG_FILE
fi

# 2. Check PM2 Process
echo "Checking PM2..." >> $LOG_FILE
PM2_STATUS=$(pm2 jlist | grep -c '"status":"online"')

if [ "$PM2_STATUS" -lt 1 ]; then
    send_alert "🚨 WUC Backend Process DOWN" "The wuc-backend PM2 process is not running. Attempting restart..."
    pm2 restart wuc-backend
    echo "❌ PM2 Check FAILED - Process restarted" >> $LOG_FILE
else
    echo "✅ PM2 Check PASSED" >> $LOG_FILE
fi

# 3. Check Database Connection
echo "Checking Database..." >> $LOG_FILE
DB_CHECK=$(psql -d wuc_admissions -c "SELECT 1;" 2>&1 | grep -c "1 row")

if [ "$DB_CHECK" -lt 1 ]; then
    send_alert "🚨 WUC Database Connection FAILED" "Cannot connect to PostgreSQL database. Check database server immediately!"
    echo "❌ Database Check FAILED" >> $LOG_FILE
else
    echo "✅ Database Check PASSED" >> $LOG_FILE
fi

# 4. Check Disk Space
echo "Checking Disk Space..." >> $LOG_FILE
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ "$DISK_USAGE" -gt 85 ]; then
    send_alert "⚠️ WUC Server Disk Space Low" "Disk usage is at ${DISK_USAGE}%. Consider cleaning up old backups or expanding storage."
    echo "⚠️ Disk Check WARNING (${DISK_USAGE}%)" >> $LOG_FILE
else
    echo "✅ Disk Check PASSED (${DISK_USAGE}%)" >> $LOG_FILE
fi

# 5. Check Memory Usage
echo "Checking Memory..." >> $LOG_FILE
MEM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')

if [ "$MEM_USAGE" -gt 90 ]; then
    send_alert "⚠️ WUC Server Memory High" "Memory usage is at ${MEM_USAGE}%. Backend may slow down."
    echo "⚠️ Memory Check WARNING (${MEM_USAGE}%)" >> $LOG_FILE
else
    echo "✅ Memory Check PASSED (${MEM_USAGE}%)" >> $LOG_FILE
fi

# 6. Check SSL Certificate Expiry
echo "Checking SSL Certificate..." >> $LOG_FILE
CERT_EXPIRY=$(echo | openssl s_client -servername apply.wuc.edu.gh -connect apply.wuc.edu.gh:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

if [ ! -z "$CERT_EXPIRY" ]; then
    EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s)
    CURRENT_EPOCH=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))
    
    if [ "$DAYS_UNTIL_EXPIRY" -lt 7 ]; then
        send_alert "🚨 WUC SSL Certificate Expiring Soon" "SSL certificate expires in $DAYS_UNTIL_EXPIRY days! Renew immediately."
        echo "🚨 SSL Certificate expires in $DAYS_UNTIL_EXPIRY days" >> $LOG_FILE
    else
        echo "✅ SSL Check PASSED ($DAYS_UNTIL_EXPIRY days remaining)" >> $LOG_FILE
    fi
fi

# 7. Check Nginx
echo "Checking Nginx..." >> $LOG_FILE
NGINX_STATUS=$(systemctl is-active nginx)

if [ "$NGINX_STATUS" != "active" ]; then
    send_alert "🚨 WUC Nginx DOWN" "Nginx web server is not running. Website is down!"
    sudo systemctl restart nginx
    echo "❌ Nginx Check FAILED - Service restarted" >> $LOG_FILE
else
    echo "✅ Nginx Check PASSED" >> $LOG_FILE
fi

echo "=== Health Check Complete ===" >> $LOG_FILE
echo "" >> $LOG_FILE

# Keep only last 1000 lines of log
tail -1000 $LOG_FILE > $LOG_FILE.tmp && mv $LOG_FILE.tmp $LOG_FILE
