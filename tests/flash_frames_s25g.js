/* s25-full load flash: sample frames (~50 ms) and DOM state while a mock draft loads (mock.html -> Start -> room.html) and while room.html loads.
   node tests/flash_frames_s25g.js <outdir> [shots=1]   (APP/API env). Also used by e2e_loadflash_s25g.js. */
const L=require('./lib.js');const {sleep}=L;const fs=require('fs');
const STATE=()=>{const vis=e=>{if(!e)return false;const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0.05};
  const ov=document.getElementById('overlay'),sh=document.getElementById('sheetwrap'),v=document.getElementById('view'),tabs=document.getElementById('tabs');
  return{url:location.pathname,loading:document.documentElement.classList.contains('loading'),loader:vis(document.getElementById('loader')),
    overlay:!!(ov&&ov.children.length&&vis(ov.firstElementChild))&&(ov.firstElementChild.className||ov.firstElementChild.id),sheet:!!(sh&&sh.children.length&&vis(sh.firstElementChild))&&(sh.firstElementChild.className||'sheet'),
    pickov:vis(document.getElementById('pickov')),view:v&&vis(v)?(v.firstElementChild?(v.firstElementChild.id||v.firstElementChild.className||v.firstElementChild.tagName):'empty'):null,
    sel:tabs&&tabs.querySelector('[aria-selected=true]')?tabs.querySelector('[aria-selected=true]').dataset.t:null,body:document.body?document.body.dataset.tab||'':'',
    banner:vis(document.getElementById('banner'))&&document.getElementById('banner').innerText.slice(0,40),txt:(v&&vis(v)?v.innerText:'').slice(0,60).replace(/\n/g,' ')}};
async function capture(P,dir,tag,ms,shots){const frames=[];const t0=Date.now();let i=0;while(Date.now()-t0<ms){let s=null;try{s=await P.page.evaluate(STATE)}catch(e){s={err:String(e.message).slice(0,40)}}
  s.t=Date.now()-t0;frames.push(s);if(shots&&i%2===0){try{await P.page.screenshot({path:dir+'/'+tag+'_'+String(i).padStart(3,'0')+'.png'})}catch(e){}}i++;await sleep(50)}return frames}
async function run(dir,shots){fs.mkdirSync(dir,{recursive:true});const out={};
 for(const [w,h] of [[390,844],[1280,900]]){const opt=w>700?{desktop:true,w,h}:{w,h};
  const P=await L.phone('fl'+w,opt);await P.page.setBypassServiceWorker(true);await P.go('mock.html');await P.page.waitForSelector('#startmock',{timeout:15000});
  await P.page.$eval('#startmock',e=>e.click());out['mock_'+w]=await capture(P,dir,'mock_'+w,4500,shots);const rid=new URL(P.page.url()).searchParams.get('l');
  /* reload the room (the real draft room path, same league) */
  if(rid){const Q=await L.phone('fr'+w,opt);await Q.page.setBypassServiceWorker(true);const go=Q.page.goto(process.env.APP+'/room.html?l='+rid);out['room_'+w]=await capture(Q,dir,'room_'+w,3000,shots);await go.catch(()=>{});await Q.close()}
  await P.close()}
 fs.writeFileSync(dir+'/frames.json',JSON.stringify(out,null,0));return out}
module.exports={run,STATE};
if(require.main===module)run(process.argv[2],process.argv[3]!=='0').then(o=>{for(const k in o){const seen=new Map();o[k].forEach(f=>{const key=JSON.stringify([f.url,f.loading,f.loader,f.overlay,f.sheet,f.pickov,f.view,f.sel]);if(!seen.has(key))seen.set(key,f.t)});console.log(k);for(const [key,t] of seen)console.log('  '+t+'ms '+key)}process.exit(0)});
