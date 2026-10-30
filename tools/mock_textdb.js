/* Local stand-in for textdb.dev (+ static file server) that behaves like the REAL service, so tests/previews never touch it.
   node tools/mock_textdb.js <appPort> <staticDir> [apiPort]   (copied from the hardened room's mock, adapted for this product)
   - app origin  : http://localhost:<appPort>   serves the built page, /data.json (read-only copy) and HEAD with a Date header
   - api origin  : http://localhost:<apiPort>   (default appPort+1) = SEPARATE ORIGIN like textdb.dev, with the real CORS behaviour:
       OPTIONS preflight -> 204 + the same allow-headers/methods list as textdb; every response has access-control-allow-origin:* and
       an EMPTY access-control-expose-headers (so JS cannot read Date from it); PUT/PATCH/DELETE -> 404; no ETag; GET of an unknown key
       -> 200 with an EMPTY body and the key is created; POST replaces the whole document (last write wins).
   latency like the real service (~1.9 s per request from the box) via /__cfg?lat=MS (default 0 so unit runs are fast)
   fault injection: /__cfg?fail=REGEX&code=500  (matching keys answer with that status; optional test-only: &failm=GET|POST only that method, &failn=N only the next N matching requests, then normal), /__cfg?hang=REGEX (never answers), /__cfg?post=MS extra POST latency
   GET /__stats, /__dump/<id>, /__reset (in-memory store only), /__cfg?clear=1 */
const http=require('http'),fs=require('fs'),path=require('path');
const [,, appPort='8461', dir='.', apiPortArg]=process.argv;const dataJson=null;const apiPort=+apiPortArg||(+appPort+1);
const kv={};const cfg={lat:0,post:0,fail:null,code:500,hang:null,failm:null,failn:null};const stats={get:0,post:0,options:0,failed:0,byKey:{}};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
const CORS={'access-control-allow-credentials':'true','access-control-allow-origin':'*','access-control-expose-headers':'','cache-control':'max-age=0, private, must-revalidate'};
const PRE={'access-control-allow-headers':'Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since,X-CSRF-Token','access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','access-control-max-age':'1728000'};
function ctl(p,u,s){if(p==='/__cfg'){const g=k=>u.searchParams.get(k);if(g('clear')){cfg.fail=cfg.hang=null;cfg.failm=cfg.failn=null}if(g('failm')!=null)cfg.failm=g('failm')||null;if(g('failn')!=null)cfg.failn=g('failn')===''?null:+g('failn');
    if(g('lat')!=null)cfg.lat=+g('lat')||0;if(g('post')!=null)cfg.post=+g('post')||0;if(g('fail')!=null)cfg.fail=g('fail')?new RegExp(g('fail')):null;if(g('code'))cfg.code=+g('code');if(g('hang')!=null)cfg.hang=g('hang')?new RegExp(g('hang')):null;s.end('ok');return true}
  if(p==='/__stats'){s.end(JSON.stringify(stats));return true}
  if(p.startsWith('/__dump/')){s.end(kv[decodeURIComponent(p.slice(8))]||'');return true}
  if(p==='/__reset'){for(const k in kv)delete kv[k];stats.get=stats.post=stats.options=stats.failed=0;stats.byKey={};s.end('ok');return true}return false}
function api(q,s,u,p){if(!p.startsWith('/api/data/'))return false;apiInner(q,s,u,p);return true}
function apiInner(q,s,u,p){
  if(p.startsWith('/api/data/')){const id=decodeURIComponent(p.slice(10));
    if(q.method==='OPTIONS'){stats.options++;s.writeHead(204,Object.assign({},CORS,PRE));return s.end()}
    if(q.method!=='GET'&&q.method!=='POST'){s.writeHead(404,CORS);return s.end('Not Found')}
    if(cfg.hang&&cfg.hang.test(id))return;                         /* never answers */
    const go=()=>{if(cfg.fail&&cfg.fail.test(id)&&(!cfg.failm||cfg.failm===q.method)&&(cfg.failn==null||cfg.failn>0)){if(cfg.failn!=null)cfg.failn--;stats.failed++;s.writeHead(cfg.code,CORS);return s.end('err')}
      if(q.method==='POST'){let b='';q.on('data',c=>b+=c);q.on('end',()=>setTimeout(()=>{stats.post++;stats.byKey[id]=(stats.byKey[id]||0)+1;kv[id]=b;s.writeHead(200,Object.assign({'content-type':'text/plain; charset=utf-8'},CORS));s.end(b)},cfg.post));return}
      stats.get++;if(!(id in kv))kv[id]='';s.writeHead(200,Object.assign({'content-type':'text/plain; charset=utf-8'},CORS));s.end(kv[id])};
    setTimeout(go,cfg.lat);return true}
  return false}
http.createServer((q,s)=>{const u=new URL(q.url,'http://x');const p=u.pathname;
  if(api(q,s,u,p))return;
  if(ctl(p,u,s))return;s.writeHead(404);s.end('nf')}).listen(apiPort,()=>console.log('mock textdb API origin on',apiPort));
http.createServer((q,s)=>{const u=new URL(q.url,'http://x');const p=u.pathname;
  if(api(q,s,u,p))return;if(ctl(p,u,s))return;
  if(p==='/data.json'&&dataJson){return fs.createReadStream(dataJson).pipe(s)}
  let pp=p;
  const f=path.join(path.resolve(dir),decodeURIComponent(pp)==='/'?'index.html':decodeURIComponent(pp));if(f.indexOf(path.resolve(dir))!==0){s.writeHead(403);return s.end()}
  fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);return s.end('nf')}s.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});s.end(q.method==='HEAD'?undefined:d)})
}).listen(+appPort,()=>console.log('mock app origin on',appPort));
