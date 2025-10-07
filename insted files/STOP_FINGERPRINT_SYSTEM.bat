@echo off
title Stop Fingerprint System
echo.
echo ===============================================
echo    FINGERPRINT SYSTEM - STOP
echo ===============================================
echo.
echo This will stop your fingerprint system.
echo.
echo Press any key to stop the system...
pause >nul

echo.
echo Stopping fingerprint system...
echo.

REM Change to the project directory
cd /d "C:\Program Files\fingerPrintSystem"

REM Find PM2 command
set "PM2_CMD=%APPDATA%\npm\pm2.cmd"

echo Using PM2 command: %PM2_CMD%
echo.

REM Check if PM2 command exists
if not exist "%PM2_CMD%" (
    echo ERROR: PM2 not found at %PM2_CMD%
    echo.
    pause
    exit /b 1
)

REM Stop all PM2 processes
echo Stopping all PM2 processes...
call "%PM2_CMD%" stop all

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Show final status
echo.
echo Final status:
call "%PM2_CMD%" list

echo.
echo ===============================================
echo ✓ FINGERPRINT SYSTEM STOPPED
echo ===============================================
echo.
echo The system has been stopped.
echo You can restart it using the START_FINGERPRINT_SYSTEM.bat file.
echo.

REM Log the manual stop
echo %date% %time% - Manual stop from desktop >> logs\startup.log

echo Press any key to close this window...
pause >nul
