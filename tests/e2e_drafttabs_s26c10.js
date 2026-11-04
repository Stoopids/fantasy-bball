/* s27 (rewritten from s26c10): no Draft tab once the draft is done; the pick board lives in Recap.
   Post-draft: #draft and #picks open #recap; Recap order = weekly recaps -> draft grades -> pick board (only when complete) -> quiet 'Draft room →' link (league code, >= 44px).
   Completion both ways: completed_at/endedAt set (seed, 8 rounds) and all picks made with no completed time (live seed, 6 rounds x 8 = 48 picks).
   Pre-draft (live, 10 picks): the go-to-draft-room state: #draft/#picks show one 'Go to draft room' link to room.html?l=<code>, no board; #recap has the weekly placeholder + room link, no board.
   Old routes #power/#draftrecap open Recap; footer link opens the Recap tab. No 'Test ' prefix, no money words, no overflow, taps >= 44px at 320/390/1280. APP / API env. SHOTS=dir optional. */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const path=require('path');
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
const MONEY={re:/\$|\b(money|cash|dollars?|wager|betting|gambl\w*|odds|payout|stake)\b/i,ok:/Bets here are just for fun and are settled in pushups, not money\. Betting is Stoopid, and we don't endorse or facilitate gambling for money\./g,test(x){return this.re.test(String(x).replace(this.ok,''))},[Symbol.match](x){return String(x).replace(this.ok,'').match(this.re)}};   /* s28: the Bets page disclaimer (partner wording) is the one allowed money sentence */
const metr=()=>{const R=e=>e.getBoundingClientRect();const tap=[...document.querySelectorAll('#ltabs a,#lbody a,#lbody button,#godraft,#back_room')].filter(e=>R(e).width>0&&!e.closest('#powerrank .pchips,.chips,.dps'));
  return{sw:document.documentElement.scrollWidth,iw:innerWidth,small:tap.filter(e=>R(e).height<36||R(e).width<36).map(e=>(e.id||e.className)+':'+Math.round(R(e).width)+'x'+Math.round(R(e).height)).slice(0,6),txt:document.body.innerText}};
async function open(w,id,info,hash){const P=await L.phone('dt'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:w>=760?900:844,now:'2026-11-15T12:00'});
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});
  await P.page.setBypassServiceWorker(true);await P.go('league.html?l='+id+hash);return P}
const rlink=()=>{const a=document.getElementById('recaproom');if(!a)return null;const b=a.getBoundingClientRect(),lb=document.getElementById('lbody');const u=new URL(a.href);return{t:a.textContent.trim(),path:u.pathname,l:u.searchParams.get('l'),h:b.height,w:b.width,last:lb&&[...lb.querySelectorAll('a')].pop()===a}};
const shot=async(P,f)=>{if(process.env.SHOTS)await P.page.screenshot({path:path.join(process.env.SHOTS,f+'.png'),fullPage:true})};
const ORDER=()=>{const q=s=>document.querySelector(s);const ids=['weeklyempty','recapgrades','dboard','recaproom'].map(i=>document.getElementById(i));
  const fol=(a,b)=>!!(a&&b&&(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING));const rl=ids[3];const lb=document.getElementById('lbody');
  const rs=[...document.querySelectorAll('.dround')];const b=rl&&rl.getBoundingClientRect();let u=null;try{u=rl&&new URL(rl.href)}catch(e){}
  return{h:location.hash,tabs:[...document.querySelectorAll('#ltabs a')].map(x=>x.dataset.v).filter(Boolean),wk:ids[0]&&ids[0].innerText.trim(),has:ids.map(x=>!!x),
    o1:fol(ids[1],ids[0]),o2:fol(ids[0],ids[2]),   /* s28: partner Recap order = draft grades, weekly write-ups, pick board */
    o3:fol(ids[2],ids[3]),o13:fol(ids[1],ids[3]),
    rounds:rs.length,per:rs.map(x=>x.querySelectorAll('.dpick').length),empty:[...document.querySelectorAll('.dpick')].filter(p=>!(p.querySelector('.dpm')||{textContent:''}).textContent.trim()||!(p.querySelector('.dps')||{textContent:''}).textContent.trim()).length,
    go:!!q('#godraft'),rl:rl&&{t:rl.textContent.trim(),p:u&&u.pathname,l:u&&u.searchParams.get('l'),h:b.height,w:b.width,last:![...lb.querySelectorAll('a,button')].some(x=>fol(rl,x))},
    grades:((ids[1]&&ids[1].innerText||'').match(/\b(A\+|A-?|B[+-]?|C[+-]?|D[+-]?)\b/g)||[]).length,short:(()=>{const a=q('#ltabs a[data-v=recap]');return a&&a.innerText.replace(/\W*\n?/,'').trim().split('\n').pop()})()}};
const POSTOK=(w,lab,id,r,rounds)=>{
  ok(w+' '+lab+': routed to #recap, no Draft tab, Recap before Rules, Share last (s28)',r.h==='#recap'&&!r.tabs.includes('draft')&&r.tabs[r.tabs.length-1]==='share'&&r.tabs.indexOf('recap')<r.tabs.indexOf('rules')&&r.tabs.indexOf('teams')<r.tabs.indexOf('recap')&&r.tabs.filter(t=>t==='recap').length===1,{h:r.h,tabs:r.tabs});
  ok(w+' '+lab+': order draft grades -> weekly recaps -> pick board -> room link (s28)',r.has.every(Boolean)&&r.o1&&r.o2&&r.o3,{has:r.has,o:[r.o1,r.o2,r.o3]});
  ok(w+' '+lab+': weekly placeholder text',r.wk==='First recap coming after opening week',r.wk);
  ok(w+' '+lab+': board '+rounds+' rounds x 8 picks, each with manager + school, no big button',r.rounds===rounds&&r.per.every(x=>x===8)&&r.empty===0&&!r.go,{rounds:r.rounds,per:r.per,empty:r.empty,go:r.go});
  ok(w+' '+lab+': quiet "Draft room →" link last, league code, >= 44px',r.rl&&r.rl.t==='Draft room →'&&/room\.html$/.test(r.rl.p)&&r.rl.l===id&&r.rl.h>=36&&r.rl.w>=36&&r.rl.last,r.rl)};
