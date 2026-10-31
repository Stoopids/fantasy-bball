/* s24: League site tab URLs + deep links + copy / share links.
   Refresh stays on every tab, Back / Forward, deep links to a bet and a game card (highlight, not-found note), copied / shared links carry no identity or k=,
   identity fragments are stripped from the address bar, room link + Redraft label intact, no overflow and 44px tap targets at 320 / 360 / 390 / 1280.
   node tests/e2e_deeplink_s24.js  (APP / API env, mock store, ESPN + scores.json mocked). Screenshots to SHOTS (default /workspace/league-site-work/compare-s24). */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const F=require('../js/core.js');const fs=require('fs'),path=require('path');
const SH=process.env.SHOTS||'/workspace/league-site-work/compare-s24';
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
const base=process.env.API||'http://localhost:9996/api/data/';const post=(k,v)=>fetch(base+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
const MONEY=/\b(wager\w*|payout|prize|cash|money|dollars?|lottery|jackpot|gambl\w*|USD|IDR|Rp)\b|\$\s?\d/i;
const tsrc=fs.readFileSync(path.join(__dirname,'..','assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));const TIDS=TD.teams.map(t=>t[0]);
const [A1,B1,C1,D1,U1,U2]=TIDS.slice(0,6);
const rosters=()=>{const used=[A1,B1,C1,D1,U1,U2];const rest=TIDS.filter(t=>!used.includes(t));const R=[[A1],[B1],[C1],[D1],[],[],[],[]];let k=0;for(const r of R)while(r.length<6)r.push(rest[k++]);return R};
const now=Date.now(),H=3600e3;const iso=ms=>new Date(ms).toISOString().replace(/\.\d+Z/,'Z');const etDay=ms=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
const G=(id,h,a,o)=>Object.assign({id,day:etDay(now+3*24*H),start:iso(now+3*24*H),status:'scheduled',kind:'reg',round:'',neutral:false,home:{id:h,score:null,seed:null},away:{id:a,score:null,seed:null}},o||{});
const GAMES=[G('g1',B1,A1),G('g3',D1,C1),G('g6',U1,U2),G('g8',B1,D1,{status:'final',start:iso(now-5*24*H),day:etDay(now-5*24*H),home:{id:B1,score:70,seed:null},away:{id:D1,score:60,seed:null}})];
for(let i=0;i<30;i++)GAMES.push(G('gx'+i,C1,A1,{start:iso(now+(4+i)*24*H),day:etDay(now+(4+i)*24*H)}));
const TABS=require('./tabs_exp.js').vis;   /* s25: tabs visible at the test clock (LNOW) */
async function phone(id,info,i,o){o=o||{};const P=await L.phone('d'+Math.random().toString(36).slice(2,6),o.w?{desktop:o.w>=1000,w:o.w,h:o.w>=1000?900:780}:{});
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
  P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify({format:1,sample:false,label:'',season:'2026-27',as_of:'2026-11-01',source:'test',games:GAMES})});
    else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
  if(i!=null)await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[i].id,k:info.managers[i].k});
  await P.page.evaluateOnNewDocument(sh=>{window.__copied=[];try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:t=>{window.__copied.push(t);return Promise.resolve()}}})}catch(e){}
    if(sh){window.__shared=[];Object.defineProperty(navigator,'share',{configurable:true,value:d=>{window.__shared.push(d.url);return Promise.resolve()}})}else{try{delete Navigator.prototype.share}catch(e){}}},!!o.share);
  return P}
const ready=P=>P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});
const cur=P=>P.page.$eval('#ltabs [aria-current=page]',e=>e.dataset.v).catch(()=>null);
const url=P=>P.page.url();
const secretFree=(u,info)=>!/[?&#](k|as|cm|mid)=/i.test(u)&&!info.managers.some(m=>u.includes(m.k)||u.includes(m.id));
const audit=P=>P.page.evaluate(()=>{const A=[...document.querySelectorAll('#lshare button, .cpl, #ltabs a')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0});
  return{n:A.length,small:A.filter(e=>{const r=e.getBoundingClientRect();return r.height<43.5||r.width<43.5}).map(e=>(e.id||e.className)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)).slice(0,6),over:document.documentElement.scrollWidth>innerWidth+1}});
