/* League site top tabs (s25): link tabs <a data-v> in #ltabs, order Standings, Games, Bets, Rosters, All teams, Postseason, Redraft, Rules, Archive (date-windowed ones only
   when open) + the Draft link last; one tab marked aria-current; taps >= 44px; no overflow at 320 / 390 (and 1280). Clocks: Nov 15, Jan 10, Mar 15.
   (Replaces the old room.html button-tab test; original kept at /workspace/league-site-work/e2e_toptabs.room-original.js.)  APP / API env (mock store). */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;
let n=0,bad=0;function ok(t,c,x){n++;if(c)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
const ALL=['standings','games','bets','rosters','teams','postseason','redraft','rules','archive'];const LAB={standings:'Standings',games:'Games',bets:'Bets',rosters:'Rosters',teams:'All teams',postseason:'Postseason',redraft:'Redraft',rules:'Rules',archive:'Archive'};
const CLOCKS=[['2026-11-15T12:00',[]],['2027-01-10T12:00',['redraft']],['2027-03-15T12:00',['postseason']]];
(async()=>{try{
  const id=await seed(null,{rounds:8});
  for(const [now,extra] of CLOCKS){const exp=ALL.filter(t=>!['postseason','redraft'].includes(t)||extra.includes(t));
    for(const w of [320,390,1280]){const P=await L.phone('tl'+Math.random().toString(36).slice(2,6),{w,h:900,desktop:w>=760,now});await P.page.setBypassServiceWorker(true);
      await P.go('league.html?l='+id+'#standings');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await sleep(700);
      const r=await P.page.evaluate(()=>{const nav=document.getElementById('ltabs');const as=[...nav.querySelectorAll('a')];const R=e=>e.getBoundingClientRect();
        return{tags:as.map(a=>a.tagName),v:as.filter(a=>a.dataset.v).map(a=>a.dataset.v),lab:as.filter(a=>a.dataset.v).map(a=>a.getAttribute('aria-label')),last:as[as.length-1].id,cur:as.filter(a=>a.getAttribute('aria-current')==='page').map(a=>a.dataset.v),
          btn:nav.querySelectorAll('button').length,minH:Math.min(...as.map(a=>R(a).height)),minW:Math.min(...as.map(a=>R(a).width)),nr:Math.round(R(nav).right),
          over:as.filter(a=>R(a).right>innerWidth+0.5||R(a).left<-0.5).length,nsw:nav.scrollWidth-nav.clientWidth,sw:document.documentElement.scrollWidth,iw:innerWidth}});
      const tag=now.slice(0,10)+' '+w+'px';
      ok(tag+': link tabs (<a data-v>), no button tabs',r.btn===0&&r.tags.every(t=>t==='A'),r);
      ok(tag+': order '+exp.map(t=>LAB[t]).join(', ')+' + Draft link last',JSON.stringify(r.v)===JSON.stringify(exp)&&r.last==='tab_room'&&r.lab.every((l,i)=>l.startsWith(LAB[exp[i]])),r);
      ok(tag+': exactly one tab current (Standings)',r.cur.length===1&&r.cur[0]==='standings',r.cur);
      ok(tag+': tap targets >= 44px',r.minH>=44&&r.minW>=44,{h:r.minH,w:r.minW});
      ok(tag+': no overflow (tab row and page)',r.over===0&&r.nsw<=1&&r.sw<=r.iw,r);
      await P.close()}}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
