const { spawn } = require('child_process');
const path = require('path');
const server = path.join(__dirname, 'server.js');
let stopping = false;
let child;
function start() {
  if (stopping) return;
  child = spawn(process.execPath, [server], { stdio: 'inherit', windowsHide: true });
  child.on('error', () => setTimeout(start, 2000));
  child.on('exit', () => { child = null; if (!stopping) setTimeout(start, 2000); });
}
function stop() { stopping = true; if (child) child.kill(); else process.exit(0); }
process.on('SIGTERM', stop); process.on('SIGINT', stop);
start();
