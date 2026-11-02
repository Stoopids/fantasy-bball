/* s28c one Share (Paul): Share tab only (no Copy link / per-card link buttons on any other tab); Share tab picker (whole site or Standings / Games / Bets / All teams / Recap / Rules)
   -> link = origin + path + ?l=CODE + &view=1 (+ #tab), never k= / cm= / as= / a manager id; ?view=1 = view only even with a stored manager identity AND a commissioner unlock:
   '👀 View only' badge, no chat, no bet form / Quick bet, no commissioner controls, no writes. Per-card copy (Games + Bets): clean multi-line text, no URL / k=, button shows 'Copied'.
   node tests/e2e_share_s28c.js  (APP / API env; SHOTS=dir for screenshots) */
const L=require('./lib.js');const path=require('path');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const SH=process.env.SHOTS||'';
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,600):''))}}
const base=process.env.API||'http://localhost:9996/api/data/';const post=(k,v)=>fetch(base+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
const now=Date.now(),H=36e5;const iso=ms=>new Date(ms).toISOString().replace(/\.\d+Z/,'Z');
const BAD=/https?:|www\.|[?&](k|cm|as|mid)=|\bk=/i;
let GAMES=[];
async function open(id,info,w,o){o=o||{};const P=await L.phone('sh'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:900});
  await P.page.evaluateOnNewDocument((id,me,cm,asCm)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me));if(asCm)localStorage.setItem('fbn.cm.'+id,cm);window.__cp=[];try{Object.defineProperty(navigator,'clipboard',{value:{writeText:t=>{window.__cp.push(t);return Promise.resolve()}},configurable:true})}catch(e){}},id,{mid:info.managers[0].id,k:info.managers[0].k},info.cmSecret,!!o.cm);
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
  P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify({format:1,sample:false,label:'',season:'2026-27',as_of:'2026-11-01',source:'test',games:GAMES})});
    else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
  await P.go('league.html?l='+id+(o.q||'')+'#'+(o.hash||'share'));await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await sleep(900);return P}
