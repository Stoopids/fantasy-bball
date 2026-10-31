/* s25: no tab bar scrolls sideways (room .tabs, recap #rcnav; real + mock) at 390 and 320; compact end card (~25% of 390px viewport) with tabs visible; shots.
   APP / API env (mock store). BEFORE=1 + SHOTPRE=before_ for screenshots only against an older build. */
const L=require('./lib.js');const F=require('../js/core.js');const {seedRecap}=require('./recap_seed.js');const {seed}=require('./seed_league.js');const {sleep,API}=L;
const OUT=process.env.SHOTS||'/workspace/draftroom-notes/s25-setup',PRE=process.env.SHOTPRE||'',BEFORE=!!process.env.BEFORE;
let n=0,bad=0;const ok=(t,c,x)=>{n++;if(c||BEFORE)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const bars=P=>P.page.evaluate(()=>[...document.querySelectorAll('.tabs,#rcnav,.rcnav,[role=tablist]')].map(e=>{const a=[...e.querySelectorAll('a,button')];return{id:e.id||e.className,sw:e.scrollWidth,cw:e.clientWidth,n:a.length,minH:Math.min(...a.map(x=>x.getBoundingClientRect().height)),hidden:a.filter(x=>{const r=x.getBoundingClientRect();return r.right>innerWidth+1||r.left<-1}).length,docOver:document.documentElement.scrollWidth>innerWidth}}));
(async()=>{try{
 const real=await seedRecap(null,{power:true});const mock=await seedRecap(null,{power:true});{const K=F.Keys(mock);const m=await gj(K.meta);m.mock=true;m.solo=true;await post(K.meta,m)}
 const live=await seed(API,{});
 for(const [nm,id] of [['real',real],['mock',mock]])for(const [w,h,d] of [[390,844,false],[320,640,false],[1280,900,true]]){
  const P=await L.phone(nm+w,{w,h,desktop:d});await P.go('recap.html?l='+id);await P.page.waitForSelector('#rcnav',{timeout:20000}).catch(()=>{});await sleep(1200);await P.page.evaluate(()=>scrollTo(0,0));await sleep(200);
  const b=await bars(P);const nonav=nm==='mock'&&b.length===0;   /* s25-full: a solo mock recap has only Top + My grade inline (rest in Full recap), so recap.js draws no #rcnav (needs >= 3 sections) */
  if(nonav)ok(`recap mock ${w}px: no section tab bar (fewer than 3 inline sections) and no sideways page scroll`,await P.page.evaluate(()=>!document.getElementById('rcnav')&&document.documentElement.scrollWidth<=innerWidth));
  else ok(`recap ${nm} ${w}px: every tab bar fits (scrollWidth <= clientWidth), all tabs on screen, tap targets >= 44px`,b.length>0&&b.every(x=>x.sw<=x.cw&&x.hidden===0&&x.minH>=44&&!x.docOver),b);
  const hc=await P.page.evaluate(()=>{const h=document.getElementById('recaphead'),nx=document.getElementById('rc_site'),nv=document.getElementById('rcnav'),b=document.querySelector('#rc_site #rcsite,#rc_site #mockback');const r=nv&&nv.getBoundingClientRect(),hr=h&&h.getBoundingClientRect(),xr=nx&&nx.getBoundingClientRect(),br=b&&b.getBoundingClientRect();return{hh:hr&&hr.height,nxh:xr&&xr.height,vh:innerHeight,navTop:r&&r.top,navBot:r&&r.bottom,btn:br&&br.height,btnw:br&&br.width,btnTxt:b&&b.innerText.trim(),rcdown:!!document.getElementById('rcdown')}});
  if(w===390)ok(`recap ${nm} 390 (s25-full layout: hero #recaphead, then the What's next row #rc_site, then the tabs; #rcdown gone): hero <= 30% of viewport, tabs visible without scrolling, Back to my league >= 44px`,hc.hh!=null&&hc.hh<=hc.vh*0.30&&hc.nxh!=null&&(nonav||hc.navBot<=hc.vh)&&hc.btn>=44&&hc.btnw>=44&&hc.btnTxt==='Back to my league'&&!hc.rcdown,hc);
  if(w!==320)await P.page.screenshot({path:OUT+'/'+PRE+w+'_recap_endcard_'+nm+'.png'});
  if(w===390&&!BEFORE&&!nonav){await P.page.click('#rcnav a[data-rt="grade"]');await sleep(500);ok(`recap ${nm}: tabs are a-href links and mark the active one`,await P.page.evaluate(()=>/#tab=grade/.test(location.hash)&&document.querySelector('#rcnav a[data-rt="grade"]').getAttribute('aria-current')==='location'&&document.querySelector('#rcnav a').tagName==='A'))}
  ok(`recap ${nm} ${w}: no page errors`,P.errs.length===0,P.errs);await P.close()}
 /* room tabs (live league, spectator) */
 for(const [w,h,d] of [[390,844,false],[320,640,false],[1280,900,true]]){const P=await L.phone('r'+w,{w,h,desktop:d});await P.go('room.html?l='+live+'&watch=1');await P.page.waitForSelector('.tabs',{timeout:20000});await sleep(1000);
  const b=await bars(P);ok(`room ${w}px: tab bar fits, all tabs visible, >= 44px`,b.length>0&&b.every(x=>x.sw<=x.cw&&x.hidden===0&&x.minH>=44),b);if(w!==1280)await P.page.screenshot({path:OUT+'/'+PRE+w+'_room_tabs.png'});await P.close()}
}catch(e){bad++;console.log('CRASH',e)}await L.close();console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)})();
