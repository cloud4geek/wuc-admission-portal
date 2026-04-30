#!/bin/bash

# WUC Admission Portal - Database Backup Script
# Schedule with cron: 0 2 * * * /path/to/backup-database.sh

set -e

# Configuration
BACKUP_DIR="/var/backups/wuc-admissions"
DB_NAME="wuc_admissions"
DB_USER="wuc_admin"
DB_HOST="localhost"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/wuc_admissions_$TIMESTAMP.sql"

echo "=========================================="
echo "WUC Database Backup"
echo "=========================================="
echo "Starting backup at $(date)"
echo ""

# Perform backup
echo "Backing up database: $DB_NAME"
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_FILE

# Compress backup
echo "Compressing backup..."
gzip $BACKUP_FILE

# Check if backup was successful
if [ -f "$BACKUP_FILE.gz" ]; then
  SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
  echo "✅ Backup successful: $BACKUP_FILE.gz ($SIZE)"
else
  echo "❌ Backup failed!"
  exit 1
fi

# Remove old backups
echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find $BACKUP_DIR -name "wuc_admissions_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Upload to S3 (optional)
if [ ! -z "$AWS_S3_BACKUP_BUCKET" ]; then
  echo "Uploading to S3..."
  aws s3 cp "$BACKUP_FILE.gz" "s3://$AWS_S3_BACKUP_BUCKET/database-backups/"
  echo "✅ Uploaded to S3"
fi

echo ""
echo "Backup completed at $(date)"
echo "=========================================="

# Send notification (optional)
# curl -X POST https://api.apply.wuc.edu.gh/api/admin/notify \
#   -H "Content-Type: application/json" \
#   -d '{"message":"Database backup completed successfully"}'
