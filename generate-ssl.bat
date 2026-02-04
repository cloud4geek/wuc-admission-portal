@echo off
echo ========================================
echo Generating Self-Signed SSL Certificates
echo ========================================
echo.

cd backend\ssl

echo Creating private key...
openssl genrsa -out private-key.pem 2048

echo.
echo Creating certificate...
openssl req -new -x509 -key private-key.pem -out certificate.pem -days 365 -subj "/C=GH/ST=Greater Accra/L=Accra/O=Withrow University College/OU=IT/CN=localhost"

echo.
echo ========================================
echo SSL Certificates Generated Successfully!
echo ========================================
echo.
echo Location: backend\ssl\
echo Files:
echo   - private-key.pem
echo   - certificate.pem
echo.
echo Valid for: 365 days
echo.
echo To enable SSL, update backend\.env:
echo SSL_ENABLED=true
echo.
pause
