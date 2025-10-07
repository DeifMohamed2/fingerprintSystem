@echo off
title Fingerprint System PM2 Monitor
color 0A

:menu
cls
echo.
echo ===============================================
echo    Fingerprint System PM2 Monitor
echo ===============================================
echo.
echo Current PM2 Status:
echo ------------------
pm2 list
echo.
echo Recent Logs (last 20 lines):
echo ---------------------------
pm2 logs --lines 20 --nostream
echo.
echo ===============================================
echo Options:
echo 1. View real-time logs
echo 2. Restart all processes
echo 3. Stop all processes
echo 4. Show process details
echo 5. Refresh status
echo 6. Exit
echo ===============================================
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto logs
if "%choice%"=="2" goto restart
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto details
if "%choice%"=="5" goto menu
if "%choice%"=="6" goto exit
goto menu

:logs
cls
echo Real-time logs (Press Ctrl+C to return to menu):
echo ===============================================
pm2 logs
pause
goto menu

:restart
echo Restarting all processes...
pm2 restart all
echo.
echo Processes restarted. Press any key to continue...
pause >nul
goto menu

:stop
echo Stopping all processes...
pm2 stop all
echo.
echo Processes stopped. Press any key to continue...
pause >nul
goto menu

:details
cls
echo Process Details:
echo ===============
pm2 show fingerPrintApp
echo.
pm2 show listener
echo.
echo Press any key to continue...
pause >nul
goto menu

:exit
echo Goodbye!
exit

