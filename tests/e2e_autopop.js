/* The League site appears by itself, populated for every manager, the moment the draft is complete (no commissioner step).
   (a) a finished league, (b) a fresh 8-manager draft that is finished while the League page is open. At 390 and 1280.
   node tests/e2e_autopop.js   (APP=http://localhost:9995 API=http://localhost:9996/api/data/ node tools/mock_textdb.js 9995 . 9996 running) */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const F=require('../js/core.js');const {sleep,APP}=L;
let n=0,bad=0;const fails=[];const API=process.env.API||'http://localhost:9996/api/data/';
function ok(name,cond,extra){n++;if(cond)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(extra!==undefined?'  -> '+JSON.stringify(extra).slice(0,400):''))}}
const get=async k=>{const r=await fetch(API+encodeURIComponent(k));return r.ok?await r.text():null};const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
const ready=P=>P.page.waitForFunction('!!document.querySelector("#lapp[data-ready]")',{timeout:25000});
async function audit(P,id,label,names){
  await ready(P);await sleep(300);
  const o=await P.page.evaluate(()=>{const c=[...document.querySelectorAll('#main .ocl .strow')];return{n:c.length,t1:c.every(x=>x.querySelector('.place').innerText==='T-1'),zero:c.every(x=>x.querySelector('.score .pv').innerText==='0'),chips:c.every(x=>x.querySelectorAll('.chip').length===6),names:c.map(x=>x.querySelector('.nm').innerText),tabs:[...document.querySelectorAll('#ltabs > *')].map(x=>x.innerText.trim()),ov:document.documentElement.scrollWidth>innerWidth,avail:!!document.getElementById('avail'),room:(document.getElementById('tab_room')||{}).href||''}});
  ok(label+': 8 populated cards, all T-1 and 0 points, 6 school chips each, no placeholder',o.n===8&&o.t1&&o.zero&&o.chips&&!o.avail,o);
  ok(label+': every manager name is on a card',names.every(nm=>o.names.some(x=>x.includes(nm))),o.names);
  ok(label+': tab row Standings … Rules plus Draft link to this league\'s room',/Standings|Ranks/.test(o.tabs[0])&&o.tabs.slice(-3,-1).some(t=>/Rules/.test(t))&&/Draft/.test(o.tabs[o.tabs.length-1])&&o.room.includes('room.html?l='+id),o.tabs);
  ok(label+': no sideways overflow, no page errors',!o.ov&&P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs.slice(-2));
}
(async()=>{try{
  for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
    const tag=w+'px';
    const id=await seed();const js=seed.info;const names=js.managers.map(m=>m.name);
    // (a) finished league: every manager (a fresh device each) opens the plain link
    for(const m of js.managers.slice(0,3).concat(js.managers.slice(-1))){const P=await L.phone('ap'+m.name+w,desk?{desktop:true,w,h}:{});await P.go('league.html?l='+id);await audit(P,id,'(a) finished league, '+tag+', as '+m.name,names);if(m===js.managers[0])await P.shot('autopop_finished_'+w);await P.page.close()}
    // (b) fresh draft: 47 of 48 picks made, page open -> last pick and the draft completes -> page fills in by itself
    const id2=await seed(null,{live:true,picksMade:47,name:'Fresh Draft'});const j2=seed.info;
    const P=await L.phone('apB'+w,desk?{desktop:true,w,h}:{});await P.go('league.html?l='+id2);await P.page.waitForSelector('#avail',{timeout:15000});
    ok('(b) fresh draft '+tag+': before the draft ends the page says it appears after the draft (47 of 48 picks)',/Available after the draft/.test(await P.page.$eval('#lhome',e=>e.innerText))&&/47 of 48/.test(await P.page.$eval('#lhome',e=>e.innerText)));
    const K=F.Keys(id2);const meta=JSON.parse(await get(K.meta));
    let prev=null,used={};for(let i=1;i<=47;i++){const e=JSON.parse(await get(K.pick(1,i)));used[String(e.tid)]=1;prev=e.id}
    const fs=require('fs'),path=require('path');const s=fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8');const TD=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));
    const tid=TD.teams.map(t=>t[0]).find(t=>!used[String(t)]);
    const e48=F.makeEntry(48,j2.managers[0].id,tid,{now:Date.now(),epoch:1,writer:'seed',by:'owner',prev});await post(K.pick(1,48),e48);
    /* like the real room: meta.status stays 'live' after the last pick; the page must derive completion from the picks */meta.endedAt=Date.now();await post(K.meta,meta);
    await P.page.waitForFunction('!!document.querySelector("#lapp[data-ready]")',{timeout:30000});
    await audit(P,id2,'(b) fresh draft completed, '+tag+' (page refreshed itself)',j2.managers.map(m=>m.name));
    await P.shot('autopop_fresh_'+w);await P.page.close();
  }
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
