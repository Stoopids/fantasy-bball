/* s26c14 (Paul): Rules tab between Chat and More (Board, Teams, My Team, Chat, Rules, More). Holds Draft Rules (incl. 10. Rankings) + League Rules link (league.html?l=<id>#rules; not in mocks).
   No header Rules buttons (lobby, live, complete); no Rules card on post-draft More; lobby card keeps its Draft Rules / League Rules buttons. Tab bar: one row, no overflow at 320/360/390/1280.
   Mock store only. APP/API env; SHOTDIR saves rules-tab-390.png / rules-tab-360.png. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const path=require('path'),fs=require('fs');
const SD=process.env.SHOTDIR;if(SD)fs.mkdirSync(SD,{recursive:true});
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
(async()=>{try{
 const live=await seed(API,{managers:8,rounds:8,live:true,clockSecs:null,picksMade:3});const IL=seed.info;
 const done=await seed(API,{managers:8,rounds:2});const ID=seed.info;
 const lob=await seed(API,{managers:8,rounds:8,live:true,clockSecs:60,picksMade:0});const IB=seed.info;{const K=F.Keys(lob);const m=await gj(K.meta);m.status='lobby';delete m.startedAt;await post(K.meta,m)}
 for(const [tag,id,I] of [['live',live,IL],['complete',done,ID],['lobby',lob,IB]])for(const w of [320,360,390,1280]){const me=I.managers[0];
  const P=await L.phone(tag+w,w>700?{desktop:true,w,h:900}:{w,h:780});await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await sleep(3500);
  const t=await P.page.evaluate(()=>{const tb=document.getElementById('tabs');const as=[...tb.querySelectorAll('[data-t]')];const tops=new Set(as.map(a=>Math.round(a.getBoundingClientRect().top)));
    return{order:as.map(a=>a.dataset.t),labels:as.map(a=>a.innerText.replace(/\s+/g,' ').trim()),rows:tops.size,clip:as.filter(a=>{const r=document.createRange();r.selectNodeContents(a);const tw=[...a.childNodes].filter(n=>n.nodeType===3).reduce((s,n)=>{r.selectNode(n);return s+r.getBoundingClientRect().width},0);return a.scrollWidth>a.clientWidth+1||tw>a.clientWidth-2}).map(a=>a.dataset.t),over:tb.scrollWidth>tb.clientWidth+1,sx:document.documentElement.scrollWidth,hdr:!!document.querySelector('#rulesbtn_hdr,#leaguerules_hdr'),lobbyBtn:!!document.getElementById('rulesbtn_lobby')}});
  ok(`${tag} ${w}: tab order Board, Teams, My Team, Chat, Rules, More`,t.order.join()==='board,teams,my,chat,rules,more',t.order);
  ok(`${tag} ${w}: tab bar one row, no overflow, no clipped label`,t.rows===1&&!t.over&&!t.clip.length&&t.sx<=w+1,t);
  ok(`${tag} ${w}: no header Rules buttons`,!t.hdr);
  if(tag==='lobby')ok(`lobby ${w}: lobby card keeps Draft Rules button`,t.lobbyBtn);
  await P.page.evaluate(()=>document.getElementById('tab_rules').click());await sleep(900);
  const r=await P.page.evaluate(()=>({txt:(document.getElementById('rulestab')||{innerText:''}).innerText,lr:(document.getElementById('leaguerules_tab')||{}).getAttribute?document.getElementById('leaguerules_tab').getAttribute('href'):null,sel:document.getElementById('tab_rules').getAttribute('aria-selected'),close:[...document.querySelectorAll('#rulestab [data-dr2=close]')].some(b=>b.offsetParent)}));
  ok(`${tag} ${w}: Rules tab shows Draft Rules incl. 10. Rankings`,/Draft Rules/.test(r.txt)&&/10\.\s*Rankings/.test(r.txt)&&/STOOPID rank/.test(r.txt)&&/KenPom 2026-27 preseason ratings/.test(r.txt)&&r.sel==='true'&&!r.close,r);
  ok(`${tag} ${w}: League Rules link -> league.html?l=<id>#rules`,!!r.lr&&r.lr.includes('league.html')&&r.lr.includes(id)&&/#rules$/.test(r.lr),r.lr);
  if(SD&&tag==='live'&&(w===390||w===360))await P.page.screenshot({path:path.join(SD,'rules-tab-'+w+'.png')});
  if(tag==='complete'){await P.page.evaluate(()=>document.getElementById('tab_more').click());await sleep(800);ok(`complete ${w}: no Rules card on More`,!(await P.page.$('#rulescard')))}
  ok(`${tag} ${w}: 0 JS errors`,!P.errs.length,P.errs);await P.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
 await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed');process.exit(bad?1:0)})();
