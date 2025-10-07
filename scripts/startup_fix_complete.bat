@echo off
setlocal enabledelayedexpansion
title Fingerprint System Auto-Start (Enhanced)

REM ===============================================
REM Enhanced Auto-Start Script for PM2 Processes
REM This script handles various PM2 installation scenarios
REM ===============================================

echo ========================================================
echo Fingerprint System Auto-Start (Enhanced Version)
echo ========================================================
echo Timestamp: %date% %time%
echo User: %USERNAME%
echo System: %COMPUTERNAME%
echo ========================================================

REM Change to the project directory
cd /d "C:\Program Files\fingerPrintSystem"
echo Current directory: %CD%

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Wait for system to fully boot (increased delay)
echo Waiting 20 seconds for system boot completion...
timeout /t 20 /nobreak >nul

REM Log startup attempt
echo %date% %time% - Enhanced startup script started by %USERNAME% >> logs\startup.log

REM Fix PowerShell execution policy
echo Setting PowerShell execution policy...
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force" >nul 2>&1

REM Set environment variables
set "NODE_ENV=production"
set "PORT=8721"

REM Try multiple PM2 locations
set "PM2_FOUND=false"
set "PM2_CMD="

REM Try global npm location (most common)
set "PM2_TEMP=%APPDATA%\npm\pm2.cmd"
if exist "!PM2_TEMP!" (
    set "PM2_CMD=!PM2_TEMP!"
    set "PM2_FOUND=true"
    echo Found PM2 at: !PM2_TEMP!
)

REM Try alternative npm locations
if "!PM2_FOUND!"=="false" (
    set "PM2_TEMP=%ProgramFiles%\nodejs\pm2.cmd"
    if exist "!PM2_TEMP!" (
        set "PM2_CMD=!PM2_TEMP!"
        set "PM2_FOUND=true"
        echo Found PM2 at: !PM2_TEMP!
    )
)

REM Try yarn global location
if "!PM2_FOUND!"=="false" (
    set "PM2_TEMP=%LOCALAPPDATA%\Yarn\bin\pm2.cmd"
    if exist "!PM2_TEMP!" (
        set "PM2_CMD=!PM2_TEMP!"
        set "PM2_FOUND=true"
        echo Found PM2 at: !PM2_TEMP!
    )
)

REM Try system PATH
if "!PM2_FOUND!"=="false" (
    where pm2 >nul 2>&1
    if !errorLevel! equ 0 (
        set "PM2_CMD=pm2"
        set "PM2_FOUND=true"
        echo Found PM2 in system PATH
    )
)

REM Check if PM2 was found
if "!PM2_FOUND!"=="false" (
    echo ERROR: PM2 not found in any expected location!
    echo Please ensure PM2 is installed globally: npm install -g pm2
    echo %date% %time% - ERROR: PM2 not found >> logs\startup.log
    pause
    exit /b 1
)

echo Using PM2 command: !PM2_CMD!

REM Start PM2 daemon
echo Starting PM2 daemon...
call "!PM2_CMD!" ping >nul 2>&1
if !errorLevel! equ 0 (
    echo PM2 daemon is already running
) else (
    echo Starting PM2 daemon...
    call "!PM2_CMD!" list >nul 2>&1
    timeout /t 3 /nobreak >nul
)

REM Check PM2 daemon status
call "!PM2_CMD!" ping >nul 2>&1
if !errorLevel! neq 0 (
    echo ERROR: Failed to start PM2 daemon
    echo %date% %time% - ERROR: Failed to start PM2 daemon >> logs\startup.log
    pause
    exit /b 1
)

echo PM2 daemon is running successfully

REM Try to resurrect saved processes first
echo Attempting to restore saved processes...
call "!PM2_CMD!" resurrect >nul 2>&1

REM Wait for processes to start
timeout /t 5 /nobreak >nul

REM Check if any processes are running
call "!PM2_CMD!" list | findstr "online" >nul 2>&1
if !errorLevel! equ 0 (
    echo Processes restored from saved state
    goto :check_status
)

REM If no processes running, start from ecosystem config
echo No saved processes found, starting from ecosystem config...
call "!PM2_CMD!" start ecosystem.config.js
if !errorLevel! neq 0 (
    echo ERROR: Failed to start from ecosystem config
    echo %date% %time% - ERROR: Failed to start from ecosystem config >> logs\startup.log
    pause
    exit /b 1
)

REM Wait for processes to start
timeout /t 5 /nobreak >nul

REM Save the current state
call "!PM2_CMD!" save >nul 2>&1

:check_status
echo ========================================================
echo Checking final process status...
call "!PM2_CMD!" list

REM Verify both processes are running
call "!PM2_CMD!" list | findstr "fingerPrintApp.*online" >nul 2>&1
set "APP_RUNNING=!errorLevel!"

call "!PM2_CMD!" list | findstr "listener.*online" >nul 2>&1
set "LISTENER_RUNNING=!errorLevel!"

if !APP_RUNNING! equ 0 if !LISTENER_RUNNING! equ 0 (
    echo ========================================================
    echo ✓ SUCCESS: Both processes are running!
    echo   - fingerPrintApp: ONLINE
    echo   - listener: ONLINE
    echo ========================================================
    echo System should be accessible at http://localhost:8721
    echo %date% %time% - SUCCESS: Both processes started successfully >> logs\startup.log
) else (
    echo ========================================================
    echo ✗ WARNING: Not all processes are running
    if !APP_RUNNING! neq 0 echo   - fingerPrintApp: NOT RUNNING
    if !LISTENER_RUNNING! neq 0 echo   - listener: NOT RUNNING
    echo ========================================================
    echo %date% %time% - WARNING: Not all processes started >> logs\startup.log
)

REM Keep the window open for debugging (only in manual execution)
if "%1" neq "auto" (
    echo.
    echo Press any key to close...
    pause >nul
)

echo %date% %time% - Startup script completed >> logs\startup.log
exit /b 0