/* s26mo4 shots: mock setup (Customize collapsed + expanded), mock in progress, finished; 1280 + 390. fbn.store mock, textdb.dev aborted. */
const {chromium}=require(process.env.PW||'/workspace/draftroom-notes/scrolljump/node_modules/playwright');
const APP=process.env.APP,OUT=process.env.OUT;const sleep=ms=>new Promise(r=>setTimeout(r,ms));const errs=[];
(async()=>{const B=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
for(const w of [1280,390]){const ctx=await B.newContext({viewport:{width:w,height:w<500?844:900},isMobile:w<500,hasTouch:w<500,serviceWorkers:'block'});
  await ctx.route(/textdb\.dev/,r=>r.abort());await ctx.addInitScript(()=>{localStorage.setItem('fbn.store','/api/data/')});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(w+': '+e.message));
  await p.goto(APP+'/mock.html');await p.waitForSelector('#mockcust');
  const s1={bots:await p.$('#m_bots'),namesHidden:await p.evaluate(()=>getComputedStyle(document.getElementById('mocknames')).display==='none')};
  await p.screenshot({path:OUT+'/mock_setup_customize_hidden_'+w+'.png',fullPage:true});
  await p.click('#mockcust');await p.waitForSelector('#m_name',{state:'visible'});await p.fill('#m_name','Paul');await p.fill('#m_team','Hoop Dreams');
  await p.screenshot({path:OUT+'/mock_setup_customize_expanded_'+w+'.png',fullPage:true});
  console.log(w,'no m_bots:',!s1.bots,'names hidden by default:',s1.namesHidden);
  await p.selectOption('#m_seat','8');await p.selectOption('#m_clock','30');await p.click('#startmock');await p.waitForURL(/room\.html\?l=/,{timeout:30000});
  await p.waitForSelector('#oncard',{timeout:30000});await sleep(5000);
  await p.screenshot({path:OUT+'/mock_in_progress_'+w+'.png',fullPage:false});
  await p.evaluate(()=>{const t=document.getElementById('autotog');if(t&&!t.checked)t.click()});
  await p.waitForSelector('#finalbanner',{timeout:300000}).catch(()=>console.log('no finalbanner'));await sleep(1500);
  await p.screenshot({path:OUT+'/mock_finished_'+w+'.png',fullPage:false});await ctx.close()}
console.log('page errors:',errs.length,errs);await B.close()})();
