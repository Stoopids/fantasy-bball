/* s25 add-on: help.html "How your queue works" note; league photo hook (meta.settings.photo as the banner fallback). node tests/e2e_s25_addon.js (APP / API env, mock store) */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;const F=require('../js/core.js');
const SH=process.env.SHOTS||'/workspace/league-site-work/compare-s25';
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
const base=process.env.API||'http://localhost:9996/api/data/';const get=async k=>(await fetch(base+encodeURIComponent(k))).text();const post=(k,v)=>fetch(base+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
const Q="Your queue never picks by itself. On your turn you pick. If your clock runs out (league auto-pick on), or you turn on Auto-pick for me (picks right away when your turn comes), we take your top available queued team, then the best-ranked team left.";
(async()=>{try{
  for(const w of [320,360,390,1280]){const P=await L.phone('h'+w,{desktop:w>=1000,w,h:900});await P.go('help.html');await P.page.waitForSelector('#h_managers');
    const r=await P.page.evaluate(()=>{const c=document.getElementById('h_managers');const h=[...c.querySelectorAll('h3')].find(x=>x.innerText.trim()==='How your queue works');return{h:!!h,p:h&&h.nextElementSibling&&h.nextElementSibling.innerText.trim(),sw:document.documentElement.scrollWidth,iw:innerWidth}});
    ok(w+'px help: "How your queue works" in the Managers card with the exact text, no overflow',r.h&&r.p===Q&&r.sw<=w&&r.iw<=w,r);
    if(w===390){await P.page.$eval('#h_managers',e=>e.scrollIntoView());await sleep(200);await P.page.screenshot({path:SH+'/s25_help_queue_390.png'})}await P.page.close()}
  const id=await seed();const K=F.Keys(id).meta;const meta0=JSON.parse(await get(K));
  const P0=await L.phone('ph',{});await P0.go('help.html');const jpg=await P0.page.evaluate(()=>{const c=document.createElement('canvas');c.width=64;c.height=20;const x=c.getContext('2d');x.fillStyle='#c33';x.fillRect(0,0,64,20);return c.toDataURL('image/jpeg',0.8)});
  const png=await P0.page.evaluate(()=>{const c=document.createElement('canvas');c.width=8;c.height=8;return c.toDataURL('image/png')});await P0.page.close();
  const hero=async w=>{const P=await L.phone('l'+Math.random().toString(36).slice(2,6),{desktop:w>=1000,w,h:900});
    /* core.js (Draft Room file) in this staged copy still drops settings.photo when it normalizes the meta; the Draft Room s25 core.js keeps it.
       To test the League side alone, serve core.js with photo kept (test only; the shipped core.js is not changed). */
    const CORE=require('fs').readFileSync(__dirname+'/../js/core.js','utf8').replace("tz:typeof s.tz==='string'?s.tz.slice(0,60):'UTC'}}","tz:typeof s.tz==='string'?s.tz.slice(0,60):'UTC',photo:s.photo}}");
    await P.page.setRequestInterception(true);P.page.on('request',q=>{if(/\/js\/core\.js(\?|$)/.test(q.url()))return q.respond({status:200,contentType:'application/javascript',body:CORE});q.continue().catch(()=>{})});await P.go('league.html?l='+id);await P.page.waitForSelector('#hero',{timeout:25000});await sleep(1500);
    const r=await P.page.evaluate(()=>({bg:document.getElementById('hero').style.backgroundImage,html:[...document.querySelectorAll('#lhdr, #lhdr *')].some(e=>[...e.attributes].some(a=>a.name!=='style'&&a.value.includes('data:image'))||[...e.childNodes].some(t=>t.nodeType===3&&t.nodeValue.includes('data:image'))),sw:document.documentElement.scrollWidth,iw:innerWidth}));return[P,r]};
  let [P,r]=await hero(390);ok('no photo: default banner',!/data:/.test(r.bg)&&/setup|hero|\.jpg|\.svg/.test(r.bg),r.bg.slice(0,80));await P.page.close();
  await post(K,Object.assign({},meta0,{settings:Object.assign({},meta0.settings,{photo:jpg})}));
  for(const w of [320,360,390,1280]){[P,r]=await hero(w);ok(w+'px: league photo from setup shown as the banner (as a CSS background only, never markup or text), no overflow',r.bg.includes(jpg.slice(0,60))&&!r.html&&r.sw<=w&&r.iw<=w,{bg:r.bg.slice(0,60),sw:r.sw});if(w===390)await P.page.screenshot({path:SH+'/s25_league_photo_390.png'});await P.page.close()}
  for(const [bad_,lab] of [[png,'a PNG'],['data:image/jpeg;base64,abc"onerror=x','a broken string'],[42,'a number']]){await post(K,Object.assign({},meta0,{settings:Object.assign({},meta0.settings,{photo:bad_})}));[P,r]=await hero(390);ok('photo = '+lab+': ignored, default banner',!/data:/.test(r.bg),r.bg.slice(0,60));await P.page.close()}
  await post(K,meta0);
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