(async()=>{try{
  const id=await seed(undefined,{rosters:rosters()});const info=seed.info;const M=info.managers.map(m=>m.id);
  /* a pending bet Ana -> Ben straight into Ana's own log */
  const betId='dlbet0001';await post(F.Keys(id).base+'-bets-'+M[0],{v:1,ev:[{k:'p',u:'dlu0000001',ts:Date.now()-60000,id:betId,to:M[1],amt:10,a:1,b:1,text:'Ben scores 20 in the opener'},{k:'p',u:'dlu0000002',ts:Date.now()-50000,id:'dlbet0002',to:M[2],amt:5,a:1,b:1,text:'Cy hits a three'}]});
  /* ---- refresh on every tab ---- */
  const P=await phone(id,info,0);await P.go('league.html?l='+id);await ready(P);
  ok('plain open: Standings, URL has no hash (start state unchanged)',(await cur(P))==='standings'&&!/#/.test(url(P)),url(P));
  for(const t of TABS){await P.page.click('#ltabs [data-v="'+t+'"]');await sleep(250);const u1=url(P);await P.page.reload({waitUntil:'domcontentloaded'});await ready(P);await sleep(300);
    ok('tab '+t+': URL is ?l=CODE#'+t+' and a refresh stays on it',u1.endsWith('league.html?l='+id+'#'+t)&&(await cur(P))===t&&url(P)===u1,{u1,after:url(P),cur:await cur(P)})}
  await P.page.click('#ltabs [data-v="bets"]');await sleep(300);
  await P.page.reload({waitUntil:'domcontentloaded'});await ready(P);await P.page.waitForSelector('[data-bet]',{timeout:15000});await sleep(300);ok('refresh on Bets: still Bets with the bets loaded',(await cur(P))==='bets');await P.page.screenshot({path:SH+'/s24_dl_1_tab_after_refresh_390.png'});
  /* ---- Back / Forward ---- */
  await P.page.click('#ltabs [data-v="standings"]');await sleep(200);await P.page.click('#ltabs [data-v="games"]');await sleep(200);await P.page.click('#ltabs [data-v="teams"]');await sleep(200);
  await P.page.goBack();await sleep(400);const b1=await cur(P);await P.page.goBack();await sleep(400);const b2=await cur(P);await P.page.goForward();await sleep(400);const f1=await cur(P);
  ok('Back / Forward walk the tabs (teams -> games -> standings -> games), page stays loaded',b1==='games'&&b2==='standings'&&f1==='games'&&/#games$/.test(url(P)),{b1,b2,f1,u:url(P)});
  await P.page.evaluate(()=>{location.hash='#rules'});await sleep(400);ok('typing a hash (#rules) switches the tab (hashchange)',(await cur(P))==='rules');
  await P.page.evaluate(()=>{location.hash='#schedule'});await sleep(400);ok('#schedule opens Games',(await cur(P))==='games');
  ok('every URL this page wrote is free of k= / manager id',secretFree(url(P),info),url(P));
  /* ---- tabs are real links ---- */
  {const exp0=APP+'/league.html?l='+id;const tl=await P.page.$$eval('#ltabs [data-a=tab]',a=>a.map(x=>({tag:x.tagName,href:x.href,v:x.dataset.v,cur:x.getAttribute('aria-current'),on:x.classList.contains('on')})));
  ok('every tab is an <a> whose href is exactly ?l=CODE#<tab> (no identity), all visible tabs, active one has aria-current=page + .on',tl.length===TABS.length&&tl.every(x=>x.tag==='A'&&x.href===exp0+'#'+x.v&&secretFree(x.href,info))&&tl.filter(x=>x.cur==='page'&&x.on).length===1,tl);
  await P.page.evaluate(()=>{window.__mark=1;window.__ev=[];['click','auxclick'].forEach(t=>window.addEventListener(t,e=>{const a=e.target.closest&&e.target.closest('#ltabs a');if(a)window.__ev.push({t,dp:e.defaultPrevented,v:a.dataset.v,b:e.button})}))});
  const pagesBefore=(await P.ctx.pages()).length;
  await P.page.click('#ltabs [data-v="standings"]');await sleep(300);
  const pc=await P.page.evaluate(()=>({mark:window.__mark,ev:window.__ev.slice(-1)[0]}));
  ok('plain left click: switches in place (same document, default prevented, URL #standings, no new page)',(await cur(P))==='standings'&&pc.mark===1&&pc.ev&&pc.ev.dp===true&&/#standings$/.test(url(P))&&(await P.ctx.pages()).length===pagesBefore,pc);
  const newTarget=()=>new Promise(r=>{const t=setTimeout(()=>r(null),4000);P.ctx.once('targetcreated',x=>{clearTimeout(t);r(x)})});
  const mod=process.platform==='darwin'?'Meta':'Control';
  for(const [label,how] of [['Ctrl/Cmd-click',async()=>{await P.page.keyboard.down(mod);await P.page.click('#ltabs [data-v="teams"]');await P.page.keyboard.up(mod)}],['Shift-click',async()=>{await P.page.keyboard.down('Shift');await P.page.click('#ltabs [data-v="teams"]');await P.page.keyboard.up('Shift')}],['middle-click',async()=>{await P.page.click('#ltabs [data-v="teams"]',{button:'middle'})}]]){
    const nt=newTarget();await how();const t=await nt;await sleep(300);const e=await P.page.evaluate(()=>window.__ev.slice(-1)[0]);
    let landed=null;if(t&&t.type()==='page'){const np=await t.page();try{await np.waitForFunction(()=>location.href.indexOf('#')>0,{timeout:5000});landed=np.url()}catch(_){landed=np.url()}await np.close()}
    ok(label+': not switched in place, not prevented (browser default), page still on Standings'+(t?' and a new tab/window opened ('+String(landed).replace(/^.*league/,'league')+')':''),(await cur(P))==='standings'&&/#standings$/.test(url(P))&&e&&e.v==='teams'&&e.dp===false&&(!landed||landed===exp0+'#teams'),{e,landed})}
if(TABS.includes('redraft')){  const NT=await P.ctx.newPage();await NT.setViewport({width:390,height:844});const href=await P.page.$eval('#ltabs [data-v="redraft"]',a=>a.href);await NT.goto(href,{waitUntil:'domcontentloaded'});await NT.waitForSelector('#lapp[data-ready]',{timeout:25000});
  ok('a new tab opened from a tab href lands on that tab (Redraft)',(await NT.$eval('#ltabs [aria-current=page]',e=>e.dataset.v))==='redraft'&&NT.url()===exp0+'#redraft');await NT.close();}
  await P.page.focus('#ltabs [data-v="rules"]');await P.page.keyboard.press('Enter');await sleep(300);ok('keyboard: Enter on a focused tab link switches in place',(await cur(P))==='rules'&&(await P.page.evaluate(()=>window.__mark))===1);
  const DM=await phone(id,info,null);await DM.go('league.html?l='+id+'&demo=1#games');await ready(DM);const dh=await DM.page.$$eval('#ltabs [data-a=tab]',a=>a.map(x=>x.href));
  ok('demo: tab hrefs are ?l=CODE&demo=1#<tab>, Games stays open',dh.length===TABS.length&&dh.every(h=>h.startsWith(exp0+'&demo=1#')&&secretFree(h,info))&&(await cur(DM))==='games',dh.slice(0,2));await DM.page.close();
  ok('no page errors on the link checks',P.errs.length===0,P.errs)}
  await P.page.close();
  /* ---- identity fragment is stripped, tab kept ---- */
  const I=await phone(id,info,null);await I.go('league.html?l='+id+'&watch=1#bets&as='+M[0]+'&k='+info.managers[0].k);await ready(I);await sleep(300);
  ok('a link with #bets&as=..&k=.. opens Bets and the address bar is cleaned to ?l=CODE#bets (no identity, no other query)',(await cur(I))==='bets'&&url(I).endsWith('league.html?l='+id+'#bets')&&secretFree(url(I),info),url(I));await I.page.close();
  const CMp=await phone(id,info,null);await CMp.go('league.html?l='+id+'#cm='+info.cmSecret);await ready(CMp);await sleep(300);ok('commissioner #cm= link: secret removed, URL has no hash',!/#|cm=/.test(url(CMp))&&(await cur(CMp))==='standings',url(CMp));await CMp.page.close();
  /* ---- deep link to a bet ---- */
  const B=await phone(id,info,1);await B.go('league.html?l='+id+'#bets/'+betId);await ready(B);await B.page.waitForSelector('[data-bet="'+betId+'"].dl-hl',{timeout:15000}).catch(()=>{});
  const bs=await B.page.evaluate(id=>{const c=document.querySelector('[data-bet="'+id+'"]');if(!c)return null;const r=c.getBoundingClientRect();return{hl:c.classList.contains('dl-hl'),inView:r.top<innerHeight&&r.bottom>0}},betId);
  ok('deep link #bets/<id>: Bets tab, the card is highlighted and scrolled into view',(await cur(B))==='bets'&&bs&&bs.hl&&bs.inView&&url(B).endsWith('#bets/'+betId),{bs,u:url(B)});
  await B.page.screenshot({path:SH+'/s24_dl_2_deeplink_bet_highlight_390.png'});
  await sleep(2900);ok('the highlight is brief (gone after ~2.6 s)',!(await B.page.$('.dl-hl')));await B.page.close();
  const BM=await phone(id,info,1);await BM.go('league.html?l='+id+'#bets/nosuchbet9');await ready(BM);await BM.page.waitForSelector('#dlmiss',{timeout:15000}).catch(()=>{});
  ok('deep link to a missing bet: Bets tab + short "not found" note, bets still listed',(await cur(BM))==='bets'&&/not found/.test(await BM.page.$eval('#dlmiss',e=>e.innerText).catch(()=>''))&&!!(await BM.page.$('[data-bet]')));
  await BM.page.click('#ltabs [data-v="games"]');await sleep(300);ok('the note goes away on another tab',!(await BM.page.$('#dlmiss')));await BM.page.close();
  /* ---- deep link to a game ---- */
  const Gp=await phone(id,info,0);await Gp.go('league.html?l='+id+'#games/g8');await ready(Gp);await sleep(400);
  const gs=await Gp.page.evaluate(()=>{const c=document.querySelector('[data-gid="g8"]');if(!c)return null;const r=c.getBoundingClientRect();return{hl:c.classList.contains('dl-hl'),inView:r.top<innerHeight&&r.bottom>0}});
  ok('deep link #games/<id> to a FINAL game (normally under Scores): Games tab switches to Scores, card highlighted and in view',(await cur(Gp))==='games'&&gs&&gs.hl&&gs.inView,gs);
  await Gp.page.screenshot({path:SH+'/s24_dl_3_deeplink_game_390.png'});
  await Gp.page.select('#gOwnerSel','Hal');await sleep(300);await Gp.page.evaluate(()=>{location.hash='#games/g3'});await sleep(500);ok('deep link clears an owner filter that would hide the game (Hal filter -> Cy vs Dee game g3 found, highlighted)',!!(await Gp.page.$('[data-gid="g3"].dl-hl')));
  await Gp.page.evaluate(()=>{location.hash='#games/g6'});await sleep(500);ok('a game that is not on the League site (nobody owns either team, so the site drops it) gets the "not found" note',/not found/.test(await Gp.page.$eval('#dlmiss',e=>e.innerText).catch(()=>'')));
  await Gp.page.evaluate(()=>{location.hash='#games/nogame1'});await sleep(500);ok('deep link to a missing game: Games tab + "not found" note',(await cur(Gp))==='games'&&/not found/.test(await Gp.page.$eval('#dlmiss',e=>e.innerText).catch(()=>'')));
  await Gp.page.goBack();await sleep(500);ok('Back from a deep link returns to the previous deep link (g6)',/#games\/g6$/.test(url(Gp)),url(Gp));
  /* ---- copy links ---- */
  await Gp.page.click('#ltabs [data-v="bets"]');await Gp.page.waitForSelector('[data-bet] .cpl',{timeout:15000});await Gp.page.click('#cptab');await sleep(300);
  let c=await Gp.page.evaluate(()=>window.__copied.slice());const exp=APP+'/league.html?l='+id;
  ok('Copy link on a tab: exactly origin + path + ?l=CODE + #bets, nothing else',c[0]===exp+'#bets'&&secretFree(c[0],info),c);
  const toast=await Gp.page.$eval('#toast',e=>({t:e.innerText,vis:!e.classList.contains('hide')})).catch(()=>null);ok('a "Link copied" toast shows',toast&&toast.vis&&/Link copied/.test(toast.t),toast);
  await Gp.page.screenshot({path:SH+'/s24_dl_4_copy_link_toast_390.png'});
  await Gp.page.click('[data-bet="'+betId+'"] .cpl');await sleep(200);c=await Gp.page.evaluate(()=>window.__copied.slice());ok('per-card copy link on a bet: ?l=CODE#bets/<betId>, no identity',c[1]===exp+'#bets/'+betId&&secretFree(c[1],info),c);
  await Gp.page.click('#ltabs [data-v="games"]');await sleep(300);await Gp.page.click('[data-a=gmode][data-v=upcoming]');await sleep(300);await Gp.page.$eval('[data-gid="g1"] .cpl',e=>{e.scrollIntoView({block:'center'});e.click()});await sleep(200);c=await Gp.page.evaluate(()=>window.__copied.slice());ok('per-card copy link on a game: ?l=CODE#games/g1',c[2]===exp+'#games/g1',c);
  ok('room link still goes to the draft room with only ?l=CODE',/room\.html\?l=/.test(await Gp.page.$eval('#tab_room',e=>e.getAttribute('href')))&&secretFree(await Gp.page.$eval('#tab_room',e=>e.href),info));
  ok('no page errors',Gp.errs.length===0,Gp.errs);await Gp.page.close();
  const SP=await phone(id,info,0,{share:true});await SP.go('league.html?l='+id+'#teams');await ready(SP);await sleep(300);const lab=await SP.page.$eval('#cptab',e=>e.innerText);await SP.page.click('#cptab');await sleep(200);
  const sh=await SP.page.evaluate(()=>window.__shared);ok('when navigator.share exists the button says Share and shares the clean link',/Share/.test(lab)&&sh[0]===exp+'#teams'&&secretFree(sh[0],info),{lab,sh});await SP.page.close();
  /* ---- widths, labels, wording ---- */
  for(const w of [320,360,390,1280])for(const t of ['bets','games','standings']){const W=await phone(id,info,0,{w});await W.go('league.html?l='+id+'#'+t);await ready(W);if(t==='bets')await W.page.waitForSelector('[data-bet]',{timeout:15000});await sleep(300);const a=await audit(W);
    ok(w+'px #'+t+': no overflow; Copy link / card link / tab buttons >= 44px',!a.over&&!a.small.length&&a.n>0,a);
    if(t==='games'&&w===390&&TABS.includes('redraft')){const bt=await W.page.$eval('body',e=>e.innerText);ok('Redraft tab label capitalized, no "Jan 20", no money words',(await W.page.$eval('#ltabs [data-v=redraft]',e=>e.innerText)).includes('Redraft')&&!/Jan\.? 20\b/.test(bt)&&!MONEY.test(bt),bt.match(MONEY))}
    await W.page.close()}
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
