# Removes the startup task and firewall rule only. Uploaded data is intentionally preserved.
$ErrorActionPreference = 'SilentlyContinue'
Stop-ScheduledTask -TaskName 'Local Share Shelf'
schtasks.exe /Delete /TN 'Local Share Shelf' /F | Out-Null
Remove-NetFirewallRule -DisplayName 'Local Share Shelf (Private LAN)'
Write-Host 'Uninstalled startup and firewall configuration. Data was preserved.'
