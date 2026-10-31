/* Every school chip / name on the League site (and the power-rankings module on the recap page) links to that school's ESPN team page:
   https://www.espn.com/mens-college-basketball/team/_/id/<id>  target=_blank  rel="noopener noreferrer", >= 44px tall at 390, a school without an id is plain text,
   and no ESPN page/image request is made just for the links (outbound links only).  node tests/e2e_espnlinks.js  (APP / API env, mock store) */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
const root=path.join(__dirname,'..');const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));
const RE=/^https:\/\/www\.espn\.com\/mens-college-basketball\/team\/_\/id\/\d+$/;
const TABS=require('./tabs_exp.js').vis;   /* s25: the tabs visible at the test clock (LNOW) */
const ready=P=>P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});
async function audit(P,w,label){return P.page.evaluate(()=>{const A=[...document.querySelectorAll('#lbody a[href*="espn.com"], #lbody a.chip, #lbody a.tl')];
  const bad=A.filter(a=>!/^https:\/\/www\.espn\.com\/mens-college-basketball\/team\/_\/id\/\d+$/.test(a.href)||a.target!=='_blank'||!/\bnoopener\b/.test(a.rel)||!/\bnoreferrer\b/.test(a.rel)).map(a=>a.href+'|'+a.target+'|'+a.rel);
  const small=A.filter(a=>{const r=a.getBoundingClientRect();return r.width>0&&r.height<43.5}).map(a=>(a.className||'')+':'+Math.round(a.getBoundingClientRect().height)+':'+(a.innerText||'').trim().slice(0,14));
  return{n:A.length,bad,small:small.slice(0,6),ns:small.length,over:document.documentElement.scrollWidth>innerWidth+1,plain:document.querySelectorAll('#lbody .chip.nolink').length}})}
