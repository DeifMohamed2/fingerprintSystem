@echo off
title Install Fingerprint System Auto-Start
echo.
echo ===============================================
echo Installing Fingerprint System Auto-Start
echo ===============================================
echo.
echo This will create a Windows startup task that automatically
echo starts your fingerprint system when Windows boots.
echo.
echo WARNING: This must be run as Administrator!
echo.
pause

echo.
echo Checking Administrator privileges...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Please right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

echo Running as Administrator - OK
echo.

REM Get the project directory
set "PROJECT_ROOT=C:\Program Files\fingerPrintSystem"
set "STARTUP_SCRIPT=%PROJECT_ROOT%\scripts\start_pm2_auto.bat"

echo Project root: %PROJECT_ROOT%
echo Startup script: %STARTUP_SCRIPT%
echo.

REM Check if startup script exists
if not exist "%STARTUP_SCRIPT%" (
    echo ERROR: Startup script not found at %STARTUP_SCRIPT%
    pause
    exit /b 1
)

REM Remove existing scheduled task if it exists
echo Removing existing startup task (if any)...
schtasks /delete /tn "FingerprintSystemAutoStart" /f >nul 2>&1

REM Create new scheduled task
echo Creating Windows startup task...
schtasks /create /tn "FingerprintSystemAutoStart" /tr "\"%STARTUP_SCRIPT%\"" /sc onstart /ru "SYSTEM" /rl highest /f

if %errorLevel% equ 0 (
    echo.
    echo ✓ Windows startup task created successfully!
    echo.
    echo The task "FingerprintSystemAutoStart" will run at Windows startup
    echo and automatically start your fingerprint system processes.
    echo.
    echo You can verify the task exists by:
    echo 1. Opening Task Scheduler (taskschd.msc)
    echo 2. Looking for "FingerprintSystemAutoStart" in the Task Scheduler Library
    echo.
    echo To test: Restart your computer and check if the system is running
    echo at http://localhost:8721
) else (
    echo.
    echo ✗ Failed to create startup task!
    echo Error code: %errorLevel%
)

echo.
echo Additional setup options:
echo 1. Install as Windows Service: scripts\install_as_service.bat
echo 2. Manual startup: scripts\start_pm2_auto.bat
echo 3. Monitor system: pm2 monit
echo.
pause
