@echo off
echo ========================================
echo PostgreSQL Password Reset for Windows
echo ========================================
echo.

REM Check common PostgreSQL installation paths
set "PGBIN="
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set "PGBIN=C:\Program Files\PostgreSQL\16\bin"
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set "PGBIN=C:\Program Files\PostgreSQL\15\bin"
if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" set "PGBIN=C:\Program Files\PostgreSQL\14\bin"
if exist "C:\Program Files\PostgreSQL\13\bin\psql.exe" set "PGBIN=C:\Program Files\PostgreSQL\13\bin"
if exist "C:\Program Files\PostgreSQL\12\bin\psql.exe" set "PGBIN=C:\Program Files\PostgreSQL\12\bin"

if "%PGBIN%"=="" (
    echo ERROR: PostgreSQL not found in standard locations
    echo Please locate your PostgreSQL installation manually
    pause
    exit /b 1
)

echo Found PostgreSQL at: %PGBIN%
echo.

REM Create SQL file to reset password
echo ALTER USER postgres WITH PASSWORD 'wuc123'; > "%TEMP%\reset_pg_password.sql"
echo.

echo INSTRUCTIONS:
echo 1. Stop PostgreSQL service (if running)
echo 2. Edit pg_hba.conf to allow trust authentication temporarily
echo 3. Restart PostgreSQL service
echo 4. Run the password reset
echo.
echo This is complex. Let's try a simpler approach...
echo.

REM Try using pgAdmin or direct connection
echo Attempting to reset password...
echo.

"%PGBIN%\psql.exe" -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD 'wuc123';"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ SUCCESS! Password has been reset to: wuc123
    echo.
    echo Update your .env file if needed.
) else (
    echo.
    echo ❌ Failed. You need to manually reset the password.
    echo.
    echo MANUAL STEPS:
    echo 1. Open pgAdmin 4
    echo 2. Right-click on PostgreSQL server
    echo 3. Select Properties ^> Definition
    echo 4. Set new password: wuc123
    echo 5. Save
)

del "%TEMP%\reset_pg_password.sql" 2>nul
echo.
pause
