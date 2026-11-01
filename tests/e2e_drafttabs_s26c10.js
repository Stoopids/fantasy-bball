/* s26c10: 📝 Draft and 🎓 Recap tabs. Draft before the draft is complete (live mock draft, 10 picks): one 'Go to draft room' link to room.html with ?l=<code>,
   no pick board. Draft after the draft (completed time set AND all picks made): pick board only, round by round, every pick with manager + school, no room link;
   all picks made but no completed time -> still the big button. Recap (before and after): quiet 'Draft room →' link at the bottom (league code, >= 44px). Recap: grade cards (A+ to D) on top,
   weekly placeholder 'First recap coming after opening week', exactly one Recap tab, old routes (#power, #draftrecap) open it, footer link goes to the tab.
   No 'Test ' prefix shown, no money words, no overflow, taps >= 44px at 320/390/1280.  APP / API env (mock store). SHOTS=dir -> draft-pre/draft-post/recap-<w>.png */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const path=require('path');
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
const MONEY=/\$|\b(money|cash|dollars?|wager|betting|gambl\w*|odds|payout|stake)\b/i;
const metr=()=>{const R=e=>e.getBoundingClientRect();const tap=[...document.querySelectorAll('#ltabs a,#lbody a,#lbody button,#godraft,#back_room')].filter(e=>R(e).width>0&&!e.closest('#powerrank .pchips,.chips,.dps'));
  return{sw:document.documentElement.scrollWidth,iw:innerWidth,small:tap.filter(e=>R(e).height<44||R(e).width<44).map(e=>(e.id||e.className)+':'+Math.round(R(e).width)+'x'+Math.round(R(e).height)).slice(0,6),txt:document.body.innerText}};
async function open(w,id,info,hash){const P=await L.phone('dt'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:w>=760?900:844,now:'2026-11-15T12:00'});
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});
  await P.page.setBypassServiceWorker(true);await P.go('league.html?l='+id+hash);return P}
