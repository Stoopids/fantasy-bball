/* s26c8b Auto-draft me, multi-client (mock store only). Contexts: Ana (auto, sets it in the lobby, then her device is CLOSED), Ben (commissioner + manager), Cy (manager).
   Lobby: Ana ON via My Team; Ben (commissioner) turns Dee ON; Cy's forged toggle of Ana is rejected; Cy sees the AUTO badge. Auto-start: countdown -> grid, pick 1 (Ana, auto) lands ~2 s after the start.
   Pick 3 (Cy, auto ON) is turned OFF the moment pick 2 lands: no fast pick, it waits for the clock. Pick 4 (Dee, auto) fast; Undo of it -> 10 s hold with countdown; Pause in the hold;
   Resume -> re-pick after the hold with a u1 id. Pause with Eli on the clock + Eli auto ON: no pick while paused; Resume: fast pick. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):''));else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms,step)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(step||200)}return false};
const click=(P,sel)=>P.page.evaluate(s=>{const b=document.querySelector(s);if(b){b.click();return true}return false},sel);
const banner=P=>P.page.evaluate(()=>(document.getElementById('banner')||{innerText:''}).innerText);
const tab=async(P,t)=>{await click(P,'#tab_'+t);await sleep(500)};
const SH=process.env.SHOTS||'s26c8b';
(async()=>{try{
 const id=await seed(API,{managers:8,rounds:8,live:true,clockSecs:30,picksMade:0});const I=seed.info;const K=F.Keys(id);const M0=await gj(K.meta);
 const lob=Object.assign({},M0,{status:'lobby',startedAt:null,resumeAt:null});lob.settings=Object.assign({},M0.settings,{startMode:'auto',startAt:Date.now()+45000});await post(K.meta,lob);
 const [Ana,Ben,Cy,Dee,Eli]=I.managers;const pick=k=>gj(K.pick(M0.epoch,k)).then(e=>e&&e.tid?e:null);
 const A=await L.phone('ana',{w:1280,h:900,desktop:true});await A.go('room.html?l='+id+'#as='+Ana.id+'&k='+Ana.k);
 const B=await L.phone('ben',{w:390,h:844});await B.go('room.html?l='+id+'#cm='+I.cmSecret+'&as='+Ben.id+'&k='+Ben.k);
 const C=await L.phone('cy',{w:390,h:844});await C.go('room.html?l='+id+'#as='+Cy.id+'&k='+Cy.k);
 await sleep(4000);
 await tab(A,'my');const hasA=await waitFor(()=>A.page.$('#autodraft'),8000);ok('Ana: My Team shows the Auto-draft me toggle in the lobby',!!hasA);
 await A.shot(SH+'_myteam_toggle_1280');await click(A,'#autodraft');
 const pa=await waitFor(async()=>{const p=await gj(K.pref(Ana.id));return p&&p.auto===true?p:null},8000);ok('Ana ON saved to her league pref doc',!!pa,pa);
 await sleep(1200);await A.shot(SH+'_myteam_toggle_on_1280');
 /* Cy (not commissioner) on Ana's My Team: no toggle; a forged toggle is rejected */
 await tab(C,'my');await C.page.evaluate(mid=>{const b=document.querySelector('[data-a="vo"][data-m="'+mid+'"]');if(b)b.click()},Ana.id);await sleep(600);
 ok('Cy sees no Auto-draft toggle on Ana\'s My Team',!(await C.page.$('#autodraft')));
 await C.page.evaluate(mid=>{const i=document.createElement('input');i.type='checkbox';i.dataset.a='autodraft';i.dataset.m=mid;i.checked=false;document.body.appendChild(i);i.click()},Ana.id);await sleep(2500);
 const pa2=await gj(K.pref(Ana.id));ok('Cy\'s forged toggle of Ana is rejected (pref unchanged, toast)',pa2&&pa2.auto===true&&(await C.page.evaluate(()=>window.__toasts.join('|'))).includes('only change your own'),{pa2});
 /* Ben (commissioner) turns Dee ON from Dee's My Team */
 await tab(B,'my');await B.page.evaluate(mid=>{const b=document.querySelector('[data-a="vo"][data-m="'+mid+'"]');if(b)b.click()},Dee.id);await sleep(600);
 ok('commissioner sees the toggle on Dee\'s My Team',!!(await B.page.$('#autodraft')));await click(B,'#autodraft');
 const pd=await waitFor(async()=>{const p=await gj(K.pref(Dee.id));return p&&p.auto===true?p:null},8000);ok('commissioner turned Dee ON',!!pd,pd);
 /* Cy turns own ON (turned OFF later mid-draft) */
 await C.page.evaluate(()=>{const b=document.querySelector('.opills [data-a="vo"]');});await tab(C,'board');await tab(C,'my');
 await C.page.evaluate(mid=>{const b=document.querySelector('[data-a="vo"][data-m="'+mid+'"]');if(b)b.click()},Cy.id);await sleep(500);await click(C,'#autodraft');
 await waitFor(async()=>{const p=await gj(K.pref(Cy.id));return p&&p.auto},8000);
 await tab(C,'board');const badge=await waitFor(async()=>{const t=await C.page.evaluate(()=>[...document.querySelectorAll('#orderlist .mrow')].map(r=>r.innerText).join('\n'));return new RegExp((Ana.teamName||Ana.team||'Aces')+'[^\\n]*AUTO').test(t.replace(/\n(?!\d)/g,' '))&&t.includes('AUTO')?t:null},22000,500);
 ok('Cy sees the 🤖 AUTO badge in the lobby order list (team name on top, s28)',!!badge);await C.shot(SH+'_lobby_auto_390');
 await B.page.setViewport({width:1280,height:900});await tab(B,'board');await sleep(1500);await B.shot(SH+'_lobby_auto_1280');await B.page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 /* Ana's device goes offline */
 await A.close();
 /* start: countdown -> grid; pick 1 = Ana (auto) */
 const live=await waitFor(async()=>{const m=await gj(K.meta);return m.status==='live'?m:null},70000,250);ok('auto-start at the start time',!!live);
 const grid=await waitFor(()=>C.page.$('table.board'),15000);ok('Cy: countdown switched to the board grid',!!grid);
 const e1=await waitFor(()=>pick(1),15000,100);ok('pick 1 (Ana, device closed) auto-picked by the other phones, ~2 s after start',!!e1&&e1.owner===Ana.id&&e1.by==='auto'&&e1.ts-live.startedAt>=1500&&e1.ts-live.startedAt<=7000,{d:e1&&e1.ts-live.startedAt});
 /* pick 2 Ben manual (by clock? he is a human not auto: clock 30s). Make it now via the UI pick for speed: let the clock run instead */
 const e2=await waitFor(()=>pick(2),45000,50);
 await post(K.pref(Cy.id),Object.assign(await gj(K.pref(Cy.id)),{auto:false,v:99}));const tOff=Date.now();
 ok('pick 2 (Ben, OFF) waited for the clock',!!e2&&e2.ts-e1.ts>=25000,{d:e2&&e2.ts-e1.ts});
 await sleep(7000);ok('pick 3 (Cy turned OFF as the turn began): the pending fast pick is cancelled',!(await pick(3)));
 const e3=await waitFor(()=>pick(3),45000,100);ok('pick 3 then goes at the clock',!!e3&&e3.ts-e2.ts>=25000,{d:e3&&e3.ts-e2.ts});
 const e4=await waitFor(()=>pick(4),10000,100);ok('pick 4 (Dee, set by the commissioner) fast',!!e4&&e4.by==='auto'&&e4.ts-e3.ts<=6000,{d:e4&&e4.ts-e3.ts});
 await B.page.setViewport({width:1280,height:900});await tab(B,'board');await sleep(1500);await B.shot(SH+'_middraft_1280');await B.page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await C.shot(SH+'_middraft_390');
 /* undo pick 4 */
 await tab(B,'more');await click(B,'#undobtn');await waitFor(()=>B.page.$('#cfyes'),6000);await B.page.$eval('#cfyes',e=>e.click());const tU=Date.now();
 const back=await waitFor(async()=>/Pick #4/.test(await banner(C)),10000);const hold=await waitFor(async()=>/Auto re-pick in \d+s/.test(await banner(C))?await banner(C):null,6000);
 ok('after Undo: slot 4 waits, countdown shown',!!back&&!!hold,hold&&hold.match(/Auto re-pick in \d+s/)[0]);await C.shot(SH+'_undo_hold_390');
 await sleep(3000);await click(B,'#pausebtn');const pz=await waitFor(async()=>(await gj(K.meta)).paused,8000);ok('paused during the hold',!!pz);
 await sleep(14000);const m4=await gj(K.meta);const x4=await pick(4);ok('paused: no re-pick (slot still the voided entry)',!x4||m4.voided.includes(x4.id),x4&&x4.id);
 await click(B,'#pausebtn');const rz=await waitFor(async()=>{const m=await gj(K.meta);return !m.paused?m:null},8000);
 const r4=await waitFor(async()=>{const e=await pick(4);const m=await gj(K.meta);return e&&!m.voided.includes(e.id)?e:null},25000,200);
 ok('after resume the re-pick lands after the 10 s hold, with a new id',!!r4&&r4.ts-rz.resumeAt>=9500&&r4.id!==e4.id,{d:r4&&r4.ts-rz.resumeAt,id:r4&&r4.id});
 /* pause with Eli on the clock, Eli turns ON while paused */
 await sleep(1500);await click(B,'#pausebtn');await waitFor(async()=>(await gj(K.meta)).paused,8000);
 await post(K.pref(Eli.id),{queue:[],auto:true,v:5});await sleep(9000);ok('paused: Eli (auto ON) is not picked',!(await pick(5)));
 await click(B,'#pausebtn');const rz2=await waitFor(async()=>{const m=await gj(K.meta);return !m.paused?m:null},8000);
 const e5=await waitFor(()=>pick(5),15000,100);ok('resume: Eli fast-picked',!!e5&&e5.by==='auto'&&e5.ts-rz2.resumeAt<=8000,{d:e5&&rz2&&e5.ts-rz2.resumeAt});
 /* s26c8b reload/resume: Undo pick 5 (Eli, auto), reload Cy mid-hold, the hold + countdown survive the reload; re-pick after 10 s; a fresh Ana device shows her switch ON */
 await sleep(1500);await tab(B,'more');await click(B,'#undobtn');await waitFor(()=>B.page.$('#cfyes'),6000);await B.page.$eval('#cfyes',e=>e.click());
 const mu=await waitFor(async()=>{const m=await gj(K.meta);return m.voided.includes(e5.id)?m:null},8000,100);
 await C.page.reload({waitUntil:'domcontentloaded'});
 const hold2=await waitFor(async()=>{const b=await banner(C);const m=b.match(/Auto re-pick in (\d+)s/);return m?+m[1]:null},8000,150);
 ok('reload during the undo hold: countdown resumes (<=10 s, not restarted)',!!mu&&hold2>0&&hold2<=10&&!(await pick(5)&&!(await gj(K.meta)).voided.includes((await pick(5)).id)),{hold2});
 const hb=await waitFor(async()=>{await tab(C,'board');const t=await C.page.evaluate(()=>[...document.querySelectorAll('table.board th')].map(x=>x.innerText).join('|'));return /AUTO/.test(t)?t:null},10000,500);ok('after reload Cy sees AUTO badges on the board header',!!hb);
 const r5=await waitFor(async()=>{const e=await pick(5);const m=await gj(K.meta);return e&&!m.voided.includes(e.id)?e:null},25000,200);
 ok('after reload the re-pick lands after the 10 s hold, with a u-suffixed id, once',!!r5&&r5.ts-mu.resumeAt>=9500&&r5.ts-mu.resumeAt<=16000&&r5.id!==e5.id&&/u\d/.test(r5.id),{d:r5&&r5.ts-mu.resumeAt,id:r5&&r5.id});
 const A2=await L.phone('ana2',{w:390,h:844});await A2.go('room.html?l='+id+'#as='+Ana.id+'&k='+Ana.k);await sleep(3000);await tab(A2,'my');
 const ck=await waitFor(()=>A2.page.evaluate(()=>{const i=document.getElementById('autodraft');return i?String(i.checked):null}),10000);ok('fresh Ana device (resume): Auto-draft switch still ON',ck==='true',ck);
 ok('no page errors on the resumed devices',!A2.errs.length,A2.errs);await A2.close();
 const fin=F.deriveState(await gj(K.meta),Object.fromEntries(await Promise.all([1,2,3,4,5].map(async k=>[k,await gj(K.pick(M0.epoch,k))]))),{},null);
 ok('board: 5 picks, all distinct',fin.picks.length===5&&new Set(fin.picks.map(p=>p.tid)).size===5);
 ok('no page errors',!B.errs.length&&!C.errs.length,B.errs.concat(C.errs));await B.close();await C.close();
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
await L.close().catch(()=>{});console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
