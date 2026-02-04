# SSL Certificate Setup for WUC Admission Portal

## Development/Testing (Self-Signed Certificates)

1. Run `generate-ssl.bat` to create self-signed certificates
2. Certificates will be created in the `ssl/` directory
3. Server will run on both HTTP (port 5000) and HTTPS (port 443)

## Production SSL Certificates

### Option 1: Let's Encrypt (Free) - Automated Installation

**Run the installation script:**
```bash
chmod +x install-certbot.sh
sudo ./install-certbot.sh
```

**Manual Installation:**
```bash
# Install Certbot
sudo apt update
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Generate certificate
sudo certbot certonly --standalone -d wuc.edu.gh -d www.wuc.edu.gh

# Copy certificates to ssl directory
sudo cp /etc/letsencrypt/live/wuc.edu.gh/fullchain.pem ./ssl/certificate.pem
sudo cp /etc/letsencrypt/live/wuc.edu.gh/privkey.pem ./ssl/private-key.pem

# Setup auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Option 2: Commercial SSL Certificate
1. Purchase SSL certificate from a trusted CA
2. Generate CSR (Certificate Signing Request)
3. Submit CSR to CA and receive certificate files
4. Place certificate files in `ssl/` directory:
   - `certificate.pem` - SSL certificate
   - `private-key.pem` - Private key

### Environment Configuration
Update `.env` file:
```
SSL_ENABLED=true
SSL_CERT_PATH=./ssl/certificate.pem
SSL_KEY_PATH=./ssl/private-key.pem
HTTPS_PORT=443
```

### Nginx Configuration (Recommended for Production)
```nginx
server {
    listen 80;
    server_name wuc.edu.gh www.wuc.edu.gh;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wuc.edu.gh www.wuc.edu.gh;

    ssl_certificate /path/to/ssl/certificate.pem;
    ssl_certificate_key /path/to/ssl/private-key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Security Notes
- Never commit SSL certificates to version control
- Use strong SSL/TLS configurations
- Regularly renew certificates (Let's Encrypt expires every 90 days)
- Consider using a reverse proxy like Nginx for production