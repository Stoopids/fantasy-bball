/* Label scan (Paul): the Redraft is always written "Redraft" in tabs, pills, buttons, links and headings, and never "Jan 20 redraft" / "Jan 20" (the date is written "January 20, 2027" in body text).
   1. STATIC: no "Jan 20" in any shipped html/js/css; no lowercase "redraft" as the whole text of a tag (h1-h4, button, a, summary, label, th, b) or at the start of a label string.
   2. RENDERED (390 and 1280): the text of every tab / pill / button / link / heading on room (all tabs), recap, redraft, league (all tabs) and help, home has no lowercase "redraft" and no "Jan 20".
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/test_labels.js   (APP / API env) */
const TX=require('./tabs_exp.js');   /* s25 */
const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
process.env.APP=process.env.APP||'http://localhost:9995';process.env.API=process.env.API||'http://localhost:9996/api/data/';
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const API=process.env.API;
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}};
const LOWER=/(^|[^A-Za-z0-9_#.\/-])redraft(?![A-Za-z0-9_(.:\/=-])/;      /* a plain lowercase word, not an identifier, URL, file or key */
const JAN=/\bJan\.? 20\b/;
/* ---- 1. static ---- */
const files=[...fs.readdirSync(root).filter(f=>/\.html$/.test(f)),...fs.readdirSync(root+'/js').filter(f=>/\.js$/.test(f)&&f!=='qr.min.js').map(f=>'js/'+f),...fs.readdirSync(root+'/css').filter(f=>/\.css$/.test(f)).map(f=>'css/'+f),'manifest.webmanifest'];
{const hits=[];files.forEach(f=>{const s=fs.readFileSync(path.join(root,f),'utf8');const m=JAN.exec(s);if(m)hits.push(f+': '+s.slice(Math.max(0,m.index-30),m.index+30))});ok('no "Jan 20" in any shipped html / js / css file (the date is "January 20, 2027")',hits.length===0,hits)}
{const hits=[];const tag=/<(h[1-6]|button|a|summary|label|th|b|strong|span)\b[^>]*>\s*([^<>]*)</g;files.filter(f=>!/css$/.test(f)).forEach(f=>{const s=fs.readFileSync(path.join(root,f),'utf8');let m;while((m=tag.exec(s))){if(/\bredraft\b/.test(m[2])&&LOWER.test(m[2]))hits.push(f+': '+m[0].slice(0,80))}
  const lab=/['"`]\s*(?:[^\w'"`\s]{1,4}\s*)?redraft\b[^'"`]*['"`]/g;while((m=lab.exec(s))){const t=m[0].slice(1,-1).trim();if(/^redraft$/.test(t)||/^redraft[.\-:#\/_]/.test(t)||/^redraft\w/.test(t))continue;hits.push(f+': '+m[0].slice(0,80))}});
  ok('no lowercase "redraft" as the text of a heading, button, link, tag or label string in any html / js file',hits.length===0,hits)}
/* ---- 2. rendered ---- */
const LABELS='button,a,h1,h2,h3,h4,summary,label,th,.pill,.tag,.chip,.btn,[role=tab],nav *,#tabs *,#ltabs *,.tabs *,.rccount b,.banner b';
const scan=(P)=>P.page.evaluate((sel)=>{const out=[];document.querySelectorAll(sel).forEach(e=>{const t=(e.innerText||'').trim();if(t&&t.length<200)out.push(t)});out.push(document.title);return out},LABELS);
const bodyT=P=>P.page.$eval('body',e=>e.innerText).catch(()=>'');
const check=async(name,P)=>{const ls=await scan(P);const b=await bodyT(P);const bl=ls.filter(t=>LOWER.test(t)||JAN.test(t));ok(name+': no lowercase "redraft" and no "Jan 20" in any tab / pill / button / link / heading',bl.length===0,bl.slice(0,5));ok(name+': "Jan 20 redraft" appears nowhere in the page text',!/Jan\.? 20 redraft/i.test(b)&&!JAN.test(b),b.match(/.{20}Jan\.? 20.{20}/)||'')};
(async()=>{try{
const id=await seed(API,{managers:8,rounds:4});const I=seed.info;const m0=I.managers[0];const cm='#cm='+I.cmSecret,mg='#as='+m0.id+'&k='+m0.k;
const live=await seed(API,{managers:8,rounds:4,live:true,picksMade:2});const IL=seed.info;
for(const [w,h,d] of [[390,844,0],[1280,900,1]]){
  const o=d?{desktop:true,w,h}:{};const pre=w+'px ';
  const open=async(url)=>{const P=await L.phone('lb'+w,o);await P.page.setBypassServiceWorker(true).catch(()=>{});await P.page.goto(APP+'/'+url,{waitUntil:'domcontentloaded'});await sleep(1800);await P.page.evaluate(()=>{const b=document.querySelector('[data-a=idclose]');if(b)b.click()});return P};
  /* room, finished league: every tab, as commissioner */
  let P=await open(`room.html?l=${id}${cm}`);await P.page.waitForSelector('#tabs',{timeout:25000}).catch(()=>{});
  const tabs=await P.page.evaluate(()=>[...document.querySelectorAll('#tabs [data-t]')].map(b=>b.dataset.t));ok(pre+'room has its tabs',tabs.length>=4,tabs);
  for(const t of tabs){await P.page.evaluate(t=>{const b=document.querySelector('#tabs [data-t='+t+'],[data-t='+t+']');if(b)b.click()},t);await sleep(600);await check(pre+'room tab '+t+' (finished league)',P)}
  ok(pre+'room: no page errors',P.errs.length===0,P.errs);await P.close();
  /* room during the draft (live), manager */
  P=await open(`room.html?l=${live}#as=${IL.managers[0].id}&k=${IL.managers[0].k}`);await P.page.waitForSelector('#tabs',{timeout:25000}).catch(()=>{});
  const tl=await P.page.evaluate(()=>[...document.querySelectorAll('#tabs [data-t]')].map(b=>b.dataset.t));for(const t of tl){await P.page.evaluate(t=>{const b=document.querySelector('[data-t='+t+']');if(b)b.click()},t);await sleep(500);await check(pre+'room tab '+t+' (live draft)',P)}await P.close();
  /* recap, redraft page (spectator and commissioner), help, home, setup, join */
  for(const [nm,url,wait] of [['recap',`recap.html?l=${id}${mg}`,'#recaphead'],['redraft (manager)',`redraft.html?l=${id}${mg}`,'#rapp[data-ready]'],['redraft (commissioner)',`redraft.html?l=${id}${cm}`,'#rapp[data-ready]'],['help','help.html','#helppage'],['home','index.html','#landing'],['join',`join.html?l=${live}`,'body'],['time page',`time.html?t=${Date.now()+864e5}`,'body']]){
    P=await open(url);await P.page.waitForSelector(wait,{timeout:20000}).catch(()=>{});await sleep(800);await check(pre+nm,P);await P.close()}
  /* league site: every tab */
  P=await open(`league.html?l=${id}`);await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000}).catch(()=>{});await sleep(500);
  const lt=await P.page.evaluate(()=>[...document.querySelectorAll('#ltabs [data-v]')].map(b=>b.dataset.v));ok(pre+'league site has its tabs (all visible at the test clock'+(TX.has('redraft')?', incl. redraft':'')+')',JSON.stringify(lt)===JSON.stringify(TX.vis),lt);
  for(const t of lt){await P.page.evaluate(t=>{const b=document.querySelector('#ltabs [data-v='+t+']');if(b)b.click()},t);await sleep(500);await check(pre+'league tab '+t,P)}
  const tl2=await P.page.evaluate(()=>{const b=document.querySelector('#ltabs [data-v=redraft]');return b?b.innerText.replace(/\s+/g,' ').trim():null});if(TX.has('redraft'))ok(pre+'the league site Redraft tab reads exactly "Redraft" (with its icon)',/^(🔄\s*)?Redraft$/.test(tl2||''),tl2);
  await P.close()}
console.log('\n'+(n-bad)+'/'+n+' passed'+(bad?'  FAILED: '+fails.join(' | '):''));process.exitCode=bad?1:0}catch(e){console.log(e.stack);process.exitCode=1}finally{await L.close()}})();
