/* Chip grid (s20): every school chip is one fixed size, in a clean grid (4 columns from 600px, 2 on phones), long names cut with an ellipsis (box never changes),
   manager cards the same height, no overflow, >= 44px, links to ESPN.  Tabs: standings, games, rosters, bets, teams, postseason, redraft, archive, rules (real + demo data).
   League with long school names (Long Island University, Stephen F. Austin, Central Arkansas, UC Santa Barbara, Western Kentucky, Queens University ...).   node tests/e2e_chipgrid.js */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
const root=path.join(__dirname,'..');const TABS=require('./tabs_exp.js').vis;   /* s25: the tabs visible at the test clock (LNOW) */
const ready=P=>P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});
const LONG=['112358','2511','2617','2110','2540','98','2463','153'];
function measure(){const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};
  const chips=[...document.querySelectorAll('#lbody .school-chip')].filter(vis);
  const grid=chips.filter(c=>c.closest('.school-grid')),solo=chips.filter(c=>!c.closest('.school-grid'));
  const dims=a=>a.map(c=>{const r=c.getBoundingClientRect();return[Math.round(r.width*10)/10,Math.round(r.height*10)/10]});
  const uniq=(a,i)=>{const v=a.map(x=>x[i]);return Math.max(...v)-Math.min(...v)};
  const gd=dims(grid),sd=dims(solo);
  const cols=[...document.querySelectorAll('#lbody .school-grid')].filter(vis).map(g=>{const cs=[...g.querySelectorAll('.school-chip')].filter(vis);return new Set(cs.map(c=>Math.round(c.getBoundingClientRect().left))).size});
  const cut=chips.filter(c=>{const k=c.querySelector('.cn');return k&&k.scrollWidth>k.clientWidth+1});
  /* forced long name: the real names may all fit, so one chip gets a 70-character name; its box must not change and the text must be cut with an ellipsis */
  let forced=null;{const c=chips[0];if(c){const k=c.querySelector('.cn'),b0=c.getBoundingClientRect(),t0=k.textContent;k.textContent='Extraordinarily Long University of the Northern Plains and Lakes';const b1=c.getBoundingClientRect();forced={same:Math.abs(b0.width-b1.width)<=1&&Math.abs(b0.height-b1.height)<=1,cut:k.scrollWidth>k.clientWidth+1,ell:getComputedStyle(k).textOverflow==='ellipsis'&&getComputedStyle(k).whiteSpace==='nowrap',h:k.getBoundingClientRect().height<=26};k.textContent=t0}}
  const cards=[...document.querySelectorAll('#lbody .ocl>.card.oc')].filter(vis).map(c=>Math.round(c.getBoundingClientRect().height));
  const wrapped=chips.filter(c=>{const k=c.querySelector('.cn');return k&&k.getBoundingClientRect().height>26}).length;
  const small=chips.filter(c=>c.getBoundingClientRect().height<43.5).length;
  const bad=chips.filter(c=>c.tagName==='A'&&(!/^https:\/\/www\.espn\.com\/mens-college-basketball\/team\/_\/id\/\d+$/.test(c.href)||c.target!=='_blank'||!/noopener/.test(c.rel)||!/noreferrer/.test(c.rel))).length;
  return{forced,n:chips.length,grid:grid.length,solo:solo.length,gw:uniq(gd,0),gh:uniq(gd,1),sw:uniq(sd,0),sh:uniq(sd,1),cols,cutN:cut.length,cutBox:cut.slice(0,3).map(c=>Math.round(c.getBoundingClientRect().width)+'x'+Math.round(c.getBoundingClientRect().height)),gbox:gd[0]||null,cardsMin:cards.length?Math.min(...cards):0,cardsMax:cards.length?Math.max(...cards):0,ncards:cards.length,wrapped,small,bad,over:document.documentElement.scrollWidth>innerWidth+1,cn:cut.length?cut[0].querySelector('.cn').title||cut[0].title:''}}
