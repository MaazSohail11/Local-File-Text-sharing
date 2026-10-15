$t = Get-ScheduledTask -TaskName 'Local Share Shelf' -ErrorAction SilentlyContinue
if (!$t) { Write-Host 'Not installed'; exit 1 }
Get-ScheduledTaskInfo -TaskName 'Local Share Shelf' | Format-List
Get-NetFirewallRule -DisplayName 'Local Share Shelf (Private LAN)' -ErrorAction SilentlyContinue | Format-Table DisplayName,Enabled,Profile,Direction,Action
