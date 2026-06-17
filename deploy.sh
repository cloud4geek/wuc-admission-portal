#!/bin/bash
# ============================================================
# WUC Admission & Student Portal — Production Deployment Script
# Run on the production server (Ubuntu/Debian)
# ============================================================

set -e

APP_DIR="/var/www/wuc-admission-portal"
BACKUP_DIR="/var/backups/wuc"
LOG_DIR="/var/log/wuc"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 WUC Portal Deployment — $(date)"
echo "================================================"

# 1. Create required directories
echo "📁 Ensuring directories exist..."
sudo mkdir -p $APP_DIR $BACKUP_DIR $LOG_DIR
sudo mkdir -p $APP_DIR/backend/uploads/{admission-letters,application-forms,documents,photos,templates}
sudo mkdir -p $APP_DIR/backend/logs

# 2. Backup database
echo "💾 Backing up database..."
pg_dump -U wuc_admin wuc_admissions > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql" 2>/dev/null || echo "  ⚠️  DB backup skipped (first deploy?)"

# 3. Pull latest code
echo "📥 Pulling latest code..."
cd $APP_DIR
git pull origin main

# 4. Backend dependencies
echo "📦 Installing backend dependencies..."
cd $APP_DIR/backend
npm ci --production

# 5. Frontend build
echo "🏗️  Building frontend..."
cd $APP_DIR/frontend
npm ci
npm run build

# 6. Set permissions
echo "🔒 Setting file permissions..."
sudo chown -R www-data:www-data $APP_DIR/backend/uploads
sudo chmod -R 755 $APP_DIR/backend/uploads
sudo chown -R www-data:www-data $APP_DIR/frontend/build

# 7. Restart API with PM2
echo "♻️  Restarting API..."
cd $APP_DIR/backend
pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production

# 8. Reload Nginx
echo "🌐 Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

# 9. Health check
echo "🏥 Running health check..."
sleep 3
HEALTH=$(curl -s http://localhost:5000/api/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "✅ API is healthy!"
else
    echo "❌ API health check failed: $HEALTH"
    echo "   Rolling back..."
    pm2 reload ecosystem.config.js --env production
    exit 1
fi

echo ""
echo "================================================"
echo "✅ Deployment complete!"
echo "   API: https://admissions.wuc.edu.gh/api/health"
echo "   App: https://admissions.wuc.edu.gh"
echo "   Student Portal: https://admissions.wuc.edu.gh/student/login"
echo "================================================"
