/* s28 (shipped defaults TEAM_NAME_ON_TOP=true, ALLOW_PHOTO=true): My settings sheet screenshots on a MOCK league in the local mock store only. APP=http://localhost:9741 API=http://localhost:9742/api/data/ */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;const OUT=process.env.OUT||'/workspace/s28-settings-shots2';
(async()=>{const id=await seed(process.env.API,{live:true,mock:true,picksMade:3,name:'Mock Settings League'});const me=seed.info.managers[1];
  console.log('league',id,'me',me.name,me.team);
  for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){const P=await L.phone('p'+w,{w,h,desktop:desk});const pg=P.page;
    await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await sleep(3500);await pg.screenshot({path:OUT+'/0a-board-team-on-top-'+w+'.png'});
    await pg.click('[data-a="tab"][data-t="more"]');await sleep(1200);
    const s=f=>pg.screenshot({path:OUT+'/'+f+'-'+w+'.png'});
    await pg.evaluate(()=>{const e=document.getElementById('youcard');if(e)e.scrollIntoView({block:'center'})});await sleep(300);await s('0-more-tab-entry');
    await pg.click('#mysettings');await sleep(700);await s('1-settings-page');
    await pg.$eval('#ms_team',e=>{e.value='';e.focus()});await pg.type('#ms_team',' comets');await pg.click('#mssave');await sleep(700);await pg.evaluate(()=>{const e=document.getElementById('ms_team');e&&e.scrollIntoView({block:'center'})});await s('2b-duplicate-team-error');await pg.$eval('#ms_team',e=>{e.value='';e.focus()});await pg.type('#ms_team','Ben’s Buckets');await sleep(300);await s('2-editing-team-name');
    await pg.click('[data-a="msemoji"][data-e="🐺"]');await sleep(400);await pg.evaluate(()=>{const e=document.querySelector('#mysheet .emojis');e&&e.scrollIntoView({block:'center'})});await sleep(200);await s('3-emoji-picker');
    const fi=await pg.$('#ms_photo');await fi.uploadFile('/tmp/s28ball.jpg');await sleep(2000);await pg.evaluate(()=>{const e=document.getElementById('mszoomrow');e&&e.scrollIntoView({block:'center'})});await sleep(200);await s('4-photo-picker');
    await pg.evaluate(()=>{const e=document.getElementById('msnamebox');e&&e.scrollIntoView({block:'center'})});await sleep(200);await s('5-readonly-real-name');
    await pg.click('#mssave');await sleep(2500);await pg.click('#tab_board');await sleep(800);await s('7-board-after-save');await pg.click('#tab_more');await sleep(600);await pg.evaluate(()=>{const e=document.getElementById('youcard');if(e)e.scrollIntoView({block:'center'})});await sleep(300);await s('6-after-save');
    const ro=await pg.evaluate(()=>{const n=document.getElementById('ms_name');return n?n.readOnly:null});
    console.log(w,'errs',P.errs,'toasts',await pg.evaluate(()=>window.__toasts));await P.close();
    if(w===390){/* reset profile for the 1280 run */}
  }
  const raw=await (await fetch(process.env.API+encodeURIComponent(require('../js/core.js').Keys(id).mgr(me.id)))).text();const p=JSON.parse(raw);console.log('saved profile',p.name,p.team,p.emoji,p.photo?p.photo.length+' chars':'no photo');
  await L.close()})().catch(e=>{console.error(e);process.exit(1)});
