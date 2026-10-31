/* DR2 s25-full: Rules button + page. Lobby and live, real and mock (meta.mock=true), live per-league values, required lines, banned words.
   APP/API env = private mock_textdb ports. OUT=dir for 320/390/1280 shots. Mock/test data only. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const OUT=process.env.OUT;
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const REQ=["Games played before your league's draft count. Scoring starts from the beginning of the season.",'spun once','only if the first spin doesn','right away at your turn','If no ranked teams are left, a random team is picked.','queue first','best power-ranked team left','always pick for you','only that one pick','After an Undo, the slot waits for the clock','at least one phone or computer has the room open','tap a team to draft','confirm pop-up','Q+ button only'];
const BANNED=/\b(bet|bets|betting|wager|money|cash|\$|dollars?|stake|STOOPIDS)\b/i;
(async()=>{try{if(OUT)require('fs').mkdirSync(OUT,{recursive:true});
 const cases=[{tag:'real-lobby',mock:false,live:false},{tag:'mock-lobby',mock:true,live:false},{tag:'real-live',mock:false,live:true},{tag:'mock-live',mock:true,live:true},{tag:'mock-lobby-10',mock:true,live:false,mgrs:10,rounds:6}];
 for(const c of cases){const NM=c.mgrs||8;const id=await seed(API,{managers:NM});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);
  m.settings.rounds=c.rounds||(c.live?9:7);m.settings.managers=NM;m.settings.clockSecs=c.live?90:30;m.settings.type=c.live?'linear':'snake';if(c.mock)m.mock=true;delete m.endedAt;
  if(c.live){m.status='live';m.paused=true;m.pausedLeft=90000}else{m.status='lobby';delete m.startedAt;m.orderSet=false;m.order=[];m.spin=null;m.spinGen=0;m.spinDone=false;m.respins=[];m.settings.startMode='auto';m.settings.startAt=Date.UTC(2026,11,5,1,0)}
  await post(K.meta,m);
  for(const [w,h] of (OUT&&c.tag.startsWith('real')?[[320,640],[390,844],[1280,800]]:[[390,844]])){const opt=w>700?{desktop:true,w,h}:{w,h};const me=I.managers[0];
   const P=await L.phone(c.tag+w,opt);await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);
   const sel=c.live?'#rulesbtn_hdr':'#rulesbtn_lobby';const b=await waitFor(()=>P.page.$(sel),25000);await sleep(800);
   const bb=b&&await P.page.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return{w:r.width,h:r.height,x:r.right,iw:innerWidth}},sel);
   ok(`${c.tag} ${w}px: Rules button present (${sel}), tap target >= 44px`,!!(bb&&bb.w>=44&&bb.h>=44),bb);
   if(!c.live&&bb){const pos=await P.page.evaluate(()=>{const c=document.getElementById('lobbycard').getBoundingClientRect(),r=document.getElementById('rulesbtn_lobby').getBoundingClientRect();return{right:c.right-r.right,top:r.top-c.top}});ok(`${c.tag} ${w}px: button in the top-right of the lobby card`,pos.right>=0&&pos.right<24&&pos.top>=0&&pos.top<24,pos)}
   await P.page.evaluate(()=>{const t=document.getElementById('toast');if(t)t.style.display='none'});if(OUT&&w)await P.page.screenshot({path:`${OUT}/${c.tag}_button_${w}.png`});
   if(b){await P.page.evaluate(s=>document.querySelector(s).click(),sel);const pg=await waitFor(()=>P.page.$('#rulespage2'),5000);ok(`${c.tag} ${w}px: Rules page opens`,!!pg);
    if(pg){const t=await P.page.evaluate(()=>document.getElementById('rulespage2').innerText);const g=id=>P.page.evaluate(i=>(document.getElementById(i)||{}).innerText||'',id);
     ok(`${c.tag}: live values (rounds ${m.settings.rounds}, clock ${m.settings.clockSecs}s, ${m.settings.type}, ${NM} managers, ${NM*m.settings.rounds} picks)`,(await g('r2_rounds'))===String(m.settings.rounds)&&(await g('r2_clock')).includes(String(m.settings.clockSecs))&&(await g('r2_mgrs'))===String(NM)&&t.includes('exactly '+NM+' managers')&&t.includes('('+NM*m.settings.rounds+' picks in total)')&&(await g('r2_type')).toLowerCase().startsWith(m.settings.type));
     if(!c.live)ok(`${c.tag}: start mode + date as Month Day, Year`,/^[A-Z][a-z]+ \d{1,2}, \d{4} at \d{1,2}:\d{2}\s?[AP]M your time \((UTC|GMT)[+-−]?\d*(:\d\d)?\)$/.test(await g('r2_start'))&&/starts by itself/.test(t),await g('r2_start'));
     const miss=REQ.filter(x=>t.toLowerCase().indexOf(x.toLowerCase())<0);ok(`${c.tag}: required lines present`,!miss.length,miss);
     ok(`${c.tag}: no betting / money / banned words`,!BANNED.test(t),(t.match(BANNED)||[])[0]);
     ok(`${c.tag}: numbered sections`,(await P.page.$$('#rulespage2 .r2sec')).length>=6);
     ok(`${c.tag} ${w}px: no sideways scroll`,await P.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
     if(OUT&&c.tag.startsWith('real'))await P.page.screenshot({path:`${OUT}/${c.tag}_page_${w}.png`});
     await P.page.evaluate(()=>{const x=document.querySelector('#rulespage2 [data-dr2="close"]');if(x)x.click()});await sleep(300);ok(`${c.tag} ${w}px: Close closes the Rules page`,!(await P.page.$('#rulespage2')));await P.page.evaluate(()=>{});await sleep(300)}}
   ok(`${c.tag} ${w}px: no page errors`,!P.errs.length,P.errs);await P.close()}}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
await L.close();console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
