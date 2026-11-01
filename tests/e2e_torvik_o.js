/* s26c14: team field o (KenPom 2026-27 preseason ratings Power rank, 1-365) next to p (STOOPID rank) in the Rosters school detail.
   Runs with o present (from /workspace/dr2-s26c14/torvik_o.json when it exists, else mocked) and with o missing / null. 320/390/1280: no overflow,
   no 'undefined' / 'null' / 'NaN', labels exact, '–' when missing, no page errors, no money words. APP / API env (mock store). SHOTS=dir. */
const L=require('./lib.js'),path=require('path'),fs=require('fs');const {seed}=require('./seed_league.js');const root=path.join(__dirname,'..');const fx=require('./fixture_s26c3.js')(root);
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
let RAW=null,RAWSRC='mock';try{RAW=JSON.parse(fs.readFileSync('/workspace/dr2-s26c14/torvik_o.json','utf8'));RAWSRC='torvik_o.json'}catch(e){}
/* s26c14: real o = KenPom 2026-27 preseason ratings when /workspace/kenpom/kenpom_o.json is present ([{rank,team}] by school name -> mapped to ESPN ids
   through assets/teams.js names; ambiguous / unknown names are left out and show '–') */
try{const K=JSON.parse(fs.readFileSync('/workspace/kenpom/kenpom_o.json','utf8'));const S=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(S.slice(S.indexOf('{'),S.lastIndexOf('}')+1));
  const nz=x=>String(x).toLowerCase().replace(/\bst\.?$/,'state').replace(/\bst\.\s/,'state ').replace(/&/g,'and').replace(/[^a-z0-9]/g,'');const ix={};TD.teams.forEach(t=>[t[1],t[2]].forEach(n=>{const k=nz(n);(ix[k]=ix[k]||new Set()).add(t[0])}));
  const o={};(Array.isArray(K)?K:[]).forEach(r=>{const c=ix[nz(r.team)];if(c&&c.size===1&&Number.isInteger(r.rank))o[[...c][0]]=r.rank});if(Object.keys(o).length>100){RAW=o;RAWSRC='kenpom_o.json ('+Object.keys(o).length+'/'+K.length+' mapped)'}}catch(e){}
async function open(w,id,info,patch){const P=await L.phone('to'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:w>=760?900:800});
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
  const teamsJs=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8')+'\n;(function(M,P){for(const k in P){M[k]=Object.assign({},M[k]||{},P[k]);for(const f in P[k])if(P[k][f]==="__DEL__")delete M[k][f]}})(window.TEAMS_DATA.meta=window.TEAMS_DATA.meta||{},'+JSON.stringify(patch)+');';
  P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/assets/teams.js')r.respond({status:200,contentType:'text/javascript',body:teamsJs});
    else if(u.pathname==='/data/scores.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify(fx.scores)});
    else if(u.pathname==='/data/tournament.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify(fx.tournament)});
    else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
  await P.go('league.html?l='+id+'#rosters');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(1200);return P}
async function openAll(P){for(let i=0;i<8;i++){const c=await P.page.evaluate(()=>{const e=[...document.querySelectorAll('[data-a=teamrow][aria-expanded=false]')].find(x=>x.getClientRects().length);if(!e)return 0;e.click();return 1});if(!c)break;await L.sleep(250)}}
(async()=>{try{const id=await seed(null,{name:'Test League s26c14',names:fx.NAMES,rosters:fx.rosters,rounds:8});const info=seed.info;const SH=process.env.SHOTS;
  const ids=fx.rosters.flat().map(String);
  /* with o: every school gets p and o (raw Torvik file when present); one school has o:null, one has o missing -> '–' */
  const W={};ids.forEach((t,i)=>{W[t]={p:i+1,o:RAW&&RAW[t]!=null?RAW[t]:((i*37)%365)+1}});
  const NUL=ids[1],MIS=ids[2];W[NUL].o=null;W[MIS].o='__DEL__';
  const WO={};ids.forEach(t=>{WO[t]={o:'__DEL__'}});WO[ids[3]].p='__DEL__';
  console.log('  (o source: '+RAWSRC+')');
  for(const [lab,patch] of [['with-o',W],['without-o',WO]])for(const w of [320,390,1280]){const P=await open(w,id,info,patch);await openAll(P);
    const r=await P.page.evaluate(()=>{const det=[...document.querySelectorAll('.obr')].filter(x=>x.querySelector('.det'));
      return{rows:det.map(x=>{const k=x.querySelector('.rkp');return{tid:x.dataset.tid,has:!!k,p:k&&k.querySelector('.rk-p').innerText.trim(),o:k&&k.querySelector('.rk-o').innerText.trim(),src:k&&(k.querySelector('.rks')||{}).innerText,dp:k&&k.dataset.p,dop:k&&k.dataset.o}}),
        txt:document.getElementById('lbody').innerText,sw:document.documentElement.scrollWidth,iw:innerWidth,meta:(window.TEAMS_DATA.meta||{})}});
    const tag=lab+' '+w+'px';
    ok(tag+': details open with rank pills',r.rows.length>=1&&r.rows.every(x=>x.has),r.rows.length);
    ok(tag+': labels exact (STOOPID rank / Power rank)',r.rows.every(x=>/^STOOPID rank: /.test(x.p)&&/^Power rank: /.test(x.o)),r.rows.slice(0,2));
    ok(tag+': source line KenPom 2026-27 preseason ratings',r.rows.every(x=>/KenPom 2026-27 preseason ratings/.test(x.src||'')));
    ok(tag+': no undefined/null/NaN',!/\bundefined\b|\bnull\b|\bNaN\b/.test(r.txt));
    ok(tag+': no Torvik rank label',!/Torvik rank/.test(r.txt));
    ok(tag+': p values match meta',r.rows.every(x=>{const m=r.meta[x.tid]||{};return m.p?x.p==='STOOPID rank: #'+m.p:x.p==='STOOPID rank: –'}),r.rows.map(x=>[x.tid,x.p]));
    ok(tag+': o values match meta, – when missing/null',r.rows.every(x=>{const m=r.meta[x.tid]||{};return m.o?x.o==='Power rank: #'+m.o:x.o==='Power rank: –'}),r.rows.map(x=>[x.tid,x.o]));
    if(lab==='with-o')ok(tag+': at least one real o shown',r.rows.some(x=>/#\d+$/.test(x.o)));else ok(tag+': all o show –',r.rows.every(x=>x.o==='Power rank: –'));
    ok(tag+': no overflow',r.sw<=r.iw,{sw:r.sw,iw:r.iw});
    ok(tag+': no page errors',P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);
    ok(tag+': no money words',!/\b(cash|money|dollars?|prize|payout|wager|bets?|betting|odds)\b|\$\d/i.test(r.txt));
    if(SH&&(w===390||w===1280)){await P.page.evaluate(()=>{const d=document.querySelector('.det');if(d)d.scrollIntoView({block:'start'});scrollBy(0,-120)});await L.sleep(300);await P.page.screenshot({path:SH+'/rosters-detail-'+lab+'-'+w+'.png'})}
    await P.close()}
 }catch(e){bad++;console.log('FAIL exception',e&&e.stack)}finally{await L.close();console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)}})();
