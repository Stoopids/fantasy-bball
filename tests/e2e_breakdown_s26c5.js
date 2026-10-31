/* s26c5: Standings > Breakdown (per manager, per school, per category; sums) + All teams (Team, Owner, Record, AP, NET; best record first).
   #postseason and #standings/breakdown and #standings/points (alias) open Standings with Breakdown on. 320/390/1280: no overflow, taps >= 44px, no "Test " prefix.
   APP / API env (mock store). SHOTS=dir to save shots. */
const L=require('./lib.js'),path=require('path');const {seed}=require('./seed_league.js');const root=path.join(__dirname,'..');const fx=require('./fixture_s26c3.js')(root);
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,600):''))}}
const AP=fx.rosters.map(r=>r[1]).slice(0,6).map((id,i)=>({current:i+1,team:{id:String(id),location:'S'+i}}));
async function open(w,id,info,hash){const P=await L.phone('pt'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:w>=760?900:800});
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
  P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify(fx.scores)});
    else if(u.pathname==='/data/tournament.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify(fx.tournament)});
    else if(u.hostname==='site.api.espn.com'&&/rankings/.test(u.pathname))r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({rankings:[{type:'ap',date:'2026-10-27',ranks:AP}]})});
    else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
  await P.go('league.html?l='+id+hash);await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(1500);return P}
