# Local Share Shelf

A small, private, no-account file and text shelf for a trusted home LAN. The Windows PC runs the server; phones and other computers use a normal browser. It has no cloud service, runtime internet dependency, analytics, or external assets.

## Install

Install Node.js 20 or newer once. Put this folder somewhere stable (do not place the data folder inside it), then open **PowerShell as Administrator** and run:

```powershell
.\install.ps1
.\start.ps1
```

Administrator approval is required only to create the boot task, grant the restricted LocalService account access to the app/data folders, and add the Windows Firewall rule. The server process runs as `NT AUTHORITY\LocalService`, not Administrator or LocalSystem. The task starts at boot without a logged-in desktop and is configured by Windows to restart after failures only if you add your preferred recovery policy; the app itself exits cleanly on shutdown. For a machine needing aggressive crash recovery, set Task Scheduler's Settings > Restart the task if it fails.

The app listens on TCP port 48721 by default. Change it before installation with `$env:LOCAL_SHELF_PORT`, and update the port in `install.ps1`'s firewall rule if you customize it. The task is configured to start when available and retry five times at one-minute intervals.

## Address and bookmark

On the PC, open `http://localhost:48721`. To use the phone, run `ipconfig` and choose the PC's IPv4 address on the home Wi-Fi adapter (not VPN, Hyper-V, or loopback), then open `http://PC-IP:48721` on the phone. Bookmark it on both devices. Reserve that address in your router's DHCP reservation page so it remains stable. This app does not modify the router, create port forwarding, UPnP, tunnels, public URLs, or discovery.

The firewall rule allows TCP 48721 only on Windows' **Private** profile and `LocalSubnet`. Guest Wi-Fi/client isolation may prevent the phone from reaching the PC; use the primary home Wi-Fi. Other devices on the permitted LAN could access this no-login shelf if they discover its address. The PC must be awake and running; internet service itself is not required.

## Use

Drop or select multiple files. Desktop folder selection preserves relative paths and the folder card downloads a ZIP. Mobile browsers should use their normal photo/file picker; arbitrary folder selection and silent saving are browser limitations. Ctrl+V anywhere outside an input/textarea uploads pasted image files. Notes and links share through the text box. Downloads are normal browser downloads. Copy uses the Clipboard API where available and falls back to a manual prompt.

The installed runnable copy is placed under `%ProgramData%\LocalShareShelf\app`; files are stored under `%ProgramData%\LocalShareShelf\files`; metadata is `%ProgramData%\LocalShareShelf\items.json`; temporary partial uploads are in `tmp`; rotating logs are in `logs\server.log` (5 MiB current file plus one `.1` file). The storage directory is not removed by uninstall.

## Manage and update

```powershell
.\status.ps1
.\stop.ps1
.\restart.ps1
.\uninstall.ps1
```

To update, stop the task, replace application files while preserving `%ProgramData%\LocalShareShelf`, then run `install.ps1` again and `restart.ps1`. The install script is repeat-safe. Back up or move the shelf by stopping it and copying the entire data directory, including `items.json`, `files`, and `tmp` (omit stale `.part` files if desired). To use another location, set `LOCAL_SHELF_DATA` in the scheduled task action or make that change in `install.ps1`.

## Troubleshooting

Run `Get-NetConnectionProfile` and set the home adapter to Private if the firewall rule does not apply. Check `Test-NetConnection PC-IP -Port 48721` from another machine. Disable guest Wi-Fi/client isolation or connect both devices to the same LAN. If the address changes, make a DHCP reservation and bookmark the new address. Do not disable Windows Firewall. Do not change sleep settings unless you want the PC available while unattended.

## Security and limits

The server rejects unexpected Host/Origin combinations, does not enable CORS, constrains file paths, stores uploads under generated names, sends active content as downloads with `nosniff`, and streams file uploads/downloads. It never fetches pasted URLs. Configure `LOCAL_SHELF_MAX_UPLOAD` for the practical per-file limit (default 5 GiB). This is intended for a trusted home network, not an untrusted or public network.

## Verification status

Automated local tests cover upload/download byte integrity, duplicate names, notes/links, folder ZIP paths, persistence, deletion, unsafe names, traversal, HTML escaping, and cross-origin mutation rejection. Browser UI, phone behavior, Windows boot/task scheduling, firewall profile behavior, router DHCP reservation, and sleep/reboot persistence must be verified on your PC/network using the checklist above; they cannot be truthfully claimed as tested in this environment.
