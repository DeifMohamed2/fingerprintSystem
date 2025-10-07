# Fingerprint System Auto-Start Troubleshooting Guide

## 🚨 Current Status: FIXED ✅

Your system is now properly configured for automatic startup after computer restarts.

## 🔧 What Was Fixed

1. **Created Windows Startup Task**: `FingerprintSystemAutoStart`
2. **Created Auto-Start Script**: `scripts/start_pm2_auto.bat`
3. **Saved PM2 Process State**: Processes will be restored on startup
4. **Verified Port Configuration**: System runs on port 8721

## 📋 Quick Status Check

### Check if System is Running
```bash
# Open Command Prompt in project directory
cd "C:\Program Files\fingerPrintSystem"
pm2 list
```

**Expected Output:**
```
┌────┬───────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name              │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼───────────────────┼─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┤
│ 0  │ fingerPrintApp    │ default     │ 1.0.0   │ cluster │ [PID]    │ [time] │ 0    │ online    │ 0%       │ [mem]    │ [user]   │ disabled │
│ 1  │ listener          │ default     │ 1.0.0   │ fork    │ [PID]    │ [time] │ 0    │ online    │ 0%       │ [mem]    │ [user]   │ disabled │
└────┴───────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┬──────────┬──────────┬──────────┘
```

### Check if Port is Listening
```bash
netstat -an | findstr :8721
```

**Expected Output:**
```
TCP    0.0.0.0:8721           0.0.0.0:0              LISTENING
TCP    [::]:8721              [::]:0                 LISTENING
```

### Check Windows Startup Task
```bash
schtasks /query /tn "FingerprintSystemAutoStart" /fo list
```

**Expected Output:**
```
Folder: \
HostName:      [YOUR-COMPUTER-NAME]
TaskName:      \FingerprintSystemAutoStart
Next Run Time: N/A
Status:        Ready
Logon Mode:    Interactive/Background
```

## 🚀 Manual Startup (If Needed)

If the system doesn't start automatically, you can start it manually:

### Option 1: Use the Auto-Start Script
```bash
cd "C:\Program Files\fingerPrintSystem"
scripts\start_pm2_auto.bat
```

### Option 2: Use PM2 Commands
```bash
cd "C:\Program Files\fingerPrintSystem"
pm2 resurrect
```

### Option 3: Start from Ecosystem Config
```bash
cd "C:\Program Files\fingerPrintSystem"
pm2 start ecosystem.config.js
pm2 save
```

## 🔍 Troubleshooting Steps

### Problem: "localhost refused to connect" or "ERR_CONNECTION_REFUSED"

**Step 1: Check if processes are running**
```bash
pm2 list
```
- If no processes shown: Run `pm2 resurrect`
- If processes show "errored" or "stopped": Run `pm2 restart all`

**Step 2: Check port availability**
```bash
netstat -an | findstr :8721
```
- If no output: Processes not running, restart them
- If port shows "LISTENING": System is running, check firewall

**Step 3: Check Windows Firewall**
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Look for Node.js or your application
4. If not found, add it manually

**Step 4: Check logs for errors**
```bash
pm2 logs --lines 20
```

### Problem: System doesn't start after computer restart

**Step 1: Verify startup task exists**
```bash
schtasks /query /tn "FingerprintSystemAutoStart"
```

**Step 2: If task doesn't exist, recreate it**
```bash
cd "C:\Program Files\fingerPrintSystem\scripts"
.\install_autostart.bat
```

**Step 3: Test the startup script manually**
```bash
cd "C:\Program Files\fingerPrintSystem"
scripts\start_pm2_auto.bat
```

**Step 4: Check Task Scheduler**
1. Open Task Scheduler (`taskschd.msc`)
2. Look for "FingerprintSystemAutoStart"
3. Check if it's enabled and set to run at startup

### Problem: PM2 processes keep crashing

**Step 1: Check error logs**
```bash
pm2 logs --lines 50
```

**Step 2: Check system resources**
```bash
pm2 monit
```

**Step 3: Restart with fresh state**
```bash
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

## 🛠️ Maintenance Commands

### Daily Health Check
```bash
cd "C:\Program Files\fingerPrintSystem"
pm2 list && pm2 logs --lines 5
```

### Weekly Maintenance
```bash
cd "C:\Program Files\fingerPrintSystem"
pm2 monit                    # Check resource usage
pm2 save                     # Backup current state
```

### After Code Changes
```bash
cd "C:\Program Files\fingerPrintSystem"
pm2 reload all               # Zero-downtime update
# OR
pm2 restart all              # Full restart
pm2 save                     # Save new state
```

## 📁 Important Files

### Configuration Files
- `ecosystem.config.js` - PM2 process configuration
- `scripts/start_pm2_auto.bat` - Auto-start script
- `scripts/install_autostart.bat` - Install startup task

### Log Files
- `logs/app-error.log` - Application errors
- `logs/app-out.log` - Application output
- `logs/app-combined.log` - Combined application logs
- `logs/listener-error.log` - Listener errors
- `logs/listener-out.log` - Listener output
- `logs/listener-combined.log` - Combined listener logs

### PM2 Files
- `C:\Users\[USERNAME]\.pm2\dump.pm2` - Saved process list
- `C:\Users\[USERNAME]\.pm2\pm2.log` - PM2 daemon log

## 🆘 Emergency Recovery

### Complete System Reset
```bash
cd "C:\Program Files\fingerPrintSystem"
pm2 kill                      # Kill PM2 daemon
pm2 start ecosystem.config.js # Start fresh
pm2 save                      # Save state
```

### Reinstall Auto-Start
```bash
cd "C:\Program Files\fingerPrintSystem\scripts"
.\install_autostart.bat
```

### Check System Requirements
```bash
node --version                # Should be v14+ 
npm --version                 # Should be v6+
pm2 --version                 # Should be v4+
python --version              # Should be v3.6+
```

## 📞 Support Information

### System Information
- **Application Port**: 8721
- **Startup Task**: FingerprintSystemAutoStart
- **Project Directory**: C:\Program Files\fingerPrintSystem
- **PM2 Home**: C:\Users\[USERNAME]\.pm2

### Quick Access URLs
- **Application**: http://localhost:8721
- **Task Scheduler**: taskschd.msc
- **Windows Services**: services.msc
- **Windows Firewall**: wf.msc

---

## ✅ Verification Checklist

After a computer restart, verify:

- [ ] Windows startup task exists: `schtasks /query /tn "FingerprintSystemAutoStart"`
- [ ] PM2 processes are running: `pm2 list`
- [ ] Port 8721 is listening: `netstat -an | findstr :8721`
- [ ] Application is accessible: http://localhost:8721
- [ ] No errors in logs: `pm2 logs --lines 10`

If all items are checked, your system is working correctly! 🎉
