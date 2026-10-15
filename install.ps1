# Run once from an elevated PowerShell. Installs a LocalService startup task and a Private-profile, local-subnet firewall rule.
$ErrorActionPreference = 'Stop'
$App = (Resolve-Path $PSScriptRoot).Path
$Data = if ($env:ProgramData) { Join-Path $env:ProgramData 'LocalShareShelf' } else { Join-Path $App 'data' }
$Node = (Get-Command node.exe -ErrorAction Stop).Source
 $InstallRoot = Join-Path $Data 'app'
New-Item -ItemType Directory -Force -Path $Data, $InstallRoot, (Join-Path $Data 'files'), (Join-Path $Data 'tmp'), (Join-Path $Data 'logs') | Out-Null
Copy-Item -LiteralPath (Join-Path $App 'server.js') -Destination $InstallRoot -Force
Copy-Item -LiteralPath (Join-Path $App 'package.json') -Destination $InstallRoot -Force
if (Test-Path (Join-Path $InstallRoot 'public')) { Remove-Item -LiteralPath (Join-Path $InstallRoot 'public') -Recurse -Force }
Copy-Item -LiteralPath (Join-Path $App 'public') -Destination $InstallRoot -Recurse -Force
icacls $Data /inheritance:r /grant:r 'NT AUTHORITY\LOCAL SERVICE:(OI)(CI)(M)' 'BUILTIN\Administrators:(OI)(CI)(F)' | Out-Null
icacls $App /grant:r 'NT AUTHORITY\LOCAL SERVICE:(OI)(CI)(RX)' | Out-Null
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1)
$action = New-ScheduledTaskAction -Execute $Node -Argument ('"' + (Join-Path $InstallRoot 'server.js') + '"')
$principal = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\LocalService' -LogonType ServiceAccount -RunLevel Limited
Register-ScheduledTask -TaskName 'Local Share Shelf' -Action $action -Principal $principal -Settings $settings -Force | Out-Null
Get-NetFirewallRule -DisplayName 'Local Share Shelf (Private LAN)' -ErrorAction SilentlyContinue | Remove-NetFirewallRule -Confirm:$false -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName 'Local Share Shelf (Private LAN)' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 48721 -Profile Private -RemoteAddress LocalSubnet -Program $Node | Out-Null
Write-Host "Installed. Data: $Data"
Write-Host "Start now with: .\start.ps1"
