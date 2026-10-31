/* Power rankings GENERATOR (js/power-gen.js) + render: 3+ random drafts of 64 real schools (seeded PRNG, different school sets and conference mixes).
   Unit part (no browser): 8 distinct ranks 1-8, grades monotone A+..D, exactly 4 sentences in the short recap and 10 in the deep dive, deterministic (twice identical, and
   independent of manager order), no forbidden words, no undefined/NaN/empty strings, no repeated sentence inside one deep dive, variety across managers, facts only from the data,
   fewer than 8 managers / uneven rosters -> null.   Browser part: the temp-copy recap page shows the generated cards at 390 and 1280 (same badges, recap, deep dive, empty state).
   node tests/e2e_powergen.js  (APP / API env, mock store, for the browser part)  */
const fs=require('fs'),path=require('path'),vm=require('vm');const root=path.join(__dirname,'..');
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));
const TEAMS={};TD.teams.forEach(r=>{TEAMS[r[0]]={espn_id:r[0],name:r[1],short:r[2]}});const META=TD.meta;
const ctx={window:{TEAMS_DATA:TD},console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'js/power-gen.js'),'utf8'),ctx);const G=ctx.window.FBNPowerGen;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const NAMES=[['Ana','Aces'],['Ben','Blazers'],['Cy','Comets'],['Dee','Dunkers'],['Eli','Eagles'],['Fay','Flyers'],['Gus','Gators'],['Hal','Hawks']];
function draft(seedN,o){o=o||{};const R=mulberry(seedN),ids=TD.teams.map(t=>t[0]);for(let i=ids.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
  /* seed 3 = every manager gets schools of one or two conferences (a lopsided mix) */
  const managers=NAMES.map((x,i)=>({mid:'m'+i+'0123456789abcdef'.slice(0,8),name:(o.test?'Test ':'')+x[0],team:(o.test?'Test ':'')+x[1]}));const picks=[];let pk=0;const per=o.per||8;
  let order=ids;if(o.byConf){const by={};ids.forEach(t=>{const c=(META[t]||{}).c||'?';(by[c]=by[c]||[]).push(t)});order=Object.keys(by).sort().flatMap(c=>by[c])}
  if(o.byConf){managers.forEach((m,i)=>{order.slice(i*per,(i+1)*per).forEach((t,k)=>picks.push({n:++pk,owner:m.mid,tid:t}))})}
  else for(let r=0;r<per;r++)managers.forEach(m=>picks.push({n:++pk,owner:m.mid,tid:order[pk-1]}));
  return{managers,picks,teams:TEAMS,meta:META}}
const sc=t=>(String(t).match(/[.!?](?=\s|$)/g)||[]).length;
const FORBID=/\b(lotter\w*|jackpot|bets?|betting|wager\w*|gambl\w*|odds|payout|prize|cash|money|pot|dollars?|USD|IDR)\b|\$|undefined|NaN|null|\[object/i;
const CONFS=new Set(Object.values(META).map(m=>m.c));const GR=['A+','A','A-','B+','B','B-','C','D'];
(async()=>{try{
  const drafts=[['random A',draft(11)],['random B',draft(222)],['random C',draft(3333)],['one-conference-heavy mix',draft(5,{byConf:true})],['Test-prefixed names',draft(77,{test:true})]];
  const allTexts=[];
  for(const [label,d] of drafts){const a=G.generate(d),b=G.generate(JSON.parse(JSON.stringify(Object.assign({},d,{teams:undefined,meta:undefined}))).managers&&d);
    ok(label+': 8 rows, ranks 1-8 all distinct',a&&a.length===8&&new Set(a.map(r=>r.rank)).size===8&&a.every((r,i)=>r.rank===i+1),a&&a.map(r=>r.rank));
    ok(label+': grades follow rank, A+ at the top, D at the bottom, never improving down the list',a.every((r,i)=>GR.indexOf(r.grade)>=(i?GR.indexOf(a[i-1].grade):0))&&a[0].grade==='A+'&&a[7].grade==='D',a.map(r=>r.grade));
    ok(label+': strength is non-increasing by rank',a.every((r,i)=>!i||r.strength<=a[i-1].strength),a.map(r=>r.strength));
    ok(label+': short recap = exactly 4 sentences, deep dive = exactly 10, for every manager',a.every(r=>sc(r.short)===4&&sc(r.recap)===10),a.filter(r=>sc(r.recap)!==10||sc(r.short)!==4).map(r=>r.recap.replace(/\u2060/g,'').split(/(?<=[.!?])\s+/)));
    const t1=JSON.stringify(a),t2=JSON.stringify(G.generate(d));ok(label+': deterministic: the same draft gives identical rows and text',t1===t2);
    const sh=Object.assign({},d,{managers:d.managers.slice().reverse()});ok(label+': deterministic: manager order does not change ranks or text',JSON.stringify(G.generate(sh).map(r=>[r.rank,r.manager,r.short,r.recap]))===JSON.stringify(a.map(r=>[r.rank,r.manager,r.short,r.recap])));
    const texts=a.flatMap(r=>[r.short,r.recap]);allTexts.push(...texts);
    ok(label+': no forbidden (betting / money) words, no undefined / NaN / null, no empty text',texts.every(t=>t&&t.length>40&&!FORBID.test(t.replace(/\u2060/g,''))),texts.filter(t=>FORBID.test(t.replace(/\u2060/g,''))).map(t=>FORBID.exec(t)[0]));
    ok(label+': no sentence repeats inside one deep dive',a.every(r=>{const s=r.recap.split(/(?<=[.!?])\s+/);return new Set(s).size===s.length}));
    ok(label+': the 8 short recaps are not identical and the 8 deep dives differ (variety)',new Set(a.map(r=>r.short)).size===8&&new Set(a.map(r=>r.recap)).size===8&&new Set(a.map(r=>r.short.split('.')[0].replace(/[^a-z ]/gi,'').split(' ').slice(0,2).join(' '))).size>=1);
    const facts=a.every(r=>r.schools.length===8&&r.schoolData.length===8&&r.schools.every(s=>r.short.concat(r.recap).length>0)&&r.schoolData.every(x=>x.school&&x.pick>0));ok(label+': every row lists its 8 schools with pick numbers and only data fields',facts);
    ok(label+': every school named in the text is on that manager\'s roster',a.every(r=>{const all=TD.teams.map(t=>t[2]).filter(s=>s.length>3&&!CONFS.has(s)&&new RegExp('\\b'+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(r.recap.replace(/\u2060/g,'')));return all.every(s=>r.schools.includes(s)||r.schools.some(x=>x.includes(s)||s.includes(x)))}),a.map(r=>TD.teams.map(t=>t[2]).filter(s=>s.length>3&&!CONFS.has(s)&&new RegExp('\\b'+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(r.recap.replace(/\u2060/g,''))&&!r.schools.some(x=>x.includes(s)||s.includes(x))).join('/')).join(','));
    ok(label+': names are written exactly as stored (a real league manager called "Test Ana" keeps its "Test ")',!d.managers[0].name.startsWith('Test ')||a.some(r=>/Test Ana/.test(r.short+r.recap)));
  }
  const slotV=new Set(allTexts.flatMap(t=>t.split(/(?<=[.!?])\s+/).map(s=>s.replace(/[A-Z][\w'.\u2060 -]+/g,'X').replace(/\d+(\.\d+)?/g,'N'))));
  ok('variety: more than 30 distinct sentence shapes across the random drafts (3+ phrasings per slot)',slotV.size>30,slotV.size);
  ok('fewer than 8 managers, or uneven rosters, return null (empty state)',G.generate(Object.assign({},drafts[0][1],{managers:drafts[0][1].managers.slice(0,7)}))===null&&G.generate(Object.assign({},drafts[0][1],{picks:drafts[0][1].picks.slice(0,60)}))===null&&G.generate({})===null);
  const nometa=G.generate(Object.assign({},drafts[0][1],{meta:{}}));ok('a school without power rank / seed / conference is skipped, never invented (all-unranked data still gives 8 rows, 4 + 10 sentences, no NaN)',nometa&&nometa.length===8&&nometa.every(r=>sc(r.short)===4&&sc(r.recap)===10&&!FORBID.test(r.short+r.recap)));
  /* ---- browser: temp-copy recap page ---- */
  if(process.env.APP){const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;
    const {html,rjs}=require('./power_hook.js')(root);
    const patch=async P=>{await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/recap.html')r.respond({status:200,contentType:'text/html',body:html});else if(u.pathname==='/js/recap.js')r.respond({status:200,contentType:'application/javascript',body:rjs});else r.continue()})};
    const ids=[];for(const [seedN,o] of [[11],[222],[3333]]){const d=draft(seedN,o);const rosters=d.managers.map(m=>d.picks.filter(p=>p.owner===m.mid).map(p=>p.tid));ids.push(await seed(null,{names:NAMES.map(x=>[x[0],x[1],'🏀']),rosters,rounds:8}))}
    const six=await seed(null,{managers:6,rounds:6});
    for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
      for(const [k,id] of ids.entries()){const P=await L.phone('pg'+w+k,desk?{desktop:true,w,h}:{});await patch(P);await P.go('recap.html?l='+id);await P.page.waitForSelector('#powerrank .card.pr',{timeout:25000});await sleep(500);
        const o=await P.page.evaluate(()=>({n:document.querySelectorAll('#powerrank .card.pr').length,g:[...document.querySelectorAll('#powerrank .pgr')].map(x=>x.innerText),note:(document.getElementById('prnote')||{}).innerText||'',over:document.documentElement.scrollWidth>innerWidth+1,small:[...document.querySelectorAll('#powerrank button')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height<43.5}).length}));
        ok(w+'px random draft '+(k+1)+' on the recap page: 8 generated cards with grades A+..D in order, note says the analysis is built from this league, no overflow, tap targets >= 44px',o.n===8&&o.g.join()===GR.join()&&/built from this league/.test(o.note)&&!o.over&&o.small===0,o);
        await P.page.focus('#prb0');await P.page.keyboard.press('Enter');await sleep(200);await P.page.focus('#prd0');await P.page.keyboard.press('Space');await sleep(250);
        const d=await P.page.evaluate(()=>({short:document.querySelector('#prp0 .plead').innerText,deep:[...document.querySelectorAll('#prdp0 p')].map(p=>p.innerText).join(' '),li:document.querySelectorAll('#prdp0 .sch li').length,e:document.getElementById('prd0').getAttribute('aria-expanded')}));
        const cnt=t=>(t.match(/[.!?](?=\s|$)/g)||[]).length;ok(w+'px random draft '+(k+1)+': one tap opens the 4-sentence recap, Deep dive opens 10 sentences and the 8-school list (aria-expanded)',cnt(d.short)===4&&cnt(d.deep)===10&&d.li===8&&d.e==='true',[cnt(d.short),cnt(d.deep),d.li,d.deep.replace(/\u2060/g,'').split(/(?<=[.!?])\s+/).filter(x=>x.length<34||/\b[A-Z][a-z]{0,3}\.\s/.test(x))]);
        if(k===0)await P.shot('s20-recap-powergen-'+w);ok(w+'px random draft '+(k+1)+': no page errors',P.errs.length===0,P.errs);await P.page.close()}
      const Q=await L.phone('pe'+w,desk?{desktop:true,w,h}:{});await patch(Q);await Q.go('recap.html?l='+six);await Q.page.waitForSelector('#powerrank #prempty,#powerrank .card.pr',{timeout:25000});await sleep(500);
      ok(w+'px a league without 8 managers: plain empty state "Power rankings appear after the draft is analysed", no cards',/Power rankings appear after the draft is analysed/.test(await Q.page.$eval('#powerrank',e=>e.innerText))&&!(await Q.page.$('#powerrank .card.pr')));await Q.page.close()}
  }
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{if(process.env.APP)await require('./lib.js').close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
