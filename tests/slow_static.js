/* tiny static server for the slow-network test: node tests/slow_static.js <port> <dir>  ; GET /__delay?ms=7000 sets a per-request delay */
const http=require('http'),fs=require('fs'),path=require('path');const port=+process.argv[2]||9997,dir=path.resolve(process.argv[3]||'.');let delay=0;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json','.txt':'text/plain'};
http.createServer((q,s)=>{const u=new URL(q.url,'http://x');if(u.pathname==='/__delay'){delay=+u.searchParams.get('ms')||0;return s.end('ok')}
 const f=path.join(dir,decodeURIComponent(u.pathname)==='/'?'index.html':decodeURIComponent(u.pathname));
 setTimeout(()=>{if(f.indexOf(dir)!==0||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end('nf')}s.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(s)},delay)}).listen(port,()=>console.log('slow static on',port));