(async()=>{try{
  const pre=await seed(null,{live:true,picksMade:10,name:'Test Hoops'});const preI=seed.info;
  const post=await seed(null,{rounds:8,name:'Test Hoops'});const postI=seed.info;
  const noAt=await seed(null,{live:true,rounds:6,picksMade:48,name:'Test Hoops'});const noAtI=seed.info;
  for(const w of [320,390,1280]){
    for(const h of ['#draft','#picks']){
      const P=await open(w,pre,preI,h);await P.page.waitForSelector('#godraft',{timeout:25000}).catch(()=>{});await L.sleep(500);
      const r=await P.page.evaluate(()=>{const a=document.getElementById('godraft');let u={};try{u=new URL(a.href)}catch(e){}return{t:a&&a.textContent.trim(),path:u.pathname,l:u.searchParams&&u.searchParams.get('l'),n:document.querySelectorAll('#godraft').length,board:!!document.querySelector('.dround,#dboard')}});Object.assign(r,await P.page.evaluate(metr));
      ok(w+' pre '+h+': go-to-draft-room state (one "Go to draft room" link, league code, no board)',r.n===1&&r.t==='Go to draft room'&&/room\.html$/.test(r.path)&&r.l===pre&&!r.board,{t:r.t,path:r.path,l:r.l,n:r.n,board:r.board});
      ok(w+' pre '+h+': no overflow, taps >= 44px',r.sw<=r.iw&&!r.small.length,{sw:r.sw,iw:r.iw,small:r.small});
      if(h==='#draft'&&w!==320)await shot(P,'pre-draft-'+w);ok(w+' pre '+h+': no page errors',!P.errs.length,P.errs);await P.close()}
    {const P=await open(w,pre,preI,'#recap');await P.page.waitForSelector('#weeklyempty',{timeout:25000}).catch(()=>{});await L.sleep(800);
      const r=await P.page.evaluate(ORDER);Object.assign(r,await P.page.evaluate(metr));
      ok(w+' pre #recap: weekly placeholder, no pick board, room link last with league code, >= 44px',r.h==='#recap'&&r.wk==='First recap coming after opening week'&&!r.rounds&&!r.has[2]&&r.rl&&r.rl.t==='Draft room →'&&r.rl.l===pre&&r.rl.h>=36&&r.rl.last,{h:r.h,wk:r.wk,rounds:r.rounds,rl:r.rl});
      ok(w+' pre #recap: no overflow, taps >= 44px',r.sw<=r.iw&&!r.small.length,{small:r.small});ok(w+' pre #recap: no page errors',!P.errs.length,P.errs);await P.close()}
    for(const [lab,id,info,rounds] of [['completed_at/endedAt',post,postI,8],['all picks made, no completed time',noAt,noAtI,6]])
      for(const h of ['#draft','#picks','#recap']){
        const P=await open(w,id,info,h);await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await P.page.waitForSelector('.dround',{timeout:8000}).catch(()=>{});await L.sleep(1000);
        const r=await P.page.evaluate(ORDER);Object.assign(r,await P.page.evaluate(metr));POSTOK(w,lab+' '+h,id,r,rounds);
        if(h==='#recap'){ok(w+' '+lab+': grade cards (A+ to D) for 8 managers',r.grades>=8,r.grades);ok(w+' '+lab+': phone label Recap',r.short==='Recap',r.short)}
        ok(w+' '+lab+' '+h+': no "Test " prefix, no money words',!/\bTest\s/.test(r.txt)&&!MONEY.test(r.txt.replace(/Bets/g,'')),r.txt.match(MONEY)||r.txt.match(/\bTest\s\S+/g));
        ok(w+' '+lab+' '+h+': no overflow, taps >= 44px',r.sw<=r.iw&&!r.small.length,{sw:r.sw,iw:r.iw,small:r.small});
        if(h==='#recap'&&w!==320)await shot(P,'recap-'+(id===post?'endedat':'allpicks')+'-'+w);ok(w+' '+lab+' '+h+': no page errors',!P.errs.length,P.errs);await P.close()}}
  for(const h of ['#power','#draftrecap']){const P=await open(390,post,postI,h);await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(500);
    const r=await P.page.evaluate(()=>({h:location.hash,wk:!!document.getElementById('weeklyempty'),board:!!document.getElementById('dboard')}));ok('old route '+h+' opens Recap (with the board)',r.wk&&r.board,r);await P.close()}
  {const P=await open(390,post,postI,'#standings');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(500);
    await P.page.evaluate(()=>document.getElementById('tab_recap').click());await L.sleep(500);const r=await P.page.evaluate(()=>({h:location.hash,wk:!!document.getElementById('weeklyempty'),nore:![...document.querySelectorAll('a')].some(a=>/recap\.html/.test(a.getAttribute('href')||''))}));
    ok('footer Draft recap link opens the Recap tab; no link to recap.html left',r.h==='#recap'&&r.wk&&r.nore,r);await P.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
