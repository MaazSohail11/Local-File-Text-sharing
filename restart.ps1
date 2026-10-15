Stop-ScheduledTask -TaskName 'Local Share Shelf' -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Start-ScheduledTask -TaskName 'Local Share Shelf'
