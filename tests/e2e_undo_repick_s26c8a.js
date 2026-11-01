/* s26c8a regression: Undo must void only the ORIGINAL pick instance. Solo mock, seat 8, 30s clock, Best bots; at 390 px and 1280 px:
   (1) undo an auto (bot) pick, (2) double undo, (3) undo a manual pick (seat 8 picks #8) -> the draft keeps advancing, never stuck on 0:00 AUTO-PICKING.
   Mock store only (fbn.store=/api/data/), textdb.dev aborted.  needs: node tools/mock_textdb.js <appPort> "$PWD" <apiPort>; APP=http://localhost:<appPort> node tests/e2e_undo_repick_s26c8a.js
   PW = path to playwright (default /workspace/draftroom-notes/scrolljump/node_modules/playwright). */
const {chromium}=require(process.env.PW||'/workspace/draftroom-notes/scrolljump/node_modules/playwright');
const APP=process.env.APP||'http://localhost:18841';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const J=s=>{try{return JSON.parse(s)}catch(e){return null}};const dump=async k=>(await fetch(APP+'/__dump/'+encodeURIComponent(k))).text();
let n=0,bad=0;const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const F=require('../js/core.js');
async function count(id){const m=J(await dump('fbn1-'+id.toLowerCase()+'-meta'));const ents={};for(let i=1;i<=16;i++){const e=F.parseEntry(await dump('fbn1-'+id.toLowerCase()+'-e'+m.epoch+'-p'+i));if(e)ents[i]=e}
  return{m,picks:F.replay(m,ents,null).picks}}
const waitN=async(id,k,ms)=>{const t=Date.now();let c;while(Date.now()-t<ms){c=await count(id);if(c.picks.length>=k)return c;await sleep(500)}return c};
async function undo(p){await p.evaluate(()=>{location.hash='#tab=more'});await sleep(300);
  await p.locator('#undobtn').click({timeout:10000});await p.locator('#cfyes').click({timeout:10000});await sleep(800)}
(async()=>{const B=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
for(const w of [390,1280]){const pre=w+'px: ';const ctx=await B.newContext({viewport:{width:w,height:w<500?844:900},isMobile:w<500,hasTouch:w<500});
  await ctx.route(/textdb\.dev/,r=>r.abort());await ctx.addInitScript(()=>{localStorage.setItem('fbn.store','/api/data/')});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(APP+'/mock.html');await p.waitForSelector('#m_seat');await p.selectOption('#m_seat','8');await p.selectOption('#m_clock','30');
  await p.click('#startmock');await p.waitForURL(/room\.html\?l=/,{timeout:30000});const id=new URL(p.url()).searchParams.get('l');
  let c=await waitN(id,2,30000);ok(pre+'bots made picks #1-#2',c.picks.length>=2,c.picks.length);
  /* 1: undo an auto pick */
  const before=c.picks.length;await undo(p);c=await count(id);ok(pre+'undo removed an auto pick',c.picks.length===before-1,[before,c.picks.length]);
  c=await waitN(id,before+1,45000);ok(pre+'after undoing an auto pick the draft advances past it',c.picks.length>=before+1,c.picks.length);
  /* 2: double undo */
  const b2=c.picks.length;await undo(p);await undo(p);c=await count(id);ok(pre+'double undo removed two picks',c.picks.length===b2-2,[b2,c.picks.length]);
  c=await waitN(id,b2+1,60000);ok(pre+'after a double undo the draft advances',c.picks.length>=b2+1,c.picks.length);
  /* 3: manual pick at #8 (my seat), undo it, pick the SAME team again */
  c=await waitN(id,7,90000);ok(pre+'reached my pick #8',c.picks.length===7,c.picks.length);
  const tid=await p.evaluate(()=>{location.hash='#tab=teams';const r=document.querySelector('.trow.go .dbtn');return r&&r.dataset.t});await sleep(400);
  const mine=async()=>{await p.evaluate(()=>{location.hash='#tab=teams'});await sleep(400);await p.locator('.trow.go[data-t="'+tid+'"] .dbtn').first().click({position:{x:4,y:4}});
    await p.locator('[data-a="confirm"]').first().click({timeout:10000});};
  await mine();c=await waitN(id,8,15000);ok(pre+'manual pick #8 landed',c.picks.length>=8&&c.picks[7].by!=='auto',c.picks[7]);
  if(c.picks.length===8){await undo(p);c=await count(id);ok(pre+'manual pick undone',c.picks.length===7,c.picks.length);
    await mine();c=await waitN(id,8,15000);ok(pre+'re-picking the same team after undo lands',c.picks.length>=8&&c.picks[7].tid===String(tid),c.picks[7])}
  c=await waitN(id,10,60000);ok(pre+'draft keeps advancing after manual undo (>=10 picks)',c.picks.length>=10,c.picks.length);
  const ids=c.picks.map(x=>x.id);ok(pre+'no live pick id is on the voided list',ids.every(i=>c.m.voided.indexOf(i)<0));
  const stuck=await p.evaluate(()=>{const e=document.getElementById('cdv');return e?e.innerText:''});ok(pre+'not stuck on 0:00 AUTO-PICKING',!/0:00\s*AUTO-PICKING/.test(stuck)||c.picks.length>=10,stuck);
  ok(pre+'no page errors',errs.length===0,errs);ok(pre+'no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await ctx.close()}
await B.close();console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)})().catch(e=>{console.error(e);process.exit(2)});
