/* Final-test screenshots of a seeded finished league, at 390 and 1280.
   Also copies the draft-flow shots from the e2e run to shots/final_m_*. Run right after e2e.js, with the mock still up. */
const fs=require('fs'),L=require('./lib.js');const {sleep}=L;const SH='/workspace/fantasy-bball/shots/';
const {seed}=require('./seed_league.js');let id='';let bad=0;const ok=(n,c,x)=>{console.log((c?'  ok  ':'FAIL  ')+n+(c?'':' -> '+JSON.stringify(x===undefined?null:x).slice(0,200)));if(!c)bad++};
(async()=>{try{
  /* s16: the League site is auto-populated and the e2e league is not kept, so the shots use a seeded, finished 8-manager league */
  id=await seed(process.env.API||'http://localhost:9996/api/data/',{managers:8});
  for(const [from,to] of [['wizard_11_confirm','wizard_confirm'],['lobby','lobby'],['on_the_clock','on_the_clock'],['board_mid','board_mid'],['recap','recap']]){fs.copyFileSync(SH+from+'.png',SH+'final_m_'+to+'.png')}
  for(const [tag,opt] of [['m',{}],['d',{desktop:true,w:1280,h:860}]]){
    const P=await L.phone('final-'+tag,opt);const pg=P.page;await P.go('league.html?l='+id);await pg.waitForFunction('!!document.querySelector("#lapp[data-ready]")',{timeout:20000});ok(tag+': real league page loads, no DEMO bar and no sample-data badge',!!(await pg.$('#lapp[data-ready]'))&&!(await pg.$('#demobar'))&&!(await pg.$('#samplenote')));await sleep(400);await P.shot('final_'+tag+'_league_real_empty');await P.go('league.html?l='+id+'&demo=1');await pg.waitForFunction('!!document.querySelector("#lapp[data-ready]")',{timeout:20000});await sleep(700);
    /* the League site's tabs are covered by e2e_lsite.js; here: one full-page shot of the default view and the demo view */
    await P.shot('final_'+tag+'_league_standings');await pg.screenshot({path:SH+'final_'+tag+'_league_standings_full.png',fullPage:true});
    ok(tag+': league page: no horizontal overflow',await pg.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    ok(tag+': demo pages carry the DEMO bar',await pg.$('#demobar').then(x=>!!x));ok(tag+': league shown is the drafted league ('+id.slice(0,4)+'…)',/Friday Hoops/i.test(await pg.$eval('#lhead',e=>e.innerText).catch(()=>'')),await pg.$eval('#lhead',e=>e.innerText).catch(()=>null));
    if(tag==='d'){await P.go('recap.html?l='+id);await pg.waitForSelector('#recaphead',{timeout:20000});await sleep(600);await P.shot('final_d_recap');await P.go('room.html?l='+id+'&watch=1');await sleep(2500);await P.shot('final_d_room_complete')}
    ok(tag+': no page errors',P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);await P.close()}
}catch(e){bad++;console.log(e.stack)}finally{await L.close();console.log(bad?'FAILED':'final shots done');process.exit(bad?1:0)}})();
