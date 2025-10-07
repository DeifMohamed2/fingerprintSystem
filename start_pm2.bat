@echo off
cd /d "C:\Program Files\fingerPrintSystem"
pm2 start ecosystem.config.js
pm2 save
echo PM2 processes started and saved!
pause


