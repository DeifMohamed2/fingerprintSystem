# Enhanced PowerShell Startup Script for Fingerprint System
# This script provides better error handling and user context management

param(
    [switch]$Silent = $false
)

# Set up logging
$LogFile = "C:\Program Files\fingerPrintSystem\logs\startup_powershell.log"
$ProjectPath = "C:\Program Files\fingerPrintSystem"

function Write-Log {
    param($Message, $Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry -ErrorAction SilentlyContinue
}

function Test-PM2Installation {
    $PM2Locations = @(
        "$env:APPDATA\npm\pm2.cmd",
        "$env:ProgramFiles\nodejs\pm2.cmd",
        "$env:LOCALAPPDATA\Yarn\bin\pm2.cmd"
    )
    
    foreach ($Location in $PM2Locations) {
        if (Test-Path $Location) {
            return $Location
        }
    }
    
    # Test if PM2 is in PATH
    try {
        $null = Get-Command pm2 -ErrorAction Stop
        return "pm2"
    }
    catch {
        return $null
    }
}

function Start-FingerprintSystem {
    Write-Log "Starting Fingerprint System Auto-Start Script"
    Write-Log "User: $env:USERNAME, Computer: $env:COMPUTERNAME"
    
    # Change to project directory
    Set-Location $ProjectPath
    Write-Log "Working directory: $(Get-Location)"
    
    # Create logs directory if needed
    if (-not (Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" -Force | Out-Null
        Write-Log "Created logs directory"
    }
    
    # Wait for system to boot
    Write-Log "Waiting 20 seconds for system boot completion..."
    Start-Sleep -Seconds 20
    
    # Set execution policy
    try {
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
        Write-Log "Updated PowerShell execution policy"
    }
    catch {
        Write-Log "Warning: Could not update execution policy: $($_.Exception.Message)" -Level "WARN"
    }
    
    # Find PM2
    $PM2Command = Test-PM2Installation
    if (-not $PM2Command) {
        Write-Log "ERROR: PM2 not found! Please install PM2 globally: npm install -g pm2" -Level "ERROR"
        return $false
    }
    
    Write-Log "Found PM2 at: $PM2Command"
    
    # Start PM2 daemon
    Write-Log "Starting PM2 daemon..."
    try {
        $PingResult = & $PM2Command ping 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "PM2 daemon is already running"
        }
        else {
            & $PM2Command list | Out-Null
            Start-Sleep -Seconds 3
            Write-Log "PM2 daemon started"
        }
    }
    catch {
        Write-Log "Error starting PM2 daemon: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
    
    # Try to resurrect processes
    Write-Log "Attempting to restore saved processes..."
    try {
        & $PM2Command resurrect | Out-Null
        Start-Sleep -Seconds 5
    }
    catch {
        Write-Log "Warning: Could not resurrect processes: $($_.Exception.Message)" -Level "WARN"
    }
    
    # Check if processes are running
    $ProcessList = & $PM2Command list --no-colors 2>$null | Out-String
    $AppRunning = $ProcessList -match "fingerPrintApp.*online"
    $ListenerRunning = $ProcessList -match "listener.*online"
    
    if (-not ($AppRunning -and $ListenerRunning)) {
        Write-Log "Starting processes from ecosystem config..."
        try {
            & $PM2Command start ecosystem.config.js
            Start-Sleep -Seconds 5
            & $PM2Command save | Out-Null
            Write-Log "Started processes from ecosystem config"
        }
        catch {
            Write-Log "Error starting from ecosystem config: $($_.Exception.Message)" -Level "ERROR"
            return $false
        }
    }
    
    # Final status check
    $FinalProcessList = & $PM2Command list --no-colors 2>$null | Out-String
    $FinalAppRunning = $FinalProcessList -match "fingerPrintApp.*online"
    $FinalListenerRunning = $FinalProcessList -match "listener.*online"
    
    if ($FinalAppRunning -and $FinalListenerRunning) {
        Write-Log "SUCCESS: Both processes are running!"
        Write-Log "System should be accessible at http://localhost:8721"
        return $true
    }
    else {
        Write-Log "WARNING: Not all processes are running" -Level "WARN"
        if (-not $FinalAppRunning) { Write-Log "- fingerPrintApp: NOT RUNNING" -Level "WARN" }
        if (-not $FinalListenerRunning) { Write-Log "- listener: NOT RUNNING" -Level "WARN" }
        return $false
    }
}

# Main execution
try {
    $Success = Start-FingerprintSystem
    if ($Success) {
        Write-Log "Startup completed successfully"
        exit 0
    }
    else {
        Write-Log "Startup completed with warnings" -Level "WARN"
        exit 1
    }
}
catch {
    Write-Log "Fatal error during startup: $($_.Exception.Message)" -Level "ERROR"
    exit 1
}
finally {
    if (-not $Silent) {
        Read-Host "Press Enter to continue..."
    }
}