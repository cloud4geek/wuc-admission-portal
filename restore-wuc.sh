#!/bin/bash
# WUC Admission Portal - Backup Restore Script
# Restores database and uploads from backup

BACKUP_DIR=~/backups

echo "╔════════════════════════════════════════════════════════════╗"
echo "║    WUC ADMISSION PORTAL - RESTORE FROM BACKUP              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# List available backups
echo "Available Database Backups:"
echo "───────────────────────────────────────────────────────────"
ls -lht $BACKUP_DIR/database/wuc-db-*.sql.gz 2>/dev/null | head -10 | awk '{print $9, "(" $5 ")"}'
echo ""

echo "Available Upload Backups:"
echo "───────────────────────────────────────────────────────────"
ls -lht $BACKUP_DIR/uploads/wuc-uploads-*.tar.gz 2>/dev/null | head -10 | awk '{print $9, "(" $5 ")"}'
echo ""

# Prompt for which backup to restore
read -p "Enter database backup filename (or 'latest' for most recent): " DB_BACKUP

if [ "$DB_BACKUP" = "latest" ]; then
    DB_BACKUP=$(ls -t $BACKUP_DIR/database/wuc-db-*.sql.gz 2>/dev/null | head -1)
    echo "Selected: $DB_BACKUP"
fi

if [ ! -f "$DB_BACKUP" ]; then
    DB_BACKUP="$BACKUP_DIR/database/$DB_BACKUP"
fi

if [ ! -f "$DB_BACKUP" ]; then
    echo "❌ Database backup file not found: $DB_BACKUP"
    exit 1
fi

read -p "⚠️  This will overwrite the current database. Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "=== Restoring Database ==="
echo "Stopping backend..."
pm2 stop wuc-backend

echo "Dropping and recreating database..."
dropdb wuc_admissions 2>/dev/null
createdb wuc_admissions

echo "Restoring from backup..."
gunzip -c $DB_BACKUP | psql wuc_admissions

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully"
else
    echo "❌ Database restore failed!"
    exit 1
fi

echo "Restarting backend..."
pm2 restart wuc-backend

echo ""
echo "=== Restore Complete ==="
echo "✅ Database restored from: $(basename $DB_BACKUP)"
echo ""

# Optional: Restore uploads
read -p "Restore uploads as well? (yes/no): " RESTORE_UPLOADS

if [ "$RESTORE_UPLOADS" = "yes" ]; then
    read -p "Enter uploads backup filename (or 'latest'): " UPLOADS_BACKUP
    
    if [ "$UPLOADS_BACKUP" = "latest" ]; then
        UPLOADS_BACKUP=$(ls -t $BACKUP_DIR/uploads/wuc-uploads-*.tar.gz 2>/dev/null | head -1)
    fi
    
    if [ ! -f "$UPLOADS_BACKUP" ]; then
        UPLOADS_BACKUP="$BACKUP_DIR/uploads/$UPLOADS_BACKUP"
    fi
    
    if [ -f "$UPLOADS_BACKUP" ]; then
        echo "Restoring uploads..."
        tar -xzf $UPLOADS_BACKUP -C ~/wuc-admission-portal/backend/
        echo "✅ Uploads restored from: $(basename $UPLOADS_BACKUP)"
    else
        echo "❌ Uploads backup not found"
    fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   RESTORE COMPLETE                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
