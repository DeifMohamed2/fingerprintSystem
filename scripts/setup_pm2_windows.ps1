<#
Simple PowerShell script to prepare PM2 on Windows and register a Scheduled Task
Run PowerShell as Administrator to execute this script.
#>

param()

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
Set-Location ..
$project = Get-Location
Write-Host "Project root: $project"

Write-Host "1) Install PM2 globally (requires Node/npm installed)."
npm install -g pm2

Write-Host "2) Install Node dependencies"
npm install

Write-Host "3) (Optional) Install Python requirements (if python3 in PATH)"
if (Get-Command python -ErrorAction SilentlyContinue) {
    python -m pip install --user -r requirements.txt
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    python3 -m pip install --user -r requirements.txt
} else {
    Write-Host "python not found in PATH — skip Python deps."
}

Write-Host "4) Start processes using PM2 (use pm2.cmd path if needed)"
$pm2 = "$env:APPDATA\npm\pm2.cmd"
if (Test-Path $pm2) { $pm2Cmd = $pm2 } else { $pm2Cmd = "pm2" }
& $pm2Cmd start ecosystem.config.js

Write-Host "5) Save the PM2 process list"
& $pm2Cmd save

Write-Host "6) Create Scheduled Task to run 'pm2 resurrect' at system startup"
$action = New-ScheduledTaskAction -Execute "$pm2Cmd" -Argument "resurrect"
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest
Register-ScheduledTask -TaskName "PM2Resurrect" -Action $action -Trigger $trigger -Principal $principal -Description "Resurrect PM2 processes at startup" -Force

Write-Host "Setup complete. Reboot the machine and run 'pm2 list' to verify processes are restored."