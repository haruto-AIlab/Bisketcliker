// Reproduce project GitHub Pages hosting, where /src/... is intentionally absent.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const prefix='/Bisketcliker/';
const files=new Set(['index.html','src/style.css','src/app.js','src/engine.js','src/data.js','src/spec/core.js']);
const requests=[];
const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  requests.push(pathname);
  const relative=pathname.startsWith(prefix)?pathname.slice(prefix.length)||'index.html':'';
  if(!files.has(relative)){res.writeHead(404);res.end();return;}
  const data=await readFile(new URL('../'+relative,import.meta.url));
  res.writeHead(200,{'Content-Type':relative.endsWith('.css')?'text/css':relative.endsWith('.js')?'text/javascript':'text/html; charset=utf-8'});res.end(data);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
process.env.BASE_URL=`http://127.0.0.1:${server.address().port}${prefix}`;
try {
  await import('./browser-smoke.mjs');
  assert.ok(requests.includes(prefix+'src/style.css'));
  assert.ok(requests.includes(prefix+'src/app.js'));
  assert.ok(!requests.some(p=>p.startsWith('/src/')));
  console.log('PASS: project Pages prefix resolves CSS, module graph, and game actions');
} finally {await new Promise(resolve=>server.close(resolve));}
