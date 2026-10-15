# Local Share Shelf — Complete Usage Guide

Local Share Shelf is a private file, image, text, and link sharing shelf for devices on the same trusted home network. The Windows PC hosts the application and stores the data. Phones and other computers use an ordinary browser; they do not need an app, extension, account, or internet connection.

## What it does

- Upload one or many files.
- Drag and drop files from a desktop.
- Upload a desktop folder while preserving relative paths.
- Download an uploaded folder as a ZIP file.
- Paste screenshots with `Ctrl+V` outside editable fields.
- Share notes and links.
- Show image previews, filenames, sizes, and upload times.
- Download, copy, copy-link, and delete items directly from the feed.
- Clear all items after an explicit confirmation.
- Update all connected browser windows automatically through Server-Sent Events.
- Show connection, reconnection, upload progress, and useful errors.
- Keep data after browser closure, server restart, Windows reboot, router restart, or internet loss.
- Avoid overwriting duplicate filenames by storing every upload under a generated storage name.

## Requirements

- Windows PC that stays powered on and awake when the shelf needs to be available.
- Node.js 20 or newer for installation and runtime.
- A phone or other device connected to the same home LAN/Wi-Fi.
- No everyday internet connection is required.

Mobile browsers use their normal file/photo picker. Arbitrary folder selection and silent saving to a chosen phone folder are browser limitations and are not promised.

## First-time installation

Extract the project ZIP to a stable folder. Do not delete or move that folder after installation unless you reinstall from the new location.

Open **PowerShell as Administrator** in the extracted project folder and run:

```powershell
.\install.ps1
.\start.ps1
```

