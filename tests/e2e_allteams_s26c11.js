/* s26c11: All teams like STOOPIDS (compact). Columns Team, Owner, Rec, Pts, Conf, AP, NET (STOOPIDS s26p); owner filter (All + each manager, 44px); best record first, then NET (unranked last); Rec/AP/NET bold, tabular-nums,
   ~1.1x (>=15px desktop); card capped (<=720px) and centered on desktop, number columns side by side; owner column narrow with ellipsis; no 'Test ' names;
   dark STOOPIDS colours; 320/390/1280 no overflow, taps >= 44px. APP / API env (mock store). SHOTS=dir -> all-teams-<w>.png */
const L=require('./lib.js'),path=require('path');const {seed}=require('./seed_league.js');const root=path.join(__dirname,'..');const fx=require('./fixture_s26c3.js')(root);
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,600):''))}}
/* s26c11 conf codes: scores.json conf as tools/refresh_data.py writes it (ESPN standings abbreviations, s26c11-conf test fixture codes) + net.json ranks[].conf fallback */
const SCONF={[fx.own(4,0)]:'acc',[fx.own(4,1)]:'big12',[fx.own(5,0)]:'Mountain West Conference',[fx.own(5,1)]:'ASUN'},NCONF={[fx.own(4,0)]:'sec',[fx.own(6,0)]:'aeast',[fx.own(6,1)]:'atl10',[fx.own(7,0)]:'zzz'};
const EXPC={[fx.own(4,0)]:'ACC',[fx.own(4,1)]:'B12',[fx.own(5,0)]:'MWC',[fx.own(5,1)]:'ASUN',[fx.own(6,0)]:'AE',[fx.own(6,1)]:'A10',[fx.own(7,0)]:'ZZZ',[fx.own(0,2)]:'TST',[fx.own(3,0)]:'TST',[fx.own(1,1)]:'XYZ'};
/* s26c12: assets/teams.js meta[id].c is the last fallback (365 pool); schools with it never show – */
const TMC=(()=>{try{const t=require('fs').readFileSync(path.join(root,'assets/teams.js'),'utf8');const d=JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1));const o={};Object.entries(d.meta||{}).forEach(([k,v])=>{if(v&&v.c)o[k]=v.c});return o}catch(e){return {}}})();
const SC2=JSON.parse(JSON.stringify(fx.scores));Object.entries(SCONF).forEach(([t,c])=>{SC2.conf[t]={conf:c,confRegChamp:false,confTournChamp:false}});
const NET=JSON.parse(require('fs').readFileSync(path.join(root,'data/net.json'),'utf8'));Object.entries(NCONF).forEach(([t,c],i)=>{const r=NET.ranks.find(x=>String(x.id)===String(t));if(r)r.conf=c;else NET.ranks.push({rank:360+i,id:String(t),school:'X',conf:c})});
const AP=fx.rosters.map(r=>r[1]).slice(0,6).map((id,i)=>({current:i+1,team:{id:String(id),location:'S'+i}}));
async function open(w,id,info){const P=await L.phone('at'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:w>=760?900:800});
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
  P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify(SC2)});
    else if(u.pathname==='/data/net.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify(NET)});
    else if(u.pathname==='/data/tournament.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify(fx.tournament)});
    else if(u.hostname==='site.api.espn.com'&&/rankings/.test(u.pathname))r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({rankings:[{type:'ap',date:'2026-10-27',ranks:AP}]})});
    else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
  await P.go('league.html?l='+id+'#teams');await P.page.waitForSelector('#allteams',{timeout:25000});await L.sleep(1500);return P}
