# PM2 Quick Reference Card

## 🚀 Essential Commands

### Check Status
```bash
pm2 list                    # Show all processes
pm2 status                  # Same as list
pm2 monit                   # Real-time monitoring dashboard
```

### Start/Stop/Restart
```bash
pm2 start ecosystem.config.js    # Start from config
pm2 restart all                  # Restart all processes
pm2 stop all                     # Stop all processes
pm2 delete all                   # Delete all processes
pm2 reload all                   # Zero-downtime reload
```

### Logs
```bash
pm2 logs                       # All logs (real-time)
pm2 logs fingerPrintApp        # Specific app logs
pm2 logs listener              # Listener logs only
pm2 flush                      # Clear all logs
```

### Save/Restore
```bash
pm2 save                       # Save current processes
pm2 resurrect                  # Restore saved processes
pm2 startup                    # Setup auto-start
pm2 unstartup                  # Remove auto-start
```

## 🔧 Troubleshooting Commands

### Process Information
```bash
pm2 show fingerPrintApp        # Detailed process info
pm2 describe fingerPrintApp    # Same as show
pm2 info all                   # All processes info
```

### Debugging
```bash
pm2 logs --lines 100          # Show last 100 log lines
pm2 restart fingerPrintApp    # Restart specific process
pm2 delete fingerPrintApp     # Delete specific process
```

### System Check
```bash
pm2 ping                       # Check PM2 daemon
pm2 kill                       # Kill PM2 daemon
pm2 update                     # Update PM2
```

## 📁 File Locations

### Logs Directory
```
logs/
├── app-error.log
├── app-out.log
├── app-combined.log
├── listener-error.log
├── listener-out.log
└── listener-combined.log
```

### PM2 Files
```
~/.pm2/
├── dump.pm2                   # Saved process list
├── pm2.log                    # PM2 daemon log
└── pids/                      # Process ID files
```

## 🚨 Emergency Commands

### If PM2 is not responding
```bash
pm2 kill                       # Kill PM2 daemon
pm2 start ecosystem.config.js  # Start fresh
pm2 save                       # Save the state
```

### If processes won't start
```bash
pm2 delete all                 # Clean slate
npm install                    # Reinstall dependencies
pm2 start ecosystem.config.js  # Start again
```

### If startup is broken
```bash
pm2 unstartup                  # Remove startup
scripts/create_startup_task.bat # Recreate Windows task
pm2 startup                    # Setup again
```

## 📊 Monitoring Shortcuts

### Quick Health Check
```bash
pm2 list && pm2 logs --lines 10
```

### Resource Usage
```bash
pm2 monit                      # Visual monitoring
pm2 show all                   # Detailed resource info
```

### Log Analysis
```bash
pm2 logs --lines 50 | findstr "ERROR"    # Windows
pm2 logs --lines 50 | grep "ERROR"       # Unix/Linux
```

## 🔄 Maintenance Routine

### Daily Check (30 seconds)
1. `pm2 list` - Are both processes online?
2. `pm2 logs --lines 5` - Any errors?

### Weekly Check (2 minutes)
1. `pm2 monit` - Resource usage OK?
2. Check log file sizes in `logs/` directory
3. `pm2 save` - Backup current state

### Monthly Check (5 minutes)
1. Review error logs for patterns
2. Update dependencies if needed
3. Test restart: `pm2 restart all`

## 🎯 Common Scenarios

### After System Reboot
```bash
pm2 list                       # Should show processes running
# If not running:
pm2 resurrect                  # Restore saved processes
```

### After Code Changes
```bash
pm2 reload all                 # Zero-downtime update
# Or if reload fails:
pm2 restart all                # Full restart
```

### When Adding New Features
```bash
pm2 stop all                   # Stop processes
# Make changes to code
pm2 start ecosystem.config.js  # Start with new code
pm2 save                       # Save new state
```

### Before System Maintenance
```bash
pm2 stop all                   # Graceful shutdown
# Do maintenance
pm2 start ecosystem.config.js  # Restart after maintenance
```

## 📞 Support Commands

### Get Help
```bash
pm2 --help                     # General help
pm2 start --help               # Start command help
pm2 logs --help                # Logs command help
```

### Version Info
```bash
pm2 --version                  # PM2 version
node --version                 # Node.js version
python --version               # Python version
```

### System Info
```bash
pm2 info all                   # Process details
systeminfo                     # Windows system info
```

---

## 💡 Pro Tips

1. **Always use `pm2 save`** after making changes
2. **Check logs regularly** to catch issues early
3. **Use `pm2 reload`** for zero-downtime updates
4. **Monitor memory usage** with `pm2 monit`
5. **Keep backups** of your `ecosystem.config.js`

## 🆘 Emergency Contacts

- **Logs**: Check `logs/` directory first
- **Status**: Use `pm2 list` to see current state
- **Restart**: Use `pm2 restart all` for quick fix
- **Clean Start**: Use `pm2 delete all && pm2 start ecosystem.config.js`


