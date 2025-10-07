@echo off
title Fingerprint System Status Check
echo.
echo ===============================================
echo    FINGERPRINT SYSTEM - STATUS CHECK
echo ===============================================
echo.

REM Change to the project directory
cd /d "C:\Program Files\fingerPrintSystem"

REM Find PM2 command
set "PM2_CMD=%APPDATA%\npm\pm2.cmd"

echo Checking system status...
echo.

REM Check if PM2 command exists
if not exist "%PM2_CMD%" (
    echo ERROR: PM2 not found at %PM2_CMD%
    echo.
    pause
    exit /b 1
)

REM Show PM2 process status
echo PM2 Process Status:
echo ===================
call "%PM2_CMD%" list

echo.
echo Port Status:
echo ============
netstat -an | findstr :8721
if %errorLevel% equ 0 (
    echo ✓ Port 8721 is listening - System is accessible
) else (
    echo ✗ Port 8721 is not listening - System may not be running
)

echo.
echo Web Application Test:
echo ====================
echo Testing http://localhost:8721...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8721' -TimeoutSec 5; Write-Host '✓ HTTP Status:' $response.StatusCode '- Web application is responding' } catch { Write-Host '✗ Connection failed:' $_.Exception.Message }"

echo.
echo ===============================================
echo STATUS CHECK COMPLETE
echo ===============================================
echo.
echo If the system is not running:
echo 1. Double-click START_FINGERPRINT_SYSTEM.bat
echo 2. Or restart your computer (auto-start should work)
echo.
echo If you see any issues:
echo 1. Check the logs in: C:\Program Files\fingerPrintSystem\logs\
echo 2. Run 'pm2 logs' in command prompt
echo.

echo Press any key to close this window...
pause >nul
