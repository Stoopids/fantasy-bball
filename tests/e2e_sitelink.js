/* League-site links: end-of-draft banner (recap + league site), header link, recap button, home-page button. Mock store only.
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_sitelink.js */
process.env.APP=process.env.APP||'http://localhost:9995';process.env.API=process.env.API||'http://localhost:9996/api/data/';
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const API=process.env.API;const fs=require('fs'),path=require('path');
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const body=P=>P.page.$eval('body',e=>e.innerText).catch(()=>'');
const has=(P,sel)=>P.page.$(sel).then(x=>!!x);
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const hrefs=(P,sel)=>P.page.$$eval(sel,els=>els.map(e=>e.getAttribute('href')));
const TD=JSON.parse((s=>s.slice(s.indexOf('{'),s.lastIndexOf('}')+1))(fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8')));
async function room(name,id,hash,opt){const P=await L.phone(name,opt||{});await P.page.goto(`${APP}/room.html?l=${id}${hash&&hash.watch?'&watch=1':''}${hash&&hash.stay?'&stay=1':''}${hash&&hash.h||''}`,{waitUntil:'domcontentloaded'});await P.page.waitForSelector('#tabs',{timeout:25000}).catch(()=>{});return P}
(async()=>{try{
const ROUNDS=3,TOTAL=8*ROUNDS;
const id=await seed(API,{managers:8,rounds:ROUNDS,live:true,picksMade:TOTAL-1});const I=seed.info;const K=F.Keys(id);
const meta=await gj(K.meta);const secrets=[I.cmSecret].concat(I.managers.map(m=>m.k));
const leaguePath=new RegExp('^(?:https?://[^/]+)?/?(?:[^?#]*/)?league\\.html\\?l='+id+'$','i'),recapPath=new RegExp('^(?:https?://[^/]+)?/?(?:[^?#]*/)?recap\\.html\\?l='+id+'$','i');
const clean=hs=>hs.every(h=>h&&!/[#]|k=|cm=|as=/.test(h)&&!secrets.some(s=>h.includes(s)));
console.log('\n[before the draft completes]');
const sl=F.pickSeq(meta.order,ROUNDS,'snake')[TOTAL-1];const owner=I.managers.find(m=>m.id===sl.owner);
const MG=await room('mgr',id,{stay:1,h:'#as='+owner.id+'&k='+owner.k});   /* stay=1: the room normally jumps to the recap when the draft ends while open (s23 item 9) */
const MR=await room('mgrredir',id,{h:'#as='+owner.id+'&k='+owner.k});const SP=await room('spec',id,{watch:1,stay:1});
for(const P of [MG,SP]){const t=await P.page.$eval('#sitelink',e=>({tag:e.tagName,aria:e.getAttribute('aria-disabled'),href:e.getAttribute('href'),text:e.innerText})).catch(()=>null);
  ok('header shows "League site" disabled with "after the draft" before completion ('+P.name+')',!!t&&t.tag==='SPAN'&&t.aria==='true'&&!t.href&&/after the draft/i.test(t.text),t)}
ok('no end-of-draft banner, big button or sticky button while the draft is live',!(await has(MG,'#finalbanner'))&&!(await has(SP,'#bigsite'))&&!(await has(MG,'#stickysite')));
console.log('\n[the last pick lands]');
const prev=await gj(K.pick(1,TOTAL-1));const used=new Set(I.picks.map(p=>String(p.teamId)));const free=TD.teams.map(t=>String(t[0])).find(t=>!used.has(t));
await post(K.pick(1,TOTAL),F.makeEntry(TOTAL,sl.owner,free,{now:Date.now(),epoch:1,by:'owner',writer:'test',prev:prev.id}));
const T=(P,sel)=>P.page.$eval(sel,e=>e.innerText.trim()).catch(()=>null);
{await waitFor(()=>/recap\.html/.test(MR.page.url())&&has(MR,'#rcsite'),30000);const r=await MR.page.$eval('#rcsite',e=>({text:e.innerText.trim(),href:e.getAttribute('href'),h:e.getBoundingClientRect().height})).catch(()=>null);
 ok('a manager watching the last pick lands on the recap, which has the "Back to my league" button (s25-full #rcsite)',/recap\.html/.test(MR.page.url())&&!!r&&r.text==='Back to my league'&&leaguePath.test(r.href)&&clean([r.href])&&r.h>=44,[MR.page.url(),r]);await MR.close()}
for(const P of [MG,SP]){await waitFor(()=>has(P,'#finalbanner'),30000);await sleep(400);
  ok('headline says "Draft complete" ('+P.name+')',/^Draft complete( 🎉)?$/.test((await T(P,'#finalhead'))||''),await T(P,'#finalhead'));
  const big=await P.page.$eval('#bigsite',e=>{const r=e.getBoundingClientRect(),card=e.closest('#finalbanner .endbtns3');return{tag:e.tagName,text:e.innerText.trim(),href:e.getAttribute('href'),inCard:!!card,nbtn:card?card.querySelectorAll('.btn').length:0,top:r.top,bottom:r.bottom,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight,hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===e}}).catch(()=>null);
  ok('end card (3 buttons) has a "League site" button: exact label, clean league.html?l=<code> href, tap target >= 44 px, visible without scrolling ('+P.name+')',!!big&&big.tag==='A'&&big.text==='League site'&&big.inCard&&big.nbtn===3&&big.h>=44&&big.w>=44&&big.bottom<=big.vh&&big.hit&&leaguePath.test(big.href)&&clean([big.href]),big);
  ok('no sticky League site bar any more ('+P.name+')',!(await has(P,'#stickysite')));
  ok('primary label differs: '+P.name+' sees "'+(P===MG?'See my team':'See the teams')+'" as the large secondary',(await T(P,'#seemy'))===(P===MG?'See my team':'See the teams'));
  const rc=await P.page.$eval('#bnrecap',e=>({text:e.innerText.trim(),href:e.getAttribute('href'),h:e.getBoundingClientRect().height,w:e.getBoundingClientRect().width})).catch(()=>null);
  ok('"Draft recap" button with a clean recap.html?l=<code> link ('+P.name+')',!!rc&&rc.text==='Draft recap'&&recapPath.test(rc.href)&&clean([rc.href])&&rc.h>=44,rc);
  const nx=[await T(P,'#nx1'),await T(P,'#nx2'),await T(P,'#nx3')];ok('"What\'s next" has 3 lines: season start, points, redraft date + countdown ('+P.name+')',nx.every(Boolean)&&/November|season/i.test(nx[0])&&/point|win/i.test(nx[1])&&/January 20, 2027/.test(nx[2])&&/(\d+ days? to go|today|started|has passed|under way|day to go)/i.test(nx[2]),nx);
  const w=await P.page.$eval('#sharewatch',e=>e.getAttribute('data-u')).catch(()=>null);const cw=await P.page.$eval('#copywatch',e=>e.getAttribute('data-u')).catch(()=>null);
  ok('"Invite friends to watch": spectator link (room.html?l=<code>&watch=1), copy + share, no secrets ('+P.name+')',!!w&&w===cw&&new RegExp('room\\.html\\?l='+id+'&watch=1$','i').test(w)&&clean([w]),w);
  ok('"Save to home screen" tip is shown ('+P.name+')',/home screen/i.test((await T(P,'#hometip'))||''));
  ok('no gambling/money wording in the end screen ('+P.name+')',!/\b(bet|betting|wager|odds|payout|prize|cash|dollar|\$)\b/i.test(await body(P)));
}
await waitFor(()=>MG.page.$('#sitelink[href]'),10000);
for(const P of [MG,SP]){const h=await P.page.$eval('#sitelink',e=>({tag:e.tagName,href:e.getAttribute('href'),text:e.innerText.trim()})).catch(()=>null);ok('header pill turns into a real "League site" link ('+P.name+')',!!h&&h.tag==='A'&&h.text==='League site'&&leaguePath.test(h.href)&&clean([h.href]),h)}
await MG.page.evaluate(()=>{const b=document.querySelector('[data-a="tab"][data-t="chat"]');if(b)b.click()});await sleep(500);
ok('the end card with its League site button stays at the top on the chat tab; chat is usable; no sticky bar',await has(MG,'#finalbanner #bigsite')&&await has(MG,'#chatin,input[type=text],textarea')&&!(await has(MG,'#stickysite')));
for(const P of [MG,SP])await P.page.evaluate(()=>{const b=document.querySelector('[data-a="tab"][data-t="board"]');if(b)b.click()});await sleep(500);
for(const P of [MG,SP]){const b=await P.page.$eval('#finalbanner #bigsite',e=>({text:e.innerText.trim(),href:e.getAttribute('href'),h:e.getBoundingClientRect().height})).catch(()=>null);ok('board tab (end of the board): League site button present with a clean link ('+P.name+')',!!b&&b.text==='League site'&&leaguePath.test(b.href)&&clean([b.href])&&b.h>=44,b)}
ok('end card on the board: exports and the redraft link, no old duplicate buttons',await has(MG,'#donecard #csvbtn')&&await has(SP,'#donecard #jsonbtn')&&await has(MG,'#donecard #redraftroomlink'));
const wide=await room('wide',id,{watch:1},{desktop:true,w:1280,h:800});await waitFor(()=>has(wide,'#finalbanner'),20000);await sleep(500);
await MG.shot('sitelink_390_manager');await SP.shot('sitelink_390_spectator');await wide.shot('sitelink_1280_spectator');
{const b=await wide.page.$eval('#bigsite',e=>{const r=e.getBoundingClientRect();return{text:e.innerText.trim(),href:e.getAttribute('href'),h:r.height,w:r.width,bottom:r.bottom,vh:innerHeight,inCard:!!e.closest('#finalbanner .endbtns3'),hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===e}}).catch(()=>null);
 ok('desktop 1280: end card League site button (exact label, clean href, >= 44 px, in view), no sticky bar',!!b&&b.text==='League site'&&b.inCard&&b.h>=44&&b.w>=44&&b.bottom<=b.vh&&b.hit&&leaguePath.test(b.href)&&clean([b.href])&&!(await has(wide,'#stickysite')),b);
 await wide.page.evaluate(()=>{const x=document.querySelector('[data-a="tab"][data-t="board"]');if(x)x.click()});await sleep(400);ok('desktop 1280: board tab still shows the League site button',await has(wide,'#finalbanner #bigsite'));
 const W2=await room('wide2',id,{watch:1},{desktop:true,w:1280,h:800});await waitFor(()=>has(W2,'#bigsite'),20000);await sleep(400);
 await Promise.all([W2.page.waitForNavigation({waitUntil:'domcontentloaded'}),W2.page.click('#bigsite')]);await waitFor(()=>has(W2,'#lhead'),20000);
 ok('desktop 1280: tapping League site opens the League site',/league\.html\?l=/.test(W2.page.url())&&await has(W2,'#lhead'),W2.page.url());await W2.close()}
console.log('\n[round trips: room <-> League site <-> recap, identity kept, no secrets in links]');
await Promise.all([MG.page.waitForNavigation({waitUntil:'domcontentloaded'}),MG.page.click('#bigsite')]);await waitFor(()=>has(MG,'#lhead'),20000);await sleep(800);
ok('the big button opens the League site',/league\.html/.test(MG.page.url())&&await has(MG,'#lhead')&&!/#|cm=|k=/.test(MG.page.url()),MG.page.url());
const nav=await MG.page.$$eval('#ltabs a.nd',els=>els.map(e=>({id:e.id,text:e.innerText.replace(/\s+/g,' ').trim(),href:e.getAttribute('href')})));
const rcl=await MG.page.$eval('#foot #tab_recap',e=>e.getAttribute('href')).catch(()=>'');ok('League site: tab row ends with the Draft link (room, manager: no watch flag, no secrets) and the footer has the Draft recap link',nav.length===1&&new RegExp('room\\.html\\?l='+id+'$','i').test(nav[0].href)&&recapPath.test(rcl)&&clean([nav[0].href,rcl]),[nav,rcl]);
ok('League site: the Draft recap link and the Draft tab are both reachable from the page',await has(MG,'#tab_recap')&&await has(MG,'#tab_room')&&/Draft recap/.test(await T(MG,'#tab_recap')));
await MG.shot('sitelink_390_league');
await Promise.all([MG.page.waitForNavigation({waitUntil:'domcontentloaded'}),MG.page.$eval('#tab_room',e=>e.click())]);await waitFor(()=>has(MG,'#tabs'),20000);await sleep(1500);
const who=await T(MG,'#who');ok('back in the room, the manager is still recognised on this device',new RegExp(owner.name).test(who||'')&&!/Spectator|Not joined/.test(who||''),who);
await MG.page.evaluate(()=>document.querySelector('[data-a=tab][data-t=my]').click());await sleep(700);ok('"My Team" works after the round trip',/\(you\)|My pick queue/.test(await T(MG,'#view')||''),await T(MG,'#view'));
await MG.page.evaluate(()=>document.querySelector('[data-a=tab][data-t=board]').click());await sleep(400);
await Promise.all([MG.page.waitForNavigation({waitUntil:'domcontentloaded'}),MG.page.$eval('#bnrecap',e=>e.click())]);await waitFor(()=>has(MG,'#recaphead'),20000);
ok('Draft recap opens the recap page',/recap\.html/.test(MG.page.url()));
const rs=await MG.page.$eval('#rcsite',e=>({tag:e.tagName,href:e.getAttribute('href'),text:e.innerText.trim(),top:e.getBoundingClientRect().top,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,vw:innerWidth,cls:e.className,inNext:!!e.closest('#rc_site')})).catch(()=>null);
ok('recap page: one "Back to my league" button in the What\'s next row (s25-full: one compact row, no longer full width), link clean, >= 44 px tall and wide',!!rs&&rs.tag==='A'&&rs.text==='Back to my league'&&rs.inNext&&/btn/.test(rs.cls)&&leaguePath.test(rs.href)&&clean([rs.href])&&rs.w>=44&&rs.h>=44,rs);
ok('recap page: no sticky League site bar (redesign)',!(await has(MG,'#stickysite')));
ok('recap page: no duplicate League site / Back to my league button or link in the cards (only #rcsite)',await MG.page.evaluate(()=>{const x=[...document.querySelectorAll('#app a,#app button')].filter(e=>/^(League site|Back to my league)$/.test(e.innerText.trim()));return x.length===1&&x[0].id==='rcsite'&&!document.getElementById('rcbtns')}));
/* s25-full: the finished recap has no Draft room button any more (What's next = Back to my league / Share my grade); any room link left on the page must still carry the code only */
const ro=await MG.page.$$eval('#app a[href*="room.html"]',els=>els.map(e=>e.getAttribute('href')));ok('recap page: no Draft room button in the finished recap; any room link has the code only (manager)',!(await has(MG,'#rc_room'))&&ro.every(h=>new RegExp('room\\.html\\?l='+id+'(&watch=1)?$','i').test(h))&&clean(ro),ro);
await MG.shot('sitelink_390_recap');
{await MG.page.evaluate(()=>{window.__blobs=[];const o=URL.createObjectURL;URL.createObjectURL=function(b){try{b.text().then(t=>window.__blobs.push(t))}catch(e){}return o.call(URL,b)}});
 await MG.page.evaluate(()=>(document.querySelectorAll('details.rcextra').forEach(d=>d.open=true),window.scrollTo(0,document.documentElement.scrollHeight)));await sleep(500);
 await MG.page.evaluate(()=>{const d=document.getElementById('rcmore');if(d)d.open=true;document.getElementById('csvbtn').scrollIntoView({block:'center'})});await sleep(300);   /* s23: the exports live in the collapsed More panel */
 const ex=await MG.page.evaluate(()=>{const c=document.getElementById('csvbtn'),j=document.getElementById('jsonbtn'),g=document.getElementById('rosgrid'),h=document.getElementById('hlcard'),st=document.getElementById('stickysite');const cr=c.getBoundingClientRect(),jr=j.getBoundingClientRect();const mid=r=>document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);const cs=getComputedStyle(c);return{below:cr.top>=g.getBoundingClientRect().bottom&&(!h||cr.top>=h.getBoundingClientRect().bottom),ghost:!c.classList.contains('btn')&&!/pri/.test(c.className)&&cs.backgroundColor==='rgba(0, 0, 0, 0)'&&parseFloat(cs.fontSize)<=14,tap:cr.height>=44&&jr.height>=44,notCovered:mid(cr)===c&&mid(jr)===j,inView:cr.bottom<=innerHeight&&jr.bottom<=innerHeight,stickyTop:st&&getComputedStyle(st).display!=='none'?st.getBoundingClientRect().top:null,cb:cr.bottom,txt:[c.innerText,j.innerText],inHead:!!document.querySelector('#recaphead #csvbtn,#recaphead #jsonbtn')}});
 ok('recap: Export CSV / Export JSON are small low-key links at the very bottom, below highlights and rosters, not in the top card',ex.below&&ex.ghost&&!ex.inHead&&/CSV/.test(ex.txt[0])&&/JSON/.test(ex.txt[1]),ex);
 ok('recap: the export links are tappable (>= 44 px) and not covered by the sticky League site button',ex.tap&&ex.notCovered&&ex.inView&&(ex.stickyTop==null||ex.cb<=ex.stickyTop+1),ex);
 await MG.page.$eval('#csvbtn',e=>e.click());await MG.page.$eval('#jsonbtn',e=>e.click());await sleep(900);const bl=await MG.page.evaluate(()=>window.__blobs.slice());
 ok('recap: both exports still produce their files',bl.some(x=>/^pick,round,manager/.test(x))&&bl.some(x=>/"picks"/.test(x)),bl.map(x=>x.slice(0,30)));
 await MG.shot('recap_390_bottom');}
const rw=await L.phone('recapwide',{desktop:true,w:1280,h:800});await rw.go('recap.html?l='+id);await waitFor(()=>has(rw,'#rcsite'),20000);ok('desktop recap: no sticky bar, rosters in a grid',!(await has(rw,'#stickysite'))&&await rw.page.$eval('#rosgrid',e=>getComputedStyle(e).display==='grid'));await rw.shot('sitelink_1280_recap');await rw.page.evaluate(()=>(document.querySelectorAll('details.rcextra').forEach(d=>d.open=true),window.scrollTo(0,document.documentElement.scrollHeight)));await sleep(300);await rw.shot('sitelink_1280_recap_bottom');ok('desktop recap: exports at the bottom too (below the rosters)',await rw.page.evaluate(()=>document.getElementById('csvbtn').getBoundingClientRect().top>=document.getElementById('rosgrid').getBoundingClientRect().bottom));await rw.close();
await Promise.all([MG.page.waitForNavigation({waitUntil:'domcontentloaded'}),MG.page.$eval('#rcsite',e=>e.click())]);await waitFor(()=>has(MG,'#lhead'),20000);ok('recap -> League site works',/league\.html/.test(MG.page.url()));
await Promise.all([MG.page.waitForNavigation({waitUntil:'domcontentloaded'}),MG.page.$eval('#tab_recap',e=>e.click())]);await waitFor(()=>has(MG,'#recaphead'),20000);ok('League site -> Draft recap works',/recap\.html/.test(MG.page.url()));
/* spectator: the room link carries watch=1 and still opens read-only */
const SW=await L.phone('specleague',{});await SW.go('league.html?l='+id);await waitFor(()=>has(SW,'#ltabs'),20000);
const sr=await SW.page.$eval('#tab_room',e=>e.getAttribute('href')).catch(()=>null);ok('spectator: League site "Draft room" link opens the room as a spectator, code only',!!sr&&new RegExp('room\\.html\\?l='+id+'&watch=1$','i').test(sr)&&clean([sr]),sr);
await Promise.all([SW.page.waitForNavigation({waitUntil:'domcontentloaded'}),SW.page.$eval('#tab_room',e=>e.click())]);await waitFor(()=>has(SW,'#tabs'),20000);await sleep(1200);ok('spectator round trip: room shows Spectator',/Spectator/.test(await T(SW,'#who')||''));await SW.close();
/* commissioner: the secret stays in localStorage across pages, no secret in any link */
const CMP=await room('cm',id,{h:'#cm='+I.cmSecret+'&as='+I.managers[0].id+'&k='+I.managers[0].k});await waitFor(()=>has(CMP,'#finalbanner'),20000);await sleep(800);
ok('commissioner (secret from the #cm fragment) is recognised in the room',/commissioner/i.test(await T(CMP,'#who')||''),await T(CMP,'#who'));
await Promise.all([CMP.page.waitForNavigation({waitUntil:'domcontentloaded'}),CMP.page.$eval('#bigsite',e=>e.click())]);await waitFor(()=>has(CMP,'#lhead'),20000);await sleep(1000);
ok('commissioner: the League site page sees the Change photo control (secret remembered, not in the URL)',await has(CMP,'#herochange')&&!/#|cm=/.test(CMP.page.url())&&clean(await hrefs(CMP,'#ltabs a.nd, #lsbtns a, #chatroom'))&&(await hrefs(CMP,'#ltabs a.tb')).every(h=>/^[^#?]*league\.html\?l=[A-Z0-9]+#[a-z]+$/i.test(h)&&!/k=|cm=|as=/.test(h)&&!secrets.some(s=>h.includes(s)))   /* s24: tab links carry only ?l=CODE#<tab> */,CMP.page.url());
await Promise.all([CMP.page.waitForNavigation({waitUntil:'domcontentloaded'}),CMP.page.$eval('#tab_room',e=>e.click())]);await waitFor(()=>has(CMP,'#tabs'),20000);await sleep(1500);
ok('commissioner is still recognised after the round trip (controls present)',/commissioner/i.test(await T(CMP,'#who')||''),await T(CMP,'#who'));await CMP.close();
console.log('\n[home page]');
{const H=await L.phone('home',{});await H.go('index.html');await waitFor(()=>has(H,'#landing'),15000);ok('no remembered league: no League site button',!(await has(H,'#sitebtn')));
 await H.page.evaluate(i=>{localStorage.setItem('fbn.leagues',JSON.stringify([{id:i,name:'Friday Hoops',role:'manager',ts:1}]))},id);await H.page.reload({waitUntil:'domcontentloaded'});await waitFor(()=>has(H,'#landing'),15000);
 const b=await H.page.$eval('#sitebtn',e=>({href:e.getAttribute('href'),text:e.innerText})).catch(()=>null);ok('remembered league: "League site" button links to league.html?l=<code> only',!!b&&leaguePath.test(b.href)&&/League site/.test(b.text)&&/Friday Hoops/.test(b.text)&&clean([b.href]),b);await H.shot('sitelink_390_home');
 await H.page.evaluate(i=>{localStorage.setItem('fbn.leagues',JSON.stringify([{id:'"><img src=x onerror=alert(1)>',name:'<b>x</b>',role:'m',ts:3},{id:i,name:'<img src=x onerror=alert(1)>Evil',role:'manager',ts:2}]))},id);await H.page.reload({waitUntil:'domcontentloaded'});await waitFor(()=>has(H,'#landing'),15000);
 const b2=await H.page.$eval('#sitebtn',e=>({href:e.getAttribute('href'),html:e.innerHTML})).catch(()=>null);ok('a malformed remembered id is skipped and names are escaped (no markup, no script)',!!b2&&leaguePath.test(b2.href)&&!/<img/i.test(b2.html)&&(await H.page.$$('#sitebtn img, #mine img')).length===0&&H.errs.length===0,b2);
 await H.page.evaluate(()=>localStorage.setItem('fbn.leagues',JSON.stringify([{id:'not a code',name:'x'}])));await H.page.reload({waitUntil:'domcontentloaded'});await waitFor(()=>has(H,'#landing'),15000);ok('only malformed ids remembered: no button, no crash',!(await has(H,'#sitebtn'))&&H.errs.length===0,H.errs);await H.close()}
{const H=await L.phone('homew',{desktop:true,w:1280,h:800});await H.go('index.html');await H.page.evaluate(i=>{localStorage.setItem('fbn.leagues',JSON.stringify([{id:i,name:'Friday Hoops',role:'manager',ts:1}]))},id);await H.page.reload({waitUntil:'domcontentloaded'});await waitFor(()=>has(H,'#sitebtn'),15000);await H.shot('sitelink_1280_home');await H.close()}
console.log('\n[ended early / redraft leagues]');
{const idE=await seed(API,{managers:8,rounds:3});const m=await gj(F.Keys(idE).meta);m.endedEarly=true;await post(F.Keys(idE).meta,m);const P=await room('early',idE,{watch:1});await waitFor(()=>has(P,'#finalbanner'),20000);ok('a draft ended early shows the League site button and Draft recap',await has(P,'#bigsite')&&await has(P,'#bnrecap'));await P.close()}
{const idR=await seed(API,{managers:8,rounds:3});const K2=F.Keys(idR);const m=await gj(K2.meta);const mids=m.order;const stand=mids.slice();
  const st=F.deriveState(F.normalizeMeta(m),{},{},null);
  /* a redraft league that is complete: live redraft, one real pick made */
  const nm=F.normalizeMeta(m);const o=F.mRedraftOpen(nm,Object.assign({},F.deriveState(nm,await (async()=>{const e={};for(let k=1;k<=24;k++)e[k]=F.parseEntry(await (await fetch(API+encodeURIComponent(K2.pick(1,k)))).text());return e})(),{},null)),{rows:stand.map((mid,i)=>({mid,wins:1,losses:i,diff:0,idx:i,place:i+1})),now:Date.now()});
  ok('(setup) redraft can be opened for the link test',!o.error,o.error);
  if(!o.error){await post(K2.meta,Object.assign({},o.state,{version:(m.version||0)+1}));const P=await room('rd',idR,{watch:1});await waitFor(()=>has(P,'#finalbanner'),20000);ok('redraft-open leagues: both buttons present on the complete screen',await has(P,'#bigsite')&&await has(P,'#bnrecap')&&await has(P,'#redraftroomlink'));
  await P.go('redraft.html?l='+idR);await waitFor(()=>has(P,'#rapp[data-ready],#rdlive,#rapp'),15000);await sleep(1500);const rb=await P.page.$$eval('a.btn',els=>els.map(e=>({t:e.innerText.trim(),h:e.getAttribute('href')})));ok('redraft page links back: League site and Draft room, code only',rb.some(x=>x.t==='League site'&&x.h.endsWith('/league.html?l='+idR))&&rb.some(x=>/Draft room/.test(x.t)&&/room\.html\?l=/.test(x.h))&&clean(rb.map(x=>x.h)),rb);await P.close()}}
for(const P of [MG,SP,wide])ok('no page errors on '+P.name,P.errs.length===0,P.errs);
for(const P of [MG,SP,wide])await P.close();
}catch(e){bad++;fails.push('exception '+(e&&e.stack||e));console.log('EXCEPTION',e&&e.stack||e)}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
