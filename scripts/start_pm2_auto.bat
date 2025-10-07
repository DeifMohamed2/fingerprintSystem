@echo off
title Auto Start PM2 Processes
echo.
echo ===============================================
echo Starting Fingerprint System Processes
echo ===============================================
echo.

REM Change to the project directory
cd /d "C:\Program Files\fingerPrintSystem"

REM Wait a bit for system to fully boot
timeout /t 15 /nobreak >nul

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
    pause
    exit /b 1
)

REM Start PM2 daemon by trying to list processes (this will start daemon if needed)
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

echo ✓ Processes should now be running
echo.
echo System should be accessible at http://localhost:8721
echo.

REM Log the startup attempt
echo %date% %time% - Startup script executed >> logs\startup.log