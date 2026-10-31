/* s26c8: the League standings total (Standings > League) equals the Breakdown manager total for every manager, equals FBNScore.leagueTotals, and the standings are
   sorted by it. Conference points come from scores.json "conf" (FBNScore.confPoints): own(0,2) gets conf_reg +4 and conf_tourn +4; own(1,1) is a regular-season
   champ whose conference tournament has not started -> 0. 390 and 1280.  APP / API env (mock store). SHOTS=dir -> standings-league / standings-breakdown shots. */
const L=require('./lib.js'),path=require('path');const {seed}=require('./seed_league.js');const root=path.join(__dirname,'..');const fx=require('./fixture_s26c3.js')(root);
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,600):''))}}
async function open(w,id,info,hash){const P=await L.phone('tt'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:w>=760?900:844});
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me));localStorage.removeItem('standingsView')},id,{mid:info.managers[0].id,k:info.managers[0].k});
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
  P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify(fx.scores)});
    else if(u.pathname==='/data/tournament.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify(fx.tournament)});
    else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
  await P.go('league.html?l='+id+hash);await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(1200);return P}
const shot=async(P,name,w)=>{if(!process.env.SHOTS)return;const b=await P.page.evaluate(()=>{const r=document.getElementById('lbody').getBoundingClientRect();return{y:r.top+scrollY,h:r.height}});
  await P.page.screenshot({path:process.env.SHOTS+'/'+name+'-'+w+'.png',clip:{x:0,y:Math.max(0,b.y-70),width:w,height:Math.min(1400,b.h+70)},captureBeyondViewport:true})};
(async()=>{try{const id=await seed(null,{name:'Test League s26c8',names:fx.NAMES,rosters:fx.rosters,rounds:8});const info=seed.info;
  for(const w of [390,1280]){
    let P=await open(w,id,info,'#standings');
    const lg=await P.page.evaluate(()=>[...document.querySelectorAll('#lbody .strow')].map(c=>({mid:c.dataset.mid,tot:+c.querySelector('.pv').innerText,rank:c.querySelector('.place').innerText.trim()})));
    await shot(P,'standings-league',w);await P.close();
    P=await open(w,id,info,'#standings/breakdown');
    const bd=await P.page.evaluate(()=>[...document.querySelectorAll('#ptsv .pk')].map(k=>({mid:k.dataset.mid,tot:+k.dataset.total,shown:+k.querySelector('.pkt .pv').innerText,
      conf:[...k.querySelectorAll('.obp')].filter(p=>/^conf_/.test(p.dataset.cat)).map(p=>({tid:p.closest('.obr').dataset.tid,k:p.dataset.cat,pts:+p.dataset.pts})).filter(p=>p.pts)})));
    await shot(P,'standings-breakdown',w);await P.close();
    const tag=w+'px';const B={};bd.forEach(b=>{B[b.mid]=b});
    ok(tag+': 8 managers in both views',lg.length===8&&bd.length===8,[lg.length,bd.length]);
    ok(tag+': League standings total = Breakdown manager total, every manager',lg.every(o=>B[o.mid]&&B[o.mid].tot===o.tot&&B[o.mid].shown===o.tot),lg.map(o=>[o.tot,B[o.mid]&&B[o.mid].tot]));
    ok(tag+': standings sorted by total (desc)',lg.every((o,i)=>!i||lg[i-1].tot>=o.tot),lg.map(o=>o.tot));
    const pl=o=>+String(o.rank).replace('T-','');ok(tag+': places follow the order (equal totals broken by wins / win % / point difference, else shared)',lg.every((o,i)=>!i||pl(lg[i-1])<=pl(o))&&lg.every((o,i)=>!i||pl(lg[i-1])!==pl(o)||lg[i-1].tot===o.tot),lg.map(o=>o.rank+':'+o.tot));
    const all=bd.flatMap(b=>b.conf);
    ok(tag+': conf map scored: own(0,2) conf_reg +4 and conf_tourn +4, nothing else',all.length===2&&all.every(p=>p.tid===String(fx.own(0,2))&&p.pts===4)&&all.some(p=>p.k==='conf_season')&&all.some(p=>p.k==='conf_tourney'),all);
  }
  /* the same totals straight from js/scoring.js */
  const S=require('../js/scoring.js');ok('scoring.js has conf_reg / conf_tourn / leagueTotals',S.POINTS.conf_reg===4&&S.POINTS.conf_tourn===4&&typeof S.leagueTotals==='function');
}catch(e){bad++;console.log('FAIL  crashed',e)}await L.close();console.log('\n'+(n-bad)+'/'+n+' passed');process.exit(bad?1:0)})();
