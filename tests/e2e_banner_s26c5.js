/* s26c5: League header banner is short (centered cover crop): at 390x844 and 1280x800 the first Standings card's top is inside the viewport on first open;
   320x640 reported too. The commissioner change-photo control stays visible and >= 44px.  APP / API env.  SHOTS=dir SHOTNAME=prefix (e.g. header_after) for top-of-page shots. Also: the header buttons never overlap the site title / league name. */
const L=require('./lib.js');const {seed}=require('./seed_league.js');
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
(async()=>{try{const id=await seed(null,{});const info=seed.info;
  for(const [w,h,must] of [[390,844,1],[1280,800,1],[320,640,0]]){const P=await L.phone('bn',{w,h,desktop:w>=760});await P.page.setBypassServiceWorker(true);
    await P.page.evaluateOnNewDocument((id,me,cm)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me));localStorage.setItem('fbn.cm.'+id,cm)},id,{mid:info.managers[0].id,k:info.managers[0].k},info.cmSecret);
    await P.go('league.html?l='+id+'#standings');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(1500);
    const r=await P.page.evaluate(()=>{const c=document.querySelector('#lbody .card');const hr=document.getElementById('hero').getBoundingClientRect();const cs=getComputedStyle(document.getElementById('hero'));
      const ctl=[...document.querySelectorAll('.heroctl .btn, .heroctl button, .heroctl label')].filter(e=>e.getBoundingClientRect().width).map(e=>{const b=e.getBoundingClientRect();const hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return{t:e.innerText.trim().slice(0,20),free:!!hit&&(hit===e||e.contains(hit)),w:Math.round(b.width),h:Math.round(b.height),top:Math.round(b.top)}});
      const ttl=['.lb-pre:not([hidden])','.lb-main','.lb-sub','#ltitle'].map(q=>document.querySelector(q)).filter(e=>e&&e.getBoundingClientRect().width).map(e=>{const b=e.getBoundingClientRect();return{q:e.className||e.id,l:b.left,r:b.right,t:b.top,b:b.bottom}});
      const btn=[...document.querySelectorAll('.heroctl .btn')].filter(e=>e.getBoundingClientRect().width).map(e=>{const b=e.getBoundingClientRect();return{q:e.id,l:b.left,r:b.right,t:b.top,b:b.bottom}});
      const hits=[];btn.forEach(a=>ttl.forEach(t=>{if(a.l<t.r&&a.r>t.l&&a.t<t.b&&a.b>t.t)hits.push(a.q+' x '+t.q)}));
      return{hits,ttl:ttl.length,cardTop:c?Math.round(c.getBoundingClientRect().top):null,vh:innerHeight,heroH:Math.round(hr.height),heroW:Math.round(hr.width),bgSize:cs.backgroundSize,bgPos:cs.backgroundPosition,ctl,sw:document.documentElement.scrollWidth,iw:innerWidth,y:scrollY}});
    const tag=w+'x'+h;console.log('   '+tag+' '+JSON.stringify(r));
    if(must)ok(tag+': first card top inside the viewport on first open',r.cardTop!=null&&r.y<2&&r.cardTop>=0&&r.cardTop<r.vh-40,r);
    else ok(tag+': (info) first card position recorded',r.cardTop!=null,r);
    ok(tag+': banner uses a centered cover crop',/cover/.test(r.bgSize)&&/50%/.test(r.bgPos),{s:r.bgSize,p:r.bgPos});
    ok(tag+': commissioner change-photo control shown, >= 44px and not covered (tappable)',r.ctl.length>0&&r.ctl.every(b=>b.h>=44&&b.w>=44&&b.free),r.ctl);
    ok(tag+': header buttons do not overlap the site title or league name',r.ttl>=2&&r.hits.length===0,r.hits);
    ok(tag+': no horizontal overflow',r.sw<=r.iw,{sw:r.sw,iw:r.iw});
    if(process.env.SHOTS)await P.page.screenshot({path:process.env.SHOTS+'/'+(process.env.SHOTNAME||'banner_after')+'_'+w+'.png'});
    await P.close()}
}catch(e){bad++;console.log('FAIL  crashed',e)}await L.close();console.log('\n'+(n-bad)+'/'+n+' passed');process.exit(bad?1:0)})();