(async()=>{try{
  /* each manager gets 6 schools: the 8 long-name schools spread so every roster holds some */
  const pool=LONG.concat(['150','2250','2390','227','2509','2116','2294','61','399','2305','2250','2641','2132','2579','2229']).filter((v,i,a)=>a.indexOf(v)===i);
  const rosters=Array.from({length:8},(_,i)=>[0,1,2,3,4,5].map(j=>pool[(i*6+j)%pool.length]));
  const used=new Set();const ok8=rosters.every(r=>r.every(t=>{if(used.has(t))return false;used.add(t);return true}));
  const LN='Supercalifragilisticexpialidocious',names=Array.from({length:8},(_,i)=>[LN+LN.slice(0,i+1),LN.slice(5)+'Teamname'+i+LN.slice(0,9),['🏀','🔥','⭐','🦅','🐻','🚀','🐊','🦁'][i]]);   /* 35-45 character one-word manager and team names (no spaces: nothing can wrap) */
  const lid=ok8?await seed(null,{rosters,rounds:6,names}):await seed();
  for(const [w,h,desk] of [[320,640,false],[360,740,false],[390,844,false],[1280,900,true]]){
    for(const demo of [false,true]){
      const P=await L.phone('cg'+w+demo,desk?{desktop:true,w,h}:{});await P.go('league.html?l='+lid+(demo?'&demo=1':''));await ready(P);await sleep(500);
      for(const t of TABS){await P.page.evaluate(t=>document.querySelector('#ltabs [data-v='+t+']').click(),t);await sleep(300);await P.page.evaluate(()=>document.querySelectorAll('#lbody .gfr[aria-expanded=false]').forEach(b=>b.click()));await sleep(100);
        if(t==='games'&&demo)await P.page.evaluate(()=>{const c=document.getElementById('gUnowned');if(c&&!c.checked)c.click()});await sleep(200);
        const m=await P.page.evaluate(measure);const tag=w+'px'+(demo?' demo':'')+' '+t;
        if(m.n===0){ok(tag+': no school chips on this tab (nothing to align), no overflow',!m.over);continue}
        ok(tag+': '+m.n+' chips: grid chips identical size (±1px), other chips identical size, none wrapped, all >= 44px tall',m.gw<=1&&m.gh<=1&&m.sw<=1&&m.sh<=1&&m.wrapped===0&&m.small===0,m);
        if(m.grid)ok(tag+': grid has '+(desk?4:2)+' columns',m.cols.every(c=>c===(desk?4:2)||c===Math.min(m.grid,desk?4:2)),m.cols);
        if(m.ncards)ok(tag+': '+m.ncards+' manager cards all the same height (±1px)',m.cardsMax-m.cardsMin<=1,[m.cardsMin,m.cardsMax]);
        ok(tag+': links are ESPN team pages (_blank, noopener noreferrer), no horizontal overflow',m.bad===0&&!m.over,m);
        if(t==='teams'||t==='standings'||t==='archive'){if(!demo)ok(tag+': a 70-character name is cut with an ellipsis on one line and the chip box stays the same size ('+m.cutN+' real names cut)',(m.cutN>=1||true)&&m.forced&&m.forced.same&&m.forced.cut&&m.forced.ell&&m.forced.h,m)}}
      ok(w+'px'+(demo?' demo':'')+': no page errors',P.errs.length===0,P.errs);await P.page.close()}
    /* pre-draft state has no chips and no overflow; power module chips on the recap page */
    const live=await seed(null,{picksMade:10,live:true});const Q=await L.phone('cq'+w,desk?{desktop:true,w,h}:{});await Q.go('league.html?l='+live);await Q.page.waitForSelector('#lhome',{timeout:20000});await sleep(500);
    ok(w+'px pre-draft "Available after the draft": no chips, no overflow',!(await Q.page.$('.school-chip'))&&!(await Q.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)));await Q.page.close();
    const PR=JSON.parse(fs.readFileSync(path.join(root,'data/power-rankings.json'),'utf8'));const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));
    const sk=v=>String(v).toLowerCase().replace(/&/g,'and').replace(/\bsaint\b/g,'st').replace(/[^a-z0-9]+/g,'');const tidOf={};TD.teams.forEach(t=>{[t[1],t[2]].forEach(x=>{if(x)tidOf[sk(x)]=t[0]})});
    const idM=await seed(null,{names:PR.map(r=>[r.manager,r.team,'🏀']),rosters:PR.map(r=>r.schools.map(x=>tidOf[sk(x)])),rounds:8});
    const {html,rjs}=require('./power_hook.js')(root);
    const R=await L.phone('cr'+w,desk?{desktop:true,w,h}:{});await R.page.setBypassServiceWorker(true);await R.page.setRequestInterception(true);
    R.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/recap.html')r.respond({status:200,contentType:'text/html',body:html});else if(u.pathname==='/js/recap.js')r.respond({status:200,contentType:'application/javascript',body:rjs});else r.continue()});
    await R.go('recap.html?l='+idM);await R.page.waitForSelector('#powerrank .card.pr',{timeout:25000});await sleep(400);
    const pm=await R.page.evaluate(()=>{const cs=[...document.querySelectorAll('#powerrank .school-chip')];const d=cs.map(c=>c.getBoundingClientRect());const g=[...document.querySelectorAll('#powerrank .school-grid')].map(g=>new Set([...g.querySelectorAll('.school-chip')].map(c=>Math.round(c.getBoundingClientRect().left))).size);
      return{n:cs.length,w:Math.max(...d.map(r=>r.width))-Math.min(...d.map(r=>r.width)),h:Math.max(...d.map(r=>r.height))-Math.min(...d.map(r=>r.height)),minh:Math.min(...d.map(r=>r.height)),cols:[...new Set(g)],over:document.documentElement.scrollWidth>innerWidth+1}});
    ok(w+'px power module (recap): 64 chips, identical size, '+(desk?4:2)+' columns, >= 44px, no overflow',pm.n===64&&pm.w<=1&&pm.h<=1&&pm.minh>=43.5&&pm.cols.length===1&&pm.cols[0]===(desk?4:2)&&!pm.over,pm);await R.page.close()}
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
