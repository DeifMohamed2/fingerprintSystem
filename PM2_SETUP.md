# Simple step-by-step: Make your app run 24/7 (very easy)

This guide shows the simplest steps to make your Node app (`app.js`) and Python listener (`listener.py`) run all the time and restart if they crash. There are short scripts in `scripts/` that do most of the work.

Important idea in one sentence:
- Use PM2 to keep processes alive, then make PM2 start at machine boot.

Files we added:
- `ecosystem.config.js` — already in your project, used by PM2 to start both `app.js` and `listener.py`.
- `scripts/setup_pm2_unix.sh` — a script for macOS or Linux that installs dependencies, starts PM2, and sets up startup.
- `scripts/setup_pm2_windows.ps1` — PowerShell script to do the same on Windows and create a Scheduled Task.
- `scripts/pm2-resurrect.bat` — a small Windows batch file that calls `pm2 resurrect` (used by Task Scheduler/NSSM).

VERY SIMPLE STEPS (macOS / Linux):
1) Open Terminal and go to your project folder. Example:
```bash
cd "/Users/deifmohamed/Desktop/Nodejs Teachers Projects/fingerPrintSystem"
```
2) Make the Unix script executable and run it:
```bash
chmod +x scripts/setup_pm2_unix.sh
./scripts/setup_pm2_unix.sh
```
3) Check PM2 is running and your app is listed:
```bash
pm2 list
pm2 logs
```
4) Reboot to test: after reboot run `pm2 list` — your processes should be restored.

VERY SIMPLE STEPS (Windows):
1) Open PowerShell as Administrator.
2) Run the helper PowerShell script (from project root):
```powershell
cd "C:\path\to\fingerPrintSystem"
.
\scripts\setup_pm2_windows.ps1
```
3) The script will install pm2, start the processes and register a Scheduled Task. Reboot the machine and run in PowerShell:
```powershell
pm2 list
pm2 logs
```

If anything isn't working:
- Make sure you ran `pm2 save` after starting processes. The saved list is what `pm2 resurrect` restores.
- On Windows ensure the Scheduled Task runs as SYSTEM or the same user that saved the PM2 list.
- On macOS follow any command printed by `pm2 startup` — the script attempts to run it for you but it may ask for `sudo`.

Quick verification commands (use inside project root):
```bash
pm2 list       # shows running processes
pm2 status
pm2 logs       # follow logs live
pm2 show fingerPrintApp  # show details about the Node app
```

That's it — these steps are the minimum to get a reliable 24/7 process on your machine. If you want the app to keep running even when your personal PC is off, the next step is to deploy to a VPS or cloud provider (DigitalOcean, Render, Railway, AWS). Ask me and I will prepare a short guide to deploy the project to a small always-on server.
