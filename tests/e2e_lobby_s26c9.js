/* s26c9 lobby (pre-draft) Board: compact Invite managers row (Copy invite link / Share / Mock Draft, Mock Draft primary), '📋 Draft Rules' + 'League Rules' buttons.
   Mock store only (fbn.store=/api/data/), textdb.dev aborted. APP=http://localhost:<appPort> SHOTS=<dir> TAG=after node tests/e2e_lobby_s26c9.js ; BEFORE=1 = shots only. */
const {chromium}=require(process.env.PW||'/workspace/draftroom-notes/scrolljump/node_modules/playwright');const F=require('../js/core.js');
const APP=process.env.APP||'http://localhost:18951',SH=process.env.SHOTS||'/tmp',TAG=process.env.TAG||'after',BEFORE=!!process.env.BEFORE;const API=APP+'/api/data/';
const {seed}=require('./seed_league.js');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let n=0,bad=0;const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
(async()=>{const id=await seed(API,{managers:8});const I=seed.info;const K=F.Keys(id);const m=JSON.parse(await (await fetch(API+encodeURIComponent(K.meta))).text());
 m.status='lobby';delete m.endedAt;delete m.startedAt;m.orderSet=false;m.order=[];m.spin=null;m.spinGen=0;m.spinDone=false;m.respins=[];m.version=(m.version||0)+1;m.settings.startAt=Date.now()+(9*3600+17*60+42)*1000;m.settings.startMode='manual';
 await fetch(API+encodeURIComponent(K.meta),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(m)});const me=I.managers[3];
 const B=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const w of [1280,390,320]){const mob=w<900,pre='lobby '+w+'px: ';const ctx=await B.newContext({viewport:{width:w,height:mob?844:800},isMobile:mob,hasTouch:mob});
  await ctx.route(/textdb\.dev/,r=>r.abort());await ctx.addInitScript(()=>{localStorage.setItem('fbn.store','/api/data/')});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(APP+'/room.html?l='+id+'#as='+me.id+'&k='+me.k);await p.waitForSelector('#invitecard',{timeout:30000});await sleep(1500);
  await p.screenshot({path:SH+'/'+TAG+'-lobby-'+w+'.png'});await p.screenshot({path:SH+'/'+TAG+'-lobby-'+w+'-full.png',fullPage:true});await p.locator('#invitecard').screenshot({path:SH+'/'+TAG+'-lobby-invite-'+w+'.png'});
  ok(pre+'no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:SH+'/'+TAG+'-header-lobby-'+w+'.png',clip:{x:0,y:0,width:w,height:mob?240:180}});
  if(!BEFORE){const cd=await p.evaluate(()=>{const h=document.querySelector('#lobbycd .cdhero');if(!h)return null;const r=h.getBoundingClientRect();const b=h.querySelector('.cdg b');const bs=[...h.querySelectorAll('.cdg b')].map(x=>x.getBoundingClientRect().top);
     return{txt:[...h.querySelectorAll('.cdg b')].map(x=>x.textContent).join(':'),labels:[...h.querySelectorAll('.cdg small')].map(x=>x.textContent).join('/'),fs:parseFloat(getComputedStyle(b).fontSize),tn:getComputedStyle(b).fontVariantNumeric,over:h.scrollWidth>h.clientWidth+1,oneLine:Math.max(...bs)-Math.min(...bs)<2,right:r.right,vw:innerWidth,col:getComputedStyle(b).color,when:(document.getElementById('cdwhen')||{}).textContent}});
   ok(pre+'countdown hero: HH:MM:SS with HRS/MIN/SEC, tabular-nums, one line, no overflow',cd&&/^\d\d:\d\d:\d\d$/.test(cd.txt)&&cd.labels==='HRS/MIN/SEC'&&/tabular-nums/.test(cd.tn)&&!cd.over&&cd.oneLine&&cd.right<=cd.vw,cd);
   ok(pre+'countdown digit size '+(cd&&cd.fs)+'px ('+(mob?'~48 phone':'64-80 desktop')+')',cd&&(mob?cd.fs>=36&&cd.fs<=52:cd.fs>=64&&cd.fs<=80),cd&&cd.fs);
   ok(pre+'start time line under the countdown',cd&&cd.when&&/\d{4}/.test(cd.when),cd&&cd.when);
   const hv=await p.evaluate(()=>({pres:[...document.querySelectorAll('#presence .pc')].map(e=>e.className),who:!!document.querySelector('#who.you .youtag'),row:!!document.querySelector('#orderlist .mrow.you .youtag'),firstRow:(document.querySelector('#orderlist .mrow')||{}).dataset}));
   ok(pre+'viewer highlighted in header chip and lobby list (in place, order unchanged)',hv.who&&hv.row&&hv.firstRow&&hv.firstRow.mid&&hv.firstRow.mid!==me.id,hv);const r=await p.evaluate(()=>{const g=i=>{const e=document.getElementById(i);if(!e||!e.offsetParent)return null;const r=e.getBoundingClientRect();return{t:e.textContent.trim(),h:Math.round(r.height),w:Math.round(r.width),top:Math.round(r.top),right:Math.round(r.right),bg:getComputedStyle(e).backgroundColor,fw:getComputedStyle(e).fontWeight,href:e.getAttribute('href')}};
     return{copy:g('invcopy'),share:g('invshare'),mock:g('invmock'),card:g('invitecard'),dr:g('rulesbtn_hdr'),lr:g('leaguerules_hdr'),drl:g('rulesbtn_lobby'),lrl:g('leaguerules_lobby'),vw:innerWidth,mockPri:document.getElementById('invmock').classList.contains('pri'),sameRow:document.getElementById('invmock').closest('.invr1')!==null}});
   ok(pre+'Copy / Share / Mock Draft all in the title row, >=44px',r.copy&&r.share&&r.mock&&r.sameRow&&[r.copy,r.share,r.mock].every(x=>x.h>=44&&x.w>=44),r);
   ok(pre+'Mock Draft is the primary (most prominent) button',r.mockPri&&r.mock.w>=r.share.w,r.mock);
   ok(pre+'invite card compact (<=150px tall)',r.card.h<=(w<400?150:80),r.card.h);
   ok(pre+'lobby card reads 📋 Draft Rules + League Rules, both visible, >=44px, inside the screen',r.drl&&/Draft Rules/.test(r.drl.t)&&r.lrl&&/League Rules/.test(r.lrl.t)&&r.drl.h>=44&&r.lrl.h>=44&&r.lrl.right<=r.vw&&r.drl.right<=r.vw,[r.drl,r.lrl]);
   ok(pre+'League Rules links to league.html?l=<id>#rules',r.lrl&&/league\.html\?l=[A-Z0-9]+#rules$/.test(r.lrl.href),r.lrl&&r.lrl.href);
   if(r.drl)ok(pre+'lobby card Rules button also reads Draft Rules',/Draft Rules/.test(r.drl.t),r.drl);
   await p.click('#rulesbtn_lobby');await sleep(500);ok(pre+'Draft Rules still opens the draft rules sheet',await p.evaluate(()=>!!document.getElementById('rulespage2')));if(w!==320)await p.screenshot({path:SH+'/'+TAG+'-draftrules-'+w+'.png'});await p.evaluate(()=>{const e=document.getElementById('r2_9');if(e)e.scrollIntoView({block:'center'})});await sleep(300);if(w!==320)await p.screenshot({path:SH+'/'+TAG+'-draftrules-miss-'+w+'.png'});
   {const ms=await p.evaluate(()=>{const e=document.getElementById('r2_9');return e?{t:e.innerText,n:e.querySelectorAll('li').length}:null});ok(pre+"Draft Rules has 'Can’t make the draft?' with 3 points (s26c13: + Auto-draft me from s26c8b) and the league's 60-second clock",ms&&/Can’t make the draft\?/.test(ms.t)&&ms.n===3&&/Auto-draft me/.test(ms.t)&&/60-second clock runs out/.test(ms.t)&&/queue ahead of time on Teams/.test(ms.t),ms)}await p.evaluate(()=>window.UI&&UI.closeSheet&&UI.closeSheet());await sleep(300);
   if(!mob){const [pop]=await Promise.all([ctx.waitForEvent('page',{timeout:8000}).catch(()=>null),p.click('#leaguerules_lobby')]);ok(pre+'League Rules opens a new tab on desktop at #rules',!!pop&&/#rules$/.test(pop.url()),pop&&pop.url());
     if(pop){await pop.waitForLoadState();await sleep(2500);await pop.screenshot({path:SH+'/'+TAG+'-lobby-leaguerules-'+w+'.png'});console.log('   info league.html#rules before the draft: '+JSON.stringify((await pop.evaluate(()=>document.body.innerText)).slice(0,80)));await pop.close()}}
   else{await Promise.all([p.waitForURL(/league\.html/,{timeout:10000}).catch(()=>null),p.click('#leaguerules_lobby')]);ok(pre+'League Rules stays in the same tab on phone',/league\.html\?l=.*#rules/.test(p.url()),p.url());await sleep(2500);await p.screenshot({path:SH+'/'+TAG+'-lobby-leaguerules-'+w+'.png'})}}
  ok(pre+'no page errors',errs.length===0,errs);await ctx.close()}

 /* >99 h -> days group; spectator -> no highlight */
 {const m2=JSON.parse(await (await fetch(API+encodeURIComponent(K.meta))).text());m2.settings.startAt=Date.now()+(5*86400+3*3600+4*60)*1000;m2.version=(m2.version||0)+1;await fetch(API+encodeURIComponent(K.meta),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(m2)});
  for(const w of [320,1280]){const mob=w<900;const ctx=await B.newContext({viewport:{width:w,height:mob?844:800},isMobile:mob,hasTouch:mob});await ctx.route(/textdb\.dev/,r=>r.abort());await ctx.addInitScript(()=>{localStorage.setItem('fbn.store','/api/data/')});const p=await ctx.newPage();
   await p.goto(APP+'/room.html?l='+id+'#as='+me.id+'&k='+me.k);await p.waitForSelector('#lobbycd');await sleep(1500);await p.screenshot({path:SH+'/'+TAG+'-lobby-days-'+w+'.png'});
   if(!BEFORE){const d=await p.evaluate(()=>{const h=document.querySelector('#lobbycd .cdhero');return h?{labels:[...h.querySelectorAll('.cdg small')].map(x=>x.textContent).join('/'),over:h.scrollWidth>h.clientWidth+1,sw:document.documentElement.scrollWidth<=innerWidth+1}:null});
    ok('days '+w+'px: >99 h shows a DAYS group, no overflow, no sideways scroll',d&&d.labels==='DAYS/HRS/MIN/SEC'&&!d.over&&d.sw,d)}
   await ctx.close()}
  const ctx=await B.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ctx.route(/textdb\.dev/,r=>r.abort());await ctx.addInitScript(()=>{localStorage.setItem('fbn.store','/api/data/')});const p=await ctx.newPage();
  await p.goto(APP+'/room.html?l='+id+'&watch=1');await p.waitForSelector('#lobbycd');await sleep(1500);await p.screenshot({path:SH+'/'+TAG+'-lobby-spectator-390.png'});
  if(!BEFORE)ok('spectator: no viewer highlight anywhere',await p.evaluate(()=>!document.querySelector('.you,.youtag')));await ctx.close()}
 await B.close();console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)})().catch(e=>{console.error(e);process.exit(2)});
