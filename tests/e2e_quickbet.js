/* s22: Quick bet pill on Games cards + group undo + chat panel (League site). Mock store, mocked ESPN (empty), real clock.
   node tests/e2e_quickbet.js  (APP / API env) */
const L=require('./lib.js');const F=require('../js/core.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;const root=path.join(__dirname,'..');
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
const base=process.env.API||'http://localhost:9996/api/data/';const get=async k=>(await fetch(base+encodeURIComponent(k))).text();
const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));const TIDS=TD.teams.map(t=>t[0]);const SH={};TD.teams.forEach(t=>SH[t[0]]=t[2]);
const NAMES=[['Ana','Aces','🏀'],['Ben','Blazers','🔥'],['Cy','Comets','⭐'],['Dee','Dunkers','🦅'],['Eli','Eagles','🐻'],['Fay','Flyers','🚀'],['Gus','Gators','🐊'],['Hal','Hawks','🦅']];
const [A1,A2,B1,C1,D1,U1,U2]=[TIDS[0],TIDS[1],TIDS[2],TIDS[3],TIDS[4],TIDS[5],TIDS[6]];   /* Ana owns A1 + A2, Ben B1, Cy C1, Dee D1; U1/U2 are not drafted */
const rosters=()=>{const used=[A1,A2,B1,C1,D1,U1,U2];const rest=TIDS.filter(t=>!used.includes(t));const R=NAMES.map(()=>[]);R[0].push(A1,A2);R[1].push(B1);R[2].push(C1);R[3].push(D1);let k=0;for(const r of R)while(r.length<8)r.push(rest[k++]);return R};
const now=Date.now(),H=3600e3;const iso=ms=>new Date(ms).toISOString().replace(/\.\d+Z/,'Z');const etDay=ms=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
const G=(id,h,a,o)=>Object.assign({id,day:etDay(now+3*24*H),start:iso(now+3*24*H),status:'scheduled',kind:'reg',round:'',neutral:false,home:{id:h,score:null,seed:null},away:{id:a,score:null,seed:null}},o||{});
const GAMES=[G('g1',B1,A1),G('g2',A2,A1),G('g3',D1,C1),G('g4',B1,C1,{start:iso(now-2*H),day:etDay(now-2*H)}),G('g5',U1,A1),G('g6',U1,U2),G('g7',B1,D1,{status:'live',start:iso(now-1*H),day:etDay(now-H),home:{id:B1,score:30,seed:null},away:{id:D1,score:28,seed:null}}),G('g8',B1,D1,{status:'final',start:iso(now-5*24*H),day:etDay(now-5*24*H),home:{id:B1,score:70,seed:null},away:{id:D1,score:60,seed:null}})];
async function open(id,info,i,o){o=o||{};const P=await L.phone('q'+Math.random().toString(36).slice(2,6),o.desk?{desktop:true,w:o.w||1280,h:900}:(o.w?{w:o.w,h:700}:{}));
  if(i!=null)await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[i].id,k:o.badk?'x'.repeat(40):info.managers[i].k});
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
  P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify({format:1,sample:false,label:'',season:'2026-27',as_of:'2026-11-01',source:'test',games:GAMES})});
    else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
  await P.go('league.html?l='+id+'#games');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await sleep(900);return P}
