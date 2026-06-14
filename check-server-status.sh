#!/bin/bash
# WUC Server Diagnostic Script
# Run this on the server to check deployment status

echo "╔════════════════════════════════════════════════════════════╗"
echo "║    WUC ADMISSION PORTAL - SERVER DIAGNOSTIC REPORT        ║"
echo "║    Server: 107.20.160.131                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  SYSTEM INFORMATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Hostname: $(hostname)"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo "Uptime: $(uptime -p)"
echo "Current Time: $(date)"
echo "Current User: $(whoami)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  PROJECT FILES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d "$HOME/wuc-admission-portal" ]; then
    echo -e "${GREEN}✅ Project directory exists${NC}"
    echo "Location: $HOME/wuc-admission-portal"
    echo ""
    echo "Directory structure:"
    ls -lah $HOME/wuc-admission-portal/
    echo ""
    echo "Backend files:"
    ls -lah $HOME/wuc-admission-portal/backend/ | head -20
    echo ""
    echo "Frontend build:"
    if [ -d "$HOME/wuc-admission-portal/frontend/build" ]; then
        echo -e "${GREEN}✅ Frontend build exists${NC}"
        ls -lh $HOME/wuc-admission-portal/frontend/build/ | head -10
    else
        echo -e "${RED}❌ Frontend build NOT found${NC}"
    fi
else
    echo -e "${RED}❌ Project directory NOT found${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  NODE.JS & NPM"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js installed${NC}"
    echo "Version: $(node --version)"
else
    echo -e "${RED}❌ Node.js NOT installed${NC}"
fi

if command -v npm &> /dev/null; then
    echo -e "${GREEN}✅ npm installed${NC}"
    echo "Version: $(npm --version)"
else
    echo -e "${RED}❌ npm NOT installed${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  PM2 PROCESS MANAGER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✅ PM2 installed${NC}"
    echo "Version: $(pm2 --version)"
    echo ""
    echo "PM2 Process List:"
    pm2 list
    echo ""
    echo "PM2 Info:"
    pm2 info wuc-api 2>/dev/null || echo "wuc-api process not found"
else
    echo -e "${RED}❌ PM2 NOT installed${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  RUNNING PROCESSES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Node processes:"
ps aux | grep -E "node|npm" | grep -v grep
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  PORT USAGE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Listening ports:"
sudo netstat -tulpn 2>/dev/null | grep LISTEN | grep -E "3000|5000|80|443" || ss -tulpn | grep LISTEN | grep -E "3000|5000|80|443"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  BACKEND API HEALTH CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing: http://localhost:5000/api/health"
HEALTH_CHECK=$(curl -s http://localhost:5000/api/health 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend API responding${NC}"
    echo "Response: $HEALTH_CHECK"
else
    echo -e "${RED}❌ Backend API NOT responding${NC}"
    echo "Error: $HEALTH_CHECK"
fi
echo ""

echo "Testing: http://localhost/api/health (via nginx)"
NGINX_HEALTH=$(curl -s http://localhost/api/health 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx proxy working${NC}"
    echo "Response: $NGINX_HEALTH"
else
    echo -e "${YELLOW}⚠️  Nginx proxy not configured or not working${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8️⃣  BACKEND LOGS (Last 30 lines)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v pm2 &> /dev/null; then
    pm2 logs wuc-api --lines 30 --nostream 2>/dev/null || echo "PM2 logs not available"
elif [ -f "$HOME/wuc-admission-portal/backend/logs/combined.log" ]; then
    tail -30 $HOME/wuc-admission-portal/backend/logs/combined.log
else
    echo "No logs found"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9️⃣  NGINX WEB SERVER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✅ Nginx installed${NC}"
    echo "Version: $(nginx -v 2>&1)"
    echo ""
    echo "Nginx status:"
    sudo systemctl status nginx --no-pager | head -15
    echo ""
    echo "Nginx config test:"
    sudo nginx -t 2>&1
    echo ""
    echo "Active sites:"
    ls -la /etc/nginx/sites-enabled/
    echo ""
    if [ -f "/etc/nginx/sites-available/wuc" ]; then
        echo "WUC Nginx config:"
        cat /etc/nginx/sites-available/wuc | head -50
    fi
else
    echo -e "${RED}❌ Nginx NOT installed${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔟  POSTGRESQL DATABASE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL client installed${NC}"
    echo "Version: $(psql --version)"
    echo ""
    echo "Testing database connection:"
    psql -d wuc_admissions -c "SELECT COUNT(*) as total_applications FROM applications;" 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database connected${NC}"
        echo ""
        echo "Database tables:"
        psql -d wuc_admissions -c "\dt" 2>&1 | head -25
        echo ""
        echo "Database stats:"
        psql -d wuc_admissions -c "
            SELECT 
                (SELECT COUNT(*) FROM vouchers) as vouchers,
                (SELECT COUNT(*) FROM applications) as applications,
                (SELECT COUNT(*) FROM admin_users) as admins;
        " 2>&1
    else
        echo -e "${RED}❌ Database connection failed${NC}"
    fi
else
    echo -e "${RED}❌ PostgreSQL client NOT installed${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣1️⃣  ENVIRONMENT CONFIGURATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "$HOME/wuc-admission-portal/backend/.env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    echo "Location: $HOME/wuc-admission-portal/backend/.env"
    echo ""
    echo "Environment variables (secrets hidden):"
    cat $HOME/wuc-admission-portal/backend/.env | grep -E "NODE_ENV|PORT|DB_HOST|DB_NAME|CORS_ORIGINS|APP_URL|API_URL" | grep -v "^#"
    echo ""
    echo "Service configuration:"
    cat $HOME/wuc-admission-portal/backend/.env | grep -E "PAYSTACK_SECRET_KEY|GMAIL_USER|SMSONLINEGH_API_KEY" | sed 's/=.*/=***CONFIGURED***/' | grep -v "^#"
else
    echo -e "${RED}❌ .env file NOT found${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣2️⃣  DISK USAGE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
df -h | grep -E "Filesystem|/$|/home"
echo ""
echo "Project size:"
du -sh $HOME/wuc-admission-portal 2>/dev/null || echo "Project directory not found"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣3️⃣  MEMORY & CPU"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
free -h
echo ""
echo "CPU info:"
lscpu | grep -E "Model name|CPU\(s\)|Thread"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣4️⃣  FIREWALL & SECURITY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v ufw &> /dev/null; then
    echo "UFW status:"
    sudo ufw status
else
    echo "UFW not installed"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣5️⃣  EXTERNAL ACCESS TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing external API access:"
curl -s http://107.20.160.131/api/health 2>&1 | head -5
echo ""
echo "Testing external frontend access:"
curl -s http://107.20.160.131 2>&1 | head -10
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              END OF DIAGNOSTIC REPORT                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Summary:"
echo "  - Copy this entire output"
echo "  - Share with support team for analysis"
echo "  - Look for ❌ symbols to identify issues"
echo ""
echo "🌐 Access URLs:"
echo "  - Frontend: http://107.20.160.131"
echo "  - API Health: http://107.20.160.131/api/health"
echo "  - Admin: http://107.20.160.131/admin/login"
echo ""
