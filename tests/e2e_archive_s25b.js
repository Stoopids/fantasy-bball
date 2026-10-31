/* s25b home: device-only Archive / Restore for "Your leagues on this device"; League site button skips archived; resume skips archived. Mock store. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,API}=L;
const OUT=process.env.SHOTS||'/workspace/draftroom-notes/s25-setup';
let n=0,bad=0;const ok=(t,c,x)=>{n++;if(c)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
(async()=>{try{
 const ids=[];for(const nm of ['Alpha Hoops','Bravo Ballers','Charlie Court'])ids.push(await seed(API,{name:nm}));
 const before={};for(const id of ids)before[id]=await (await fetch(API+encodeURIComponent(F.Keys(id).meta))).text();
 for(const [w,d] of [[390,false],[1280,true]]){
  const P=await L.phone('a'+w,{w,h:900,desktop:d});let writes=0;P.page.on('request',r=>{if(r.method()!=='GET'&&/api\/data/.test(r.url()))writes++});
  await P.page.evaluateOnNewDocument(ids=>{if(!sessionStorage.getItem('__seeded')){sessionStorage.setItem('__seeded','1');localStorage.setItem('fbn.leagues',JSON.stringify(ids.map((id,i)=>({id,name:['Alpha Hoops','Bravo Ballers','Charlie Court'][i],role:'manager',ts:Date.now()-i*1000}))));localStorage.removeItem('fbn.archived');
   localStorage.setItem('fbn.lastnav',JSON.stringify({kind:'room',id:ids[0],path:'room.html?l='+ids[0],tab:'board',ts:Date.now()}))}},ids);
  await P.go('index.html');await P.page.waitForSelector('#mine');await sleep(300);
  const st=()=>P.page.evaluate(()=>({mine:[...document.querySelectorAll('#mine .mrw')].map(e=>e.dataset.id),arch:[...document.querySelectorAll('#archived .mrw')].map(e=>e.dataset.id),sum:(document.querySelector('#archived summary')||{}).innerText||'',site:(document.getElementById('sitebtn')||{}).innerText||null,siteHref:(document.getElementById('sitebtn')||{}).href||'',
   small:[...document.querySelectorAll('.arch,#archived summary')].filter(e=>e.offsetParent!==null).filter(e=>e.getBoundingClientRect().height<44).length,last:UI.lastPlace(),ls:localStorage.getItem('fbn.leagues')}));
  let s=await st();ok(w+': 3 leagues, each with an Archive button >= 44px; League site = first league',s.mine.length===3&&s.small===0&&/Alpha Hoops/.test(s.site),s);await P.page.screenshot({path:OUT+'/s25b_'+w+'_home_list.png',fullPage:true});
  ok(w+': resume offers the last place (Alpha) before archiving',s.last&&s.last.id===ids[0],s.last);
  await P.page.click(`.arch[data-a=archive][data-id="${ids[0]}"]`);await sleep(300);s=await st();
  ok(w+': archived Alpha moves to a collapsed "Archived leagues (1)"; League site now uses Bravo',s.mine.join()===[ids[1],ids[2]].join()&&s.arch.join()===ids[0]&&/Archived leagues \(1\)/.test(s.sum)&&/Bravo Ballers/.test(s.site)&&!(await P.page.$eval('#archived',e=>e.open)),s);
  ok(w+': standalone resume (UI.lastPlace) skips the archived league',s.last===null,s.last);
  await P.page.click(`.arch[data-a=archive][data-id="${ids[1]}"]`);await sleep(200);await P.page.click(`.arch[data-a=archive][data-id="${ids[2]}"]`);await sleep(300);s=await st();
  ok(w+': all archived: League site button hidden, "Archived leagues (3)"',s.site===null&&s.mine.length===0&&/\(3\)/.test(s.sum),s);
  await P.page.click('#archived summary');await sleep(200);await P.page.screenshot({path:OUT+'/s25b_'+w+'_home_archived_open.png',fullPage:true});
  await P.page.click(`.arch[data-a=restore][data-id="${ids[1]}"]`);await sleep(300);s=await st();
  ok(w+': Restore brings Bravo back and it leads the League site button',s.mine.join()===ids[1]&&/Bravo Ballers/.test(s.site)&&s.arch.length===2,s);await P.page.screenshot({path:OUT+'/s25b_'+w+'_home_after_restore.png',fullPage:true});
  await P.page.reload({waitUntil:'domcontentloaded'});await P.page.waitForSelector('#sitebtn');s=await st();ok(w+': archive list survives a reload (device-only localStorage)',s.mine.join()===ids[1]&&s.arch.length===2,s);
  ok(w+': the league list itself is untouched (all 3 still in fbn.leagues) and nothing was written to the store',JSON.parse(s.ls).length===3&&writes===0,{writes});
  ok(w+': no page errors',P.errs.length===0,P.errs);await P.close()}
 for(const id of ids)ok('server meta unchanged for '+id,(await (await fetch(API+encodeURIComponent(F.Keys(id).meta))).text())===before[id]);
}catch(e){bad++;console.log('CRASH',e)}await L.close();console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)})();
