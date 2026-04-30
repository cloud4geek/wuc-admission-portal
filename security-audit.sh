#!/bin/bash

# WUC Admission Portal - Security Audit Script
# Run this before deploying to production

echo "=========================================="
echo "WUC Security Audit"
echo "=========================================="
echo ""

ISSUES=0

# Check 1: .env files not in git
echo "[1/10] Checking for exposed .env files..."
if git ls-files | grep -q "\.env$"; then
  echo "❌ CRITICAL: .env file is tracked in git!"
  ISSUES=$((ISSUES+1))
else
  echo "✅ No .env files in git"
fi

# Check 2: Sensitive data in git history
echo "[2/10] Checking git history for secrets..."
if git log --all --full-history --source --pretty=format: -- "*.env" | grep -q "AWS_SECRET"; then
  echo "⚠️  WARNING: Secrets may exist in git history"
  echo "   Consider using git-filter-repo to clean history"
  ISSUES=$((ISSUES+1))
else
  echo "✅ No obvious secrets in git history"
fi

# Check 3: Strong JWT secrets
echo "[3/10] Checking JWT secret strength..."
if [ -f "backend/.env" ]; then
  JWT_SECRET=$(grep "^JWT_SECRET=" backend/.env | cut -d'=' -f2)
  if [ ${#JWT_SECRET} -lt 32 ]; then
    echo "❌ CRITICAL: JWT_SECRET is too short (< 32 chars)"
    ISSUES=$((ISSUES+1))
  else
    echo "✅ JWT_SECRET length is adequate"
  fi
else
  echo "⚠️  WARNING: backend/.env not found"
fi

# Check 4: Production NODE_ENV
echo "[4/10] Checking NODE_ENV..."
if [ -f "backend/.env" ]; then
  NODE_ENV=$(grep "^NODE_ENV=" backend/.env | cut -d'=' -f2)
  if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  WARNING: NODE_ENV is not set to 'production'"
  else
    echo "✅ NODE_ENV is production"
  fi
fi

# Check 5: Database SSL
echo "[5/10] Checking database SSL..."
if [ -f "backend/.env" ]; then
  DB_SSL=$(grep "^DB_SSL=" backend/.env | cut -d'=' -f2)
  if [ "$DB_SSL" != "true" ]; then
    echo "⚠️  WARNING: DB_SSL is not enabled"
  else
    echo "✅ Database SSL enabled"
  fi
fi

# Check 6: Test keys in production
echo "[6/10] Checking for test API keys..."
if [ -f "backend/.env" ]; then
  if grep -q "test-xxx" backend/.env; then
    echo "❌ CRITICAL: Test API keys found in .env"
    ISSUES=$((ISSUES+1))
  else
    echo "✅ No test keys found"
  fi
fi

# Check 7: HTTPS URLs
echo "[7/10] Checking for HTTPS URLs..."
if [ -f "backend/.env" ]; then
  if grep -q "http://.*wuc.edu.gh" backend/.env; then
    echo "⚠️  WARNING: HTTP URLs found (should be HTTPS)"
  else
    echo "✅ URLs are using HTTPS"
  fi
fi

# Check 8: Exposed AWS credentials
echo "[8/10] Checking AWS credentials..."
if [ -f "backend/.env" ]; then
  AWS_KEY=$(grep "^AWS_ACCESS_KEY_ID=" backend/.env | cut -d'=' -f2)
  if [ "$AWS_KEY" == "AKIAWRU6VR7OUXBKDQNL" ]; then
    echo "❌ CRITICAL: Exposed AWS credentials still in use!"
    echo "   These were committed to git and must be rotated"
    ISSUES=$((ISSUES+1))
  else
    echo "✅ AWS credentials appear to be rotated"
  fi
fi

# Check 9: File upload limits
echo "[9/10] Checking file upload security..."
if grep -q "limits: { fileSize:" backend/routes/applications.js; then
  echo "✅ File upload limits configured"
else
  echo "⚠️  WARNING: No file upload limits found"
fi

# Check 10: Rate limiting
echo "[10/10] Checking rate limiting..."
if grep -q "express-rate-limit" backend/server.js; then
  echo "✅ Rate limiting enabled"
else
  echo "❌ CRITICAL: Rate limiting not configured"
  ISSUES=$((ISSUES+1))
fi

echo ""
echo "=========================================="
if [ $ISSUES -eq 0 ]; then
  echo "✅ Security audit passed!"
  echo "=========================================="
  exit 0
else
  echo "❌ Security audit found $ISSUES critical issue(s)"
  echo "=========================================="
  echo ""
  echo "Fix all critical issues before deploying to production!"
  exit 1
fi
