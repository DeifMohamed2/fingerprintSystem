# PM2 Setup Complete Guide for Fingerprint System

## Overview
This guide documents the complete process of setting up PM2 (Process Manager 2) for the Fingerprint System to run continuously on Windows, even after reboots.

## What is PM2?
PM2 is a production-ready process manager for Node.js applications. It allows you to:
- Keep applications alive forever
- Reload applications without downtime
- Monitor and manage applications
- Automatically restart applications if they crash
- Start applications at system boot

## System Requirements
- Windows 10/11
- Node.js installed
- Python installed (for listener.py)
- Administrator privileges

## Complete Setup Process

### Step 1: Project Structure
Your fingerprint system should have this structure:
```
fingerPrintSystem/
├── app.js                    # Main Node.js application
├── listener.py              # Python fingerprint device listener
├── ecosystem.config.js      # PM2 configuration file
├── package.json             # Node.js dependencies
├── requirements.txt         # Python dependencies
├── logs/                    # Log files directory (auto-created)
└── scripts/                 # Setup and utility scripts
    ├── setup_pm2_windows_enhanced.ps1
    ├── create_startup_task.bat
    ├── monitor_pm2.bat
    └── install_as_service.bat
```

### Step 2: PM2 Configuration (ecosystem.config.js)
```javascript
module.exports = {
  apps : [
    {
      name: "fingerPrintApp",
      script: "./app.js",
      cwd: "C:\\Program Files\\fingerPrintSystem",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: "10s",
      kill_timeout: 5000,
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      error_file: "./logs/app-error.log",
      out_file: "./logs/app-out.log",
      log_file: "./logs/app-combined.log",
      time: true
    },
    {
      name: "listener",
      script: "./listener.py",
      interpreter: "python",
      cwd: "C:\\Program Files\\fingerPrintSystem",
      instances: 1,
      autorestart: true,
      watch: false,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: "10s",
      kill_timeout: 5000,
      error_file: "./logs/listener-error.log",
      out_file: "./logs/listener-out.log",
      log_file: "./logs/listener-combined.log",
      time: true
    }
  ]
};
```

### Step 3: Automated Setup Script
The enhanced PowerShell script (`scripts/setup_pm2_windows_enhanced.ps1`) handles:

1. **Administrator Check**: Ensures script runs with admin privileges
2. **Directory Creation**: Creates logs directory
3. **PM2 Installation**: Installs PM2 globally via npm
4. **Dependencies**: Installs Node.js and Python dependencies
5. **Process Management**: Starts both applications with PM2
6. **Persistence**: Saves PM2 process list
7. **Startup Configuration**: Creates Windows Scheduled Task
8. **Monitoring**: Creates monitoring script

### Step 4: Manual Setup (Alternative)

If the automated script doesn't work, follow these manual steps:

#### 4.1 Install PM2 Globally
```bash
npm install -g pm2
```

#### 4.2 Install Dependencies
```bash
# Node.js dependencies
npm install

# Python dependencies
pip install -r requirements.txt
```

#### 4.3 Create Logs Directory
```bash
mkdir logs
```

#### 4.4 Start Applications
```bash
pm2 start ecosystem.config.js
```

#### 4.5 Save Process List
```bash
pm2 save
```

#### 4.6 Setup Startup (Windows)
```bash
pm2 startup
```

#### 4.7 Create Windows Scheduled Task
Run the batch script: `scripts/create_startup_task.bat`

### Step 5: Verification

#### 5.1 Check PM2 Status
```bash
pm2 list
```
Expected output:
```
┌─────┬────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name           │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ fingerPrintApp │ default     │ 1.0.0   │ fork    │ 1234     │ 2m     │ 0    │ online    │ 0%       │ 45.2mb   │ user     │ disabled │
│ 1   │ listener       │ default     │ 1.0.0   │ fork    │ 5678     │ 2m     │ 0    │ online    │ 0%       │ 23.1mb   │ user     │ disabled │
└─────┴────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

#### 5.2 Test Automatic Startup
1. Restart your computer
2. Wait for system to boot completely
3. Run `pm2 list` to verify processes are running
4. Check Windows Task Scheduler for "PM2Resurrect" task

#### 5.3 Monitor Logs
```bash
# Real-time logs
pm2 logs

# Specific app logs
pm2 logs fingerPrintApp
pm2 logs listener

# Log files
# Check logs/ directory for:
# - app-error.log
# - app-out.log
# - app-combined.log
# - listener-error.log
# - listener-out.log
# - listener-combined.log
```

## Common Issues and Solutions

### Issue 1: PowerShell Execution Policy
**Error**: `File cannot be loaded because running scripts is disabled`

**Solution**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue 2: Unicode Encoding Errors
**Error**: `'charmap' codec can't encode character`

