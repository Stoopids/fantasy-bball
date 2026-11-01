/* s26c13: Rules before the draft. league.html?l=<code>#rules (Draft Room lobby 'League Rules' button) renders the league rules (settings + scoring + house rules)
   with no rosters: live draft with 0 picks and with 10 picks. Rules tab current, hash kept, identity (fbn.me.<code>) kept, no page errors, no 'Available after
   the draft', no 'Test ' prefix, no money words, no overflow, taps >= 44px at 320/390/1280. SHOTS=dir -> rules-pre-<w>.png (390, 1280) */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const path=require('path');
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
const MONEY=/\$|\b(money|cash|dollars?|wager|betting|gambl\w*|odds|payout|stake)\b/i;
(async()=>{try{
  const leagues=[];for(const pm of [0,10]){const id=await seed(null,{live:true,picksMade:pm,name:'Test Hoops',clockSecs:60});leagues.push([id,seed.info,pm])}
  for(const [id,info,pm] of leagues)for(const w of [320,390,1280]){
    const P=await L.phone('pr'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:w>=760?900:844,now:'2026-11-15T12:00'});
    await P.page.evaluateOnNewDocument((id,me)=>{if(!localStorage.getItem('fbn.me.'+id))localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[1].id,k:info.managers[1].k});
    await P.page.setBypassServiceWorker(true);await P.go('league.html?l='+id+'#rules');await P.page.waitForSelector('#presettings',{timeout:25000});await L.sleep(500);
    const r=await P.page.evaluate(id=>{const R=e=>e.getBoundingClientRect();const tap=[...document.querySelectorAll('#ltabs a,#lbody a,#lbody button')].filter(e=>R(e).width>0);
      return{hash:location.hash,q:location.search,cur:[...document.querySelectorAll('#ltabs a[aria-current=page]')].map(a=>a.dataset.v).join(),tabs:[...document.querySelectorAll('#ltabs a')].map(a=>a.dataset.v).join(),
        sc:document.querySelectorAll('#lbody .card.sc tr').length,set:document.getElementById('presettings').innerText,me:localStorage.getItem('fbn.me.'+id),
        sw:document.documentElement.scrollWidth,iw:innerWidth,small:tap.filter(e=>R(e).height<44||R(e).width<44).map(e=>(e.id||e.className)+':'+Math.round(R(e).width)+'x'+Math.round(R(e).height)),txt:document.body.innerText}},id);
    const tag=w+'px pre-draft ('+pm+' picks) #rules';
    ok(tag+': Rules tab current, hash #rules kept, league code kept in the URL',r.cur==='rules'&&r.hash==='#rules'&&new URLSearchParams(r.q).get('l')===id&&r.tabs==='rules,recap,draft',r);
    ok(tag+': league settings + scoring table + house rules shown (no rosters needed)',/Managers: 8/.test(r.set)&&/Rounds:/.test(r.set)&&/Pick clock: 60 s/.test(r.set)&&/Redraft: January 20, 2027/.test(r.set)&&r.sc>=9&&/House interpretations/.test(r.txt)&&/League rules/.test(r.txt),{set:r.set,sc:r.sc});
    ok(tag+': no "Available after the draft", no "Test " prefix, no money words',!/Available after the draft/.test(r.txt)&&!/\bTest Hoops\b/.test(r.txt)&&!MONEY.test(r.txt));
    ok(tag+': identity kept (fbn.me.<code>)',!!r.me&&JSON.parse(r.me).mid===info.managers[1].id);
    ok(tag+': no overflow, taps >= 44px',r.sw<=r.iw&&!r.small.length,{sw:r.sw,iw:r.iw,small:r.small});
    ok(tag+': no page errors',!P.errs.length,P.errs);
    if(process.env.SHOTS&&pm===10&&w!==320)await P.page.screenshot({path:path.join(process.env.SHOTS,'rules-pre-'+w+'.png'),fullPage:true});
    await P.page.evaluate(()=>document.querySelector('#ltabs a[data-v=draft]').click());await P.page.waitForSelector('#godraft',{timeout:5000}).catch(()=>{});
    ok(tag+': Draft tab still works from Rules',await P.page.evaluate(()=>!!document.getElementById('godraft')));await P.close()}
}catch(e){bad++;console.log('FAIL  crashed',e)}await L.close();console.log('\n'+(n-bad)+'/'+n+' passed');process.exit(bad?1:0)})();
