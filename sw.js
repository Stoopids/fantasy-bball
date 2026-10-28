/* Network-first service worker with one shared slow-network deadline. Own cache name (changes with every build); never touches textdb or other origins. */
self.window=self;try{importScripts('js/version.js')}catch(e){}
const CACHE='fbnc-'+(self.FBN_BUILD||'dev');
const SHELL=['./','index.html','setup.html','join.html','room.html','recap.html','league.html','redraft.html','time.html','help.html','css/app.css','css/league-app.css','js/version.js','js/core.js','js/store.js','js/ui.js','js/league.js','js/league-d.js','js/league-bets.js','js/power-render.js','js/power-gen.js','css/power.css','js/scoring.js','js/index.js','js/setup.js','js/join.js','js/room.js','js/recap.js','js/leaguehome.js','js/redraft.js','js/time.js','js/help.js','js/qr.min.js','assets/teams.js','assets/hero-banner.jpg','data/scores.json','data/power-rankings.json','data/tournament.json','LICENSE-third-party.txt','manifest.webmanifest','icons/icon-192.png','icons/apple-touch-icon.png','icons/icon-512.png'];
const NET_MS=3000,SLOW_MS=120000;
const OFFLINE='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font-family:system-ui,sans-serif;background:#10131a;color:#eee;padding:24px"><h2>You are offline</h2><p>This page was not saved on this device yet, so it cannot open without a connection. Connect to the internet and reload.</p><p><a style="color:#ffd400" href="index.html">Go to the home page</a></p></body>';
const keyOf=r=>{const u=new URL(r.url);return new Request(u.origin+u.pathname)};
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('fbnc-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting()});
/* One shared deadline, not one per request: the first request that is slower than NET_MS flips the worker into "slow" mode for SLOW_MS.
   In slow mode saved copies are returned at once and refreshed in the background, so a saved page opens in about NET_MS even on a very slow link. */
let slowUntil=0;
function save(r,res){if(res&&res.ok){const cp=res.clone();return caches.open(CACHE).then(c=>c.put(keyOf(r),cp)).catch(()=>{})}}
function refresh(r){const t0=Date.now();return fetch(r,{cache:'no-cache'}).then(res=>{if(Date.now()-t0<1500)slowUntil=0;return save(r,res)}).catch(()=>{})}
async function answer(e){const r=e.request;const hit=await caches.match(keyOf(r));
  if(hit&&Date.now()<slowUntil){e.waitUntil(refresh(r));return hit}
  const net=fetch(r,{cache:'no-cache'});let timer;
  const slow=new Promise(res=>{timer=setTimeout(()=>res('slow'),NET_MS)});
  try{const first=await Promise.race([net,slow]);clearTimeout(timer);
    if(first==='slow'){slowUntil=Date.now()+SLOW_MS;e.waitUntil(net.then(x=>save(r,x)).catch(()=>{}));if(hit)return hit;try{return await net}catch(err){return r.mode==='navigate'?new Response(OFFLINE,{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}}):Response.error()}}
    save(r,first);return first}
  catch(err){clearTimeout(timer);if(hit)return hit;return r.mode==='navigate'?new Response(OFFLINE,{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}}):Response.error()}}
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin||u.pathname.indexOf('/api/')>=0)return;e.respondWith(answer(e))});
