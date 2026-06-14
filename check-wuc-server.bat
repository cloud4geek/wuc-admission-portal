@echo off
echo ============================================================
echo    WUC SERVER STATUS CHECK
echo    Connecting to: wuc-server
echo ============================================================
echo.

echo 📡 Connecting to server...
echo.

REM Upload and run the diagnostic script
ssh wuc-server "bash -s" < check-server-status.sh

echo.
echo ============================================================
echo    STATUS CHECK COMPLETE
echo ============================================================
echo.
echo 💡 Review the output above for any ❌ symbols
echo.
pause
