@echo off
REM Script to resurrect PM2 saved processes on Windows
REM Place this in C:\scripts and reference it from Task Scheduler if desired

SET NPM_BIN=%APPDATA%\npm
SET PM2=%NPM_BIN%\pm2.cmd

echo Waiting 5 seconds to allow system services to start...
timeout /T 5 /NOBREAK > nul

if exist "%PM2%" (
  "%PM2%" resurrect
) else (
  echo pm2 not found at %PM2% — try running pm2 resurrect manually or update the script to point to the correct pm2.cmd
)
