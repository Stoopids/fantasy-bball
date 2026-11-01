/* s26c16d: seat sound cues (s28: 10 s cue is now 1 beep a second; see e2e_beep_s28.js). AudioContext stubbed (counts oscillator starts = beeps). 3 on the clock, 2 at 30 s, 1 at 10 s; other seats silent; mute; no repeat after reload. Mock store only. APP/API env. */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;
let n=0,bad=0;const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const STUB=()=>{window.__osc=0;class A{constructor(){this.state='running';this.currentTime=0;this.destination={}}resume(){return Promise.resolve()}createGain(){return{gain:{value:0},connect(){}}}createOscillator(){return{type:'',frequency:{value:0},connect(){},start(){window.__osc++},stop(){}}}}window.AudioContext=A;window.webkitAudioContext=A};
async function open(id,m,opt){opt=opt||{};const P=await L.phone(opt.name||'p',opt.desk?{desktop:true,w:1280,h:900}:{});await P.page.setBypassServiceWorker(true);await P.page.evaluateOnNewDocument(STUB);
  await P.page.evaluateOnNewDocument((id,m,mute)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:m.id,k:m.k}));if(mute)localStorage.setItem('fbn.beepMute','1')},id,m,!!opt.mute);
  await P.go('room.html?l='+id+'&stay=1'+(opt.hash||''));return P}
const cnt=P=>P.page.evaluate(()=>window.__osc).catch(()=>-1);
const rem=P=>P.page.evaluate(()=>{const e=document.getElementById('cdv');if(!e)return null;const [m,s]=e.firstChild.nodeValue.split(':');return +m*60+ +s}).catch(()=>null);
const until=async(P,f,ms)=>{for(let t=0;t<ms;t+=250){const r=await rem(P);if(r!=null&&f(r))return r;await sleep(250)}return null};
(async()=>{try{
  const id=await seed(null,{rounds:8,live:true,picksMade:0,clockSecs:50});const ms=seed.info.managers;
  const A=await open(id,ms[0],{name:'onclock'});const B=await open(id,ms[1],{name:'other'});const C=await open(id,ms[0],{name:'muted',mute:true});
  await sleep(5000);
  ok('on-clock seat: 3 beeps when the seat goes on the clock',await cnt(A)===3,await cnt(A));
  ok('other seat: no beeps',await cnt(B)===0,await cnt(B));
  ok('muted (fbn.beepMute=1): no beeps',await cnt(C)===0,await cnt(C));
  await A.page.reload({waitUntil:'domcontentloaded'});await sleep(3500);
  ok('reload with the same pick on the clock: no repeat',await cnt(A)===0,await cnt(A));
  const r30=await until(A,r=>r<=28,40000);await sleep(800);ok('30 s left: 2 beeps (once)',await cnt(A)===2,{c:await cnt(A),r30});
  await sleep(3000);ok('still 2 after 3 s more (no repeat at 30 s)',await cnt(A)===2,await cnt(A));
  const r10=await until(A,r=>r<=8,30000);await sleep(800);ok('s28: 10 s left: 1 beep a second (total 5-6 since reload at ~7 s)',(await cnt(A))>=5&&(await cnt(A))<=6,{c:await cnt(A),r10});
  ok('other seat still silent at 10 s',await cnt(B)===0,await cnt(B));ok('muted still silent',await cnt(C)===0,await cnt(C));
  // fresh page late in the pick: passed thresholds skipped, no burst
  const D=await open(id,ms[0],{name:'late'});await sleep(3000);ok('s28: fresh device late in the pick: 3 (start) + at most 1 a second after, no 30/10 burst',(await cnt(D))>=3&&(await cnt(D))<=6,await cnt(D));
  // toggle UI + shots
  for(const [w,desk] of [[390,false],[1280,true]]){const S=await open(id,ms[2],{name:'shot'+w,desk,hash:'#tab=more'});await sleep(4000);
    const has=await S.page.evaluate(()=>{const e=document.getElementById('beepon');if(!e)return null;e.scrollIntoView({block:'center'});return{checked:e.checked,label:e.closest('label').innerText}});
    ok(w+': Turn sound toggle on More, on by default',has&&has.checked&&/Turn sound/.test(has.label),has);
    await S.page.click('#beepon');await sleep(300);ok(w+': unchecking saves fbn.beepMute=1',await S.page.evaluate(()=>localStorage.getItem('fbn.beepMute'))==='1');
    await S.page.click('#beepon');await sleep(300);ok(w+': re-checking clears it',await S.page.evaluate(()=>localStorage.getItem('fbn.beepMute'))===null);
    await S.page.evaluate(()=>document.getElementById('soundcard').scrollIntoView({block:'center'}));await sleep(300);
    await S.page.screenshot({path:(process.env.SHOTDIR||'/tmp')+'/beep_toggle_'+w+'.png'});ok(w+': no page errors',!S.errs.length,S.errs);await S.close()}
  for(const P of [A,B,C,D])ok(P.name+': no page errors',!P.errs.length,P.errs);
}catch(e){bad++;console.log('FAIL exception',e&&e.stack)}finally{await L.close();console.log(bad?`${bad} of ${n} FAILED`:`ALL ${n} PASSED`);process.exit(bad?1:0)}})();
