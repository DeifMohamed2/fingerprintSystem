$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Start Fingerprint System.lnk")
$Shortcut.TargetPath = "C:\Program Files\fingerPrintSystem\scripts\startup_fix_complete.bat"
$Shortcut.WorkingDirectory = "C:\Program Files\fingerPrintSystem"
$Shortcut.Description = "Start Fingerprint System Manually"
$Shortcut.Save()
Write-Host "Desktop shortcut created successfully!"