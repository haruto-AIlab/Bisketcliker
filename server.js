import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const routes = new Map(['/index.html','/src/style.css','/src/app.js','/src/engine.js','/src/data.js','/src/spec/core.js','/src/spec/progression.js','/src/calculations.js'].map(p=>[p,fileURLToPath(new URL('.'+p,import.meta.url))]));
http.createServer(async(req,res)=> { const path=new URL(req.url,'http://localhost').pathname; const file=routes.get(path==='/'?'/index.html':path); if(!file){res.writeHead(404);res.end('Not found');return;} try {const data=await readFile(file); res.writeHead(200,{'Content-Type':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(data);}catch{res.writeHead(500);res.end('Unable to read file');} }).listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Bisket server ready'));
