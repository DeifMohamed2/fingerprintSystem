# PowerShell script to install Fingerprint System as Windows Service
# Run this as Administrator

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Installing Fingerprint System Auto-Start Service" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Running as Administrator - OK" -ForegroundColor Green
Write-Host ""

# Get the project directory
$ProjectRoot = "C:\Program Files\fingerPrintSystem"
$StartupScript = "$ProjectRoot\scripts\start_pm2_auto.bat"

Write-Host "Project root: $ProjectRoot" -ForegroundColor Yellow
Write-Host "Startup script: $StartupScript" -ForegroundColor Yellow
Write-Host ""

# Check if startup script exists
if (-not (Test-Path $StartupScript)) {
    Write-Host "ERROR: Startup script not found at $StartupScript" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Remove existing scheduled task if it exists
Write-Host "Removing existing startup task (if any)..." -ForegroundColor Yellow
schtasks /delete /tn "FingerprintSystemAutoStart" /f 2>$null

# Create new scheduled task
Write-Host "Creating Windows startup task..." -ForegroundColor Yellow
$TaskAction = "schtasks /create /tn `"FingerprintSystemAutoStart`" /tr `"$StartupScript`" /sc onstart /ru `"SYSTEM`" /rl highest /f"

try {
    Invoke-Expression $TaskAction
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Windows startup task created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "The task 'FingerprintSystemAutoStart' will run at Windows startup" -ForegroundColor Cyan
        Write-Host "and automatically start your fingerprint system processes." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "You can verify the task exists by:" -ForegroundColor Yellow
        Write-Host "1. Opening Task Scheduler (taskschd.msc)" -ForegroundColor White
        Write-Host "2. Looking for 'FingerprintSystemAutoStart' in the Task Scheduler Library" -ForegroundColor White
        Write-Host ""
        Write-Host "To test: Restart your computer and check if the system is running" -ForegroundColor Cyan
        Write-Host "at http://localhost:8721" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "✗ Failed to create startup task!" -ForegroundColor Red
        Write-Host "Error code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "✗ Error creating startup task: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Additional setup options:" -ForegroundColor Yellow
Write-Host "1. Install as Windows Service: scripts\install_as_service.bat" -ForegroundColor White
Write-Host "2. Manual startup: scripts\start_pm2_auto.bat" -ForegroundColor White
Write-Host "3. Monitor system: pm2 monit" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
