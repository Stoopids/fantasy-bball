/* s25 LINKS-HOOK on the League site: commissioner-only "Your links" button + sheet (Draft Room js/links-card.js). node tests/e2e_links_s25.js (APP / API env) */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;
const SH=process.env.SHOTS||'/workspace/league-site-work/compare-s25';
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
(async()=>{try{const id=await seed();const info=seed.info;
  const open=async(w,who)=>{const P=await L.phone('lk'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:900});
    await P.page.evaluateOnNewDocument((id,who,cm,me)=>{if(who==='cm'){localStorage.setItem('fbn.cm.'+id,cm);localStorage.setItem('fbn.me.'+id,JSON.stringify(me))}if(who==='mgr')localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.mid2,k:me.k2}))},id,who,info.cmSecret,{mid:info.managers[0].id,k:info.managers[0].k,mid2:info.managers[1].id,k2:info.managers[1].k});
    await P.go('league.html?l='+id);await P.page.waitForSelector('#lhdr',{timeout:25000});await sleep(1500);return P};
  for(const who of ['mgr','watch']){const P=await open(390,who);ok(who+': no "Your links" button',!(await P.page.$('#yourlinks')));
    await P.page.evaluate(()=>{const b=document.createElement('button');b.dataset.a='yourlinks';document.getElementById('lhdr').appendChild(b);b.click()});await sleep(500);ok(who+': a forced tap opens nothing',!(await P.page.$('#lcard')));await P.page.close()}
  for(const w of [320,360,390,1280]){const P=await open(w,'cm');
    const b=await P.page.evaluate(()=>{const e=document.getElementById('yourlinks');if(!e)return null;const r=e.getBoundingClientRect();return{w:r.width,h:r.height,r:r.right,t:e.innerText}});
    ok(w+'px commissioner: "Your links" button, >= 44px, in view',b&&/Your links/.test(b.t)&&b.w>=44&&b.h>=44&&b.r<=w,b);
    await P.page.click('#yourlinks');await P.page.waitForSelector('#lcard',{timeout:5000});await sleep(300);
    const s=await P.page.evaluate(()=>{const bs=[...document.querySelectorAll('#lcard .btn, #sheetwrap [data-a=sheetbg].btn')];const sb=document.querySelector('#sheetwrap .sheetbg'),sh=document.querySelector('#sheetwrap .sheet').getBoundingClientRect();return{fx:sb&&getComputedStyle(sb).position,inview:sh.top>=0&&sh.bottom<=innerHeight+1&&sh.left>=0&&sh.right<=innerWidth+0.5,h2:(document.querySelector('#sheetwrap h2')||{}).innerText,small:bs.filter(e=>{const r=e.getBoundingClientRect();return r.height<44||r.width<44}).length,n:bs.length,sw:document.documentElement.scrollWidth,
      out:bs.filter(e=>e.getBoundingClientRect().right>innerWidth+0.5).length,mail:decodeURIComponent((document.getElementById('lc_email')||{}).href||'')}});
    ok(w+'px: sheet "Save these links" shown as a fixed overlay in view, every button >= 44px, no overflow',s.fx==='fixed'&&s.inview&&s.h2==='Save these links'&&s.n>=4&&s.small===0&&s.out===0&&s.sw<=w,s);
    if(w===390){const m=s.mail;const urls=m.match(/https?:\/\/[^\s]+/g)||[];
      const pub=urls.filter(u=>!u.includes('#'));ok('links keep the league code (?l='+id+') on every link',urls.length>=3&&urls.every(u=>u.includes('l='+id)),urls);
      ok('public links (invite / room / watch) carry no identity: no secret, no #',pub.length>=3&&pub.every(u=>!u.includes(info.cmSecret)&&!u.includes(info.managers[0].k)),pub);
      ok('private links (only from this device) keep the secret after the # only, never in the query',urls.filter(u=>u.includes('#')).every(u=>u.split('#')[0].indexOf(info.cmSecret)<0&&u.split('#')[0].indexOf(info.managers[0].k)<0),urls);
      await P.page.screenshot({path:SH+'/s25_links_390.png'})}
    await P.page.click('#sheetwrap [data-a=sheetbg].btn');await sleep(300);ok(w+'px: Close closes the sheet',!(await P.page.$('#lcard')));await P.page.close()}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
