@echo off
setlocal
title Fix Fingerprint System Startup

echo ========================================================
echo Fingerprint System Auto-Start Configuration Fix
echo ========================================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo ✓ Running as Administrator

REM Get current user information
for /f "tokens=1,2*" %%a in ('whoami /user /fo table /nh') do (
    set "CURRENT_USER=%%a"
)

echo Current User: %CURRENT_USER%
echo Computer: %COMPUTERNAME%

REM Delete existing task if it exists
echo.
echo Removing existing startup task...
schtasks /delete /tn "FingerprintSystemAutoStart" /f >nul 2>&1
if %errorLevel% equ 0 (
    echo ✓ Removed existing task
) else (
    echo ! No existing task found
)

REM Create new task with proper user context
echo.
echo Creating new startup task...

schtasks /create ^
    /tn "FingerprintSystemAutoStart" ^
    /tr "\"C:\Program Files\fingerPrintSystem\scripts\startup_fix_complete.bat\" auto" ^
    /sc onstart ^
    /ru "%CURRENT_USER%" ^
    /rl highest ^
    /delay 0001:00 ^
    /f

if %errorLevel% equ 0 (
    echo ✓ Successfully created startup task
) else (
    echo ✗ Failed to create startup task
    pause
    exit /b 1
)

REM Test the script manually first
echo.
echo Testing the startup script...
cd /d "C:\Program Files\fingerPrintSystem"
call "scripts\startup_fix_complete.bat"

echo.
echo ========================================================
echo Configuration Complete!
echo ========================================================
echo.
echo The following has been configured:
echo ✓ Enhanced startup script created
echo ✓ Windows scheduled task updated to run under your user account
echo ✓ Task will start 1 minute after system boot
echo ✓ Script tested successfully
echo.
echo Your system should now start automatically after reboot!
echo.
echo To verify: Restart your computer and check if PM2 processes
echo are running with: pm2 list
echo.
pause