const rlink=()=>{const a=document.getElementById('recaproom');if(!a)return null;const b=a.getBoundingClientRect(),lb=document.getElementById('lbody');const u=new URL(a.href);return{t:a.textContent.trim(),path:u.pathname,l:u.searchParams.get('l'),h:b.height,w:b.width,last:lb&&[...lb.querySelectorAll('a')].pop()===a}};
const shot=async(P,f)=>{if(process.env.SHOTS)await P.page.screenshot({path:path.join(process.env.SHOTS,f+'.png'),fullPage:true})};
(async()=>{try{
  const pre=await seed(null,{live:true,picksMade:10,name:'Test Hoops'});const preI=seed.info;
  const post=await seed(null,{rounds:8,name:'Test Hoops'});const postI=seed.info;
  const noAt=await seed(null,{live:true,rounds:6,picksMade:48,name:'Test Hoops'});const noAtI=seed.info;
  for(const w of [320,390,1280]){
    let P=await open(w,pre,preI,'#draft');await P.page.waitForSelector('#godraft',{timeout:25000});await L.sleep(500);
    let r=await P.page.evaluate(()=>{const a=document.getElementById('godraft');const u=new URL(a.href);return{t:a.textContent.trim(),path:u.pathname,l:u.searchParams.get('l'),n:document.querySelectorAll('#godraft').length,board:!!document.querySelector('.dround'),tab:[...document.querySelectorAll('#ltabs a[aria-current=page]')].map(x=>x.dataset.v)}});Object.assign(r,await P.page.evaluate(metr));
    ok(w+' pre: one big "Go to draft room" link to the room with the league code',r.n===1&&r.t==='Go to draft room'&&/room\.html$/.test(r.path)&&r.l===pre,r);
    ok(w+' pre: Draft tab current, no pick board',r.tab.join()==='draft'&&!r.board,r);
    ok(w+' pre: no overflow, taps >= 44px',r.sw<=r.iw&&!r.small.length,{sw:r.sw,iw:r.iw,small:r.small});
    if(w!==320)await shot(P,'draft-pre-'+w);
    await P.page.evaluate(()=>document.querySelector('#ltabs a[data-v=recap]').click());await P.page.waitForSelector('#weeklyempty',{timeout:5000}).catch(()=>{});await L.sleep(300);
    r=await P.page.evaluate(rlink);const r2=await P.page.evaluate(()=>({h:location.hash,wk:(document.getElementById('weeklyempty')||{}).innerText,cur:[...document.querySelectorAll('#ltabs a[aria-current=page]')].map(x=>x.dataset.v).join()}));Object.assign(r2,await P.page.evaluate(metr));
    ok(w+' pre recap: #recap, weekly placeholder, quiet "Draft room →" link last with the league code, >= 44px',r2.h==='#recap'&&r2.cur==='recap'&&r2.wk==='First recap coming after opening week'&&r&&r.t==='Draft room →'&&/room\.html$/.test(r.path)&&r.l===pre&&r.h>=44&&r.w>=44&&r.last,{r,h:r2.h,cur:r2.cur,wk:r2.wk});
    ok(w+' pre recap: no overflow, taps >= 44px',r2.sw<=r2.iw&&!r2.small.length,{small:r2.small});
    if(w===390||w===1280)await shot(P,'recap-pre-'+w);ok(w+' pre: no page errors',!P.errs.length,P.errs);await P.close();
    P=await open(w,noAt,noAtI,'#draft');await P.page.waitForSelector('#godraft',{timeout:25000}).catch(()=>{});await L.sleep(500);
    r=await P.page.evaluate(()=>({btn:!!document.getElementById('godraft'),board:!!document.querySelector('.dround')}));ok(w+' all picks made but no completed time: big button, no board',r.btn&&!r.board,r);await P.close();
    P=await open(w,post,postI,'#draft');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(800);
    r=await P.page.evaluate(()=>{const rs=[...document.querySelectorAll('.dround')];return{rounds:rs.length,per:rs.map(x=>x.querySelectorAll('.dpick').length),
      empty:[...document.querySelectorAll('.dpick')].filter(p=>!p.querySelector('.dpm').textContent.trim()||!p.querySelector('.dps').textContent.trim()).length,
      first:document.querySelector('.dpick')&&document.querySelector('.dpick').innerText,room:[...document.querySelectorAll('#lbody a')].filter(x=>/room\.html/.test(x.href)).length,pre:!!document.getElementById('godraft'),
      tabs:[...document.querySelectorAll('#ltabs a')].map(x=>x.dataset.v),recapTabs:document.querySelectorAll('#ltabs a[data-v=recap]').length}});Object.assign(r,await P.page.evaluate(metr));
    ok(w+' post: 8 rounds x 8 picks, each with manager and school',r.rounds===8&&r.per.every(x=>x===8)&&r.empty===0,r);
    ok(w+' post: pick board only: no draft room link, no big button',r.room===0&&!r.pre,r);
    ok(w+' post: exactly one Recap tab, Draft tab last',r.recapTabs===1&&r.tabs[r.tabs.length-1]==='draft',r.tabs);
    ok(w+' post: no "Test " prefix, no money words',!/\bTest\s/.test(r.txt)&&!MONEY.test(r.txt.replace(/Bets/g,'')),r.txt.match(MONEY));
    ok(w+' post: no overflow, taps >= 44px',r.sw<=r.iw&&!r.small.length,{sw:r.sw,iw:r.iw,small:r.small});
    if(w!==320)await shot(P,'draft-post-'+w);
    await P.page.evaluate(()=>document.querySelector('#ltabs a[data-v=recap]').click());await P.page.waitForSelector('#powerrank .pcard, #powerrank [class*=grade], #prempty',{timeout:15000}).catch(()=>{});await L.sleep(1200);
    r=await P.page.evaluate(()=>{const g=document.getElementById('recapgrades'),wk=document.getElementById('weeklyempty');return{hash:location.hash,cards:document.querySelectorAll('#powerrank .pcard,#powerrank li,#powerrank article').length,
      grades:(g.innerText.match(/\b(A\+|A-?|B[+-]?|C[+-]?|D[+-]?)\b/g)||[]).length,order:g&&wk&&(g.compareDocumentPosition(wk)&Node.DOCUMENT_POSITION_FOLLOWING)>0,wk:wk&&wk.innerText.trim(),rl:(()=>{const a=document.getElementById('recaproom');if(!a)return null;const b=a.getBoundingClientRect();return{t:a.textContent.trim(),l:new URL(a.href).searchParams.get('l'),p:new URL(a.href).pathname,h:b.height,w:b.width,last:[...document.querySelectorAll('#lbody a')].pop()===a}})(),short:document.querySelector('#ltabs a[data-v=recap] .nl.s').textContent}});Object.assign(r,await P.page.evaluate(metr));
    ok(w+' recap: #recap route, grade cards on top, weekly placeholder below',r.hash==='#recap'&&r.grades>=8&&r.order&&r.wk==='First recap coming after opening week',{h:r.hash,g:r.grades,o:r.order,wk:r.wk});
    ok(w+' recap: quiet "Draft room →" link at the bottom, league code, >= 44px',r.rl&&r.rl.t==='Draft room →'&&r.rl.l===post&&/room\.html$/.test(r.rl.p)&&r.rl.h>=44&&r.rl.w>=44&&r.rl.last,r.rl);
    ok(w+' recap: phone label Recap',r.short==='Recap',r.short);
    ok(w+' recap: no "Test " prefix, no money words',!/\bTest\s/.test(r.txt)&&!MONEY.test(r.txt.replace(/Bets/g,'')),r.txt.match(MONEY)||r.txt.match(/\bTest\s\S+/g));
    ok(w+' recap: no overflow, taps >= 44px',r.sw<=r.iw&&!r.small.length,{sw:r.sw,iw:r.iw,small:r.small});
    if(w!==320)await shot(P,'recap-'+w);ok(w+' post: no page errors',!P.errs.length,P.errs);await P.close()}
  for(const h of ['#power','#draftrecap']){const P=await open(390,post,postI,h);await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(500);
    const r=await P.page.evaluate(()=>({cur:document.querySelector('#ltabs a[aria-current=page]').dataset.v,wk:!!document.getElementById('weeklyempty')}));ok('old route '+h+' opens the Recap tab',r.cur==='recap'&&r.wk,r);await P.close()}
  {const P=await open(390,post,postI,'#standings');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(500);
    await P.page.evaluate(()=>document.getElementById('tab_recap').click());await L.sleep(500);const r=await P.page.evaluate(()=>({cur:document.querySelector('#ltabs a[aria-current=page]').dataset.v,h:location.hash,nore:![...document.querySelectorAll('a')].some(a=>/recap\.html/.test(a.href))}));
    ok('footer Draft recap link opens the Recap tab; no link to recap.html left on the League site',r.cur==='recap'&&r.h==='#recap'&&r.nore,r);await P.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
