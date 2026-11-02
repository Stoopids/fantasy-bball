/* s28 League parity with STOOPIDS (mock store only; APP/API env): tab order Standings, Games, Bets, All teams, (Rosters), Recap, (Redraft), Rules, Share; no Archive tab and #archive -> Standings;
   Share tab (no hero Share button) shares ?l=CODE&view=1 with no k=; s28c: no Copy link on Standings; Recap grades in 2 columns at 1280, 1 column on phones;
   TEAM name on top, the manager's real name under it (Standings, Breakdown, Rosters, All teams, Bets tally/cards/opponents, power rankings); no 'Test ' names; 320/390/1280 no overflow. */
const L=require('./lib.js');const {seed}=require('./seed_league.js');
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
(async()=>{try{const id=await seed();const info=seed.info;const M=info.managers;
  for(const w of [320,390,1280]){const P=await L.phone('par'+w,w>=1000?{desktop:true,w,h:900}:{w,h:844});
    await P.page.evaluateOnNewDocument(()=>{window.__shared=[];window.__copied=[];try{navigator.share=u=>{window.__shared.push(u.url);return Promise.resolve()};Object.defineProperty(window,'isSecureContext',{get:()=>true})}catch(e){}});
    await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:M[0].id,k:M[0].k});
    await P.go('league.html?l='+id+'#archive');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(900);
    const a=await P.page.evaluate(()=>({tabs:[...document.querySelectorAll('#ltabs [data-a=tab]')].map(x=>x.dataset.v),on:((document.querySelector('#ltabs .on')||{dataset:{}}).dataset.v||''),hero:!!document.getElementById('cptab'),cp:!!document.getElementById('stcopy'),hash:location.hash,ov:document.documentElement.scrollWidth-innerWidth,
      st:[...document.querySelectorAll('.strow .who')].map(x=>[x.querySelector('.nm').textContent.trim(),(x.querySelector('small:last-child')||{}).textContent])}));
    const core=a.tabs.filter(t=>!['rosters','redraft'].includes(t));
    ok(w+': tabs Standings, Games, Bets, All teams, Recap, Rules, Share (no Archive), Share last',JSON.stringify(core)==='["standings","games","bets","teams","recap","rules","share"]'&&!a.tabs.includes('archive'),a.tabs);
    ok(w+': #archive falls back to Standings',a.on==='standings'&&!/archive/.test(a.hash),a);
    ok(w+': no hero Share button; no Copy link on Standings (s28c: one Share, the Share tab)',!a.hero&&!a.cp,a);
    ok(w+': Standings cards: TEAM on top, real name under (no Test prefix)',a.st.length===8&&a.st.every(([t,n])=>M.some(m=>t.endsWith(m.team)&&n===m.name))&&!a.st.flat().some(s=>/^Test /.test(s||'')),a.st);
    ok(w+': no horizontal overflow on Standings',a.ov<=0,a.ov);
    await P.page.click('#ltabs [data-v="teams"]');await L.sleep(700);
    const t=await P.page.evaluate(()=>({o:[...document.querySelectorAll('#allteams .obr .ato')].slice(0,3).map(x=>[(x.querySelector('.tnt')||{}).textContent,(x.querySelector('.tnr')||{}).textContent]),
      hd:[...document.querySelectorAll('#allteams .s27-sort')].map(s=>[...s.querySelectorAll('span')].filter(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0).map(e=>e.textContent).join('')),ov:document.documentElement.scrollWidth-innerWidth}));
    ok(w+': All teams owner cell: team on top, real name under',t.o.length===3&&t.o.every(([a,b])=>M.some(m=>m.team===a&&m.name===b)),t.o);
    ok(w+': All teams STOOPID and KenPom sort labels visible',t.hd.length===2&&/^(STOOPID|ST)$/.test(t.hd[0])&&/^(KenPom|KP)$/.test(t.hd[1]),t.hd);
    ok(w+': All teams no overflow',t.ov<=0,t.ov);
    await P.page.click('#ltabs [data-v="recap"]');await P.page.waitForSelector('#recapgrades ol.prl>li',{timeout:15000}).catch(()=>{});await L.sleep(800);
    const r=await P.page.evaluate(()=>{const li=[...document.querySelectorAll('#recapgrades ol.prl>li')];const xs=new Set(li.map(e=>Math.round(e.getBoundingClientRect().left)));const w0=li[0]&&li[0].querySelector('.pwho');
      return{n:li.length,cols:xs.size,who:w0?[w0.querySelector('b').textContent,w0.querySelector('small').textContent]:null,whoH:w0?Math.round(w0.querySelector('b').getBoundingClientRect().height):0,ov:document.documentElement.scrollWidth-innerWidth}});
    ok(w+': Recap grades '+(w>=1000?'two columns':'one column')+', team name on top, one line',r.n===8&&r.cols===(w>=1000?2:1)&&r.who&&M.some(m=>m.team===r.who[0]&&m.name===r.who[1])&&r.whoH<40&&r.ov<=0,r);
    await P.page.click('#ltabs [data-v="share"]');await L.sleep(500);
    const s=await P.page.evaluate(()=>({u:(document.getElementById('s29shUrl')||{}).textContent,b:!!document.getElementById('s29shBtn')}));await P.page.click('#s29shBtn');await L.sleep(300);const sh=await P.page.evaluate(()=>window.__shared.concat(window.__copied||[]));
    ok(w+': Share tab: league link ?l=CODE&view=1 (whole site, s28c), no k=, Share button shares it',s.b&&/league\.html\?l=[^&#]+&view=1$/.test(s.u)&&!/[?&]k=/.test(s.u)&&(sh.length===0||sh.every(u=>!/[?&]k=/.test(u))),{s,sh});
    await P.page.click('#ltabs [data-v="bets"]');await P.page.waitForSelector('#b27Form',{timeout:15000});await L.sleep(400);
    const b=await P.page.evaluate(()=>({opp:[...document.querySelectorAll('[data-lb=opp]')].map(x=>x.getAttribute('aria-label')),ov:document.documentElement.scrollWidth-innerWidth}));
    ok(w+': Bets opponents labelled Team (Name)',b.opp.length===7&&b.opp.every(l=>M.some(m=>l===m.team+' ('+m.name+')')),b.opp);
    ok(w+': Bets no overflow',b.ov<=0,b.ov);
    ok(w+': no page errors',P.errs.length===0,P.errs);await P.close()}
}catch(e){bad++;console.log('FAIL  exception: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
