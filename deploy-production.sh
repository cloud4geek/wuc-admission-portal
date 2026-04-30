#!/bin/bash

# WUC Admission Portal - Production Deployment Script
# Run this on your production server

set -e

echo "=========================================="
echo "WUC Admission Portal - Production Deploy"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root or with sudo${NC}"
  exit 1
fi

# 1. Update system
echo -e "${YELLOW}[1/10] Updating system packages...${NC}"
apt-get update && apt-get upgrade -y

# 2. Install dependencies
echo -e "${YELLOW}[2/10] Installing dependencies...${NC}"
apt-get install -y nodejs npm postgresql-client nginx certbot python3-certbot-nginx

# 3. Install PM2 globally
echo -e "${YELLOW}[3/10] Installing PM2...${NC}"
npm install -g pm2

# 4. Create application directory
echo -e "${YELLOW}[4/10] Setting up application directory...${NC}"
mkdir -p /var/www/wuc-admission-portal
cd /var/www/wuc-admission-portal

# 5. Clone repository (or copy files)
echo -e "${YELLOW}[5/10] Deploying application files...${NC}"
# git clone https://github.com/your-org/wuc-admission-portal.git .
# OR copy files from local machine

# 6. Install backend dependencies
echo -e "${YELLOW}[6/10] Installing backend dependencies...${NC}"
cd backend
npm install --production

# 7. Create required directories
echo -e "${YELLOW}[7/10] Creating upload directories...${NC}"
mkdir -p uploads/{documents,photos,admission-letters,application-forms,templates}
chmod 755 uploads
chmod 755 uploads/*

# 8. Set up environment file
echo -e "${YELLOW}[8/10] Setting up environment variables...${NC}"
if [ ! -f .env ]; then
  echo -e "${RED}ERROR: .env file not found!${NC}"
  echo "Please create .env file from .env.production.template"
  exit 1
fi

# 9. Start backend with PM2
echo -e "${YELLOW}[9/10] Starting backend server...${NC}"
pm2 start server.js --name wuc-api --env production
pm2 save
pm2 startup

# 10. Configure Nginx
echo -e "${YELLOW}[10/10] Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/wuc-api <<'EOF'
server {
    listen 80;
    server_name api.apply.wuc.edu.gh;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/wuc-api /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

echo ""
echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Configure SSL: sudo certbot --nginx -d api.apply.wuc.edu.gh"
echo "2. Test API: curl http://api.apply.wuc.edu.gh/api/health"
echo "3. Monitor logs: pm2 logs wuc-api"
echo "4. Check status: pm2 status"
echo ""
echo "Important commands:"
echo "  pm2 restart wuc-api    - Restart server"
echo "  pm2 stop wuc-api       - Stop server"
echo "  pm2 logs wuc-api       - View logs"
echo "  pm2 monit              - Monitor resources"
echo ""