const small=()=>[...document.querySelectorAll('#lbody a,#lbody button,#lbody [role=button]')].filter(e=>{const b=e.getBoundingClientRect();if(!b.width)return false;const h=getComputedStyle(e,'::before');const ex=h&&h.content!=='none'&&h.position==='absolute'?-parseFloat(h.top||0)-parseFloat(h.bottom||0):0;return b.height+ex<44}).map(e=>e.className+':'+Math.round(e.getBoundingClientRect().height)).slice(0,5);
(async()=>{try{const id=await seed(null,{name:'Test League s26c5',names:fx.NAMES,rosters:fx.rosters,rounds:8});const info=seed.info;const SH=process.env.SHOTS;
  for(const w of [320,390,1280])for(const hash of ['#postseason','#standings/breakdown','#standings/points']){const P=await open(w,id,info,hash);
    const r=await P.page.evaluate(new Function('return ('+(()=>{const cur=(document.querySelector('#ltabs [aria-current=page]')||{}).dataset;const on=(document.querySelector('[data-a=stview][aria-pressed=true]')||{}).dataset;
      const cards=[...document.querySelectorAll('#ptsv .pk')].map(k=>{const kr=k.getBoundingClientRect();const rows=[...k.querySelectorAll('.obr')].map(r=>({tot:+r.dataset.total,shown:+r.querySelector('.obtot').innerText,ps:[...r.querySelectorAll('.obp')].map(p=>({k:p.dataset.cat,pts:+p.dataset.pts,b:p.querySelector('b').innerText}))}));
        return{tot:+k.dataset.total,shown:+k.querySelector('.pkt .pv').innerText,rows,out:[...k.querySelectorAll('*')].some(e=>{const b=e.getBoundingClientRect();return b.width&&b.right>kr.right+0.5})}});
      return{hash:location.hash,lab:[...document.querySelectorAll('[data-a=stview]')].map(b=>b.innerText.trim()).join('|'),tab:cur&&cur.v,view:on&&on.v,tabs:[...document.querySelectorAll('#ltabs [data-v]')].map(a=>a.dataset.v),cards,sw:document.documentElement.scrollWidth,iw:innerWidth,txt:document.getElementById('lapp').innerText,small:SMALL()}}).toString().replace('SMALL()','('+small.toString()+')()')+')()'));
    const tag=w+'px '+hash;ok(tag+': switch reads League | Breakdown',r.lab==='League|Breakdown',r.lab);
    ok(tag+': Standings with Breakdown on (hash #standings/breakdown), no Postseason tab',r.tab==='standings'&&r.view==='breakdown'&&r.hash==='#standings/breakdown'&&!r.tabs.includes('postseason'),{tab:r.tab,view:r.view,hash:r.hash,tabs:r.tabs});
    ok(tag+': 8 manager cards, 8 schools each',r.cards.length===8&&r.cards.every(c=>c.rows.length===8),r.cards.map(c=>c.rows.length));
    ok(tag+': each school: category chips sum to its total',r.cards.every(c=>c.rows.every(x=>x.ps.reduce((a,p)=>a+p.pts,0)===x.tot&&x.shown===x.tot)));
    ok(tag+': each manager total = sum of school totals',r.cards.every(c=>c.tot===c.shown&&c.tot===c.rows.reduce((a,x)=>a+x.tot,0)),r.cards.map(c=>c.tot));
    ok(tag+': 10 categories per school, no Losses, dash for none',r.cards.every(c=>c.rows.every(x=>x.ps.length===10&&!x.ps.some(p=>p.k==='losses')&&x.ps.every(p=>p.pts!==0||p.b==='–'))));
    const all=r.cards.flatMap(c=>c.rows.flatMap(x=>x.ps));const has=k=>all.some(p=>p.k===k&&p.pts!==0);
    ok(tag+': real points: wins, conf season +4, conf tourney +4, NCAA entry/wins/F4/champ present',['wins','entry','ncaa_wins','final4','champ'].every(has)&&all.some(p=>p.k==='conf_season'&&p.pts===4)&&all.some(p=>p.k==='conf_tourney'&&p.pts===4),['wins','conf_season','conf_tourney','entry','ncaa_wins','upsets','final4','champ','missed','playin'].filter(has));
    ok(tag+': no overflow',r.sw<=r.iw&&r.cards.every(c=>!c.out),{sw:r.sw,iw:r.iw});
    ok(tag+': taps >= 44px',r.small.length===0,r.small);
    ok(tag+': no "Test " prefix, no money words',!/\bTest (Sasha|Ben|Cy|Dee|Eli|Fay|Gus|Hal)\b/.test(r.txt)&&!/\b(cash|money|dollars?|prize|payout|wager)\b|\$\d/i.test(r.txt));
    if(SH&&hash==='#postseason'){{const b=await P.page.evaluate(()=>{const r=document.getElementById('lbody').getBoundingClientRect();return{y:r.top+scrollY,h:r.height}});await P.page.screenshot({path:SH+'/standings-breakdown-'+w+'.png',clip:{x:0,y:b.y-60,width:w,height:Math.min(1500,b.h+60)},captureBeyondViewport:true})}}
    await P.close()}
  for(const w of [320,390,1280]){const P=await open(w,id,info,'#teams');
    const r=await P.page.evaluate(new Function('return ('+(()=>{const k=document.getElementById('allteams');const kr=k.getBoundingClientRect();const hd=[...k.querySelectorAll('.obh span')].map(s=>s.textContent.trim().toLowerCase());
      const rows=[...k.querySelectorAll('.obr')].map(r=>{const c=[...r.querySelectorAll('.obl > span')].map(s=>s.innerText.trim());return{tid:r.dataset.tid,w:+r.dataset.w,l:+r.dataset.l,owner:c[1],rec:c[2],ap:c[3],net:c[4],apx:window.LRANK.apOf(r.dataset.tid),netx:window.LRANK.netOf(r.dataset.tid)}});
      return{hd,rows,sw:document.documentElement.scrollWidth,iw:innerWidth,out:[...k.querySelectorAll('*')].some(e=>{const b=e.getBoundingClientRect();return b.width&&b.right>kr.right+0.5}),txt:k.innerText,small:SMALL()}}).toString().replace('SMALL()','('+small.toString()+')()')+')()'));
    const tag=w+'px All teams';const pct=x=>x.w+x.l?x.w/(x.w+x.l):0;
    ok(tag+': columns Team, Owner, Record, AP, NET',JSON.stringify(r.hd)===JSON.stringify(['team','owner','record','ap','net']),r.hd);
    ok(tag+': 64 schools, best record first',r.rows.length===64&&r.rows.every((x,i)=>!i||pct(r.rows[i-1])>pct(x)||(pct(r.rows[i-1])===pct(x)&&r.rows[i-1].w>=x.w)),r.rows.slice(0,6).map(x=>x.rec));
    ok(tag+': record shows W-L',r.rows.every(x=>x.rec===x.w+'-'+x.l));
    ok(tag+': AP and NET from the rankings data (– when unranked), 6 AP ranks shown',r.rows.every(x=>x.ap===(x.apx?'#'+x.apx:'–')&&x.net===(x.netx?String(x.netx):'–'))&&r.rows.filter(x=>x.ap!=='–').length===6,r.rows.filter(x=>x.ap!=='–'||x.net!=='–').slice(0,4));
    ok(tag+': no overflow',r.sw<=r.iw&&!r.out,{sw:r.sw,iw:r.iw});
    ok(tag+': taps >= 44px',r.small.length===0,r.small);
    ok(tag+': owner names without "Test "',!/\bTest /.test(r.txt));
    if(SH){const b=await P.page.evaluate(()=>{const r=document.getElementById('lbody').getBoundingClientRect();return{y:r.top+scrollY,h:r.height}});await P.page.screenshot({path:SH+'/all-teams-'+w+'.png',clip:{x:0,y:b.y-60,width:w,height:Math.min(1500,b.h+60)},captureBeyondViewport:true})};await P.close()}
}catch(e){bad++;console.log('FAIL  crashed',e)}await L.close();console.log('\n'+(n-bad)+'/'+n+' passed');process.exit(bad?1:0)})();
