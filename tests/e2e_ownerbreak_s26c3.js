/* s26c3 OWNER BREAKDOWN (Rosters tab, "Tap an owner for the full breakdown"): compact rows + per-category points.
   At 320/390/1280: no sideways scroll; each school's category chips sum to its Total (and Total = W x win points + NCAA pts);
   by default only non-zero chips show; "Show all categories" lists all 10 (zeros too; s26c5: no Losses category, conference titles score) and the sum still matches; taps >= 44px; no "Test " prefix, no money words.
   APP=http://localhost:8793 API=http://localhost:8794/api/data/ node tests/e2e_ownerbreak_s26c3.js */
const L=require('./lib.js'),path=require('path');const {seed}=require('./seed_league.js');const root=path.join(__dirname,'..');
const fx=require('./fixture_s26c3.js')(root);const open=require('./open_s26c3.js');
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,700):''))}}
const read=P=>P.page.evaluate(()=>{const k=document.querySelector('.obk');if(!k)return null;const kr=k.getBoundingClientRect();
  const rows=[...k.querySelectorAll('.obr')].map(r=>{const ps=[...r.querySelectorAll('.obp')].map(p=>({k:p.dataset.cat,pts:+p.dataset.pts,txt:p.innerText.trim()}));const ns=[...r.querySelectorAll('.obl > .n')].map(x=>x.innerText.trim());
    const ch=r.querySelector('.obt .chip'),cr=ch&&ch.getBoundingClientRect(),hit=ch&&getComputedStyle(ch,'::before');
    return{total:+r.dataset.total,shown:+ns[3],w:+ns[1],ncaa:+ns[2],ps,lh:Math.round(r.querySelector('.obl').getBoundingClientRect().height),chipH:cr?Math.round(cr.height+(hit&&hit.content!=='none'?parseFloat(hit.top)*-1+parseFloat(hit.bottom)*-1:0)):0,
      outR:[...r.querySelectorAll('*')].some(e=>{const b=e.getBoundingClientRect();return b.width&&b.right>kr.right+0.5})}});
  const tg=k.querySelector('[data-a=oball]').getBoundingClientRect();
  return{sw:document.documentElement.scrollWidth,iw:innerWidth,kw:k.scrollWidth-k.clientWidth,rows,tg:{w:tg.width,h:tg.height},txt:document.getElementById('lapp').innerText,hdr:document.getElementById('ownercard').innerText}});
(async()=>{try{const id=await seed(null,{name:'Test League s26c3',names:fx.NAMES,rosters:fx.rosters,rounds:8});const info=seed.info;
  for(const w of [320,390,1280]){const P=await open(L,root,w,fx,id,info);let r=await read(P);
    ok(w+'px owner breakdown rendered with 8 schools',r&&r.rows.length===8,r&&r.rows.length);
    ok(w+'px no horizontal overflow (page and card)',r.sw<=r.iw&&r.kw<=0&&r.rows.every(x=>!x.outR),{sw:r.sw,iw:r.iw,kw:r.kw});
    ok(w+'px category chips sum to each team total',r.rows.every(x=>x.ps.reduce((a,c)=>a+c.pts,0)===x.total&&x.shown===x.total),r.rows.map(x=>[x.total,x.shown,x.ps.map(c=>c.pts)]));
    const cf=x=>x.ps.filter(c=>/^conf_/.test(c.k)).reduce((a,c)=>a+c.pts,0);ok(w+'px total = W x 1 + conference titles + NCAA pts (js/scoring.js values)',r.rows.every(x=>x.total===x.w+x.ncaa+cf(x)),r.rows.map(x=>[x.w,cf(x),x.ncaa,x.total]));
    if(r.rows.some(x=>x.ps.length>=10))ok(w+'px no Losses chip',r.rows.every(x=>!x.ps.some(c=>c.k==='losses')));
    ok(w+'px default: only non-zero chips',r.rows.every(x=>x.ps.every(c=>c.pts!==0)),r.rows.map(x=>x.ps));
    ok(w+'px real non-zero points present (a negative too)',r.rows.some(x=>x.total>20)&&r.rows.some(x=>x.total<0),r.rows.map(x=>x.total));
    ok(w+'px taps >= 44px (row, chip hit area, toggle)',r.rows.every(x=>x.lh>=44&&x.chipH>=44)&&r.tg.h>=44&&r.tg.w>=44,{rows:r.rows.map(x=>[x.lh,x.chipH]),tg:r.tg});
    ok(w+'px no "Test " prefix in the header, no money words',!/\bTest /.test(r.hdr)&&!/\b(money|cash|dollars?|\$\d|bucks|pay|paid|owes? money)\b/i.test(r.txt.replace(/💵 Bets|💰 Tally/g,'')),r.hdr);
    const h0=r.rows.map(x=>x.lh);
    await P.page.click('[data-a=oball]');await L.sleep(300);r=await read(P);
    ok(w+'px "Show all categories": 10 chips per school (no Losses), zeros shown',r.rows.every(x=>x.ps.length===10&&!x.ps.some(c=>c.k==='losses'))&&r.rows.some(x=>x.ps.some(c=>c.pts===0)),r.rows.map(x=>x.ps.length));
    ok(w+'px all categories still sum to the total, still no overflow',r.rows.every(x=>x.ps.reduce((a,c)=>a+c.pts,0)===x.total)&&r.sw<=r.iw&&r.rows.every(x=>!x.outR),{sw:r.sw});
    await P.page.click('[data-a=oball]');await L.sleep(300);r=await read(P);ok(w+'px toggle back: non-zero only again',r.rows.every(x=>x.ps.every(c=>c.pts!==0)));
    ok(w+'px no page errors',!P.errs.length,P.errs);await P.close()}
}catch(e){bad++;console.log('FAIL exception',e)}finally{await L.close();console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)}})();