const shot=async(P,name)=>{if(!SH)return;const f=path.join(SH,name);await P.page.screenshot({path:f});console.log('  shot '+f)};
(async()=>{try{const id=await seed(null,{});const info=seed.info;const M=info.managers.map(m=>m.id);const own=i=>info.picks.find(p=>p.managerId===M[i]).teamId;
  GAMES=[{id:'s1',day:'2000-01-01',start:iso(now+26*H),status:'scheduled',kind:'reg',round:'',neutral:false,home:{id:own(1),score:null,seed:null},away:{id:own(0),score:null,seed:null},line:{fav:own(1),sp:3.5}}];
  await post(F.Keys(id).base+'-bets-'+M[0],{v:1,ev:[{k:'p',u:'st000001',ts:now-3*H,v:25,id:'sbet000001',to:M[1],amt:10,a:1,b:1,text:'Duke beats UNC'}]});
  /* ---- Share tab + picker (signed in as a manager AND commissioner on this device: the link must still carry nothing of it) ---- */
  for(const w of [390,1280]){const P=await open(id,info,w,{cm:true});
    const opts=await P.page.$$eval('#s29shSel option',o=>o.map(x=>[x.value,x.text]));
    ok(w+'px: Share tab picker = Whole site, Standings, Games, Bets, All teams, Recap, Rules',opts.map(x=>x[1]).join()==='Whole site,Standings,Games,Bets,All teams,Recap,Rules',opts);
    const urls={};for(const [v] of opts){await P.page.select('#s29shSel',v);await sleep(120);urls[v]=await P.page.$eval('#s29shUrl',e=>e.textContent)}
    ok(w+'px: every picked link = ?l=CODE&view=1 (+ #tab), no k= / cm= / as= / manager id / secret',Object.entries(urls).every(([v,u])=>{const x=new URL(u);return x.search==='?l='+id+'&view=1'&&x.hash===(v?'#'+v:'')&&!/[?&#](k|cm|as|mid)=/.test(u)&&!M.some(m=>u.includes(m))&&!info.managers.some(m=>u.includes(m.k))&&!u.includes(info.cmSecret)}),urls);
    await P.page.select('#s29shSel','games');await sleep(120);await P.page.evaluate(()=>{try{Object.defineProperty(navigator,'share',{value:undefined,configurable:true})}catch(e){}});await P.page.click('#s29shBtn');await sleep(300);const cp=await P.page.evaluate(()=>window.__cp.slice(-1)[0]);const cpl=await P.page.$eval('#s29shBtn',e=>e.textContent);
    ok(w+'px: Share (no native share) copies the picked link (games, view=1) and shows Copied',cp===urls.games&&cpl==='Copied',{cp,cpl});
    const small=await P.page.$$eval('#sharecard button,#sharecard select',e=>e.filter(x=>x.getBoundingClientRect().height<43.5).length);const sw=await P.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
    ok(w+'px: Share tab no overflow, 44px controls',small===0&&sw);await P.page.select('#s29shSel','');await sleep(100);await shot(P,'share_tab_'+w+'.png');
    for(const t of ['standings','games','bets','teams','recap','rules']){await P.go('league.html?l='+id+'#'+t);await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await sleep(t==='bets'?1500:500);
      const x=await P.page.evaluate(()=>({btn:document.querySelectorAll('#lbody [data-a=cptab],#lbody [data-a=cplink],#lbody [data-a=shareleague],#lbody .s27-share').length,txt:/Copy link/.test(document.querySelector('#lbody').innerText)}));
      ok(w+'px #'+t+': no Share / Copy link buttons (Share tab only)',x.btn===0&&!x.txt,x)}
    await P.close()}
  /* ---- view only ---- */
  for(const w of [390,1280]){const P=await open(id,info,w,{cm:true,q:'&view=1',hash:'bets'});await sleep(1200);
    const v=await P.page.evaluate(()=>({lv:window.LVIEW,badge:(document.getElementById('vobadge')||{}).textContent||'',chat:!!document.getElementById('chat'),form:!!document.getElementById('b27Form'),
      cm:!!document.getElementById('heroctl'),act:[...document.querySelectorAll('.b27-act,[data-lb=placego],[data-lb=poolvoid],[data-lb=poolplace],.qb-btn')].filter(e=>e.getBoundingClientRect().width>0).length,me:localStorage.getItem('fbn.me.'+new URLSearchParams(location.search).get('l'))}));
    ok(w+'px view=1: badge "👀 View only", no chat, no bet form / actions, no commissioner controls, stored identity reads empty',v.lv===true&&v.badge==='👀 View only'&&!v.chat&&!v.form&&!v.cm&&v.act===0&&v.me===null,v);
    await P.go('league.html?l='+id+'#games');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await sleep(700);
    const g=await P.page.evaluate(()=>({badge:!!document.getElementById('vobadge'),qb:[...document.querySelectorAll('.qb-btn')].filter(e=>e.getBoundingClientRect().width>0).length}));ok(w+'px view mode stays on in this tab (games): badge, no Quick bet',g.badge&&g.qb===0,g);
    await shot(P,'viewonly_games_'+w+'.png');await P.close()}
  /* ---- per-card copy as text ---- */
  {const P=await open(id,info,390,{hash:'games'});const b=await P.page.$('[data-gid=s1] .cpt');ok('game card has the Copy button (.s27-copy, 44px)',!!b&&await P.page.$eval('[data-gid=s1] .cpt',e=>e.textContent==='Copy'&&e.classList.contains('s27-copy')&&e.getBoundingClientRect().height>=44));
    const vis=await P.page.$eval('[data-gid=s1] .gtm',e=>e.innerText.trim());await P.page.click('[data-gid=s1] .cpt');await sleep(300);
    const t=await P.page.evaluate(()=>window.__cp.slice(-1)[0]||'');const lbl=await P.page.$eval('[data-gid=s1] .cpt',e=>e.textContent);
    console.log('--- copied game text ---\n'+t+'\n---');
    ok('game copy: multi-line text, no URL, no k=, no NaN/undefined',t.split('\n').length>=4&&!BAD.test(t)&&!/NaN|undefined|null/.test(t),t);
    ok('game copy (s29b format): A 🐶 vs B ⭐, date · time as shown (zone), Spread:, Owner, Team: emoji name',/^\S.* 🐶 vs .* ⭐$/m.test(t.split('\n')[0])&&t.split('\n')[1].endsWith(vis)&&/^Spread: .+ -3\.5$/m.test(t)&&/^Owner, .+: 🏀 Ana$/m.test(t)&&/^Owner, .+: 🔥 Ben$/m.test(t),{t,vis});
    ok('game copy button shows Copied',lbl==='Copied',lbl);await shot(P,'game_copied_390.png');
    await P.go('league.html?l='+id+'#bets');await P.page.waitForSelector('[data-bet=sbet000001] .cpt',{timeout:20000});await P.page.click('[data-bet=sbet000001] .cpt');await sleep(300);
    const bt=await P.page.evaluate(()=>window.__cp.slice(-1)[0]||'');const bl=await P.page.$eval('[data-bet=sbet000001] .cpt',e=>e.textContent);
    ok('bet copy: only the bet text (no URL, no k=), shows Copied, same button as Games',/Duke beats UNC/.test(bt)&&!BAD.test(bt)&&bl==='Copied',{bt,bl});console.log('--- copied bet text ---\n'+bt+'\n---');await P.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
