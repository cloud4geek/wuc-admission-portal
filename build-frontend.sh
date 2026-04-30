#!/bin/bash

# WUC Admission Portal - Frontend Production Build & Deploy

set -e

echo "=========================================="
echo "Building Frontend for Production"
echo "=========================================="
echo ""

# 1. Install dependencies
echo "[1/5] Installing dependencies..."
cd frontend
npm install

# 2. Update API endpoint for production
echo "[2/5] Configuring production API endpoint..."
cat > src/config.ts <<EOF
export const API_URL = process.env.REACT_APP_API_URL || 'https://api.apply.wuc.edu.gh';
export const APP_URL = 'https://apply.wuc.edu.gh';
EOF

# 3. Build production bundle
echo "[3/5] Building production bundle..."
npm run build

# 4. Test build
echo "[4/5] Testing build..."
if [ ! -d "build" ]; then
  echo "ERROR: Build directory not found!"
  exit 1
fi

echo "[5/5] Build complete!"
echo ""
echo "Build output: frontend/build/"
echo ""
echo "Deployment options:"
echo ""
echo "Option 1 - Vercel:"
echo "  npm install -g vercel"
echo "  vercel --prod"
echo ""
echo "Option 2 - Netlify:"
echo "  npm install -g netlify-cli"
echo "  netlify deploy --prod --dir=build"
echo ""
echo "Option 3 - AWS S3 + CloudFront:"
echo "  aws s3 sync build/ s3://apply.wuc.edu.gh --delete"
echo "  aws cloudfront create-invalidation --distribution-id YOUR_ID --paths '/*'"
echo ""
echo "Option 4 - Nginx (same server as backend):"
echo "  sudo cp -r build/* /var/www/wuc-frontend/"
echo "  sudo systemctl restart nginx"
echo ""
