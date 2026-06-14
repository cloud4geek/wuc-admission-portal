#!/bin/bash
# WUC Admission Portal - Automated Backup Script
# Runs daily to backup database and uploads

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=~/backups
DB_NAME=wuc_admissions
RETENTION_DAYS=30

echo "=== WUC Backup Started: $(date) ==="

# 1. Database Backup
echo "Backing up database..."
pg_dump $DB_NAME > $BACKUP_DIR/database/wuc-db-$DATE.sql
if [ $? -eq 0 ]; then
    gzip $BACKUP_DIR/database/wuc-db-$DATE.sql
    echo "✅ Database backup completed: wuc-db-$DATE.sql.gz"
else
    echo "❌ Database backup failed!"
    exit 1
fi

# 2. Uploads Backup (documents, photos, admission letters)
echo "Backing up uploads..."
tar -czf $BACKUP_DIR/uploads/wuc-uploads-$DATE.tar.gz -C ~/wuc-admission-portal/backend uploads/
if [ $? -eq 0 ]; then
    echo "✅ Uploads backup completed: wuc-uploads-$DATE.tar.gz"
else
    echo "❌ Uploads backup failed!"
fi

# 3. Configuration Backup
echo "Backing up configuration..."
cp ~/wuc-admission-portal/backend/.env $BACKUP_DIR/database/wuc-env-$DATE.backup 2>/dev/null
cp /etc/nginx/sites-available/wuc $BACKUP_DIR/database/nginx-config-$DATE.backup 2>/dev/null

# 4. Clean old backups (keep last 30 days)
echo "Cleaning old backups (keeping last $RETENTION_DAYS days)..."
find $BACKUP_DIR/database -name "wuc-db-*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR/uploads -name "wuc-uploads-*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR/database -name "wuc-env-*.backup" -mtime +$RETENTION_DAYS -delete

# 5. Backup Statistics
DB_COUNT=$(ls -1 $BACKUP_DIR/database/wuc-db-*.sql.gz 2>/dev/null | wc -l)
UPLOADS_COUNT=$(ls -1 $BACKUP_DIR/uploads/wuc-uploads-*.tar.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh $BACKUP_DIR | cut -f1)

echo ""
echo "=== Backup Summary ==="
echo "Database backups: $DB_COUNT"
echo "Uploads backups: $UPLOADS_COUNT"
echo "Total backup size: $TOTAL_SIZE"
echo "=== Backup Completed: $(date) ==="
echo ""
