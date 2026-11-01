/* s26c14 STOOPIDS header/footer parity: header = banner + title (centred) + tagline right under it, no 'Standings updated' line and no
   Refresh Live Games row; the Refresh Live Games button + 'Last updated <time>' sit at the top of the Games tab only (button >= 44px, ESPN poll still runs);
   the footer reads 'Standings last updated <time>'. 320/390/1280, no overflow. Mock ESPN (no live calls). APP / API env. SHOTS=dir. */
const L=require('./lib.js'),path=require('path');const {seed}=require('./seed_league.js');const root=path.join(__dirname,'..');const fx=require('./fixture_s26c3.js')(root);
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
(async()=>{try{const id=await seed(null,{name:"BALL DON'T LIE",names:fx.NAMES.map(x=>[x[0].replace(/^Test /,''),x[1],x[2]]),rosters:fx.rosters,rounds:8});const info=seed.info;const SH=process.env.SHOTS;
  for(const w of [320,390,1280]){const P=await L.phone('hd'+w,{desktop:w>=760,w,h:w>=760?900:800});let polls=0;
    await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});
    await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
    P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json')return r.respond({status:200,contentType:'application/json',body:JSON.stringify(Object.assign({},fx.scores,{generated_at_utc:new Date(Date.now()-3600e3).toISOString()}))});
      if(u.pathname==='/data/tournament.json')return r.respond({status:200,contentType:'application/json',body:JSON.stringify(fx.tournament)});
      if(u.hostname==='site.api.espn.com'){if(/scoreboard/.test(u.pathname))polls++;return r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:/rankings/.test(u.pathname)?'{"rankings":[]}':'{"events":[]}'})}
      if(/textdb\.dev/.test(u.hostname))return r.abort();r.continue()});
    await P.go('league.html?l='+id+'#standings');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(2500);const tag=w+'px';
    const h=await P.page.evaluate(()=>{const hd=document.getElementById('lhdr'),t=document.getElementById('ltitle'),tg=document.getElementById('tag');const tr=t.getBoundingClientRect(),hr=document.getElementById('lhead').getBoundingClientRect();
      const r=document.createRange();const g=t.closest('.s27-hd');let x;if(g){const a=g.firstElementChild.getBoundingClientRect(),b=g.lastElementChild.getBoundingClientRect();x={left:a.left,right:b.right}}else{r.selectNodeContents(t);x=r.getBoundingClientRect()}   /* s27: title + Share group is what is centred */
      return{txt:hd.innerText,fresh:!!hd.querySelector('#fresh'),live:!!hd.querySelector('#live'),next:(t.closest('.s27-hd')||t).nextElementSibling&&(t.closest('.s27-hd')||t).nextElementSibling.id,ta:getComputedStyle(t).textAlign,
        cOff:Math.abs((x.left+x.right)/2-(hr.left+hr.right)/2),tgOff:(()=>{const r2=document.createRange();r2.selectNodeContents(tg);const y=r2.getBoundingClientRect();return Math.abs((y.left+y.right)/2-(hr.left+hr.right)/2)})(),
        foot:(document.getElementById('fresh')||{}).innerText||'',footIn:!!document.querySelector('#foot #fresh'),liveAny:!!document.getElementById('live'),sw:document.documentElement.scrollWidth,iw:innerWidth}});
    ok(tag+': header has no Standings updated line and no Refresh Live Games row',!h.fresh&&!h.live&&!/Standings updated|Refresh Live Games|Last updated/.test(h.txt),h.txt);
    ok(tag+': tagline directly under the title',h.next==='tag',h.next);
    ok(tag+': title and tagline centred',h.ta==='center'&&h.cOff<=3&&h.tgOff<=3,{ta:h.ta,c:h.cOff,t:h.tgOff});
    ok(tag+': footer reads "Standings last updated <time>"',h.footIn&&/^Standings last updated \S.+\d/.test(h.foot),h.foot);
    ok(tag+': no Refresh Live Games row off the Games tab',!h.liveAny);ok(tag+': no overflow (Standings)',h.sw<=h.iw,h);
    if(SH)await P.page.screenshot({path:SH+'/header-'+w+'.png'});
    await P.page.evaluate(()=>{location.hash='#games'});await L.sleep(1500);const p0=polls;
    const g=await P.page.evaluate(()=>{const l=document.getElementById('live'),b=document.getElementById('lvB');const lb=document.getElementById('lbody');
      return{first:lb.firstElementChild&&lb.firstElementChild.id,vis:!!l&&!l.hidden&&!!l.getClientRects().length,bh:b?Math.round(b.getBoundingClientRect().height):0,btxt:b?b.innerText:'',
        lu:(document.getElementById('lvU')||{}).innerText||'',sw:document.documentElement.scrollWidth,iw:innerWidth}});
    ok(tag+': Games tab: Refresh Live Games row is the first thing in the tab, visible',g.first==='live'&&g.vis&&/Refresh Live Games/.test(g.btxt),g);
    ok(tag+': Games tab: Refresh button >= 44px tall',g.bh>=44,g.bh);ok(tag+': Games tab: "Last updated <time>" shown after the poll',/^Last updated \d/.test(g.lu),g.lu);
    ok(tag+': no overflow (Games)',g.sw<=g.iw,g);ok(tag+': ESPN scoreboard polled (live overlay still runs)',polls>=1,polls);
    if(SH){await P.page.evaluate(()=>scrollTo(0,0));await P.page.screenshot({path:SH+'/games-top-'+w+'.png'});await P.page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await L.sleep(300);await P.page.screenshot({path:SH+'/footer-'+w+'.png'})}
    await L.sleep(21000);await P.page.evaluate(()=>{const b=document.getElementById('lvB');if(b)b.click()});await L.sleep(1500);ok(tag+': tapping Refresh Live Games polls ESPN again',polls>p0,{p0,polls});
    ok(tag+': no page errors',P.errs.filter(e=>/pageerror/.test(e)).length===0,P.errs);await P.close()}
 }catch(e){bad++;console.log('FAIL exception',e&&e.stack)}finally{await L.close();console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)}})();