const cards=P=>P.page.evaluate(()=>[...document.querySelectorAll('#lbody .gm')].map(g=>({t:g.innerText.replace(/\s+/g,' '),qb:!!g.querySelector('.qb-btn'),ex:(g.querySelector('.qb-btn')||{}).getAttribute&&g.querySelector('.qb-btn')?g.querySelector('.qb-btn').getAttribute('aria-expanded'):null})));
const click=async(P,sel)=>{await P.page.waitForSelector(sel,{timeout:8000});await P.page.evaluate(s=>{const e=document.querySelector(s);e.scrollIntoView({block:'center'});e.click()},sel);await sleep(250)};
const audit=(P,scope)=>P.page.evaluate(sc=>{const A=[...document.querySelectorAll(sc)].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.closest('[hidden]')});return{n:A.length,small:A.filter(e=>{const r=e.getBoundingClientRect();return r.height<43.5||r.width<43.5}).map(e=>(e.className||e.tagName)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)).slice(0,6),over:document.documentElement.scrollWidth>innerWidth+1}},scope);
const mode=async(P,m)=>{await P.page.evaluate(m=>{const b=document.querySelector('[data-a=gmode][data-v='+m+']');if(b)b.click()},m);await sleep(300)};
(async()=>{try{
  const id=await seed(null,{names:NAMES,rosters:rosters(),rounds:8});const info=seed.info;
  /* ---- which cards get the pill (Ana, 390) ---- */
  let P=await open(id,info,0);let cs=await cards(P);const has=(c,a,b)=>c.t.includes(SH[a])&&c.t.includes(SH[b]);
  ok('pill only on the two upcoming different-owner games (Ana-Ben, Cy-Dee)',cs.filter(c=>c.qb).length===2&&cs.find(c=>has(c,A1,B1)).qb&&cs.find(c=>has(c,C1,D1)).qb,cs.map(c=>[c.t.slice(0,60),c.qb]));
  ok('no pill on the same-owner game (Ana owns both), the not-owned game, or the one nobody owns',!cs.find(c=>has(c,A1,A2)).qb&&!cs.find(c=>has(c,U1,A1)).qb&&!cs.find(c=>has(c,U1,U2)));
  ok('no pill on the game that already started (still "scheduled", start in the past) or the live game',!cs.find(c=>has(c,C1,B1)).qb&&!cs.find(c=>/LIVE/.test(c.t)).qb);
  await mode(P,'scores');cs=await cards(P);ok('no pill on a final game',cs.length>=1&&cs.every(c=>!c.qb));await mode(P,'upcoming');
  /* ---- open / close, picker content ---- */
  const AB='.gm:has(.qb-btn)';await P.page.evaluate(()=>{const g=[...document.querySelectorAll('.gm')].find(g=>g.querySelector('.qb-btn'));g.dataset.t='1'});
  const btn0=await P.page.evaluate(()=>{const gs=[...document.querySelectorAll('.gm')].filter(g=>g.querySelector('.qb-btn'));return gs.map(g=>g.innerText.replace(/\s+/g,' ').slice(0,50))});
  /* open the Ana-Ben card */
  const openAB=async()=>{await P.page.evaluate(([a,b])=>{const g=[...document.querySelectorAll('.gm')].find(g=>g.innerText.includes(a)&&g.innerText.includes(b)&&g.querySelector('.qb-btn'));g.querySelector('.qb-btn').scrollIntoView({block:'center'});g.querySelector('.qb-btn').click()},[SH[A1],SH[B1]]);await sleep(300)};
  await openAB();let o=await P.page.evaluate(()=>{const p=document.querySelector('.qb-pick');return p?{role:p.getAttribute('role'),ex:document.querySelector('.qb-btn[aria-expanded=true]')!=null,rows:[...p.querySelectorAll('.qb-l')].map(x=>x.innerText),sides:[...p.querySelectorAll('.qb-s')].map(b=>[b.innerText,b.title]),amts:[...p.querySelectorAll('[data-lb=qbamt]')].map(b=>b.innerText+':'+b.getAttribute('aria-pressed')),who:!!p.querySelector('[data-lb=qbvs]')}:null});
  ok('picker opens: role=group, button aria-expanded=true, Pushups 5/10, Winner row with two sides titled "Team beats Opp, Mon Nov 2", no "betting against" row (Ana owns a side), no Spread / Over-under row (no posted line in the data)',o&&o.role==='group'&&o.ex&&o.rows.join('|')==='Pushups|Winner'&&o.sides.length===2&&o.sides.every(s=>/ beats .+, [A-Z][a-z]{2} [A-Z][a-z]{2} \d+$/.test(s[1]))&&o.amts.join()==='5:true,10:false'&&!o.who,o);
  await click(P,'.qb-btn[aria-expanded=true]');ok('tapping the pill again closes the picker',!(await P.page.$('.qb-pick')));
  await openAB();await P.page.keyboard.press('Escape');await sleep(250);ok('Escape closes the picker',!(await P.page.$('.qb-pick')));
  /* ---- pick fills the form, nothing posted ---- */
  await openAB();await click(P,'.qb-pick [data-lb=qbamt][data-v="10"]');
  const sideTxt=await P.page.$eval('.qb-pick .qb-s',e=>e.title);await click(P,'.qb-pick .qb-s');
  const f=await P.page.evaluate(()=>({tab:location.hash,hint:(document.getElementById('qbHint')||{}).innerText,text:(document.getElementById('b27Text')||{}).value,opp:[...document.querySelectorAll('[data-lb=opp][aria-pressed=true]')].map(b=>b.getAttribute('aria-label')),amt:[...document.querySelectorAll('[data-lb=amt][aria-pressed=true]')].map(b=>b.dataset.v),odds:[...document.querySelectorAll('[data-lb=odds][aria-pressed=true]')].map(b=>b.dataset.v),place:document.getElementById('b27Place')&&!document.getElementById('b27Place').disabled,list:document.getElementById('lbody').innerText.includes('No bets yet')}));
  ok('pick: switches to the Bets tab, shows "⚡ Quick bet filled in — check and place it.", form has opponent Ben, the text, 10 pushups, Even odds',f.tab==='#bets'&&f.hint==='⚡ Quick bet filled in — check and place it.'&&f.text===sideTxt&&f.opp.join()==='Ben'&&f.amt.join()==='10'&&f.odds.join()==='1-1'&&f.place,f);
  const k0=await get(F.Keys(id).base+'-bets-'+info.managers[0].id);ok('nothing is placed by the pick (Ana\'s bets log is still empty, no bet listed)',!/"k"/.test(k0)&&f.list,k0.slice(0,80));
  await click(P,'#b27Place');await click(P,'[data-lb=confirm]');await P.page.waitForFunction('/Placed/.test((document.getElementById("b27Msg")||{}).innerText||"")',{timeout:10000});
  const k1=await get(F.Keys(id).base+'-bets-'+info.managers[0].id);ok('only after Place bet + Yes, place it is the bet saved (one propose event to Ben)',(k1.match(/"k":"p"/g)||[]).length===1,k1.slice(0,200));
  await P.page.close();
  /* ---- neither owner: choose who you bet against ---- */
  P=await open(id,info,0);await P.page.evaluate(([a,b])=>{const g=[...document.querySelectorAll('.gm')].find(g=>g.innerText.includes(a)&&g.innerText.includes(b)&&g.querySelector('.qb-btn'));g.querySelector('.qb-btn').scrollIntoView({block:'center'});g.querySelector('.qb-btn').click()},[SH[C1],SH[D1]]);await sleep(300);
  o=await P.page.evaluate(()=>({vs:[...document.querySelectorAll('[data-lb=qbvs]')].map(b=>b.innerText.trim())}));ok('a game between two other managers (Cy-Dee): picker asks which of them Ana bets against',o.vs.length===2&&/Cy/.test(o.vs[0])&&/Dee/.test(o.vs[1]),o);
  await click(P,'.qb-pick .qb-s');ok('picking a side before choosing says so, and does not leave the Games tab',/betting against first/.test(await P.page.$eval('.qb-m',e=>e.innerText))&&(await P.page.evaluate(()=>location.hash))==='#games');
  await click(P,'[data-lb=qbvs][data-mid="'+info.managers[3].id+'"]');await click(P,'.qb-pick .qb-s');
  const f2=await P.page.evaluate(()=>({tab:location.hash,opp:[...document.querySelectorAll('[data-lb=opp][aria-pressed=true]')].map(b=>b.getAttribute('aria-label'))}));ok('after choosing Dee the form opens with Dee as the opponent',f2.tab==='#bets'&&f2.opp.join()==='Dee',f2);await P.page.close();
  /* ---- spectator and wrong secret: no pill ---- */
  for(const [lab,i,badk] of [['spectator (no identity)',null,false],['wrong secret',0,true]]){const S=await open(id,info,i,{badk});const c=await cards(S);ok(lab+': Games cards show no Quick bet pill',c.length>=3&&c.every(x=>!x.qb));await S.page.close()}
  /* ---- 320 / 360 / 390 / 1280: no overflow, 44px taps with the picker open ---- */
  for(const [w,desk] of [[320,false],[360,false],[390,false],[1280,true]]){const X=await open(id,info,2,{w,desk});   /* Cy: owns C1, plays D1 (Dee) -> one side is mine; picker rows + sides */
    await X.page.evaluate(()=>{const b=document.querySelector('.qb-btn');if(b){b.scrollIntoView({block:'center'});b.click()}});await sleep(300);const a=await audit(X,'.qbw button,.qb-pick button');const e=await X.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    ok(w+'px: pill + open picker: every tap target >= 44px, no horizontal overflow ('+a.n+' buttons)',a.n>=6&&a.small.length===0&&!e,a);
    await X.page.keyboard.press('Tab');const foc=await X.page.evaluate(()=>document.activeElement&&document.activeElement.tagName);ok(w+'px: keyboard Tab moves focus between picker buttons',foc==='BUTTON');
    ok(w+'px: no page errors',X.errs.filter(x=>/pageerror/.test(x)).length===0,X.errs);await X.page.close()}
  /* ---- placed together: undo all ---- */
  {const M=await open(id,info,4);await M.page.evaluate(()=>{location.hash='#bets'});await M.page.goto(L.APP+'/league.html?l='+id+'#bets');await M.page.waitForSelector('#b27Form',{timeout:25000});
    for(const i of [1,2,3])await click(M,'[data-lb=opp]:nth-of-type('+i+')');await M.page.type('#b27Text','Group bet');await click(M,'[data-lb=amt][data-v="5"]');await click(M,'#b27Place');await click(M,'[data-lb=confirm]');await M.page.waitForFunction('/Placed/.test((document.getElementById("b27Msg")||{}).innerText||"")',{timeout:10000});
    const o1=await M.page.evaluate(()=>({undo:(document.querySelector('#b27Msg [data-lb=undogroup]')||{}).innerText,tog:[...document.querySelectorAll('#lbody .b27-c')].filter(c=>/placed together/.test(c.innerText)).length}));
    ok('3 opponents: the confirmation has "Undo all 3 bets (30 s)" and the 3 cards say "1 of 3 placed together"',/Undo all 3 bets/.test(o1.undo||'')&&o1.tog===3,o1);
    await click(M,'#b27Msg [data-lb=undogroup]');await M.page.waitForFunction('/Undone/.test((document.getElementById("b27Msg")||{}).innerText||"")',{timeout:10000});
    const o2=await M.page.evaluate(()=>[...document.querySelectorAll('#lbody .b27-c')].filter(c=>/Group bet/.test(c.innerText)).map(c=>c.querySelector('.st').innerText));ok('Undo all withdraws all three (cards show Withdrawn)',o2.length===3&&o2.every(x=>/Withdrawn/i.test(x)),o2);await M.page.close()}
  /* ---- chat panel ---- */
  {const C=await open(id,info,5);await C.page.evaluate(()=>{});await sleep(400);
    let o=await C.page.evaluate(()=>({tag:document.getElementById('chatbar').tagName,ex:document.getElementById('chatbar').getAttribute('aria-expanded'),hid:document.getElementById('chatpanel').hidden}));ok('chat bar is a button, panel closed to start',o.tag==='BUTTON'&&o.ex==='false'&&o.hid,o);
    await click(C,'#chatbar');o=await C.page.evaluate(()=>({ex:document.getElementById('chatbar').getAttribute('aria-expanded'),hid:document.getElementById('chatpanel').hidden,form:!!document.getElementById('chatform'),room:document.getElementById('chatroom').getAttribute('href')}));ok('tap opens the panel with the message box and an "Open in the draft room" link',o.ex==='true'&&!o.hid&&o.form&&/room\.html\?l=/.test(o.room),o);
    await C.page.type('#chatin','Hello <b>league</b>');await click(C,'#chatsend');await sleep(1800);
    const raw=await get(F.Keys(id).chat);const lst=await C.page.$eval('#chatlist',e=>({t:e.innerText,html:e.innerHTML}));
    ok('sending writes the message to the league chat key (same store as the draft room) and shows it, escaped',/Hello <b>league<\/b>/.test(raw.replace(/\\u003c/g,'<'))&&/Hello <b>league<\/b>/.test(lst.t)&&!/<b>league/.test(lst.html),{raw:raw.slice(0,160),t:lst.t});
    await C.page.keyboard.press('Escape');await sleep(250);ok('Escape closes the panel',await C.page.$eval('#chatpanel',e=>e.hidden));
    const W=await open(id,info,null);await click(W,'#chatbar');ok('spectator: panel shows the message, no message box, "Watching only"',await W.page.evaluate(()=>!document.getElementById('chatform')&&/Watching only/.test(document.getElementById('chatwatch').innerText)&&/Hello/.test(document.getElementById('chatlist').innerText)));
    const a=await audit(C,'#chat button, #chat a, #chat input');await C.page.click('#chatbar').catch(()=>{});await sleep(300);const a2=await audit(C,'#chat button, #chat a, #chat input');ok('chat bar + panel: taps >= 44px, no overflow',a2.small.length===0&&!a2.over,a2);
    ok('no page errors',C.errs.filter(x=>/pageerror/.test(x)).length===0,C.errs);await C.page.close();await W.page.close()}
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