(async()=>{try{const id=await seed(null,{name:'Test League s26c11',names:fx.NAMES,rosters:fx.rosters,rounds:8});const info=seed.info;const SH=process.env.SHOTS;
  for(const w of [320,390,1280]){const P=await open(w,id,info);
    /* owner totals and schools from Standings > Breakdown (FBNScore via league-d.js); filter chips give mid + display name in the same order */
    await P.page.evaluate(()=>{location.hash='#standings/breakdown'});await P.page.waitForSelector('#ptsv .pk',{timeout:8000});await L.sleep(500);
    await P.page.evaluate(()=>{window.__BKC=[...document.querySelectorAll('#ptsv .pk')].map(k=>({total:+k.dataset.total,tids:[...k.querySelectorAll('.obr')].map(r=>String(r.dataset.tid))}))});
    await P.page.evaluate(()=>{location.hash='#teams'});await P.page.waitForSelector('#allteams',{timeout:8000});await L.sleep(500);
    await P.page.evaluate(()=>{const fl=[...document.querySelectorAll('#atfilter button')].slice(1);window.__BK=fl.map(b=>{const tids=null;return{mid:b.dataset.mid,name:b.textContent.trim()}});
      /* match each chip to its breakdown card through the schools listed for it in the table */
      const rowsBy={};[...document.querySelectorAll('#allteams .obr')].forEach(r=>{const o=(r.querySelector('.ato .tnt')||r.querySelector('.ato')).textContent;(rowsBy[o]=rowsBy[o]||[]).push(String(r.dataset.tid))});
      window.__BK.forEach(o=>{const t=rowsBy[o.name]||[];const c=window.__BKC.find(c=>c.tids.length===t.length&&c.tids.every(x=>t.includes(x)));o.tids=t;o.total=c?c.total:NaN})});
    const r=await P.page.evaluate(()=>{const k=document.getElementById('allteams');const kr=k.getBoundingClientRect();const cs=e=>getComputedStyle(e);
      const hd=[...k.querySelectorAll('.obh span')].map(s=>s.textContent.trim().toLowerCase());
      const rows=[...k.querySelectorAll('.obr')].map(r=>{const sp=[...r.querySelectorAll('.obl > span')];const c=sp.map(s=>s.innerText.trim());const nb=sp.filter(x=>x.classList.contains('n')).map(s=>({x:s.getBoundingClientRect(),st:cs(s)}));
        const ow=sp[1];return{tid:r.dataset.tid,w:+r.dataset.w,l:+r.dataset.l,owner:c[1],rec:c[2],pts:c[3],conf:c[4],ap:c[5],net:c[6],dpts:r.dataset.pts,netx:window.LRANK.netOf(r.dataset.tid),nums:nb.map(b=>({fs:parseFloat(b.st.fontSize),fw:+b.st.fontWeight,tn:b.st.fontVariantNumeric})),
          gaps:[nb[1].x.left-nb[0].x.right,nb[2].x.left-nb[1].x.right,nb[3].x.left-nb[2].x.right],ownEl:{tov:cs(ow).textOverflow,ws:cs(ow).whiteSpace,w:ow.getBoundingClientRect().width,team2own:ow.getBoundingClientRect().left-sp[0].getBoundingClientRect().right}}});
      const R=e=>e.getBoundingClientRect();const small=[...document.querySelectorAll('#ltabs a,#lbody a,#lbody button,#lbody [role=button]')].filter(e=>{const b=R(e);if(!b.width)return false;const h=getComputedStyle(e,'::before');const ex=h&&h.content!=='none'&&h.position==='absolute'?-parseFloat(h.top||0)-parseFloat(h.bottom||0):0;return b.height+ex<44||b.width<44}).map(e=>e.className+':'+Math.round(R(e).width)+'x'+Math.round(R(e).height));
      const own=window.__BK;const fl=[...document.querySelectorAll('#atfilter button')].map(b=>({t:b.textContent.trim(),mid:b.dataset.mid,on:b.getAttribute('aria-pressed')}));
      return{hd,rows,own,fl,kw:kr.width,kl:kr.left,kr:innerWidth-kr.right,bg:cs(document.body).backgroundColor,card:cs(k).backgroundColor,acc:cs(document.documentElement).getPropertyValue('--acc').trim(),sw:document.documentElement.scrollWidth,iw:innerWidth,
        out:[...k.querySelectorAll('*')].some(e=>{const b=e.getBoundingClientRect();return b.width&&b.right>kr.right+0.5}),txt:document.getElementById('lapp').innerText,small}});
    const tag=w+'px All teams';const pct=x=>x.w+x.l?x.w/(x.w+x.l):0;const nk=x=>x.netx||1e9;
    ok(tag+': column order Team, Owner, Rec, Pts, Conf, AP, NET, then s27 STOOPID + KenPom sort columns',r.hd.some(x=>/^stoopid/.test(x))&&r.hd.some(x=>/^kenpom/.test(x))&&JSON.stringify(r.hd.filter(x=>!/stoopid|kenpom|^st$|^kp$/.test(x)))===JSON.stringify(['team','owner','rec','pts','conf','ap','net']),r.hd);
    ok(tag+': 64 rows, best record first then NET (unranked last)',r.rows.length===64&&r.rows.every((x,i)=>{if(!i)return true;const p=r.rows[i-1];return pct(p)>pct(x)||(pct(p)===pct(x)&&(p.w>x.w||(p.w===x.w&&(p.l<x.l||(p.l===x.l&&nk(p)<=nk(x))))))}),r.rows.slice(0,8).map(x=>x.rec+' '+x.net));
    ok(tag+': Rec/AP/NET bold, tabular-nums, slightly larger (>=14px phone, 15-17px desktop)',r.rows.every(x=>x.nums.every(m=>m.fw>=700&&/tabular-nums/.test(m.tn)&&m.fs>=14&&m.fs<=17&&(w<760||m.fs>=15))),r.rows[0].nums);
    ok(tag+': Pts = per-school Breakdown points; each owner total = sum of its schools',r.rows.every(x=>x.pts===x.dpts&&/^-?\d+$/.test(x.pts))&&r.own.every(o=>r.rows.filter(x=>o.tids.includes(x.tid)).reduce((a,x)=>a+ +x.pts,0)===o.total)&&r.rows.some(x=>+x.pts>0),r.own.map(o=>o.total));
    ok(tag+': Conf: scores.json codes/names normalised (acc->ACC, big12->B12, Mountain West Conference->MWC, ASUN), net.json conf fallback (aeast->AE, atl10->A10), unknown code uppercase (zzz->ZZZ), scores.json wins over net.json, then teams.js meta (short label), – when unknown',r.rows.every(x=>EXPC[x.tid]?x.conf===EXPC[x.tid]:x.conf===(TMC[x.tid]?'*':'–')||(TMC[x.tid]&&x.conf!=='–'&&x.conf===x.conf.trim()&&x.conf.length<=6)),r.rows.filter(x=>x.conf!=='–'||EXPC[x.tid]).map(x=>[x.tid,x.conf,EXPC[x.tid]]));
    ok(tag+': owner filter: All (on) then each manager, no Test prefix',r.fl.length===r.own.length+1&&r.fl[0].t==='All'&&r.fl[0].on==='true'&&r.fl.slice(1).every((f,i)=>f.mid===r.own[i].mid&&f.t===r.own[i].name&&!/^Test /.test(f.t)&&f.on==='false'),r.fl);
    {const o=r.own[2];await P.page.click('#atfilter button[data-mid="'+o.mid+'"]');await L.sleep(400);
      const f=await P.page.evaluate(()=>{const R=e=>e.getBoundingClientRect();return{rows:[...document.querySelectorAll('#allteams .obr')].map(r=>({tid:r.dataset.tid,o:r.querySelector('.ato .tnr')?r.querySelector('.ato .tnr').textContent:r.querySelector('.ato').textContent,pts:+r.dataset.pts})),on:[...document.querySelectorAll('#atfilter button[aria-pressed=true]')].map(b=>b.textContent),small:[...document.querySelectorAll('#atfilter button')].filter(b=>R(b).height<44||R(b).width<44).length,sw:document.documentElement.scrollWidth,iw:innerWidth}});
      ok(tag+': filter to one owner: only their 8 schools, pressed, sum = their total, taps >= 44px, no overflow',f.rows.length===8&&f.rows.every(x=>!!x.o&&o.tids.includes(x.tid))&&f.on.length===1&&f.rows.reduce((a,x)=>a+x.pts,0)===o.total&&!f.small&&f.sw<=f.iw,f);
      if(SH){const b=await P.page.evaluate(()=>{const r=document.getElementById('lbody').getBoundingClientRect();return{y:r.top+scrollY,h:r.height}});await P.page.screenshot({path:SH+'/all-teams-owner-'+w+'.png',clip:{x:0,y:Math.max(0,b.y-60),width:w,height:Math.min(1500,b.h+60)},captureBeyondViewport:true})}
      await P.page.click('#atfilter button[data-mid=""]');await L.sleep(300);ok(tag+': All restores 64 rows',await P.page.evaluate(()=>document.querySelectorAll('#allteams .obr').length)===64)}
    ok(tag+': owner column narrow with ellipsis',r.rows.every(x=>x.ownEl.tov==='ellipsis'&&x.ownEl.ws==='nowrap'&&(w<=480||x.ownEl.w<=160)),r.rows[0].ownEl);   /* phones: owner sits under the team (s26c4 stacked layout) */
    ok(tag+': no "Test " names, no money words',!/\bTest (Sasha|Ben|Cy|Dee|Eli|Fay|Gus|Hal)\b/.test(r.txt)&&!r.rows.some(x=>/^Test /.test(x.owner))&&!/\b(cash|money|dollars?|prize|payout|wager)\b|\$\d/i.test(r.txt));
    ok(tag+': dark STOOPIDS colours',r.bg==='rgb(16, 19, 26)'&&r.card==='rgb(26, 31, 43)'&&r.acc==='#ffd23f',[r.bg,r.card,r.acc]);
    if(w>=760){ok(tag+': compact: card <= 720px and centered',r.kw<=720&&Math.abs(r.kl-r.kr)<=40,{kw:r.kw,kl:r.kl,kr:r.kr});
      ok(tag+': Rec+Pts and AP+NET side by side (gaps <= 24px, Conf between <= 110px), owner close to team (<= 40px)',r.rows.every(x=>x.gaps[0]<=24&&x.gaps[2]<=24&&x.gaps[1]<=110&&x.ownEl.team2own<=40),[r.rows[0].gaps,r.rows[0].ownEl.team2own])}
    ok(tag+': no overflow',r.sw<=r.iw&&!r.out,{sw:r.sw,iw:r.iw});
    ok(tag+': taps >= 44px',r.small.length===0,r.small);
    if(SH){const b=await P.page.evaluate(()=>{const r=document.getElementById('lbody').getBoundingClientRect();return{y:r.top+scrollY,h:r.height}});await P.page.screenshot({path:SH+'/all-teams-'+w+'.png',clip:{x:0,y:Math.max(0,b.y-60),width:w,height:Math.min(1500,b.h+60)},captureBeyondViewport:true})}
    await P.close()}
}catch(e){bad++;console.log('FAIL  crashed',e)}await L.close();console.log('\n'+(n-bad)+'/'+n+' passed');process.exit(bad?1:0)})();
