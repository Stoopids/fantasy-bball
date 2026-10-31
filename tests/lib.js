/* shared e2e helpers: puppeteer-core + system Chrome, mock store injected through localStorage fbn.store */
const puppeteer=require('puppeteer-core');
const APP=process.env.APP||'http://localhost:9995',API=process.env.API||'http://localhost:9996/api/data/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
async function launch(){if(!browser)browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});return browser}
async function close(){if(browser){await browser.close();browser=null}}
/* one isolated "phone": its own incognito context, 390x844 */
async function phone(name,opt){opt=opt||{};const b=await launch();const ctx=await b.createBrowserContext();const page=await ctx.newPage();
  await page.setViewport({width:opt.w||390,height:opt.h||844,deviceScaleFactor:opt.dsf||1,isMobile:!opt.desktop,hasTouch:!opt.desktop});
  if(opt.tz)await page.emulateTimezone(opt.tz);
  {const now=opt.now||process.env.LNOW;if(now)await page.evaluateOnNewDocument(n=>{try{localStorage.setItem('fbn.now',n)}catch(e){}},now)}   /* s25: test clock for the date-windowed League tabs (honoured on localhost only) */
  const errs=[];page.on('pageerror',e=>errs.push('pageerror: '+e.message));page.on('console',m=>{if(/\[dbg\]/.test(m.text())&&process.env.DBGLOG)console.log('   ['+name+']',m.text());if(m.type()==='error'&&!/ERR_|Failed to load resource|espncdn|net::|site\.api\.espn\.com/i.test(m.text()))errs.push('console: '+m.text())});
  const store=opt.real?null:'/api/data/';
  await page.evaluateOnNewDocument((store,perm)=>{try{if(store)localStorage.setItem('fbn.store',store);else localStorage.removeItem('fbn.store')}catch(e){}},store);
  await page.evaluateOnNewDocument(()=>{window.__toasts=[];document.addEventListener('DOMContentLoaded',()=>{const t=document.getElementById('toast');if(!t)return;new MutationObserver(()=>{const x=t.innerText;if(x&&window.__toasts[window.__toasts.length-1]!==x)window.__toasts.push(x)}).observe(t,{childList:true,characterData:true,subtree:true})})});
  const P={name,ctx,page,errs,go:async(p)=>{await page.goto(APP+'/'+p,{waitUntil:'domcontentloaded'})},
    shot:async(f)=>{await page.screenshot({path:require('path').join(__dirname,'..','shots')+'/'+f+'.png'})},close:()=>ctx.close()};
  return P}
module.exports={launch,close,phone,sleep,APP,API};
