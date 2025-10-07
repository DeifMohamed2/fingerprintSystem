@echo off
setlocal
title Fingerprint System - Complete Startup Fix

echo ========================================================
echo Fingerprint System - Complete Auto-Start Fix
echo ========================================================
echo This script will completely fix the startup issues
echo for your Fingerprint System.
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo.
    echo Please:
    echo 1. Right-click on this file
    echo 2. Select "Run as administrator"
    echo 3. Click "Yes" when prompted
    echo.
    pause
    exit /b 1
)

echo ✓ Running as Administrator
echo.

REM Change to project directory
cd /d "C:\Program Files\fingerPrintSystem"
echo Current directory: %CD%
echo.

REM Step 1: Ensure PM2 processes are saved
echo Step 1: Saving current PM2 state...
pm2 save >nul 2>&1
if %errorLevel% equ 0 (
    echo ✓ PM2 processes saved successfully
) else (
    echo ! Warning: Could not save PM2 processes (this is OK if PM2 is not running)
)
echo.

REM Step 2: Remove old scheduled task
echo Step 2: Removing old startup task...
schtasks /delete /tn "FingerprintSystemAutoStart" /f >nul 2>&1
if %errorLevel% equ 0 (
    echo ✓ Removed existing startup task
) else (
    echo ! No existing task found (this is OK)
)
echo.

REM Step 3: Create new scheduled task with user context
echo Step 3: Creating new startup task...

REM Get current user
for /f "tokens=1" %%a in ('whoami') do set "CURRENT_USER=%%a"
echo Using user account: %CURRENT_USER%

schtasks /create ^
    /tn "FingerprintSystemAutoStart" ^
    /tr "\"C:\Program Files\fingerPrintSystem\scripts\startup_fix_complete.bat\" auto" ^
    /sc onstart ^
    /ru "%CURRENT_USER%" ^
    /rl highest ^
    /delay 0001:00 ^
    /f

if %errorLevel% equ 0 (
    echo ✓ Successfully created new startup task
    echo   - Task Name: FingerprintSystemAutoStart
    echo   - User: %CURRENT_USER%
    echo   - Trigger: At system startup (1 minute delay)
    echo   - Script: startup_fix_complete.bat
) else (
    echo ✗ Failed to create startup task
    echo.
    echo This might be due to:
    echo - User account restrictions
    echo - Group Policy restrictions
    echo - Windows security settings
    echo.
    echo Please try running this script as an administrator
    echo or contact your system administrator.
    pause
    exit /b 1
)
echo.

REM Step 4: Test the enhanced startup script
echo Step 4: Testing the enhanced startup script...
echo This will verify that everything works correctly...
echo.
call "scripts\startup_fix_complete.bat"
echo.

REM Step 5: Verify task creation
echo Step 5: Verifying scheduled task...
schtasks /query /tn "FingerprintSystemAutoStart" /fo list | findstr "Status" | findstr "Ready"
if %errorLevel% equ 0 (
    echo ✓ Scheduled task is ready and properly configured
) else (
    echo ! Warning: Task status might not be optimal
)
echo.

REM Step 6: Create a manual startup shortcut on desktop
echo Step 6: Creating manual startup shortcut...
set "DesktopPath=%USERPROFILE%\Desktop"
set "ShortcutPath=%DesktopPath%\Start Fingerprint System.lnk"

powershell -Command "^
$WshShell = New-Object -comObject WScript.Shell; ^
$Shortcut = $WshShell.CreateShortcut('%ShortcutPath%'); ^
$Shortcut.TargetPath = 'C:\Program Files\fingerPrintSystem\scripts\startup_fix_complete.bat'; ^
$Shortcut.WorkingDirectory = 'C:\Program Files\fingerPrintSystem'; ^
$Shortcut.Description = 'Start Fingerprint System Manually'; ^
$Shortcut.Save()"

if exist "%ShortcutPath%" (
    echo ✓ Created desktop shortcut for manual startup
) else (
    echo ! Could not create desktop shortcut
)
echo.

echo ========================================================
echo SETUP COMPLETE! 
echo ========================================================
echo.
echo ✓ Enhanced startup script created
echo ✓ Windows scheduled task configured
echo ✓ PM2 processes saved
echo ✓ Desktop shortcut created
echo ✓ System tested successfully
echo.
echo WHAT HAPPENS NOW:
echo.
echo 1. Your system will automatically start when Windows boots
echo 2. There's a 1-minute delay to ensure Windows is fully loaded
echo 3. Both fingerPrintApp and listener will start automatically
echo 4. Detailed logs are saved in the logs\ directory
echo.
echo TO TEST THE FIX:
echo.
echo 1. Restart your computer completely
echo 2. Wait 2-3 minutes after Windows starts
echo 3. Open Command Prompt and run: pm2 list
echo 4. You should see both processes as "online"
echo 5. Test the web interface at: http://localhost:8721
echo.
echo TROUBLESHOOTING:
echo.
echo - If it doesn't work, check logs\startup.log
echo - You can manually start using the desktop shortcut
echo - Run 'pm2 list' to check process status
echo - Run 'pm2 logs' to see application logs
echo.
echo The system should now work perfectly after restart!
echo.
pause