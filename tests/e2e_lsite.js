const TX=require('./tabs_exp.js');   /* s25 */
/* League site (league.html): tab row + links, modes, DEMO bar, banner photo (default, commissioner change/reset, forged and malicious values), chat bar.
   needs: node tools/mock_textdb.js 8600 "$PWD" 8601        node tests/e2e_lsite.js */
process.env.APP=process.env.APP||'http://localhost:8600';process.env.API=process.env.API||'http://localhost:8601/api/data/';
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
const get=async k=>(await fetch(API+encodeURIComponent(k))).text();
const has=(P,sel)=>P.page.$(sel).then(x=>!!x);const T=(P,sel)=>P.page.$eval(sel,e=>e.innerText.trim()).catch(()=>null);
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const heroBg=P=>P.page.$eval('#hero',e=>e.style.backgroundImage).catch(()=>null);
const open=async(name,id,q,opt,pre)=>{const P=await L.phone(name,opt||{});await P.page.setBypassServiceWorker(true);if(pre)await P.page.evaluateOnNewDocument(pre.fn,...pre.args);await P.go('league.html?l='+id+(q||''));await waitFor(()=>has(P,'#ltabs'),20000);await sleep(900);return P};
(async()=>{try{
const id=await seed(API);const I=seed.info;const K=F.Keys(id);const mine=I.managers[0];
console.log('\n[tabs, links, modes, DEMO bar]');
const D=await open('demo',id,'&demo=1');
ok('DEMO bar is shown on the demo',await has(D,'#demobar'));
const tabs=await D.page.$$eval('#ltabs [data-a=tab]',b=>b.map(x=>x.dataset.v));ok('tab buttons in order (s25): '+TX.labels.join(', '),JSON.stringify(tabs)===JSON.stringify(TX.vis),tabs);
{const lb=await D.page.evaluate(()=>{const g=v=>{const b=document.querySelector('#ltabs [data-v='+v+']');return b&&{f:b.querySelector('.nl.f').textContent,s:b.querySelector('.nl.s').textContent,m:b.querySelector('.nl.m').textContent,aria:b.getAttribute('aria-label'),tt:[...b.querySelectorAll('.nl')].map(x=>getComputedStyle(x).textTransform).join()}};const r=g('redraft');const vis=document.querySelector('#ltabs [data-v=redraft] .nl.f');return{r,all:[...document.querySelectorAll('#ltabs [data-a=tab] .nl.f')].map(x=>x.textContent),shown:[...document.querySelectorAll('#ltabs [data-v=redraft] .nl')].filter(x=>getComputedStyle(x).display!=='none').map(x=>x.innerText)}});
if(TX.has('redraft'))ok('the Redraft tab reads exactly "Redraft" (capital R) in the full, short and mid labels and the aria-label; no CSS text-transform; the visible label is "Redraft"',lb.r&&lb.r.f==='Redraft'&&lb.r.s==='Redraft'&&lb.r.m==='Redraft'&&lb.r.aria==='Redraft'&&/^none(,none)*$/.test(lb.r.tt)&&lb.shown.length===1&&lb.shown[0]==='Redraft',lb);
ok('tab labels in order are exactly '+TX.labels.join(', '),JSON.stringify(lb.all)===JSON.stringify(TX.labels),lb.all)}
const an=await D.page.$$eval('#ltabs a.nd',a=>a.map(x=>({id:x.id,t:x.innerText.replace(/\s+/g,' ').trim()})));ok('plus one link in the tab row: Draft (the draft room); the draft recap is linked in the footer',an.length===1&&an[0].id==='tab_room'&&/Draft/.test(an[0].t)&&await has(D,'#foot #tab_recap'),an);
ok('league page header has a big title, the league name and the banner',/^friday hoops$/i.test(await T(D,'#ltitle')||'')&&await has(D,'#hero'),await T(D,'#ltitle'));
for(const [v,sel] of [['standings','.strow'],['teams','#main table'],['games','.gm,#gempty'],['rosters','#ownercard'],['postseason','#tstand'],['redraft','#redraftcard'],['archive','#archempty'],['rules','#main .card']].filter(x=>TX.has(x[0]))){await D.page.evaluate(v=>document.querySelector('#ltabs [data-v='+v+']').click(),v);await sleep(450);
  ok('tab "'+v+'" shows its content and is marked on',await has(D,sel)&&await D.page.$eval('#ltabs [data-v='+v+']',e=>e.classList.contains('on')));}
await D.page.evaluate(()=>document.querySelector('#ltabs [data-v=standings]').click());await sleep(300);
const rows=await D.page.$$eval('#main .ocl .strow',r=>r.length);ok('standings are dark owner cards, 8 of them, with the schools as chips',rows===8&&await D.page.$$eval('#main .ocl .strow',r=>r.every(x=>x.querySelectorAll('.chip').length===6&&x.querySelector('.place'))),rows);
ok('no money wording or amounts on the League site (Bets are pushups)',!/\b(wager\w*|payout|prize|cash|money|dollars?|lottery|jackpot|gambl\w*|USD|IDR|Rp)\b|\$\s?\d/i.test(await T(D,'body')||''));
ok('chat bar is a button that opens the chat panel (s22), the panel links to the room chat without secrets',await D.page.$eval('#chatbar',e=>e.tagName==='BUTTON'&&e.getAttribute('aria-expanded')==='false').catch(()=>false)&&await D.page.$eval('#chatroom',e=>/room\.html\?l=/.test(e.getAttribute('href'))&&!/#|cm=|k=/.test(e.getAttribute('href'))).catch(()=>false));
ok('demo: no page errors',D.errs.length===0,D.errs);await D.close();
console.log('\n[redraft tab before its window]');if(TX.has('redraft'))
{const R=await open('rd',id,'#redraft');const t=await T(R,'#redraftcard')||'';ok('deep link #redraft opens the Redraft tab',await has(R,'#redraftcard'));
 ok('it explains the date, the order, the last-place choice and the drops',/January 20, 2027/.test(t)&&/last place/i.test(t)&&/drop up to 2/i.test(t)&&/standings/i.test(t),t);
 const cd=F.redraftCountdown(Date.now(),'UTC');ok('countdown text matches the date maths',cd.state!=='future'||new RegExp(cd.text.replace(/\d+/,'\\d+')).test(t),[cd,t]);
 ok('before the window: the button is disabled and a preview link is offered',cd.state!=='future'||(await R.page.$eval('#redraftlink',e=>e.disabled&&e.getAttribute('aria-disabled')==='true').catch(()=>false)&&await has(R,'#redraftpreview')));await R.close()}
console.log('\n[chat bar]');
{await post(K.chat,{version:1,msgs:[{id:'a1b2c3d4',ts:Date.now()-60000,who:mine.id,text:'<b>Good luck</b> everyone'}]});await post(K.pres(mine.id),{t:Date.now()});
 const C=await open('chat',id,'',{});await waitFor(()=>C.page.$eval('#chatlast',e=>/Good luck/.test(e.textContent)),15000);
 const o=await C.page.$eval('#chatbar',e=>({last:document.getElementById('chatlast').textContent,html:document.getElementById('chatlast').innerHTML,pres:document.getElementById('chatpres').textContent,badge:!document.getElementById('chatbadge').hidden,pos:getComputedStyle(document.getElementById('chat')).position}));
 ok('last chat message shown as plain text (markup not interpreted), with the sender name',/Ana: <b>Good luck<\/b> everyone/.test(o.last)&&!/<b>/.test(o.html.replace(/&lt;b&gt;|&lt;\/b&gt;/g,'')),o);
 ok('presence line shows who is online (read-only)',/Ana/.test(o.pres),o.pres);ok('unread badge and fixed position',o.badge&&o.pos==='fixed',o);
 await C.page.$eval('#chatroom',e=>{e.addEventListener('click',ev=>ev.preventDefault(),true);e.click()});const tab=await C.page.evaluate(()=>localStorage.getItem('fbn.x.'+new URLSearchParams(location.search).get('l')+'.tab'));ok('"Open in the draft room" in the chat panel opens the room on the Chat tab',tab==='chat',tab);await C.close()}
console.log('\n[banner photo]');
const spec=await open('spec',id,'');
ok('spectator: default banner photo, no Change/Reset control',(await heroBg(spec)).includes('assets/hero-banner.jpg')&&!(await has(spec,'#heroctl'))&&!(await has(spec,'#herochange')));
const hs=await spec.page.$eval('#hero',e=>({bg:getComputedStyle(e).backgroundSize,pos:getComputedStyle(e).backgroundPosition,h:e.getBoundingClientRect().height,w:e.getBoundingClientRect().width}));ok('banner uses cover and a centred position',hs.bg==='cover'&&/^50%/.test(hs.pos),hs);
const mg=await open('mgr',id,'',{},{fn:(i,m)=>localStorage.setItem('fbn.me.'+i,JSON.stringify(m)),args:[id,{mid:mine.id,k:mine.k}]});
ok('manager: no Change/Reset control',!(await has(mg,'#heroctl'))&&!(await has(mg,'#herochange')));
/* a forged secret in localStorage does not turn on the control */
const fg=await open('forged',id,'',{},{fn:(i)=>localStorage.setItem('fbn.cm.'+i,'deadbeef'.repeat(4)),args:[id]});ok('wrong commissioner secret on the device: no control',!(await has(fg,'#heroctl')));
/* forged write through the UI path: inject the file input into a non-commissioner page and fire the change event */
const png=()=>{const c=document.createElement('canvas');c.width=640;c.height=300;const x=c.getContext('2d');x.fillStyle='#c33';x.fillRect(0,0,640,300);x.fillStyle='#fc3';x.fillRect(200,60,240,180);return new Promise(r=>c.toBlob(b=>r(new File([b],'t.png',{type:'image/png'})),'image/png'))};
await fg.page.evaluate(async png=>{const f=await eval('('+png+')')();const i=document.createElement('input');i.type='file';i.id='herofile';document.body.appendChild(i);const dt=new DataTransfer();dt.items.add(f);i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}))},png.toString());await sleep(2500);
ok('forged change from a non-commissioner page writes nothing to the store',(await get(K.hero))==='',await get(K.hero));
ok('...and the page still shows the default banner',(await heroBg(fg)).includes('assets/hero-banner.jpg'));
await fg.close();
/* commissioner: the secret from the room / #cm fragment is remembered, never shown in the URL */
const cm=await open('cm',id,'#cm='+I.cmSecret);
ok('commissioner (#cm fragment, then removed from the URL) sees "Change photo"; no Reset yet',await has(cm,'#herochange')&&!(await has(cm,'#heroreset'))&&!/#|cm=/.test(cm.page.url()),cm.page.url());
await cm.page.evaluate(async png=>{const f=await eval('('+png+')')();const i=document.getElementById('herofile');const dt=new DataTransfer();dt.items.add(f);i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}))},png.toString());
await waitFor(async()=>/^url\("data:image\/jpeg/.test(await heroBg(cm)),15000);
const stored=F.parseHero(await get(K.hero));ok('commissioner change: stored in its own key as a safe JPEG data URL within 150 KB',!!stored&&/^data:image\/jpeg;base64,/.test(stored.url)&&F.heroOk(stored.url),stored&&stored.url.length);
ok('...and shown in the banner, with "Reset to default" now offered',/^url\("data:image\/jpeg/.test(await heroBg(cm))&&await has(cm,'#heroreset'));
await cm.shot('league_site_390_hero_changed');
const sp2=await open('spec2',id,'');ok('another device sees the new photo (read on load, sanitised)',/^url\("data:image\/jpeg/.test(await heroBg(sp2)));
const pollKeys=[];sp2.page.on('request',r=>{if(/hero/.test(r.url()))pollKeys.push(r.url())});await sleep(32000);ok('the photo key is not polled (no hero requests in 32 s, chat bar polls only)',pollKeys.length===0,pollKeys);await sp2.close();
await cm.page.$eval('#heroreset',e=>e.click());await waitFor(async()=>(await get(K.hero))==='',15000);await waitFor(async()=>(await heroBg(cm)).includes('assets/hero-banner.jpg'),8000);
ok('Reset to default: key blanked and the default banner is back',(await get(K.hero))===''&&(await heroBg(cm)).includes('assets/hero-banner.jpg')&&!(await has(cm,'#heroreset')));
await cm.close();
console.log('\n[malicious stored values fall back to the default]');
for(const [nm,val] of [['svg',{v:1,url:'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+',ts:1}],['javascript url',{v:1,url:'javascript:alert(1)',ts:1}],['remote url',{v:1,url:'https://evil.test/x.jpg',ts:1}],['quote break-out',{v:1,url:'data:image/jpeg;base64,AAAA");background:url("https://evil.test/x',ts:1}],['oversized',{v:1,url:'data:image/jpeg;base64,'+Buffer.alloc(200*1024,1).toString('base64'),ts:1}],['not json','<script>alert(1)</script>']]){
  await post(K.hero,typeof val==='string'?val:JSON.stringify(val));const P=await open('mal',id,'',{},{fn:i=>localStorage.removeItem('fbn.hero.'+i),args:[id]});
  ok('malicious "'+nm+'": default banner, no errors, no dialog',(await heroBg(P)).includes('assets/hero-banner.jpg')&&P.errs.length===0,[await heroBg(P),P.errs]);await P.close()}
await post(K.hero,'');
console.log('\n[fallback when the image fails to load]');
{const P=await L.phone('fail',{});await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);P.page.on('request',r=>/hero-banner/.test(r.url())?r.abort():r.continue());await P.go('league.html?l='+id);await waitFor(()=>has(P,'#hero'),20000);await sleep(1500);
 const o=await P.page.$eval('#hero',e=>({bg:getComputedStyle(e).backgroundImage,fail:e.classList.contains('herofail')}));ok('failed image: gradient fallback, page still works',o.fail&&/gradient/.test(o.bg)&&await has(P,'#ltabs'),o);await P.close()}
console.log('\n[screens: 390 and 1280]');
for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){const P=await open('s'+w,id,'&demo=1',desk?{desktop:true,w,h}:{w,h});
  for(const t of TX.vis){await P.page.evaluate(t=>document.querySelector('#ltabs [data-v='+t+']').click(),t);await sleep(400);const ov=await P.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);ok(w+'px: no sideways overflow on '+t,!ov)}
  const nb=await P.page.$eval('#ltabs',e=>({over:e.scrollWidth>e.clientWidth+1,rows:new Set([...e.children].map(x=>Math.round(x.getBoundingClientRect().top))).size,minW:Math.min(...[...e.children].map(x=>x.getBoundingClientRect().width)),pos:getComputedStyle(e).position,min:Math.min(...[...e.children].map(x=>x.getBoundingClientRect().height))}));ok(w+'px: tab bar never scrolls sideways (s25: wraps into rows below 760px, one row and sticky on desktop), tap targets >= 44px',!nb.over&&(w<760?nb.pos==='static':nb.rows===1&&nb.pos==='sticky')&&nb.min>=44&&nb.minW>=44,nb);await P.close()}
}catch(e){bad++;fails.push('exception '+(e&&e.stack||e));console.log('EXCEPTION',e&&e.stack||e)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
