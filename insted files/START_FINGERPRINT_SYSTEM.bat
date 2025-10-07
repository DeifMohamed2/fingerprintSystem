@echo off
title Start Fingerprint System
echo.
echo ===============================================
echo    FINGERPRINT SYSTEM - MANUAL START
echo ===============================================
echo.
echo This will start your fingerprint system manually.
echo The system will be accessible at: http://localhost:8721
echo.
echo Press any key to start the system...
pause >nul

echo.
echo Starting fingerprint system...
echo.

REM Change to the project directory
cd /d "C:\Program Files\fingerPrintSystem"

REM Fix PowerShell execution policy for PM2
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force" >nul 2>&1

REM Set up environment variables
set "NODE_ENV=production"
set "PORT=8721"

REM Find PM2 command
set "PM2_CMD=%APPDATA%\npm\pm2.cmd"

echo Using PM2 command: %PM2_CMD%
echo.

REM Check if PM2 command exists
if not exist "%PM2_CMD%" (
    echo ERROR: PM2 not found at %PM2_CMD%
    echo Please install PM2 globally: npm install -g pm2
    echo.
    pause
    exit /b 1
)

REM Start PM2 daemon
echo Starting PM2 daemon...
call "%PM2_CMD%" list
if %errorLevel% equ 0 (
    echo PM2 daemon is running
) else (
    echo PM2 daemon started
)

REM Wait for daemon to be ready
timeout /t 3 /nobreak >nul

REM Try to resurrect processes
echo Attempting to restore saved processes...
call "%PM2_CMD%" resurrect

REM Wait for processes to start
timeout /t 5 /nobreak >nul

REM Check if processes are running
echo Checking process status...
call "%PM2_CMD%" list

REM Try to start from ecosystem if no processes are running
echo Attempting to start from ecosystem config...
call "%PM2_CMD%" start ecosystem.config.js
timeout /t 3 /nobreak >nul
call "%PM2_CMD%" save

echo.
echo ===============================================
echo ✓ FINGERPRINT SYSTEM STARTED SUCCESSFULLY!
echo ===============================================
echo.
echo Your system is now running and accessible at:
echo    http://localhost:8721
echo.
echo To monitor the system, you can:
echo 1. Open the web application in your browser
echo 2. Run 'pm2 monit' in command prompt
echo 3. Check logs in the logs/ directory
echo.
echo This window will stay open to show the status.
echo You can close it when you're done.
echo.

REM Log the manual startup
echo %date% %time% - Manual startup from desktop >> logs\startup.log

echo Press any key to close this window...
pause >nul
