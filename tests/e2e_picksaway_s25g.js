/* s25-full (Paul via NCAA): "You're N picks away" sits on its own line in the On the clock card: accent yellow, bold, >= 1.2x body text; 1 away reads "You're up next!";
   your own turn keeps "You're on the clock". Real draft at 390 and 1280. OUT=<dir> TAG=before|after for screenshots. node tests/e2e_picksaway_s25g.js */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const OUT=process.env.OUT,TAG=process.env.TAG||'';const CHECK=!process.env.SHOTS_ONLY;
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const raw=async k=>(await (await fetch(API+encodeURIComponent(k))).text());
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
(async()=>{try{if(OUT)require('fs').mkdirSync(OUT,{recursive:true});
 const id=await seed(API,{managers:8,rounds:6,live:true,clockSecs:null,picksMade:3});const I=seed.info;const meta=F.parseJ(await raw(F.Keys(id).meta));
 const ow=k=>{const sl=F.slotAt(meta.order,k,meta.settings.type,meta.settings.rounds);return I.managers.find(m=>m.id===sl.owner)};
 for(const [w,h] of [[390,844],[1280,800]])for(const [lab,k] of [['3away',7],['1away',5],['myturn',4]]){const opt=w>700?{desktop:true,w,h}:{w,h};const me=ow(k);
  const P=await L.phone('pa'+w+lab,opt);await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await waitFor(()=>P.page.$('#oncard'),25000);await sleep(1500);
  if(OUT)await P.page.screenshot({path:`${OUT}/${TAG?TAG+'_':''}${lab}_${w}.png`});
  if(CHECK){const r=await P.page.evaluate(()=>{const a=document.querySelector('#oncard .away-big');const body=parseFloat(getComputedStyle(document.body).fontSize);const acc=getComputedStyle(document.documentElement).getPropertyValue('--acc').trim();
    const probe=document.createElement('span');probe.style.color=acc;document.body.appendChild(probe);const accRgb=getComputedStyle(probe).color;probe.remove();
    const sub=document.querySelector('#oncard small, #oncard .sub');return{txt:a?a.textContent.trim():null,color:a?getComputedStyle(a).color:null,accRgb,fs:a?parseFloat(getComputedStyle(a).fontSize):0,body,fw:a?+getComputedStyle(a).fontWeight:0,
     own:a?a.parentElement&&getComputedStyle(a).display!=='inline':false,card:document.querySelector('#oncard').innerText}});
   if(lab==='myturn')ok(w+'px your turn: no picks-away line, "You\'re on the clock" kept',!r.txt&&/on the clock|Make your pick/i.test(r.card),r);
   else{const want=lab==='1away'?"You're up next!":"You're 3 picks away";ok(w+'px '+lab+': own line reads "'+want+'"',r.txt===want&&r.own,r);
    ok(w+'px '+lab+': accent yellow, bold, font-size >= 1.2x body',r.color===r.accRgb&&r.fw>=700&&r.fs>=1.2*r.body,r);
    ok(w+'px '+lab+': the sub line no longer carries the picks-away text',!/picks away|up next/i.test(r.card.replace(r.txt,'')),r.card)}}
  await P.close()}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
