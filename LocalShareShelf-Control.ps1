Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$Port = 48721
$Url = "http://localhost:$Port"
$TaskName = 'Local Share Shelf'
$DataRoot = Join-Path ($env:ProgramData) 'LocalShareShelf'
$SourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstalledRoot = Join-Path $DataRoot 'app'

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Local Share Shelf'
$form.StartPosition = 'CenterScreen'
$form.Size = New-Object System.Drawing.Size(560,430)
$form.MinimumSize = New-Object System.Drawing.Size(560,430)
$form.BackColor = [System.Drawing.Color]::FromArgb(247,249,252)
$form.Font = New-Object System.Drawing.Font('Segoe UI',10)

$title = New-Object System.Windows.Forms.Label
$title.Text = 'Local Share Shelf'
$title.Font = New-Object System.Drawing.Font('Segoe UI',20,[System.Drawing.FontStyle]::Bold)
$title.ForeColor = [System.Drawing.Color]::FromArgb(24,80,125)
$title.Location = New-Object System.Drawing.Point(28,22)
$title.AutoSize = $true
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Private home-network sharing · dedicated port $Port"
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(92,105,120)
$subtitle.Location = New-Object System.Drawing.Point(31,62)
$subtitle.AutoSize = $true
$form.Controls.Add($subtitle)

$status = New-Object System.Windows.Forms.Label
$status.Text = 'Checking status…'
$status.Font = New-Object System.Drawing.Font('Segoe UI',11,[System.Drawing.FontStyle]::Bold)
$status.Location = New-Object System.Drawing.Point(31,98)
$status.AutoSize = $true
$form.Controls.Add($status)

$urlBox = New-Object System.Windows.Forms.TextBox
$urlBox.Text = $Url
$urlBox.ReadOnly = $true
$urlBox.Location = New-Object System.Drawing.Point(31,128)
$urlBox.Size = New-Object System.Drawing.Size(480,28)
$form.Controls.Add($urlBox)

function Button($text,$x,$y,$width=150) {
  $b = New-Object System.Windows.Forms.Button
  $b.Text = $text
  $b.Location = New-Object System.Drawing.Point($x,$y)
  $b.Size = New-Object System.Drawing.Size($width,36)
  $b.FlatStyle = 'System'
  $form.Controls.Add($b)
  return $b
}

$start = Button 'Start' 31 178 110
$stop = Button 'Stop' 151 178 110
$restart = Button 'Restart' 271 178 110
$browser = Button 'Open in Browser' 391 178 120

$data = Button 'Open Data Folder' 31 230 150
$installed = Button 'Open Installed App' 191 230 150
$source = Button 'Open Source Folder' 351 230 160
$readme = Button 'Open README' 31 282 150
$copy = Button 'Copy PC Address' 191 282 150
$refresh = Button 'Refresh Status' 351 282 160

$info = New-Object System.Windows.Forms.Label
$info.Text = "Stored files: $DataRoot\files`r`nThe service runs as LocalService at boot. Port $Port is reserved for this app."
$info.ForeColor = [System.Drawing.Color]::FromArgb(92,105,120)
$info.Location = New-Object System.Drawing.Point(31,335)
$info.Size = New-Object System.Drawing.Size(480,45)
$form.Controls.Add($info)

function Refresh-Status {
  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($listener) {
    $status.Text = "● Running · port $Port · PID $($listener.OwningProcess)"
    $status.ForeColor = [System.Drawing.Color]::FromArgb(20,125,67)
  } elseif ($task -and $task.State -eq 'Running') {
    $status.Text = 'Starting…'
    $status.ForeColor = [System.Drawing.Color]::FromArgb(180,115,0)
  } else {
    $status.Text = '○ Stopped'
    $status.ForeColor = [System.Drawing.Color]::FromArgb(180,45,35)
  }
}
function Run-Task($action) {
  try { & $action -TaskName $TaskName -ErrorAction Stop; Start-Sleep -Milliseconds 700; Refresh-Status }
  catch { [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'Local Share Shelf','OK','Error') | Out-Null }
}
$start.Add_Click({ Run-Task Start-ScheduledTask })
$stop.Add_Click({ Run-Task Stop-ScheduledTask })
$restart.Add_Click({ try { Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 500; Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop; Start-Sleep -Milliseconds 900; Refresh-Status } catch { [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'Local Share Shelf','OK','Error') | Out-Null } })
$browser.Add_Click({ Start-Process $Url })
$data.Add_Click({ Start-Process explorer.exe $DataRoot })
$installed.Add_Click({ Start-Process explorer.exe $InstalledRoot })
$source.Add_Click({ Start-Process explorer.exe $SourceRoot })
$readme.Add_Click({ Start-Process notepad.exe (Join-Path $SourceRoot 'README.md') })
$copy.Add_Click({ [System.Windows.Forms.Clipboard]::SetText($Url); [System.Windows.Forms.MessageBox]::Show('Copied: ' + $Url,'Local Share Shelf','OK','Information') | Out-Null })
$refresh.Add_Click({ Refresh-Status })
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 2000
$timer.Add_Tick({ Refresh-Status })
$timer.Start()
Refresh-Status
[void]$form.ShowDialog()
$timer.Stop()