(async()=>{try{
  const missing=TD.teams.filter(t=>!/^\d+$/.test(String(t[0]))).map(t=>t[1]);
  ok('every school in assets/teams.js has a numeric ESPN id (element 0); schools without: '+(missing.join(', ')||'none'),missing.length===0,missing);
  const id=await seed();const info=seed.info;
  /* a school that the page's team table does not know: an undrafted OPPONENT in the demo games of this league's schools (dropping a drafted school would break the hash-chained draft) */
  const drafted=new Set(info.picks.map(p=>String(p.teamId)));const DG=JSON.parse(fs.readFileSync(path.join(root,'data/demo/scores.json'),'utf8')).games;
  const dropTid=(()=>{const c={};DG.forEach(g=>{const h=String(g.home.id),a=String(g.away.id);if(drafted.has(h)&&!drafted.has(a))c[a]=(c[a]||0)+1;if(drafted.has(a)&&!drafted.has(h))c[h]=(c[h]||0)+1});return Object.keys(c).sort((x,y)=>c[y]-c[x])[0]})();
  for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
    for(const demo of [false,true]){
      const P=await L.phone('el'+w+demo,desk?{desktop:true,w,h}:{});const img=[];P.page.on('request',r=>{if(/espn\.com|espncdn/.test(r.url()))img.push(r.resourceType()+' '+r.url())});
      await P.go('league.html?l='+id+(demo?'&demo=1':''));await ready(P);await sleep(500);let total=0;
      for(const t of TABS){await P.page.evaluate(t=>document.querySelector('#ltabs [data-v='+t+']').click(),t);await sleep(350);const a=await audit(P,w,t);total+=a.n;
        ok(w+'px'+(demo?' demo':'')+' '+t+': '+a.n+' school links, all correct ESPN team URL, target=_blank, rel noopener noreferrer',a.bad.length===0&&(a.n>0||/^(bets|redraft|rules|archive)$/.test(t)||(!demo&&/^(games|postseason)$/.test(t))),a.bad);
        if(w===390)ok(w+'px'+(demo?' demo':'')+' '+t+': school links are >= 44px tall, no overflow',a.ns===0&&!a.over,{small:a.small,over:a.over});else ok(w+'px'+(demo?' demo':'')+' '+t+': no overflow',!a.over)}
      ok(w+'px'+(demo?' demo':'')+': links found on the tabs',total>20,total);
      ok(w+'px'+(demo?' demo':'')+': no ESPN page or image is requested by the links themselves (only the existing a.espncdn.com logos and ESPN scoreboard data)',!img.some(x=>/espn\.com\/mens-college/.test(x)&&!/script|xhr|fetch/.test(x)),img.filter(x=>/espn\.com\/mens/.test(x)).slice(0,3));
      ok(w+'px: no page errors',P.errs.length===0,P.errs);await P.page.close()}
    /* a school that is not in the team table is plain text, not a link */
    const Q=await L.phone('en'+w,desk?{desktop:true,w,h}:{});await Q.page.setBypassServiceWorker(true);await Q.page.setRequestInterception(true);
    Q.page.on('request',r=>{if(new URL(r.url()).pathname==='/assets/teams.js'){const t=tsrc.replace(new RegExp('\\["'+dropTid+'",[^\\]]*\\],?'),'');r.respond({status:200,contentType:'application/javascript',body:t})}else r.continue()});
    await Q.go('league.html?l='+id+'&demo=1');await ready(Q);await sleep(500);await Q.page.evaluate(()=>document.querySelector('#ltabs [data-v=games]').click());await sleep(500);
    const pl=await Q.page.evaluate(d=>{const all=[...document.querySelectorAll('#lbody a.tl, #lbody a.chip')];return{links:all.length,plainChip:document.querySelectorAll('#lbody span.chip.nolink').length,dead:all.filter(a=>/\/id\/(undefined|null|)$/.test(a.href)||a.href.endsWith('/'+d)).length,games:document.querySelectorAll('#lbody .gm').length,err:/could not|error/i.test(document.getElementById('lbody').innerText)}},dropTid);
    ok(w+'px: a school missing from the team table ('+dropTid+') renders as plain text (no dead link), the other opponents stay links, the Games tab still renders',!!dropTid&&pl.games>=1&&pl.links>=1&&pl.dead===0&&!pl.err,pl);await Q.page.close();    /* power-rankings module on the recap page */
    const PR=JSON.parse(fs.readFileSync(path.join(root,'data/power-rankings.json'),'utf8'));
    const sk=v=>String(v).toLowerCase().replace(/&/g,'and').replace(/\bsaint\b/g,'st').replace(/[^a-z0-9]+/g,'');const tidOf={};TD.teams.forEach(t=>{[t[1],t[2]].forEach(x=>{if(x)tidOf[sk(x)]=t[0]})});
    const idM=await seed(null,{names:PR.map(r=>[r.manager,r.team,'🏀']),rosters:PR.map(r=>r.schools.map(x=>tidOf[sk(x)])),rounds:8});
    const {html,rjs}=require('./power_hook.js')(root);
    const R=await L.phone('er'+w,desk?{desktop:true,w,h}:{});await R.page.setBypassServiceWorker(true);await R.page.setRequestInterception(true);
    R.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/recap.html')r.respond({status:200,contentType:'text/html',body:html});else if(u.pathname==='/js/recap.js')r.respond({status:200,contentType:'application/javascript',body:rjs});else r.continue()});
    await R.go('recap.html?l='+idM);await R.page.waitForSelector('#powerrank .card.pr',{timeout:25000});await sleep(400);
    await R.page.evaluate(()=>{document.getElementById('prb0').click()});await sleep(200);await R.page.evaluate(()=>{document.getElementById('prd0').click()});await sleep(250);
    const pr=await R.page.evaluate(()=>{const A=[...document.querySelectorAll('#powerrank a[href*="espn.com"]')];const re=/^https:\/\/www\.espn\.com\/mens-college-basketball\/team\/_\/id\/\d+$/;
      return{n:A.length,chips:document.querySelectorAll('#powerrank a.pchip').length,names:document.querySelectorAll('#powerrank a.tl').length,bad:A.filter(a=>!re.test(a.href)||a.target!=='_blank'||!/noopener/.test(a.rel)||!/noreferrer/.test(a.rel)).length,small:A.filter(a=>{const r=a.getBoundingClientRect();return r.width>0&&r.height<43.5}).map(a=>a.className+':'+Math.round(a.getBoundingClientRect().height)),over:document.documentElement.scrollWidth>innerWidth+1}});
    ok(w+'px power module: 64 school chips + 64 deep-dive names are ESPN links with target/rel, >= 44px, no overflow',pr.chips===64&&pr.names===64&&pr.bad===0&&pr.small.length===0&&!pr.over,pr);
    ok(w+'px power module: no page errors',R.errs.length===0,R.errs);await R.page.close()}
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
