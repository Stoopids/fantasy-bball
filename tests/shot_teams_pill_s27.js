/* s27: Teams list name pill = Draft action on turn; shots on/off turn 390/1280. APP/API env, SHOTDIR. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
const raw=async k=>(await (await fetch(API+encodeURIComponent(k))).text());
(async()=>{let bad=0;const ok=(m,c,x)=>{if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+' '+JSON.stringify(x||'').slice(0,300))}};try{
for(const w of [390,1280]){const opt=w>700?{desktop:true,w,h:800}:{w,h:844};
 const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:null,picksMade:3});const I=seed.info;const K=F.Keys(id);const meta=F.parseJ(await raw(K.meta));
 const slot=F.slotAt(meta.order,4,meta.settings.type,meta.settings.rounds);const on=I.managers.find(m=>m.id===slot.owner),off=I.managers.find(m=>m.id!==slot.owner);
 const P=await L.phone('pon'+w,opt);await P.go('room.html?l='+id+'#as='+on.id+'&k='+on.k);await P.page.waitForSelector('#tab_teams',{timeout:25000});await sleep(1500);
 await P.page.evaluate(()=>document.querySelector('#tab_teams').click());await P.page.waitForSelector('#tlist .trow.go .tm.dbtn',{timeout:10000});await sleep(500);
 const r=await P.page.evaluate(()=>{const b=document.querySelector('#tlist .trow.go .tm.dbtn');const q=b.closest('.trow').querySelector('.qbtn');const R=b.getBoundingClientRect(),Q=q&&q.getBoundingClientRect();return{h:R.height,aria:b.getAttribute('aria-label'),sep:document.querySelectorAll('#tlist button.dbtn:not(.tm)').length,qh:Q&&Q.height,gap:Q?Q.left-R.right:null,ovf:document.documentElement.scrollWidth>innerWidth}});
 ok(w+' on turn: pill >=44px, aria Draft <team>, no separate Draft box, Q+ 48px kept, gap>=8, no overflow',r.h>=44&&/^Draft /.test(r.aria)&&r.sep===0&&r.qh>=48&&r.gap>=8&&!r.ovf,r);
 await P.page.screenshot({path:process.env.SHOTDIR+'/teams-pill-'+w+'-onturn.png'});if(w===390)await P.page.screenshot({path:process.env.SHOTDIR+'/teams-pill-390.png'});if(w===1280)await P.page.screenshot({path:process.env.SHOTDIR+'/teams-pill-1280.png'});
 const before=await raw(K.pick(meta.epoch||1,4));
 await P.page.$eval('#tlist .trow.go .tm.dbtn',e=>e.click());ok(w+' pill tap opens the confirm',!!(await P.page.waitForSelector('#confirmpick',{visible:true,timeout:6000}).catch(()=>null)));
 await P.page.evaluate(()=>{const b=document.querySelector('[data-a=sheetbg]');if(b)b.click()});await sleep(1500);ok(w+' cancel leaves no pick',(await raw(K.pick(meta.epoch||1,4)))===before);
 const tid=await P.page.$eval('#tlist .trow.go .tm.dbtn',e=>e.dataset.t);await P.page.$eval('#tlist .trow.go .tm.dbtn',e=>e.click());await P.page.waitForSelector('#confirmpick',{visible:true,timeout:6000});await P.page.click('#confirmpick');
 let landed=null;for(let i=0;i<40&&!landed;i++){await sleep(250);const e=F.parseJ(await raw(K.pick(meta.epoch||1,4)));if(e&&e.tid)landed=e}ok(w+' confirm: the pick lands (the tapped team)',landed&&String(landed.tid)===String(tid),{landed,tid});
 ok(w+' on-turn page: no errors',!P.errs.length,P.errs);await P.close();
 const O=await L.phone('poff'+w,opt);await O.go('room.html?l='+id+'#as='+off.id+'&k='+off.k);await O.page.waitForSelector('#tab_teams',{timeout:25000});await sleep(1500);await O.page.evaluate(()=>document.querySelector('#tab_teams').click());await sleep(1200);
 const nb=await O.page.evaluate(()=>document.querySelectorAll('#tlist .dbtn').length);const p5=await raw(K.pick(meta.epoch||1,5));
 await O.page.$eval('#tlist .trow .tm',e=>e.click());await sleep(1000);const pop=await O.page.$('#confirmpick');
 ok(w+' off turn: no Draft pill, tap does nothing, no pick',nb===0&&!pop&&(await raw(K.pick(meta.epoch||1,5)))===p5,{nb,pop:!!pop});
 await O.page.screenshot({path:process.env.SHOTDIR+'/teams-pill-'+w+'-offturn.png'});ok(w+' off-turn: no errors',!O.errs.length,O.errs);await O.close()}
}catch(e){bad++;console.log('exception '+e.stack)}console.log(bad?'FAILED':'ALL OK');process.exit(bad?1:0)})();
