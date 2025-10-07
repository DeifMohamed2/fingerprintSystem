@echo off
title Install Fingerprint System as Windows Service
echo.
echo ===============================================
echo Install Fingerprint System as Windows Service
echo ===============================================
echo.
echo This will install your fingerprint system as a Windows service
echo so it runs automatically even without user login.
echo.
echo WARNING: This requires PM2 to be installed and configured first!
echo.
pause

echo.
echo Checking PM2 installation...
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: PM2 is not installed or not in PATH
    echo Please run the setup script first: scripts\setup_pm2_windows_enhanced.ps1
    pause
    exit /b 1
)

echo PM2 found. Installing pm2-windows-service...
npm install -g pm2-windows-service

echo.
echo Configuring PM2 as Windows service...
pm2-service-install -n "FingerprintSystem"

echo.
echo Service installed! You can now:
echo - Start the service: net start FingerprintSystem
echo - Stop the service: net stop FingerprintSystem
echo - Check service status in Windows Services (services.msc)
echo.
echo The service will start automatically with Windows.
echo.
pause

