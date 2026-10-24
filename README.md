# Local Share Shelf

## A tiny private sharing shelf for your home network

Send screenshots, files, folders, notes, and links between your Windows PC and phone using one bookmarked browser address.

No accounts. No cloud. No subscription. No phone app. No internet connection required after installation.

> **Host it on your PC · open it from any trusted device on your home LAN**

<p align="center">
  <img src="public/favicon.svg" width="72" height="72" alt="Sharing shelf icon">
</p>

## Quick start

### 1. Install once

Install [Node.js 20+](https://nodejs.org/) on the Windows PC. Then open **PowerShell as Administrator** in this project folder:

```powershell
.\install.ps1
.\start.ps1
```

If Windows blocks scripts:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\install.ps1
powershell.exe -ExecutionPolicy Bypass -File .\start.ps1
```

### 2. Open it on the PC

```text
http://localhost:48721
```

### 3. Open it on your phone

Find the PC's home-network IPv4 address:

```powershell
ipconfig
```

Then open this pattern on your phone, while connected to the same home Wi-Fi:

```text
http://PC-IP:48721
```

Example:

```text
http://192.168.1.240:48721
```

Bookmark the working address. For a stable bookmark, reserve the PC's address in your router's DHCP settings.

### Desktop control panel

Installation also provides a Desktop shortcut named **Local Share Shelf**. Double-click it for a simple control panel with **Start**, **Stop**, **Restart**, **Open in Browser**, **Open Data Folder**, **Open Installed App**, **Open Source Folder**, **Open README**, **Copy PC Address**, and live status controls.

## What you can do

| Action | How it works |
| --- | --- |
| Upload files | Select one or many files, or drag and drop them |
| Upload folders | Desktop folder selection preserves relative paths |
| Download folders | One click downloads the folder as a ZIP |
| Share screenshots | Press `Ctrl+V` anywhere outside a text field |
| Share text and links | Type or paste into the note box and click **Share** |
| Stay in sync | Open browsers update automatically through live events |
| Copy quickly | Copy text or a shareable download link; manual fallback is included |
| Keep everything | Items remain until you delete them; no automatic expiry |
| Avoid collisions | Duplicate filenames never overwrite older uploads |

The phone uses its normal photo/file picker. Mobile browsers generally do not support arbitrary folder selection or silent saving to a chosen folder.

## Built for a home LAN

```text
                 home Wi-Fi / Ethernet
        ┌────────────────────────────────┐
        │                                │
   Windows PC                         Phone
   hosts shelf  ◄──── browser ────►  browser
   stores files
```

The PC needs to be powered on and awake. Internet service is not needed for everyday use, but the router/network must remain active.

## Security and privacy

This is intentionally a **no-login shelf**. Any device that can reach the permitted home LAN and discover the address may be able to view, upload, download, or delete items. Use it only on a trusted private network; do not expose it to the internet.

Protection included in the application:

- Windows Firewall rule restricted to the **Private** profile and `LocalSubnet`.
- No public URLs, tunnels, port forwarding, UPnP, cloud storage, telemetry, or analytics.
- Host and Origin validation; no permissive CORS.
- Cross-origin write attempts are rejected.
- Filename, folder path, ZIP entry, and URL handling is constrained.
- Path traversal such as `..` cannot escape the storage area.
- Generated internal storage names prevent accidental overwrites.
- Active uploads are served as downloads with `nosniff` instead of executing under the app origin.
- Notes and filenames are escaped before display.
- Pasted URLs are never fetched automatically.
- Large transfers stream to and from disk instead of loading whole files into memory.

## Windows startup

Installation creates a Task Scheduler startup task that runs as the restricted `NT AUTHORITY\LocalService` account. It starts at boot without requiring an open terminal or logged-in desktop and retries after failures.

```powershell
.\status.ps1
.\start.ps1
.\stop.ps1
.\restart.ps1
```

To remove the startup task and firewall rule while preserving uploads:

```powershell
.\uninstall.ps1
```

## Where data lives

Uploads are kept outside the source folder so application updates do not erase them:

```text
C:\ProgramData\LocalShareShelf\app       Installed runnable copy
C:\ProgramData\LocalShareShelf\files     Uploaded file bytes
C:\ProgramData\LocalShareShelf\items.json Metadata
C:\ProgramData\LocalShareShelf\tmp       Partial uploads
C:\ProgramData\LocalShareShelf\logs      Rotating server logs
```

Logs rotate at approximately 5 MiB. Uninstall preserves the whole data directory.

## Backup and update

Stop the shelf, copy `%ProgramData%\LocalShareShelf` somewhere safe, then start it again:

```powershell
.\stop.ps1
# Copy C:\ProgramData\LocalShareShelf to your backup location
.\start.ps1
```

To update the application while preserving uploads:

```powershell
.\stop.ps1
# Replace the source files with the new version
.\install.ps1
.\restart.ps1
```

## Troubleshooting

### Phone cannot connect

- Confirm both devices are on the same primary home Wi-Fi.
- Do not use guest Wi-Fi; guest/client isolation often blocks device-to-device access.
- Check the PC profile:

  ```powershell
  Get-NetConnectionProfile
  ```

  The home adapter should be `Private`.

- Test the port from another Windows device:

  ```powershell
  Test-NetConnection PC-IP -Port 48721
  ```

- If the address changed, run `ipconfig` again and update the bookmark or configure a DHCP reservation.

### Check whether the shelf is running

```powershell
.\status.ps1
Invoke-WebRequest -UseBasicParsing http://localhost:48721/
```

### PC sleeps

The shelf cannot serve files while the PC is asleep. This project does not change Windows sleep settings.

## Development checks

```powershell
npm test
node --check server.js
node --check public/app.js
```

The test suite covers file integrity, duplicate names, notes, links, folder ZIP paths, persistence after restart, unsafe paths, and cross-origin mutation rejection.

## More detail

See the complete [usage, security, backup, and troubleshooting guide](USAGE.md).

## License

No license has been selected yet. Add one before distributing this project publicly.
