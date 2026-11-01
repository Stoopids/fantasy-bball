/* s28 (a)+(b): with TEAM_NAME_ON_TOP the Online chips, the on-the-clock banner and the pick cards (pick sheet header, confirm, taken label) show the TEAM name on top; at 390 the top-bar pill shows only the team name (1280 keeps ' · real name'). APP/API env, SHOTDIR. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const SD=process.env.SHOTDIR||'/tmp';
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
(async()=>{try{for(const w of [390,1280]){
 const id=await seed(API,{managers:8,rounds:4,live:true,clockSecs:90,picksMade:1});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);
 const on=I.managers.find(x=>x.id===m.order[1]),other=I.managers.find(x=>x.id===m.order[3]);const prof=async x=>(await gj(K.mgr(x.id)))||{};const po=await prof(on),pt=await prof(other);
 const ph=async(x,frag)=>{const P=await L.phone(x.id+w,w>700?{desktop:true,w,h:900}:{});await P.page.setBypassServiceWorker(true);await P.page.evaluateOnNewDocument((id,mm)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:mm.id,k:mm.k}))},id,x);await P.go('room.html?l='+id+'&stay=1'+(frag||''));return P};
 const A=await ph(on),B=await ph(other,'#cm='+I.cmSecret);await sleep(5000);for(let t=0;t<40;t++){const x=await B.page.evaluate(()=>[...document.querySelectorAll('#presence .pc span:not(.tag)')].map(e=>e.textContent));if(x.includes(po.team))break;await sleep(1000)}
 const r=await B.page.evaluate(()=>({pres:[...document.querySelectorAll('#presence .pc span:not(.tag)')].map(e=>e.textContent),nm:(document.querySelector('#oncard .nm')||{}).textContent,sub:(document.querySelector('#oncard .nbsub')||{}).textContent,whonm:(document.querySelector('#who .whonm')||{}).textContent,whosub:(()=>{const e=document.querySelector('#who .whosub');return e?getComputedStyle(e).display!=='none':null})()}));
 ok(w+': Online chips show team names',r.pres.length>0&&r.pres.includes(po.team)&&!r.pres.includes(po.name),r);
 ok(w+': on-the-clock banner: team on top, real name under',r.nm&&r.nm.indexOf(po.team)===0&&r.sub===po.name,r);
 ok(w+': top pill shows the team name',r.whonm===pt.team,r);ok(w+(w===390?': top pill hides the real name':': top pill keeps the real name'),w===390?r.whosub===false:r.whosub===true,r);
 const ra=await A.page.evaluate(()=>(document.querySelector('#oncard .nm')||{}).textContent);ok(w+': own banner says Make your pick, <team>',/Make your pick, /.test(ra)&&ra.indexOf(po.team)>0,ra);
 await B.page.screenshot({path:SD+'/s28_teamtop_'+w+'.png'});
 /* commissioner pick sheet: 'Picking for <team>'; Teams taken label uses the team name */
 await sleep(2500);await B.page.evaluate(()=>{const b=document.querySelector('[data-a=popen]');if(b)b.click()});await sleep(1200);
 const hd=await B.page.evaluate(()=>{const h=document.querySelector('#pickov .phead b');return h?h.textContent:null});ok(w+': pick sheet header: Picking for <team>',hd==='Picking for '+po.team,{hd,team:po.team});
 await B.page.evaluate(()=>{const t=document.querySelector('#pickov .tq input,#tqP');if(t){t.value='';}});await B.page.screenshot({path:SD+'/s28_teamtop_sheet_'+w+'.png'});
 for(const P of [A,B]){ok(w+' '+P.name+': no page errors',!P.errs.length,P.errs);await P.close()}}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
 await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed');process.exit(bad?1:0)})();
