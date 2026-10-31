/* s25 League "remember this device" security (modeled on e2e_security's three secret checks).
   A k= / as= / cm= arriving at league.html is taken out of the address bar and history at once, a wrong one is never stored, a right one signs the device in once;
   no request carries it (query or Referer); League never builds a URL with k= / as= / cm=.  APP / API env (mock store). */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const fs=require('fs'),path=require('path');const {sleep}=L;const root=path.join(__dirname,'..');
const APP=process.env.APP||'http://localhost:8470';
let n=0,bad=0;function ok(t,c,x){n++;if(c)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,500):''))}}
const rnd=()=>[...Array(32)].map(()=>'0123456789abcdef'[Math.random()*16|0]).join('');
const SECRET=/[?&#](k|as|cm)=/;
async function backUrl(P){await P.page.goto(APP+'/help.html',{waitUntil:'domcontentloaded'});await P.page.goBack({waitUntil:'domcontentloaded'});return P.page.url()}   /* the history entry left behind */
async function visit(id,suffix,o){o=o||{};const P=await L.phone('ls'+Math.random().toString(36).slice(2,6),{w:390,h:900});const reqs=[];
  await P.page.evaluateOnNewDocument(()=>{window.__copied=[];try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:t=>{window.__copied.push(t);return Promise.resolve()}}})}catch(e){}
    window.__early=null;document.addEventListener('DOMContentLoaded',()=>{if(window.__early==null)window.__early=location.href})});
  await P.page.setBypassServiceWorker(true);P.page.on('request',r=>reqs.push({u:r.url(),ref:(r.headers()['referer']||'')}));
  await P.page.goto(APP+'/league.html?l='+id+suffix,{waitUntil:'domcontentloaded'});await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000}).catch(()=>{});await sleep(1200);
  const st=await P.page.evaluate(id=>({href:location.href,early:window.__early,me:localStorage.getItem('fbn.me.'+id),cm:localStorage.getItem('fbn.cm.'+id),hlen:history.length,body:document.body.innerText.slice(0,4000)}),id);
  return{P,reqs,st}}
(async()=>{try{
  const id=await seed(null,{rounds:8});const info=seed.info;const M0=info.managers[0];
  /* A. wrong secret (query) */
  let r=await visit(id,'&as='+M0.id+'&k='+rnd());
  ok('wrong secret: the device is not stored as that manager',!r.st.me,r.st.me);
  ok('wrong secret: the secret was removed from the address bar',!SECRET.test(r.st.href),r.st.href);
  ok('wrong secret: already gone when the page finished parsing (before other scripts read it)',r.st.early&&!SECRET.test(r.st.early),r.st.early);
  ok('wrong secret: the page says the link is not valid',/not valid/i.test(r.st.body));
  const back=await backUrl(r.P);
  ok('wrong secret: not in history either (replaced, Back does not bring it back)',!SECRET.test(back),back);await r.P.close();
  /* B. right manager link (hash, as the draft room writes it) */
  r=await visit(id,'#as='+M0.id+'&k='+M0.k);
  ok('the manager link secret is removed from the address bar after use',!SECRET.test(r.st.href),r.st.href);
  ok('a right manager link signs this device in once (stored on the device)',(()=>{try{const v=JSON.parse(r.st.me);return v.mid===M0.id&&v.k===M0.k}catch(e){return false}})(),r.st.me);
  ok('no request after the page opened carries the secret (URL or Referer)',r.reqs.slice(1).every(q=>!q.u.includes(M0.k)&&!q.ref.includes(M0.k)),r.reqs.slice(1).filter(q=>q.u.includes(M0.k)||q.ref.includes(M0.k)));
  /* copied / shared links + every href on the page carry no identity */
  const links=await r.P.page.evaluate(async()=>{const b=document.querySelector('[data-a=copylink],[data-a=cplink],#copylink');if(b)b.click();await new Promise(x=>setTimeout(x,300));return{hrefs:[...document.querySelectorAll('a[href]')].map(a=>a.href),copied:window.__copied.slice()}});
  ok('no link on the page carries k= / as= / cm= (room, mock, recap, redraft, share)',links.hrefs.every(h=>!SECRET.test(h)),links.hrefs.filter(h=>SECRET.test(h)));
  ok('copied links carry only the league code',links.copied.every(t=>!SECRET.test(t)&&/[?&]l=/.test(t)),links.copied);await r.P.close();
  /* reload of the clean URL: still signed in from the device, nothing in the URL */
  /* C. commissioner secret */
  r=await visit(id,'&cm='+info.cmSecret);
  ok('commissioner secret is removed from address bar and history',!SECRET.test(r.st.href)&&!SECRET.test(await backUrl(r.P)),r.st.href);
  ok('a right commissioner secret is kept on this device only',r.st.cm===info.cmSecret,r.st.cm);await r.P.close();
  r=await visit(id,'&cm='+rnd());ok('a wrong commissioner secret is stripped and not stored',!SECRET.test(r.st.href)&&!r.st.cm,r.st);await r.P.close();
  /* D. other params are kept; the referrer policy */
  r=await visit(id,'&demo=1&k='+rnd()+'#games');ok('other params kept while the secret is stripped',/[?&]l=/.test(r.st.href)&&!SECRET.test(r.st.href),r.st.href);await r.P.close();
  const html=fs.readFileSync(path.join(root,'league.html'),'utf8');
  ok('league.html: no-referrer policy and the URL step (league-d.js) loads right after core.js + scoring.js, before store/ui/any fetch',/<meta name="referrer" content="no-referrer">/.test(html)&&/js\/core\.js"><\/script>\s*<script src="js\/scoring\.js"><\/script>\s*<script src="js\/league-d\.js">/.test(html));
  /* E. source audit: League never builds a URL with k= / as= / cm= */
  const LF=['js/leaguehome.js',...fs.readdirSync(path.join(root,'js')).filter(f=>/^league-.*\.js$/.test(f)).map(f=>'js/'+f)];
  const hits=[];for(const f of [...new Set(LF)]){const s=fs.readFileSync(path.join(root,f),'utf8');
    (s.match(/pageUrl\([^)]*\{[^}]*\}/g)||[]).forEach(x=>{if(/\b(k|as|cm)\s*:/.test(x))hits.push(f+': '+x)});(s.match(/['"`][^'"`]*[?&#](k|as|cm)=[^'"`]*['"`]/g)||[]).forEach(x=>hits.push(f+': '+x))}
  ok('League files never put k= / as= / cm= in a URL they build',hits.length===0,hits);
  const shim=fs.readFileSync(path.join(root,'js/league-d.js'),'utf8');ok('shim defers to Draft Room\'s F.consumeUrlSecret when present',/typeof F\.consumeUrlSecret!=='function'/.test(shim));
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
