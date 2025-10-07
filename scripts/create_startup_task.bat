@echo off
title Create Windows Startup Task for PM2
echo.
echo ===============================================
echo Creating Windows Scheduled Task for PM2
echo ===============================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Please right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

echo Running as Administrator - OK
echo.

REM Get the current directory (project root)
set "PROJECT_ROOT=%~dp0.."
set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

echo Project root: %PROJECT_ROOT%
echo.

REM Find PM2 command
set "PM2_CMD="
if exist "%APPDATA%\npm\pm2.cmd" (
    set "PM2_CMD=%APPDATA%\npm\pm2.cmd"
) else if exist "%ProgramFiles%\nodejs\npm.cmd" (
    set "PM2_CMD=%ProgramFiles%\nodejs\npm.cmd"
) else if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" (
    set "PM2_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd"
) else (
    set "PM2_CMD=pm2"
)

echo Using PM2 command: %PM2_CMD%
echo.

REM Remove existing task if it exists
echo Removing existing task (if any)...
schtasks /delete /tn "PM2Resurrect" /f >nul 2>&1

REM Create new scheduled task
echo Creating new scheduled task...
schtasks /create /tn "PM2Resurrect" /tr "\"%PM2_CMD%\" resurrect" /sc onstart /ru "SYSTEM" /rl highest /f

if %errorLevel% equ 0 (
    echo.
    echo ✓ Windows Scheduled Task created successfully!
    echo.
    echo The task "PM2Resurrect" will run at Windows startup and restore your PM2 processes.
    echo.
    echo You can verify the task exists by:
    echo 1. Opening Task Scheduler (taskschd.msc)
    echo 2. Looking for "PM2Resurrect" in the Task Scheduler Library
    echo.
    echo To test: Restart your computer and check if PM2 processes are running.
) else (
    echo.
    echo ✗ Failed to create scheduled task!
    echo Error code: %errorLevel%
)

echo.
pause
