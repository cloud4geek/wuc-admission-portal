@echo off
REM One-click server diagnostic
echo ========================================
echo   WUC SERVER AUTO-CHECK
echo ========================================
echo.
echo Connecting to wuc-server and running diagnostics...
echo.

ssh wuc-server "bash -s" << 'EOF'
echo "╔════════════════════════════════════════════════════════════╗"
echo "║    WUC ADMISSION PORTAL - AUTO DIAGNOSTIC                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "1️⃣ PROJECT LOCATION:"
if [ -d ~/wuc-admission-portal ]; then
    echo "✅ Found at: ~/wuc-admission-portal"
    cd ~/wuc-admission-portal
elif [ -d /var/www/wuc-admission-portal ]; then
    echo "✅ Found at: /var/www/wuc-admission-portal"
    cd /var/www/wuc-admission-portal
else
    echo "❌ Project not found!"
    exit 1
fi
echo ""

echo "2️⃣ NODE & PM2:"
echo "Node: $(node --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "NPM: $(npm --version 2>/dev/null || echo 'NOT INSTALLED')"
echo "PM2: $(pm2 --version 2>/dev/null || echo 'NOT INSTALLED')"
echo ""

echo "3️⃣ PM2 PROCESSES:"
pm2 list 2>/dev/null
echo ""

echo "4️⃣ BACKEND HEALTH:"
HEALTH=$(curl -s http://localhost:5000/api/health 2>&1)
if [ $? -eq 0 ]; then
    echo "✅ Backend responding: $HEALTH"
else
    echo "❌ Backend not responding"
fi
echo ""

echo "5️⃣ NGINX STATUS:"
sudo systemctl is-active nginx 2>/dev/null || echo "Not running"
echo ""

echo "6️⃣ DATABASE:"
psql -d wuc_admissions -c "SELECT 
    (SELECT COUNT(*) FROM vouchers) as vouchers,
    (SELECT COUNT(*) FROM applications) as applications,
    (SELECT COUNT(*) FROM admin_users) as admins;" 2>/dev/null || echo "❌ Database error"
echo ""

echo "7️⃣ RECENT LOGS:"
pm2 logs --lines 15 --nostream 2>/dev/null
echo ""

echo "8️⃣ PORTS IN USE:"
sudo netstat -tulpn 2>/dev/null | grep LISTEN | grep -E ":5000|:80|:443" || ss -tulpn | grep LISTEN | grep -E ":5000|:80|:443"
echo ""

echo "9️⃣ ENVIRONMENT:"
if [ -f backend/.env ]; then
    echo "✅ .env exists"
    echo "NODE_ENV=$(grep NODE_ENV backend/.env | cut -d'=' -f2)"
    echo "PORT=$(grep '^PORT=' backend/.env | cut -d'=' -f2)"
else
    echo "❌ .env not found"
fi
echo ""

echo "╚════════════════════════════════════════════════════════════╝"
EOF

echo.
echo ========================================
echo   CHECK COMPLETE
echo ========================================
pause
