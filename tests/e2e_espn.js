/* School links to ESPN team pages in the draft room and the Draft Room pages: every school chip is an <a> with the exact ESPN URL, target=_blank, rel noopener noreferrer,
   >= 44 px tall on the phone; a tap on a link never drafts, stars, queues or opens the confirm sheet; schools without an id are plain text. Mock store only.
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_espn.js   (APP / API env) */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=L.API;
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const root=path.join(__dirname,'..');const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));
const RE=/^https:\/\/www\.espn\.com\/mens-college-basketball\/team\/_\/id\/\d+$/;
(async()=>{try{
  /* unit: F.espnUrl */
  ok('F.espnUrl: numeric string -> exact ESPN URL; number, empty, text, null -> null',F.espnUrl('150')==='https://www.espn.com/mens-college-basketball/team/_/id/150'&&F.espnUrl(150)===null&&F.espnUrl('')===null&&F.espnUrl('abc')===null&&F.espnUrl('12/../x')===null&&F.espnUrl(null)===null&&F.espnUrl(undefined)===null);
  const missing=TD.teams.filter(t=>typeof t[0]!=='string'||!/^\d+$/.test(t[0]));
  ok('every one of the '+TD.teams.length+' schools in assets/teams.js has a numeric-string ESPN id; missing: '+(missing.map(t=>t[1]).join(', ')||'none'),missing.length===0&&new Set(TD.teams.map(t=>t[0])).size===TD.teams.length);
  const id=await seed(null,{live:true,picksMade:11,rounds:8});const info=seed.info;const me=info.managers[4];
  const stateKey=()=>fetch(API+encodeURIComponent(F.Keys(id).pick(1,12))).then(r=>r.text());
  for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
    const P=await L.phone('es'+w,desk?{desktop:true,w,h}:{});const pg=P.page;await pg.setBypassServiceWorker(true);
    pg.on('popup',async p=>{try{await p.close()}catch(e){}});
    await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await pg.waitForSelector('#pickbtn',{timeout:25000});await sleep(800);
    const audit=async(sel,label,min)=>{const a=await pg.evaluate(sel=>{const A=[...document.querySelectorAll(sel)];return{n:A.length,bad:A.filter(x=>!/^https:\/\/www\.espn\.com\/mens-college-basketball\/team\/_\/id\/\d+$/.test(x.href)||x.target!=='_blank'||!/\bnoopener\b/.test(x.rel)||!/\bnoreferrer\b/.test(x.rel)).length,small:A.filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height<43.5}).length,
        plain:[...document.querySelectorAll(sel.replace(/a\.tlink/g,'.chip'))].filter(c=>!c.closest('a.tlink')).length}},sel);
      ok(w+'px '+label+': '+a.n+' school links, exact ESPN URL, target=_blank, rel noopener noreferrer, >= 44 px tall, none left as plain text',a.n>=min&&a.bad===0&&a.small===0&&a.plain===0,a);return a};
    const same=async(label)=>{const s=await pg.evaluate(()=>({sheet:!!document.getElementById('confirmpick'),on:document.querySelectorAll('#view .trow .wstar.on,#tlist .qbtn.on').length,banner:(document.getElementById('banner')||{innerText:''}).innerText.match(/Pick #\d+/)}));
      const pk=await stateKey();ok(w+'px '+label+': tapping a school link did not open the confirm sheet, star, queue or make a pick',!s.sheet&&s.on===0&&(!pk||pk.length<5||/not found|^\s*$/i.test(pk)||pk.trim()==='')&&/Pick #12/.test(s.banner&&s.banner[0]),{s,pk:pk.slice(0,60)})};
    const tapLink=async(sel)=>{const el=await pg.$(sel);await el.evaluate(e=>e.scrollIntoView({block:'center'}));await sleep(150);await el.click();await sleep(400)};
    /* Teams tab */
    await pg.click('#tab_teams');await sleep(900);
    /* s25-full (Paul via NCAA): no ESPN link or icon in Teams tab rows; the name / row is the Draft target */
    const tl=await pg.evaluate(()=>({rows:document.querySelectorAll('#tlist .trow').length,a:document.querySelectorAll('#tlist .trow a,#tlist .trow .espn').length}));ok(w+'px Teams tab rows: no ESPN anchors or icons ('+tl.rows+' rows)',tl.rows>=100&&tl.a===0,tl);
    const rowCtl=await pg.evaluate(()=>{const r=document.querySelector('#tlist .trow.go');const q=r.querySelector('.qbtn');const R=e=>{const b=e.getBoundingClientRect();return[Math.round(b.width),Math.round(b.height)]};return{d:R(r),q:R(q),star:!!r.querySelector('.wstar'),hasData:r.dataset.a}});
    ok(w+'px Teams tab: Q+ is >= 44 px, no star; the whole row is the Draft target',rowCtl.d[1]>=44&&!rowCtl.star&&rowCtl.q[0]>=44&&rowCtl.hasData==='draftrow',rowCtl);
    /* explicit Draft button still opens the confirm sheet, and the school link on the sheet does not draft */
    await pg.$eval('#tlist .trow.go[data-a=draftrow] .tm',e=>e.click());await pg.waitForSelector('#confirmpick',{visible:true,timeout:8000});
    await audit('#sheetwrap a.tlink','confirm sheet',1);await tapLink('#sheetwrap a.tlink');
    ok(w+'px confirm sheet: tapping the school link keeps the sheet open and makes no pick',!!(await pg.$('#confirmpick'))&&/Pick #12/.test(await pg.$eval('#banner',e=>e.innerText)));
    await pg.click('#sheetwrap [data-a=sheetbg]:not(.sheetbg)').catch(()=>{});await pg.evaluate(()=>{const b=[...document.querySelectorAll('#sheetwrap button')].find(x=>x.innerText.trim()==='Cancel');if(b)b.click()});await sleep(300);
    /* queue: Q+ then My Team shows the queue with links */
    await pg.$eval('#tlist .trow .qbtn',e=>{if(!e.classList.contains('on'))e.click()});await sleep(500);
    /* board */
    await pg.click('#tab_board');await sleep(800);await audit('.board td a.tlink','board cells',11);
    await tapLink('.board td a.tlink');
    const bs=await pg.evaluate(()=>({sheet:!!document.getElementById('confirmpick'),banner:document.getElementById('banner').innerText.match(/Pick #\d+/)[0]}));ok(w+'px board: tapping a school in a cell changes nothing',!bs.sheet&&bs.banner==='Pick #12',bs);
    /* my team (+ queue) */
    await pg.click('#tab_my');await sleep(800);await audit('#view a.tlink','My Team (picks and queue)',2);
    /* pick feed */
    await pg.click('#tab_chat');await sleep(600);await pg.$eval('[data-a=csub][data-v=picks]',e=>e.click());await sleep(700);await audit('#chatbody a.tlink','pick feed',11);
    /* pick overlay */
    await pg.click('#tab_board');await sleep(500);/* the banner re-renders every second, so the button node can be swapped mid-click: retry on a fresh node */for(let tr=0;tr<5;tr++){try{await pg.$eval('#pickbtn',e=>e.click());if(await pg.waitForSelector('#pickov',{timeout:1500}).catch(()=>null))break}catch(e){}await sleep(300)}await pg.waitForSelector('#pickov .trow',{timeout:8000});await sleep(400);
    {const po=await pg.evaluate(()=>({rows:document.querySelectorAll('#pickov .trow').length,a:document.querySelectorAll('#pickov .trow a,#pickov .trow .espn').length}));ok(w+'px pick overlay rows: no ESPN anchors or icons',po.rows>=100&&po.a===0,po)}
    await pg.$eval('#pickov .trow.go .tm',e=>e.click());ok(w+'px pick overlay: tapping a team name opens the confirm sheet',!!(await pg.waitForSelector('#confirmpick',{visible:true,timeout:6000}).catch(()=>null)));
    await pg.evaluate(()=>{const b=[...document.querySelectorAll('#sheetwrap button')].find(x=>x.innerText.trim()==='Cancel');if(b)b.click()});await sleep(300);
    await pg.evaluate(()=>{const b=document.querySelector('#pickov [data-a=pclose]');if(b)b.click()});await sleep(300);
    ok(w+'px room: no page errors',P.errs.length===0,P.errs);await pg.close()}
  /* a school with no id is plain text, never a dead link */
  const Q=await L.phone('en',{});await Q.page.setBypassServiceWorker(true);await Q.page.setRequestInterception(true);const dropTid=info.picks[0].teamId;
  const csrc=fs.readFileSync(path.join(root,'js/core.js'),'utf8');   /* the team table keeps the id (the picks need it); the helper reports no ESPN id for that one school */
  Q.page.on('request',r=>{if(new URL(r.url()).pathname==='/js/core.js'){r.respond({status:200,contentType:'application/javascript',body:csrc+"\n;(function(){const o=FBN.espnUrl;FBN.espnUrl=id=>id==='"+dropTid+"'?null:o(id)})();"})}else r.continue()});
  await Q.go('room.html?l='+id+'&watch=1');await sleep(2500);await Q.page.click('#tab_board').catch(()=>{});await sleep(600);
  const pl=await Q.page.evaluate(()=>({links:document.querySelectorAll('.board td a.tlink').length,span:document.querySelectorAll('.board td span.chip').length,dead:[...document.querySelectorAll('a.tlink')].filter(a=>/\/id\/(undefined|null|)$/.test(a.href)).length}));
  ok('a school without an ESPN id renders as plain text (no link, no dead URL); the others stay links',pl.links>=8&&pl.span>=1&&pl.dead===0,pl);await Q.page.close();
  /* static pages: no school names there, but the helper must not be missing */
  const S=await L.phone('st',{});for(const pgName of ['index.html','setup.html','join.html?l='+id,'redraft.html?l='+id]){await S.go(pgName);await sleep(700);ok(pgName.split('?')[0]+': loads, UI.teamLink and F.espnUrl exist, no errors',await S.page.evaluate(()=>typeof UI.teamLink==='function'&&typeof FBN.espnUrl==='function'&&typeof UI.teamChip==='function'),S.errs)}
  ok('static pages: no page errors',S.errs.length===0,S.errs);
  console.log('\n'+(n-bad)+'/'+n+' passed'+(bad?'  FAILED: '+fails.join(' | '):''));process.exitCode=bad?1:0}catch(e){console.log(e.stack);process.exitCode=1}finally{await L.close()}})();
