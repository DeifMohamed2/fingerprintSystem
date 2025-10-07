<#
Enhanced PowerShell script to setup PM2 on Windows for continuous operation
This script ensures your fingerprint system runs 24/7, even after reboots
Run PowerShell as Administrator to execute this script.
#>

param(
    [switch]$Force
)

# Function to write colored output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check if running as administrator
if (-not (Test-Administrator)) {
    Write-ColorOutput Red "ERROR: This script must be run as Administrator!"
    Write-ColorOutput Yellow "Please right-click PowerShell and select 'Run as Administrator'"
    Read-Host "Press Enter to exit"
    exit 1
}

# Get script directory and project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir
Set-Location ..
$projectRoot = Get-Location
Write-ColorOutput Green "Project root: $projectRoot"

# Create logs directory if it doesn't exist
$logsDir = Join-Path $projectRoot "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Write-ColorOutput Green "Created logs directory: $logsDir"
}

Write-ColorOutput Cyan "=== Fingerprint System PM2 Setup ==="
Write-ColorOutput Yellow "This will install PM2 and configure your system to run continuously"

# Step 1: Install PM2 globally
Write-ColorOutput Cyan "Step 1: Installing PM2 globally..."
try {
    npm install -g pm2
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✓ PM2 installed successfully"
    } else {
        throw "npm install failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-ColorOutput Red "✗ Failed to install PM2: $_"
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 2: Install Node dependencies
Write-ColorOutput Cyan "Step 2: Installing Node.js dependencies..."
try {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✓ Node.js dependencies installed"
    } else {
        throw "npm install failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-ColorOutput Red "✗ Failed to install Node.js dependencies: $_"
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 3: Install Python requirements
Write-ColorOutput Cyan "Step 3: Installing Python requirements..."
$pythonInstalled = $false
if (Get-Command python -ErrorAction SilentlyContinue) {
    try {
        python -m pip install --user -r requirements.txt
        $pythonInstalled = $true
        Write-ColorOutput Green "✓ Python requirements installed"
    } catch {
        Write-ColorOutput Yellow "⚠ Python requirements installation failed, but continuing..."
    }
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    try {
        python3 -m pip install --user -r requirements.txt
        $pythonInstalled = $true
        Write-ColorOutput Green "✓ Python requirements installed"
    } catch {
        Write-ColorOutput Yellow "⚠ Python requirements installation failed, but continuing..."
    }
} else {
    Write-ColorOutput Yellow "⚠ Python not found in PATH - skipping Python dependencies"
}

# Step 4: Stop existing PM2 processes if any
Write-ColorOutput Cyan "Step 4: Stopping any existing PM2 processes..."
try {
    pm2 stop all 2>$null
    pm2 delete all 2>$null
    Write-ColorOutput Green "✓ Cleared existing PM2 processes"
} catch {
    Write-ColorOutput Yellow "⚠ No existing processes to clear (this is normal for first setup)"
}

# Step 5: Start processes using PM2
Write-ColorOutput Cyan "Step 5: Starting processes with PM2..."
try {
    pm2 start ecosystem.config.js
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✓ Processes started successfully"
    } else {
        throw "PM2 start failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-ColorOutput Red "✗ Failed to start processes: $_"
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 6: Save PM2 process list
Write-ColorOutput Cyan "Step 6: Saving PM2 process list..."
try {
    pm2 save
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✓ PM2 process list saved"
    } else {
        throw "PM2 save failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-ColorOutput Red "✗ Failed to save PM2 process list: $_"
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 7: Setup PM2 startup script
Write-ColorOutput Cyan "Step 7: Setting up PM2 startup script..."
try {
    pm2 startup
    Write-ColorOutput Green "✓ PM2 startup script configured"
} catch {
    Write-ColorOutput Red "✗ Failed to setup PM2 startup: $_"
}

# Step 8: Create Windows Scheduled Task for automatic startup
Write-ColorOutput Cyan "Step 8: Creating Windows Scheduled Task for automatic startup..."

# Find PM2 executable
$pm2Paths = @(
    "$env:APPDATA\npm\pm2.cmd",
    "$env:ProgramFiles\nodejs\npm.cmd",
    "$env:ProgramFiles(x86)\nodejs\npm.cmd",
    "pm2"
)

$pm2Cmd = $null
foreach ($path in $pm2Paths) {
    if (Test-Path $path) {
        $pm2Cmd = $path
        break
    }
}

if (-not $pm2Cmd) {
    # Try to find pm2 in PATH
    try {
        $pm2Cmd = (Get-Command pm2).Source
    } catch {
        $pm2Cmd = "pm2"
    }
}

Write-ColorOutput Yellow "Using PM2 command: $pm2Cmd"

# Remove existing task if it exists
try {
    Unregister-ScheduledTask -TaskName "PM2Resurrect" -Confirm:$false -ErrorAction SilentlyContinue
} catch {
    # Task doesn't exist, which is fine
}

# Create new scheduled task
try {
    $action = New-ScheduledTaskAction -Execute $pm2Cmd -Argument "resurrect" -WorkingDirectory $projectRoot
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    Register-ScheduledTask -TaskName "PM2Resurrect" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Automatically resurrect PM2 processes at Windows startup" -Force
    
    Write-ColorOutput Green "✓ Windows Scheduled Task created successfully"
} catch {
    Write-ColorOutput Red "✗ Failed to create Scheduled Task: $_"
    Write-ColorOutput Yellow "You may need to run PM2 startup manually: pm2 startup"
}

# Step 9: Show current status
Write-ColorOutput Cyan "Step 9: Current PM2 status..."
pm2 list

# Step 10: Create a monitoring script
Write-ColorOutput Cyan "Step 10: Creating monitoring script..."
$monitorScript = @"
@echo off
echo Fingerprint System PM2 Monitor
echo =============================
echo.
echo Current PM2 Status:
pm2 list
echo.
echo Recent logs:
pm2 logs --lines 10
echo.
pause
"@

$monitorScriptPath = Join-Path $projectRoot "scripts\monitor_pm2.bat"
$monitorScript | Out-File -FilePath $monitorScriptPath -Encoding ASCII

Write-ColorOutput Green "✓ Monitoring script created at: $monitorScriptPath"

# Final instructions
Write-ColorOutput Green "`n=== Setup Complete! ==="
Write-ColorOutput Yellow "Your fingerprint system is now configured to run continuously!"
Write-ColorOutput White "`nWhat was configured:"
Write-ColorOutput White "• PM2 installed globally"
Write-ColorOutput White "• Node.js and Python dependencies installed"
Write-ColorOutput White "• Both app.js and listener.py are running"
Write-ColorOutput White "• Processes will auto-restart if they crash"
Write-ColorOutput White "• Processes will start automatically after Windows reboot"
Write-ColorOutput White "• Log files are saved in the 'logs' directory"

Write-ColorOutput White "`nUseful commands:"
Write-ColorOutput White "• pm2 list          - Show running processes"
Write-ColorOutput White "• pm2 logs          - Show real-time logs"
Write-ColorOutput White "• pm2 restart all   - Restart all processes"
Write-ColorOutput White "• pm2 stop all      - Stop all processes"
Write-ColorOutput White "• scripts\monitor_pm2.bat - Open monitoring dashboard"

Write-ColorOutput Green "`nYour system is ready! The fingerprint system will run continuously."
Write-ColorOutput Yellow "You can now close this window and reboot your computer to test automatic startup."

Read-Host "`nPress Enter to exit"