If PowerShell script execution is restricted:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\install.ps1
powershell.exe -ExecutionPolicy Bypass -File .\start.ps1
```

Administrator approval is needed for the one-time machine setup:

1. Copying the runnable application to `%ProgramData%\LocalShareShelf\app`.
2. Granting the restricted `NT AUTHORITY\LocalService` account access to the application and data directories.
3. Creating the boot startup task.
4. Creating the Windows Firewall rule.

The application itself does not run as Administrator or LocalSystem.

## Open it on the PC

Open:

```text
http://localhost:48721
```

The default port is `48721`.

## Configure the PC network address

On the PC, run:

```powershell
ipconfig
```

Find the IPv4 address for the adapter connected to your home router. Ignore loopback, VPN, Hyper-V, VirtualBox, and disconnected adapters.

The address observed during setup was:

```text
192.168.1.240
```

It may change later unless reserved in the router.

On the phone, connected to the same home Wi-Fi, open:

```text
http://192.168.1.240:48721
```

Replace `192.168.1.240` if the PC's address changes. Bookmark the working address.

For a stable bookmark, open the router's DHCP reservation page and reserve the PC's current address using its network adapter MAC address. This application does not modify router settings.

## Daily use

### Files

Click **Upload files**, choose multiple files, or drag files into the large drop area. On a desktop, click **Upload a folder** to select a folder. Folder uploads preserve browser-provided relative paths and appear as a folder entry with a ZIP download action.

### Screenshots

Take a screenshot on the PC, click somewhere outside the note field, and press:

```text
Ctrl+V
```

The pasted image uploads automatically. Normal text pasting into the note field is not intercepted.

### Notes and links

Type a note or paste a link into the text box and click **Share**. Links are displayed as clickable links but are never fetched automatically by the server.

### Copying

The Copy button uses the browser Clipboard API where available. On local HTTP pages where clipboard access is restricted, a manual copy prompt is provided instead.

### Deleting

Use an item's **Delete** button for individual deletion. **Clear all** requires confirmation. Deleted files are removed from the persistent shelf and are not recoverable through the application.

## Startup and management

The application starts at Windows boot through a Task Scheduler startup task, before a normal desktop login is required. It runs as the restricted LocalService account and is configured to retry after failures.

Run these commands from the project folder:

```powershell
.\status.ps1
.\start.ps1
.\stop.ps1
.\restart.ps1
```

After restarting Windows, wait approximately 30–60 seconds and open the bookmarked address.

To uninstall the startup task and firewall rule while preserving all uploaded data:

```powershell
.\uninstall.ps1
```

Uninstall does not delete `%ProgramData%\LocalShareShelf`.

## Storage locations

The installer uses:

```text
%ProgramData%\LocalShareShelf\app       Installed runnable copy
%ProgramData%\LocalShareShelf\files     Uploaded file bytes
%ProgramData%\LocalShareShelf\items.json Metadata database
%ProgramData%\LocalShareShelf\tmp       Incomplete upload temporary files
%ProgramData%\LocalShareShelf\logs      Rotating server logs
```

The current log is `logs\server.log`; it rotates after approximately 5 MiB and keeps one `.1` file.

## Backup and restore

Stop the application before backing up:

```powershell
.\stop.ps1
```

Copy the entire directory `%ProgramData%\LocalShareShelf` to a safe backup location. This includes `items.json` and `files`. You may omit stale `.part` files under `tmp`.

Restart afterward:

```powershell
.\start.ps1
```

To move the shelf to another PC, install the application there, stop it, replace its `%ProgramData%\LocalShareShelf` data directory with the backup, then start it.

## Security model

This application intentionally has no login. Anyone who can reach the allowed LAN address and port may be able to view, upload, download, or delete shelf contents. Use it only on a trusted private network.

Security protections included:

- Windows Firewall rule limited to the Private profile and `LocalSubnet`.
- No public hosting, port forwarding, UPnP, tunnels, cloud storage, or internet discovery.
- Server-side Host and Origin validation.
- No permissive CORS policy.
- Cross-origin mutation attempts are rejected.
- Uploaded filenames and relative paths are sanitized.
- Path traversal components such as `..` cannot escape the storage area.
- Files are stored with generated internal names rather than user-controlled paths.
- Active formats are served as downloads with `X-Content-Type-Options: nosniff` rather than executed as application-origin content.
- Notes and filenames are escaped before display in the browser.
- Pasted URLs are displayed but never fetched automatically.
- Uploads are streamed to disk rather than loaded entirely into memory.
- A practical per-file upload limit is enforced; the default is 5 GiB.
- Incomplete uploads use temporary files and are removed when safely detected.

Important limitations:

- There is no authentication or per-user permission system.
- A compromised or untrusted device on the permitted LAN can access the shelf.
- Windows Firewall only protects the configured machine/network boundary; it does not replace Wi-Fi security.
- Do not expose the port to Public networks or the internet.
- Keep Windows, the browser, and the trusted home router secured.

## Troubleshooting

### PC works but phone cannot connect

Check that both devices are on the same non-guest Wi-Fi. Guest Wi-Fi and client/AP isolation commonly prevent device-to-device access.

Check the PC network profile:

```powershell
Get-NetConnectionProfile
```

The home adapter should be `Private`.

Check that the application responds on the LAN address from the PC:

```powershell
Invoke-WebRequest -UseBasicParsing http://192.168.1.240:48721/
```

Check the port from another Windows device:

```powershell
Test-NetConnection 192.168.1.240 -Port 48721
```

Check the task and firewall:

```powershell
.\status.ps1
Get-NetFirewallRule -DisplayName 'Local Share Shelf (Private LAN)'
```

### The bookmark stopped working

Run `ipconfig` again. If the IPv4 address changed, update the bookmark and create a DHCP reservation in the router.

### The shelf is unavailable after the PC sleeps

The PC must be awake to serve files. This application does not change Windows sleep settings. Adjust sleep behavior manually only if that is acceptable for your PC and privacy requirements.

### Port conflict

Check the port:

```powershell
Get-NetTCPConnection -LocalPort 48721 -ErrorAction SilentlyContinue
```

Stop the shelf before investigating other programs using the port. Changing the port requires updating `LOCAL_SHELF_PORT` and the matching firewall rule in `install.ps1`, then reinstalling.

## Updating

Stop the application, replace the source files, and reinstall. The installer copies the new runnable files into the ProgramData app directory but preserves uploaded data:

```powershell
.\stop.ps1
.\install.ps1
.\restart.ps1
```

Always keep `%ProgramData%\LocalShareShelf` backed up before upgrades.

## Developer checks

From the project folder:

```powershell
npm test
node --check server.js
node --check public/app.js
```

The automated tests cover byte-for-byte transfer integrity, duplicate names, notes, links, folder ZIP paths, persistence after restart, unsafe path handling, and cross-origin mutation rejection. Phone behavior, router DHCP reservation, Wi-Fi isolation, Windows reboot behavior, and browser-specific clipboard behavior should still be checked on the target devices.
