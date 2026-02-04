#!/bin/bash
# Install Certbot for Let's Encrypt SSL Certificates

echo "Installing Certbot for WUC Admission Portal..."

# Update package list
sudo apt update

# Install snapd if not already installed
sudo apt install snapd -y

# Install certbot via snap
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot

# Create symlink for certbot command
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Stop any running services on port 80/443
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl stop apache2 2>/dev/null || true

# Generate SSL certificate for WUC domain
sudo certbot certonly --standalone \
  -d wuc.edu.gh \
  -d www.wuc.edu.gh \
  --email admin@wuc.edu.gh \
  --agree-tos \
  --non-interactive

# Copy certificates to project directory
sudo mkdir -p /var/www/wuc-admission-portal/ssl
sudo cp /etc/letsencrypt/live/wuc.edu.gh/fullchain.pem /var/www/wuc-admission-portal/ssl/certificate.pem
sudo cp /etc/letsencrypt/live/wuc.edu.gh/privkey.pem /var/www/wuc-admission-portal/ssl/private-key.pem

# Set proper permissions
sudo chown -R www-data:www-data /var/www/wuc-admission-portal/ssl
sudo chmod 600 /var/www/wuc-admission-portal/ssl/private-key.pem
sudo chmod 644 /var/www/wuc-admission-portal/ssl/certificate.pem

# Setup auto-renewal
sudo crontab -l | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -

echo "✅ Certbot installed and SSL certificates generated!"
echo "📁 Certificates location: /var/www/wuc-admission-portal/ssl/"
echo "🔄 Auto-renewal configured via cron"
echo ""
echo "Next steps:"
echo "1. Update your .env file with SSL_ENABLED=true"
echo "2. Restart your Node.js application"
echo "3. Configure Nginx reverse proxy (recommended)"