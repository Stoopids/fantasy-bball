/* s25 equal-size bet cards: equal heights + bottom rows lined up per grid row (1280 / 1600), 3-line clamp + 'more' (390), no overflow (320). node tests/e2e_cards_s25.js (APP / API env) */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;const F=require('../js/core.js');
const SH=process.env.SHOTS||'/workspace/league-site-work/compare-s25';
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,600):''))}}
const base=process.env.API;const post=(k,v)=>fetch(base+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
const LONG='WOW MOM WOW: KANSAS WINS BIG WHEN MWW MEETS DUKE, AND WE WATCH WITH WARM WINGS, MEMES, WAVES, WHOOPS, WOWS AND MMM WHAT A WILD WEEKNIGHT WOW';   // 140 chars max per bet; wide letters so it runs past 3 lines at 390
(async()=>{try{const id=await seed();const info=seed.info;const M=info.managers.map(m=>m.id);const K=i=>F.Keys(id).base+'-bets-'+M[i];
  const T=Date.now()-3600e3;let u=0;const ev=(k,o)=>Object.assign({k,u:'cu'+(++u).toString().padStart(6,'0'),ts:T+u*1000,v:25},o);const logs=[[],[],[],[],[],[],[],[]];
  const bet=(by,to,bid,text,o)=>{o=o||{};logs[by].push(ev('p',{id:bid,to:M[to],amt:10,a:1,b:1,text}));if(o.acc)logs[to].push(ev('a',{id:bid}));if(o.s)logs[by].push(ev('s',{id:bid,r:o.s}))};
  bet(0,1,'cbet000001',LONG,{acc:1});bet(0,2,'cbet000002','Duke beats UNC',{acc:1});bet(1,0,'cbet000003','Short one');bet(2,0,'cbet000004','Florida beats Miami by more than 6.5 points',{acc:1,s:'b'});
  bet(3,4,'cbet000005','Over 150 in Kentucky vs Louisville',{acc:1});bet(5,0,'cbet000006',LONG.slice(0,100));
  for(let i=0;i<8;i++)await post(K(i),{v:1,ev:logs[i]});
  const open=async w=>{const P=await L.phone('cd'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:1000});await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});
    await P.go('league.html?l='+id+'#bets');await P.page.waitForSelector('#b27Grid [data-bet]',{timeout:25000});await sleep(1200);return P};
  for(const w of [1280,1600]){const P=await open(w);
    const rows=await P.page.evaluate(()=>{const cs=[...document.querySelectorAll('.b27-grid > [data-bet]')];const by={};cs.forEach(c=>{const r=c.getBoundingClientRect();const k=c.parentElement.id+'|'+Math.round(r.top);const rx=c.querySelector('.b27-rx').getBoundingClientRect();(by[k]=by[k]||[]).push({h:Math.round(r.height),b:Math.round(r.bottom),rxb:Math.round(rx.bottom),rxt:Math.round(rx.top),mh:getComputedStyle(c).minHeight})});return Object.values(by)});
    const multi=rows.filter(r=>r.length>1);
    ok(w+'px: cards in each grid row have equal heights ('+multi.length+' rows with 2+ cards)',multi.length>=1&&multi.every(r=>Math.max(...r.map(x=>x.h))-Math.min(...r.map(x=>x.h))<=1),rows);
    ok(w+'px: reaction rows (bottom of each card) line up across each row',multi.every(r=>Math.max(...r.map(x=>x.rxt))-Math.min(...r.map(x=>x.rxt))<=1),rows);
    ok(w+'px: same min-height on every card (220px)',rows.flat().every(x=>x.mh==='220px'),rows.flat().map(x=>x.mh));
    await P.page.evaluate(()=>document.getElementById('b27Grid').scrollIntoView());await sleep(200);await P.page.screenshot({path:SH+'/s25_cards_'+w+'.png'});await P.page.close()}
  {const P=await open(390);const sel='[data-bet=cbet000001]';
    const st=()=>P.page.evaluate(sel=>{const c=document.querySelector(sel),t=c.querySelector('.b27-t'),b=c.querySelector('.b27-more'),lh=parseFloat(getComputedStyle(t).lineHeight)||20,r=b&&b.getBoundingClientRect();return{h:t.clientHeight,sh:t.scrollHeight,lines:Math.round(t.clientHeight/lh),hid:b.hidden,lab:b.innerText,ae:b.getAttribute('aria-expanded'),ac:b.getAttribute('aria-controls')===t.id,bw:r.width,bh:r.height}},sel);
    let a=await st();ok('390px: long text clamped to 3 lines, "more" shown (aria-expanded=false, aria-controls), tap target >= 44px',a.lines===3&&!a.hid&&a.lab==='more'&&a.ae==='false'&&a.ac&&a.bw>=44&&a.bh>=44,a);
    await P.page.evaluate(sel=>document.querySelector(sel).scrollIntoView({block:'center'}),sel);await sleep(150);await P.page.screenshot({path:SH+'/s25_cards_390.png'});
    await P.page.click(sel+' .b27-more');await sleep(400);a=await st();ok('tap "more": full text shown, button says "less", aria-expanded=true',a.lines>3&&a.lab==='less'&&a.ae==='true'&&!a.hid,a);
    await P.page.click(sel+' .b27-more');await sleep(400);a=await st();ok('tap "less": clamped again',a.lines===3&&a.lab==='more'&&a.ae==='false',a);
    ok('short text: no "more" button',await P.page.$eval('[data-bet=cbet000002] .b27-more',b=>b.hidden));await P.page.close()}
  {const P=await open(320);const o=await P.page.evaluate(()=>({sw:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('[data-bet]')].filter(c=>c.getBoundingClientRect().right>innerWidth+0.5).length}));ok('320px: no overflow',o.sw<=320&&o.cards===0,o);await P.page.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
