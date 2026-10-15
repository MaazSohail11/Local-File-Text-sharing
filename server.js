const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { URL } = require('url');

const ROOT = __dirname;
const DATA_DIR = process.env.LOCAL_SHELF_DATA || path.join(process.env.ProgramData || path.join(ROOT, 'data'), 'LocalShareShelf');
const PORT = Number(process.env.LOCAL_SHELF_PORT || 48721);
const MAX_UPLOAD = Number(process.env.LOCAL_SHELF_MAX_UPLOAD || 5 * 1024 * 1024 * 1024);
const MAX_NOTE = 100000;
const PUBLIC_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const META = path.join(DATA_DIR, 'items.json');
const FILES = path.join(DATA_DIR, 'files');
const TMP = path.join(DATA_DIR, 'tmp');
const LOG_DIR = path.join(DATA_DIR, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'server.log');
let items = [];
let clients = new Set();
let writeChain = Promise.resolve();

function json(res, status, value) { const body = JSON.stringify(value); res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store'}); res.end(body); }
function safePart(value) { return String(value || '').replace(/\\/g, '/').split('/').filter(x => x && x !== '.' && x !== '..').map(x => x.replace(/[<>:"|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '')).filter(Boolean).join('/'); }
function safeName(value) { const n = safePart(value).split('/').pop() || 'upload'; return n.slice(0, 240); }
function id() { return crypto.randomUUID(); }
function hostAllowed(req) {
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  const origin = req.headers.origin;
  if (origin && !origin.startsWith('http://' + host) && !origin.startsWith('http://localhost') && !origin.startsWith('http://127.0.0.1')) return false;
  if (PUBLIC_HOSTS.has(host)) return true;
  return /^[a-z0-9_.:-]+$/i.test(host) && host !== '0.0.0.0';
}
function broadcast(event, data) { const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`; for (const res of clients) res.write(msg); }
function queueSave() { writeChain = writeChain.then(async () => { const tmp = META + '.tmp'; await fsp.writeFile(tmp, JSON.stringify(items, null, 2), 'utf8'); await fsp.rename(tmp, META); }); return writeChain; }
async function load() { await fsp.mkdir(FILES, {recursive:true}); await fsp.mkdir(TMP, {recursive:true}); try { items = JSON.parse(await fsp.readFile(META, 'utf8')); } catch { items = []; await queueSave(); } }
async function logLine(line) { try { await fsp.mkdir(LOG_DIR,{recursive:true}); const st=await fsp.stat(LOG_FILE).catch(()=>null); if(st && st.size>5*1024*1024){await fsp.rename(LOG_FILE,LOG_FILE+'.1').catch(()=>{});} await fsp.appendFile(LOG_FILE,`${new Date().toISOString()} ${line}\n`); } catch {} }
function publicItem(item) { return {...item}; }
function contentDisposition(name) { return `attachment; filename="${name.replace(/[^a-zA-Z0-9._ -]/g, '_')}"`; }
function sendFile(req, res, item) { const file = path.join(FILES, item.storageName); if (!fs.existsSync(file)) return json(res, 404, {error:'Stored file is missing'}); res.writeHead(200, {'Content-Type': item.mime || 'application/octet-stream', 'Content-Length': item.size, 'Content-Disposition': contentDisposition(item.name), 'X-Content-Type-Options':'nosniff', 'Cache-Control':'private, no-store'}); fs.createReadStream(file).pipe(res); }
function crc32(buf, crc=0) { let c = (crc ^ 0xffffffff) >>> 0; for (const b of buf) { c ^= b; for (let k=0;k<8;k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return (c ^ 0xffffffff) >>> 0; }
async function makeZip(item) {
  const entries = items.filter(x => x.folderId === item.id || x.id === item.id).filter(x => x.type === 'file');
  const chunks = []; let offset = 0; const central = [];
  for (const e of entries) { const name = safePart(e.relativePath || e.name).replace(/\\/g,'/'); const nameBuf = Buffer.from(name,'utf8'); const data = await fsp.readFile(path.join(FILES,e.storageName)); const crc = crc32(data); const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50,0); h.writeUInt16LE(20,4); h.writeUInt16LE(0,6); h.writeUInt16LE(0,8); h.writeUInt16LE(0,10); h.writeUInt16LE(0,12); h.writeUInt32LE(crc,14); h.writeUInt32LE(data.length,18); h.writeUInt32LE(data.length,22); h.writeUInt16LE(nameBuf.length,26); h.writeUInt16LE(0,28); chunks.push(h,nameBuf,data); const c=Buffer.alloc(46); c.writeUInt32LE(0x02014b50,0); c.writeUInt16LE(20,4); c.writeUInt16LE(20,6); c.writeUInt16LE(0,8); c.writeUInt16LE(0,10); c.writeUInt16LE(0,12); c.writeUInt16LE(0,14); c.writeUInt32LE(crc,16); c.writeUInt32LE(data.length,20); c.writeUInt32LE(data.length,24); c.writeUInt16LE(nameBuf.length,28); c.writeUInt16LE(0,30); c.writeUInt16LE(0,32); c.writeUInt16LE(0,34); c.writeUInt16LE(0,36); c.writeUInt32LE(0,38); c.writeUInt32LE(offset,42); central.push(c,nameBuf); offset += h.length + nameBuf.length + data.length; }
  const csize = central.reduce((n,b)=>n+b.length,0); const end=Buffer.alloc(22); end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(entries.length,8); end.writeUInt16LE(entries.length,10); end.writeUInt32LE(csize,12); end.writeUInt32LE(offset,16); return Buffer.concat([...chunks,...central,end]);
}
async function handle(req,res) {
  if (!hostAllowed(req)) return json(res, 403, {error:'Host or Origin not allowed'});
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`); const p=u.pathname;
  if (req.method==='GET' && p==='/api/items') return json(res,200,items.filter(x=>x.type!=='folder-entry').map(publicItem));
  if (req.method==='GET' && p==='/api/events') { res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'}); res.write(`event: snapshot\ndata: ${JSON.stringify(items.filter(x=>x.type!=='folder-entry'))}\n\n`); clients.add(res); req.on('close',()=>clients.delete(res)); return; }
  if (req.method==='GET' && p==='/api/download') { const item=items.find(x=>x.id===u.searchParams.get('id')); if (!item) return json(res,404,{error:'Not found'}); if(item.type==='folder'){ const zip=await makeZip(item); res.writeHead(200,{'Content-Type':'application/zip','Content-Length':zip.length,'Content-Disposition':contentDisposition(item.name+'.zip'),'X-Content-Type-Options':'nosniff'}); return res.end(zip); } return sendFile(req,res,item); }
  if (req.method==='GET' && p.startsWith('/api/file/')) { const item=items.find(x=>x.id===p.slice(10)); if(!item || item.type!=='file') return json(res,404,{error:'Not found'}); return sendFile(req,res,item); }
  if (req.method==='POST' && p==='/api/items/note') { let body=''; req.on('data',d=>{body+=d; if(body.length>MAX_NOTE+1000) req.destroy();}); req.on('end',async()=>{try{const v=JSON.parse(body); const text=String(v.text||'').trim(); if(!text || text.length>MAX_NOTE) return json(res,400,{error:'Note must be 1–100,000 characters'}); const item={id:id(),type:/^https?:\/\//i.test(text)?'link':'note',text,createdAt:new Date().toISOString()}; items.unshift(item); await queueSave(); broadcast('item',item); json(res,201,item);}catch{json(res,400,{error:'Invalid note data'});}}); return; }
  if (req.method==='POST' && p==='/api/items/file') { const declared=Number(req.headers['content-length']||0); if(Number.isFinite(declared)&&declared>MAX_UPLOAD) return json(res,413,{error:'Upload exceeds the configured limit'}); let name,rel; try{name=safeName(decodeURIComponent(req.headers['x-file-name']||'upload')); rel=safePart(decodeURIComponent(req.headers['x-relative-path']||name));}catch{name='upload';rel=name;} const tmp=path.join(TMP,id()+'.part'); let received=0; const out=fs.createWriteStream(tmp,{flags:'wx'}); req.on('data',d=>{received+=d.length; if(received>MAX_UPLOAD){req.destroy();out.destroy();}}); req.pipe(out); out.on('finish',async()=>{try{if(!received) throw new Error('empty'); const folderPath=rel.includes('/')?rel.split('/').slice(0,-1).join('/') : ''; const folderId=folderPath?crypto.createHash('sha256').update(folderPath).digest('hex').slice(0,32):null; if(folderId && !items.some(x=>x.id===folderId)){const folder={id:folderId,type:'folder',name:folderPath.split('/').pop(),relativePath:folderPath,createdAt:new Date().toISOString(),size:0};items.unshift(folder);} const storageName=id(); await fsp.rename(tmp,path.join(FILES,storageName)); const item={id:id(),type:'file',name,relativePath:rel,size:received,mime:req.headers['content-type']||'application/octet-stream',storageName,folderId,createdAt:new Date().toISOString()}; items.unshift(item); await queueSave(); broadcast('item',item); json(res,201,item);}catch(e){try{await fsp.rm(tmp,{force:true});}catch{} json(res,400,{error:e.message==='empty'?'Upload is empty':'Could not store upload'});}}); req.on('aborted',()=>out.destroy()); return; }
  if (req.method==='DELETE' && p.startsWith('/api/items/')) { const item=items.find(x=>x.id===p.slice(11)); if(!item) return json(res,404,{error:'Not found'}); const removed=item.type==='folder'?[item,...items.filter(x=>x.folderId===item.id)]:[item]; for(const x of removed) if(x.storageName) await fsp.rm(path.join(FILES,x.storageName),{force:true}); const ids=new Set(removed.map(x=>x.id)); items=items.filter(x=>!ids.has(x.id)); await queueSave(); broadcast('delete',{id:item.id}); return json(res,200,{ok:true}); }
  if (req.method==='GET' && (p==='/' || p==='/index.html')) { res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}); const html=await fsp.readFile(path.join(ROOT,'public','index.html'),'utf8'); return res.end(html.replace('<title>','<link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta name="theme-color" content="#1769aa"><title>')); }
  if (req.method==='GET' && p==='/favicon.svg') { res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'public, max-age=86400'}); return fs.createReadStream(path.join(ROOT,'public','favicon.svg')).pipe(res); }
  if (req.method==='GET' && p.startsWith('/static/')) { const name=path.basename(p); const file=path.join(ROOT,'public',name); if(!fs.existsSync(file)) return json(res,404,{error:'Not found'}); const type=name.endsWith('.css')?'text/css; charset=utf-8':name.endsWith('.svg')?'image/svg+xml':'text/javascript; charset=utf-8'; res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'}); return fs.createReadStream(file).pipe(res); }
  json(res,404,{error:'Not found'});
}
load().then(()=>{const server=http.createServer((req,res)=>handle(req,res).catch(e=>{logLine(`request error: ${e.stack||e}`); if(!res.headersSent) json(res,500,{error:'Internal server error'}); else res.destroy();})); server.listen(PORT,'0.0.0.0',()=>{console.log(`Local Share Shelf listening on ${PORT}`);logLine(`listening on ${PORT}`)}); server.on('error',e=>{logLine(`server error: ${e.stack||e}`);process.exitCode=1;}); process.on('SIGTERM',()=>server.close(()=>process.exit(0))); process.on('SIGINT',()=>server.close(()=>process.exit(0)));}).catch(e=>{logLine(`startup error: ${e.stack||e}`);process.exit(1);});
