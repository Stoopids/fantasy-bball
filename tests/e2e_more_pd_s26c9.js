/* s26c9: compact post-draft More tab + League site new-tab on desktop. Mock store only (fbn.store=/api/data/), textdb.dev aborted.
   needs: node tools/mock_textdb.js <appPort> "$PWD" <apiPort>; APP=http://localhost:<appPort> SHOTS=<dir> TAG=after node tests/e2e_more_pd_s26c9.js
   BEFORE=1 runs only the screenshots (for an older build). */
const {chromium}=require(process.env.PW||'/workspace/draftroom-notes/scrolljump/node_modules/playwright');
const APP=process.env.APP||'http://localhost:18951',SH=process.env.SHOTS||'/tmp',TAG=process.env.TAG||'after',BEFORE=!!process.env.BEFORE;
const {seed}=require('./seed_league.js');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let n=0,bad=0;const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
(async()=>{const id=await seed(APP+'/api/data/',{rounds:8});const me=seed.info.managers[7];
const B=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
for(const w of [1280,390,320]){const mob=w<900;const pre=w+'px: ';
  const ctx=await B.newContext({viewport:{width:w,height:mob?844:800},isMobile:mob,hasTouch:mob});
  await ctx.route(/textdb\.dev/,r=>r.abort());await ctx.addInitScript(()=>{localStorage.setItem('fbn.store','/api/data/')});
  await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:APP});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/ERR_|Failed to load|espn|net::/i.test(m.text()))errs.push(m.text())});
  await p.goto(APP+'/room.html?l='+id+'#as='+me.id+'&k='+me.k);await p.waitForSelector('#finalbanner',{timeout:30000});
  await sleep(1200);await p.screenshot({path:SH+'/'+TAG+'-board-'+w+'.png'});await p.screenshot({path:SH+'/'+TAG+'-board-'+w+'-full.png',fullPage:true});
  ok(pre+'board: no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(!BEFORE){const bd=await p.evaluate(()=>{const vis=e=>e&&e.offsetParent!==null;const dc=[...document.querySelectorAll('.card,.banner')].filter(e=>vis(e)&&/Draft complete/.test(e.innerText));
      const ids=['seemy','bnrecap','bigsite','csvbtn','jsonbtn','redraftroomlink'].map(i=>{const e=document.getElementById(i);if(!vis(e))return[i,0,0];const r=e.getBoundingClientRect();return[i,Math.round(r.height),Math.round(r.width)]});
      const lastCard=document.getElementById('hometip');return{n:dc.length,ids,inDone:!!document.querySelector('#finalbanner #donecard #csvbtn'),cheer:vis(document.getElementById('cheermute')),bottom:lastCard?Math.round(lastCard.getBoundingClientRect().bottom+scrollY):-1,h:innerHeight}});
    ok(pre+'board: one Draft complete card',bd.n===1,bd);ok(pre+'board: all six buttons visible, >=44px',bd.ids.every(x=>x[1]>=44&&x[2]>=44),bd.ids);ok(pre+'board: exports inside #finalbanner #donecard',bd.inDone);ok(pre+'board: sound toggle visible',bd.cheer);
    if(w===1280)ok(pre+'board: end card + What next + Watch + Home tip fit in 1280x800 (bottom '+bd.bottom+')',bd.bottom>0&&bd.bottom<=800,bd.bottom);else console.log('   info '+pre+'tip bottom '+bd.bottom+' / '+bd.h);
    const cm=await p.evaluate(()=>{window.__dl=0;const o=URL.createObjectURL;URL.createObjectURL=b=>{window.__dl++;return o.call(URL,b)};return 1});await p.click('#csvbtn');await p.click('#jsonbtn');await sleep(500);
    ok(pre+'board: CSV and JSON export still fire',await p.evaluate(()=>window.__dl>=2),await p.evaluate(()=>window.__dl))}
  await p.evaluate(()=>{location.hash='#tab=my'});await sleep(900);await p.screenshot({path:SH+'/'+TAG+'-myteam-'+w+'.png'});await p.screenshot({path:SH+'/'+TAG+'-header-'+w+'.png',clip:{x:0,y:0,width:w,height:mob?240:180}});
  ok(pre+'my team: no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(!BEFORE){const v=await p.evaluate(mid=>{const ch=[...document.querySelectorAll('.opills button')];const h=document.getElementById('myhead');return{first:ch[0]&&ch[0].dataset.m,firstYou:ch[0]&&ch[0].classList.contains('you')&&!!ch[0].querySelector('.youtag'),n:ch.length,head:!!(h&&h.classList.contains('you')&&h.querySelector('.youtag')),fs:h?parseFloat(getComputedStyle(h.querySelector('.mhteam')).fontSize):0,who:!!document.querySelector('#who.you .youtag'),cols:[...document.querySelectorAll('.bwrap th')].length}},me.id);
    ok(pre+'my team: viewer chip first with YOU tag (display copy), 8 chips',v.first===me.id&&v.firstYou&&v.n===8,v);ok(pre+'my team: header card highlighted, bigger team name (>=19px)',v.head&&v.fs>=19,v);ok(pre+'header chip highlighted with YOU',v.who,v);
    const hr=await p.evaluate(()=>{const vis=i=>{const e=document.getElementById(i);return!!(e&&e.offsetParent)};const tops=new Set();document.querySelectorAll('#top .toprow > *, #top .toprow .pill, #top .toprow .btn').forEach(e=>{if(e.offsetParent){const r=e.getBoundingClientRect();if(r.height>0)tops.add(Math.round(r.top/8))}});return{d:vis('rulesbtn_hdr'),l:vis('leaguerules_hdr'),rows:tops.size,topH:Math.round(document.getElementById('top').getBoundingClientRect().height)}});
    ok(pre+'post-draft header has no Draft Rules / League Rules buttons',!hr.d&&!hr.l,hr);ok(pre+'post-draft header is at most 2 rows (top '+hr.topH+'px)',hr.rows<=2,hr)}
  await p.evaluate(()=>{location.hash='#tab=more'});await p.waitForSelector('#linkscard');await sleep(800);
  await p.screenshot({path:SH+'/'+TAG+'-more-'+w+'.png',fullPage:true});
  await p.screenshot({path:SH+'/'+TAG+'-more-'+w+'-fold.png'});
  ok(pre+'no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(BEFORE){ok(pre+'no page errors',errs.length===0,errs);await ctx.close();continue}
  {/* s26c14 (Paul): the post-draft Rules card on More is replaced by the Rules tab */const rc=await p.evaluate(()=>({card:!!document.getElementById('rulescard'),tab:!!document.getElementById('tab_rules')}));ok(pre+'More has no Rules card; Rules tab exists',!rc.card&&rc.tab,rc);
   await p.evaluate(()=>{location.hash='#tab=rules'});await sleep(700);const rt=await p.evaluate(()=>({pg:!!document.querySelector('#rulestab #rulespage2'),l:(document.getElementById('leaguerules_tab')||{getAttribute:()=>null}).getAttribute('href')}));ok(pre+'Rules tab: Draft Rules + League Rules (#rules)',rt.pg&&/league\.html\?l=[A-Z0-9]+#rules$/.test(rt.l||''),rt);await p.evaluate(()=>{location.hash='#tab=more'});await sleep(500)}
  const rows=await p.evaluate(()=>[...document.querySelectorAll('#linkscard .pdrow')].map(r=>({t:r.querySelector('.pdlbl').textContent,u:r.querySelector('[data-a=copy]').dataset.u})));
  ok(pre+'three short link rows',JSON.stringify(rows.map(r=>r.t))==='["Invite link","Room link","Spectator link"]',rows);
  ok(pre+'no URL text shown in link rows',await p.evaluate(()=>!/https?:/.test(document.getElementById('linkscard').innerText)));
  const small=await p.evaluate(()=>[...document.querySelectorAll('#view .btn,#view a.btn,#finalbanner .btn')].filter(b=>b.offsetParent).map(b=>{const r=b.getBoundingClientRect();return[b.textContent.trim(),Math.round(r.height),Math.round(r.width)]}).filter(x=>x[1]<44||x[2]<44));
  ok(pre+'all tap targets >=44px',small.length===0,small);
  await p.locator('#pdl_room [data-a=copy]').click();await sleep(300);const clip=await p.evaluate(()=>navigator.clipboard.readText());
  ok(pre+'Copy copies the full room URL',clip===rows[1].u&&/room\.html\?l=/.test(clip),clip);
  /* Share without navigator.share -> Copy fallback */
  await p.evaluate(()=>{try{delete Navigator.prototype.share}catch(e){};navigator.clipboard.writeText('x')});
  await p.locator('#pdl_watch [data-a=pdshare]').click();await sleep(300);const clip2=await p.evaluate(()=>navigator.clipboard.readText());
  ok(pre+'Share falls back to Copy of the full spectator URL',clip2===rows[2].u&&/watch=1/.test(clip2),clip2);
  /* Share with navigator.share */
  await p.evaluate(()=>{window.__sh=null;navigator.share=d=>{window.__sh=d;return Promise.resolve()}});
  await p.locator('#pdl_invite [data-a=pdshare]').click();await sleep(200);const sh=await p.evaluate(()=>window.__sh);
  ok(pre+'Share uses navigator.share with the full invite URL',sh&&sh.url===rows[0].u&&/join\.html/.test(sh.url),sh);
  ok(pre+'no betting / money words',await p.evaluate(()=>!/\b(bet|bets|betting|wager|money|\$\d)/i.test(document.getElementById('view').innerText)));
  /* League site: new tab on desktop, same tab on phones */
  for(let sel of ['#bigsite@board','#bigsite','#leaguehome2','#sitelink','#leaguerules_tab@rules']){const tb=sel.indexOf('@board')>0?'board':sel.indexOf('@rules')>0?'rules':'more';sel=sel.split('@')[0];await p.evaluate(t=>{location.hash='#tab='+t},tb);await sleep(300);await p.waitForSelector(sel);
    if(!mob){const [pop]=await Promise.all([ctx.waitForEvent('page',{timeout:8000}).catch(()=>null),p.locator(sel).first().click()]);
      ok(pre+sel+' opens a new tab on desktop',!!pop&&/league\.html/.test(pop.url()),pop&&pop.url());
      const rel=await p.locator(sel).first().getAttribute('rel');ok(pre+sel+' rel=noopener noreferrer',rel==='noopener noreferrer',rel);
      ok(pre+'room tab stays on the room',/room\.html/.test(p.url()));if(pop)await pop.close()}
    else{const pages=ctx.pages().length;await Promise.all([p.waitForURL(/league\.html/,{timeout:10000}).catch(()=>null),p.locator(sel).first().click()]);
      ok(pre+sel+' stays in the same tab on phone',/league\.html/.test(p.url())&&ctx.pages().length===pages,p.url());
      await p.goto(APP+'/room.html?l='+id+'#tab='+tb);await p.waitForSelector('#finalbanner')}}
  ok(pre+'no page errors',errs.length===0,errs);await ctx.close()}
/* desktop width but coarse pointer / narrow desktop (<=900) -> same tab */
{const ctx=await B.newContext({viewport:{width:880,height:900}});await ctx.route(/textdb\.dev/,r=>r.abort());await ctx.addInitScript(()=>{localStorage.setItem('fbn.store','/api/data/')});
  const p=await ctx.newPage();await p.goto(APP+'/room.html?l='+id+'#as='+me.id+'&k='+me.k);await p.waitForSelector('#bigsite');await sleep(800);
  await Promise.all([p.waitForURL(/league\.html/,{timeout:10000}).catch(()=>null),p.click('#bigsite')]);ok('880px fine pointer: same tab',/league\.html/.test(p.url())&&ctx.pages().length===1);await ctx.close()}

if(!BEFORE)/* League site label: '<name> League site →', escaped, truncated on phones, full text in title + aria-label */
{const LONG='The <b>Extremely</b> Long & Wonderful Poo Part Deux Invitational Hoops';const id2=await seed(APP+'/api/data/',{rounds:8,name:LONG});const m2=seed.info.managers[7];
 for(const w of [320,390,1280]){const mob=w<900,pre='long name '+w+'px: ';const ctx=await B.newContext({viewport:{width:w,height:mob?844:800},isMobile:mob,hasTouch:mob});
  await ctx.route(/textdb\.dev/,r=>r.abort());await ctx.addInitScript(()=>{localStorage.setItem('fbn.store','/api/data/')});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(APP+'/room.html?l='+id2+'#as='+m2.id+'&k='+m2.k);await p.waitForSelector('#bigsite');await sleep(1200);
  await p.screenshot({path:SH+'/'+TAG+'-longname-board-'+w+'.png'});
  for(const tb of ['board','more']){await p.evaluate(t=>{location.hash='#tab='+t},tb);await sleep(600);if(tb==='more')await p.screenshot({path:SH+'/'+TAG+'-longname-more-'+w+'.png'});
   const r=await p.evaluate(()=>['sitelink','bigsite','leaguehome2'].map(i=>{const a=document.getElementById(i);if(!a||!a.offsetParent)return{i,miss:1};const s=a.querySelector('.sfx'),n=a.querySelector('.snm');const ar=a.getBoundingClientRect(),sr=s.getBoundingClientRect();
     return{i,title:a.title,aria:a.getAttribute('aria-label'),txt:a.textContent,bTag:!!a.querySelector('b'),sfxIn:sr.right<=ar.right+1&&sr.width>20&&/League site →/.test(s.textContent),ell:n?n.scrollWidth>n.clientWidth:null,h:Math.round(ar.height)}}));
   const full='The Extremely Long & Wonderful Poo Part Deux Invitational Hoops League site →';/* the app strips tags from names; either way no markup may reach the DOM */
   for(const x of r){if(x.miss)continue;ok(pre+tb+' #'+x.i+' title/aria = full text',x.title===full&&x.aria===full,x);ok(pre+tb+' #'+x.i+' name escaped (no injected <b>)',!x.bTag,x.txt);ok(pre+tb+' #'+x.i+' arrow suffix visible',x.sfxIn,x)
     if(mob&&x.i==='bigsite')ok(pre+tb+' #bigsite name truncated with ellipsis, >=44px',x.ell&&x.h>=44,x)}
   ok(pre+tb+' no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))}
  ok(pre+'no page errors',errs.length===0,errs);await ctx.close()}}

if(!BEFORE)/* apostrophe: "BALL DON'T LIE" -> visible text, title and aria-label show ' (no &#39; / &amp;#39;) */
{const NM="BALL DON'T LIE";const id4=await seed(APP+'/api/data/',{rounds:8,name:NM});const m4=seed.info.managers[7];const want=NM+' League site →';
 for(const w of [320,390,1280]){const mob=w<900;const ctx=await B.newContext({viewport:{width:w,height:mob?844:800},isMobile:mob,hasTouch:mob});await ctx.route(/textdb\.dev/,r=>r.abort());await ctx.addInitScript(()=>{localStorage.setItem('fbn.store','/api/data/')});const p=await ctx.newPage();
  await p.goto(APP+'/room.html?l='+id4+'#as='+m4.id+'&k='+m4.k);await p.waitForSelector('#bigsite');await sleep(1000);await p.screenshot({path:SH+'/'+TAG+'-apostrophe-board-'+w+'.png'});
  for(const tb of ['board','more']){await p.evaluate(t=>{location.hash='#tab='+t},tb);await sleep(500);if(tb==='more')await p.screenshot({path:SH+'/'+TAG+'-apostrophe-more-'+w+'.png'});
   const r=await p.evaluate(()=>['sitelink','bigsite','leaguehome2'].map(i=>{const a=document.getElementById(i);if(!a||!a.offsetParent)return null;return{i,t:a.textContent.replace(/\s+/g,' ').trim(),title:a.title,aria:a.getAttribute('aria-label'),html:a.innerHTML}}).filter(Boolean));
   for(const x of r)ok("apostrophe "+w+'px '+tb+' #'+x.i+': text/title/aria read '+want,x.t===want&&x.title===want&&x.aria===want&&!/&amp;#39;|&amp;amp;/.test(x.html)&&!/&#39;/.test(x.t+x.title+x.aria),x)}
  await ctx.close()}}
if(!BEFORE)/* no name */
{const id3=await seed(APP+'/api/data/',{rounds:8});const m3=seed.info.managers[7];const K=require('../js/core.js').Keys(id3);const base=APP+'/api/data/';
 const meta=JSON.parse(await (await fetch(base+encodeURIComponent(K.meta))).text());meta.name='';meta.version=(meta.version||0)+1;await fetch(base+encodeURIComponent(K.meta),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(meta)});
 const ctx=await B.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ctx.route(/textdb\.dev/,r=>r.abort());await ctx.addInitScript(()=>{localStorage.setItem('fbn.store','/api/data/')});const p=await ctx.newPage();
 await p.goto(APP+'/room.html?l='+id3+'#as='+m3.id+'&k='+m3.k);await p.waitForSelector('#bigsite');await sleep(800);const tx=await p.$eval('#bigsite',a=>[a.textContent.trim(),a.title]);
 ok('no name: button reads "League site →"',tx[0]==='League site →'&&tx[1]==='League site →',tx);await ctx.close()}
await B.close();console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)})().catch(e=>{console.error(e);process.exit(2)});
