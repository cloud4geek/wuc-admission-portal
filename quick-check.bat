@echo off
title WUC Server Status
color 0A
echo.
echo ============================================
echo    AUTO-CHECKING WUC SERVER...
echo ============================================
echo.

ssh wuc-server "cd ~/wuc-admission-portal 2>/dev/null || cd /var/www/wuc-admission-portal; echo '=== PM2 STATUS ==='; pm2 list; echo ''; echo '=== BACKEND HEALTH ==='; curl -s http://localhost:5000/api/health; echo ''; echo ''; echo '=== RECENT LOGS ==='; pm2 logs --lines 20 --nostream; echo ''; echo '=== DATABASE ==='; psql -d wuc_admissions -c 'SELECT COUNT(*) FROM applications;' 2>/dev/null"

echo.
echo ============================================
echo.
pause