**Solution**: Remove all Unicode/emoji characters from:
- `listener.py` print statements
- `controllers/employeeController.js` console.log statements
- `public/js/employeeJS/addStudent.js` success/error messages

### Issue 3: PM2 Startup Not Working on Windows
**Error**: `[PM2][ERROR] Init system not found`

**Solution**: This is expected on Windows. Use the Windows Scheduled Task:
```bash
# Run as Administrator
scripts/create_startup_task.bat
```

### Issue 4: Process Not Found
**Error**: `[PM2][ERROR] Process X not found`

**Solution**:
```bash
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

### Issue 5: Port Already in Use
**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Restart PM2
pm2 restart all
```

## Useful PM2 Commands

### Basic Management
```bash
pm2 list                    # Show all processes
pm2 start ecosystem.config.js # Start from config file
pm2 stop all               # Stop all processes
pm2 restart all            # Restart all processes
pm2 delete all             # Delete all processes
pm2 reload all             # Zero-downtime reload
```

### Monitoring
```bash
pm2 monit                  # Real-time monitoring dashboard
pm2 logs                   # Show logs from all apps
pm2 logs fingerPrintApp    # Show logs from specific app
pm2 logs listener          # Show logs from listener
```

### Process Information
```bash
pm2 show fingerPrintApp    # Detailed info about specific process
pm2 describe fingerPrintApp # Same as show
pm2 info all               # Info about all processes
```

### Maintenance
```bash
pm2 save                   # Save current process list
pm2 resurrect              # Restore saved process list
pm2 startup                # Generate startup script
pm2 unstartup              # Remove startup script
```

## Monitoring and Maintenance

### Daily Monitoring
1. Check `pm2 list` to ensure both processes are online
2. Review log files in `logs/` directory
3. Monitor system resources (CPU, memory)

### Weekly Maintenance
1. Review error logs for issues
2. Check for memory leaks
3. Update dependencies if needed
4. Test automatic restart functionality

### Troubleshooting Steps
1. Check PM2 status: `pm2 list`
2. Review logs: `pm2 logs`
3. Check Windows Task Scheduler
4. Verify file permissions
5. Test manual startup: `pm2 resurrect`

## File Locations

### Log Files
- `logs/app-error.log` - Node.js application errors
- `logs/app-out.log` - Node.js application output
- `logs/app-combined.log` - Node.js combined logs
- `logs/listener-error.log` - Python listener errors
- `logs/listener-out.log` - Python listener output
- `logs/listener-combined.log` - Python listener combined logs

### Configuration Files
- `ecosystem.config.js` - PM2 configuration
- `package.json` - Node.js dependencies
- `requirements.txt` - Python dependencies

### Scripts
- `scripts/setup_pm2_windows_enhanced.ps1` - Main setup script
- `scripts/create_startup_task.bat` - Windows startup task
- `scripts/monitor_pm2.bat` - Monitoring dashboard
- `scripts/install_as_service.bat` - Service installation

## Security Considerations

1. **Run as Administrator**: Setup scripts require admin privileges
2. **File Permissions**: Ensure proper permissions on project directory
3. **Network Access**: Applications run on localhost (ports 3000, 5001)
4. **Log Rotation**: Consider implementing log rotation for long-term operation

## Performance Optimization

### Memory Management
- `max_memory_restart: "500M"` - Restart if memory usage exceeds 500MB
- Monitor memory usage with `pm2 monit`

### Restart Strategy
- `max_restarts: 10` - Maximum restart attempts
- `restart_delay: 4000` - 4-second delay between restarts
- `min_uptime: "10s"` - Minimum uptime before considering stable

### Logging
- Separate error and output logs
- Timestamped logs with `time: true`
- Automatic log rotation (configure separately)

## Backup and Recovery

### Backup PM2 Configuration
```bash
pm2 save
# This creates/updates ~/.pm2/dump.pm2
```

### Backup Project Files
- Copy entire project directory
- Include `logs/` directory for troubleshooting
- Backup database files if applicable

### Recovery Process
1. Restore project files
2. Install dependencies: `npm install` and `pip install -r requirements.txt`
3. Restore PM2: `pm2 resurrect`
4. Verify with: `pm2 list`

## Conclusion

This setup ensures your Fingerprint System runs continuously and reliably. The system will:

✅ **Run 24/7** - Applications stay alive forever  
✅ **Auto-restart** - Restart automatically if they crash  
✅ **Start on boot** - Begin running when Windows starts  
✅ **Monitor health** - Track performance and errors  
✅ **Log everything** - Comprehensive logging for troubleshooting  

For support or issues, check the log files first, then use the monitoring commands to diagnose problems.


