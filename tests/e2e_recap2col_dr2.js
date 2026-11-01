/* DR2 s26c14 recap2col: two-column recap at >= 900px, one column below; "Go to <League name> League" button (escaped, new tab on desktop only).
   node tools/mock_textdb.js <p> "$PWD" <p+1>; APP=http://localhost:<p> API=http://localhost:<p+1>/api/data/ [BASE_APP=<base build on its own mock>] [SHOTDIR=] node tests/e2e_recap2col_dr2.js */
const L=require('./lib.js');const F=require('../js/core.js');const {seedRecap}=require('./recap_seed.js');const {sleep}=L;const path=require('path');
const API=process.env.API,AORIG=API.replace(/\/api\/data\/$/,''),SHOT=process.env.SHOTDIR;
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const raw=async(base,k)=>await (await fetch(base+'/__dump/'+encodeURIComponent(k))).text();
const post=(api,k,v)=>fetch(api+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof v==='string'?v:JSON.stringify(v)});
async function mk(api,name){const id=await seedRecap(api,{});const info=seedRecap.info;if(name!=null){const K=F.Keys(id).meta;const ab=api.replace(/\/api\/data\/$/,'');const m=JSON.parse(await raw(ab,K));m.name=name;await post(api,K,m)}return{id,me:info.managers[5]}}
async function open(app,lg,w){const desk=w>=900;const P=await L.phone('r'+w,desk?{desktop:true,w,h:900}:{w,h:844});await P.page.setBypassServiceWorker(true);
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k}))},lg.id,lg.me);
  await P.page.goto(app+'/recap.html?l='+lg.id,{waitUntil:'domcontentloaded'});await P.page.waitForSelector('#rc_foot',{timeout:20000});await P.page.waitForSelector('#grlist li',{timeout:20000}).catch(()=>{});await sleep(1500);return P}
const info=P=>P.page.evaluate(()=>{const r=id=>{const e=document.getElementById(id);if(!e)return null;const b=e.getBoundingClientRect();return{l:Math.round(b.left),t:Math.round(b.top+scrollY),w:Math.round(b.width),r:Math.round(b.right)}};
  const a=document.getElementById('rcsite'),s=a&&a.querySelector('.dr2lbl');
  return{iw:innerWidth,sw:document.documentElement.scrollWidth,H:document.documentElement.scrollHeight,CH:(document.getElementById('rc_conf')||{}).offsetHeight||0,g:r('powerrecap_s'),G:r('rc_grades'),A:r('rc_awards'),
   txt:{grade:(document.getElementById('rcmine')||{}).innerText||'',grades:(document.getElementById('grlist')||{}).innerText||'',awards:(document.getElementById('awgrid')||{}).innerText||''},
   btn:a?{label:a.innerText.trim(),html:a.innerHTML,href:a.getAttribute('href'),target:a.getAttribute('target'),rel:a.getAttribute('rel'),aw:Math.round(a.getBoundingClientRect().width),ar:Math.round(a.getBoundingClientRect().right),sw:s?s.scrollWidth:0,cw:s?s.clientWidth:0,ell:s?getComputedStyle(s).textOverflow:''}:null,
   inj:!!document.querySelector('#rc_site img,#rc_site script')||window.__xss===1,
   over:[...document.querySelectorAll('#powerrecap_s *,#rc_grades *,#rc_awards *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).length}});
(async()=>{try{
 const NAME="BALL DON'T LIE";
 const lg=await mk(API,NAME);
 const base=process.env.BASE_APP?{app:process.env.BASE_APP,api:process.env.BASE_API}:null;const blg=base?await mk(base.api,NAME):null;
 const H={};
 for(const w of [1280,390]){const P=await open(process.env.APP,lg,w);const I=await info(P);const pre=w+'px: ';
  ok(pre+'no horizontal scroll',I.sw<=I.iw,[I.sw,I.iw]);ok(pre+'nothing in the cards sticks out of the viewport',I.over===0,I.over);
  if(w===1280){ok(pre+'Your grade and League grades side by side (same top, grades to the right)',I.g&&I.G&&Math.abs(I.g.t-I.G.t)<4&&I.G.l>=I.g.r,{g:I.g,G:I.G});
   ok(pre+'Awards under Your grade in the left column',I.A&&I.A.l===I.g.l&&I.A.t>I.g.t&&I.A.r<=I.G.l,{A:I.A});
   ok(pre+'columns fit (each < 60% of the page width)',I.g.w<I.iw*0.6&&I.G.w<I.iw*0.6,[I.g.w,I.G.w]);
   ok(pre+'button target=_blank rel has noopener',I.btn.target==='_blank'&&/noopener/.test(I.btn.rel||''),I.btn);}
  else{ok(pre+'one column: the three cards stack with the same left edge and full width',I.g.l===I.G.l&&I.G.l===I.A.l&&I.G.t>I.g.t&&I.A.t>I.G.t&&Math.abs(I.g.w-I.G.w)<2,{g:I.g,G:I.G,A:I.A});
   ok(pre+'button has no target / rel (same tab)',I.btn.target==null&&I.btn.rel==null,I.btn);}
  ok(pre+'button label in title case "Go to Ball Don\'t Lie League"',I.btn.label==="Go to Ball Don't Lie League",I.btn.label);
  ok(pre+'button keeps its address (league.html?l=<id>)',I.btn.href==='league.html?l='+lg.id||/league\.html\?l=/.test(I.btn.href),I.btn.href);
  ok(pre+'no page errors / console errors',P.errs.length===0,P.errs);H[w]=I.H;
  if(SHOT){await P.page.evaluate(()=>scrollTo(0,0));await P.page.screenshot({path:path.join(SHOT,'after-'+w+'.png')});await P.page.screenshot({path:path.join(SHOT,'after-'+w+'-full.png'),fullPage:true})}
  if(base){const B=await open(base.app,blg,w);const J=await info(B);ok(pre+'grade, grades and award text unchanged vs the base build',JSON.stringify(J.txt)===JSON.stringify(I.txt),{base:J.txt.grade.slice(0,80),new:I.txt.grade.slice(0,80)});
   console.log('   '+pre+'page height base '+J.H+' -> new '+I.H+' ('+(J.H-I.H)+' px, '+Math.round((J.H-I.H)/J.H*100)+'%); Conference breakdown '+J.CH+' -> '+I.CH+' px; layout-only change '+((J.H-J.CH)-(I.H-I.CH))+' px');
   if(SHOT){await B.page.screenshot({path:path.join(SHOT,'before-'+w+'.png')});await B.page.screenshot({path:path.join(SHOT,'before-'+w+'-full.png'),fullPage:true})}await B.close()}
  await P.close()}


 /* What's next row: Back to Draft (room, same tab) + Go to <League> League + Share my grade, all >= 44px, no overflow */
 for(const w of [1280,390]){const P=await open(process.env.APP,lg,w);const pre=w+'px buttons: ';
  const b=await P.page.evaluate(()=>{const q=id=>{const e=document.getElementById(id);if(!e)return null;const r=e.getBoundingClientRect();return{t:e.innerText.trim(),href:e.getAttribute('href'),target:e.getAttribute('target'),rel:e.getAttribute('rel'),h:Math.round(r.height),r:Math.round(r.right),top:Math.round(r.top),hidden:e.hidden}};
   return{d:q('rcdraft'),l:q('rcsite'),s:q('rcsharegrade'),iw:innerWidth,sw:document.documentElement.scrollWidth,row:document.querySelector('#rc_site .rcrow').scrollWidth<=document.querySelector('#rc_site .rcrow').clientWidth}});
  ok(pre+'"Back to Draft" present, room route, same tab',b.d&&b.d.t==='Back to Draft'&&/room\.html\?l=/i.test(b.d.href)&&b.d.href.indexOf(lg.id)>=0&&b.d.target==null,b.d);
  ok(pre+'"Go to <League> League" present, league route, '+(w>=900?'new tab':'same tab'),b.l&&/^Go to .+ League$/.test(b.l.t)&&/league\.html\?l=/.test(b.l.href)&&(w>=900?b.l.target==='_blank'&&/noopener/.test(b.l.rel):b.l.target==null),b.l);
  ok(pre+'"Share my grade" still present and visible',b.s&&b.s.t==='Share my grade'&&!b.s.hidden,b.s);
  ok(pre+'all three >= 44px tall, one row at >= 900px (may wrap below), inside the page, no sideways scroll',[b.d,b.l,b.s].every(x=>x&&x.h>=44&&x.r<=b.iw)&&(w<900||new Set([b.d.top,b.l.top,b.s.top]).size===1)&&b.sw<=b.iw&&b.row,b);
  if(w===390){const v=await P.page.evaluate(()=>{const a=document.getElementById('rcsite'),s=a.querySelector('.dr2lbl');return{t:a.innerText.trim(),asw:a.scrollWidth,acw:a.clientWidth,ssw:s.scrollWidth,scw:s.clientWidth,ell:getComputedStyle(s).textOverflow,sw:document.documentElement.scrollWidth,iw:innerWidth}});
   ok(pre+'full label "Go to Ball Don\'t Lie League" visible, not clipped (scrollWidth <= clientWidth)',v.t==="Go to Ball Don't Lie League"&&v.asw<=v.acw&&v.ssw<=v.scw&&v.ell!=='ellipsis',v);
   ok(pre+'no horizontal scroll',v.sw<=v.iw,v)}
  await P.close()}

 /* order + styles: League (primary yellow) first, Back to Draft (secondary dark) second, Share my grade third */
 for(const w of [1280,390]){const P=await open(process.env.APP,lg,w);const pre=w+'px order/style: ';
  const o=await P.page.evaluate(()=>[...document.querySelectorAll('#rc_site .rcrow>a,#rc_site .rcrow>button')].filter(e=>!e.hidden).map(e=>{const cs=getComputedStyle(e);return{id:e.id,cls:e.className,bg:cs.backgroundColor}}));
  ok(pre+'order: League link, Back to Draft, Share my grade',o.map(x=>x.id).join(',')==='rcsite,rcdraft,rcsharegrade',o.map(x=>x.id));
  const [L1,D1,S1]=o;ok(pre+'League link is the primary button (btn pri, yellow)',L1&&/\bpri\b/.test(L1.cls)&&/rgb\(255, 2\d\d, \d+\)/.test(L1.bg),L1);
  ok(pre+'Back to Draft is a secondary button (btn, not pri, same dark style as Share my grade)',D1&&/\bbtn\b/.test(D1.cls)&&!/\bpri\b/.test(D1.cls)&&D1.bg===S1.bg&&D1.bg!==L1.bg,[D1,S1]);
  ok(pre+'Share my grade keeps its class',S1&&S1.cls==='btn',S1);
  await P.close()}

 /* title case + text fits inside the league button at 320, 390 and 1280 */
 for(const w of [320,390,1280]){const P=await open(process.env.APP,lg,w);const pre=w+'px league button: ';
  const v=await P.page.evaluate(()=>{const a=document.getElementById('rcsite'),s=a.querySelector('.dr2lbl'),cs=getComputedStyle(a),ss=getComputedStyle(s),r=a.getBoundingClientRect(),sr=s.getBoundingClientRect();
   return{t:a.innerText.trim(),tt:cs.textTransform+'/'+ss.textTransform,ws:ss.whiteSpace,ell:ss.textOverflow+'/'+cs.textOverflow,asw:a.scrollWidth,acw:a.clientWidth,ash:a.scrollHeight,ach:a.clientHeight,ssw:s.scrollWidth,scw:s.clientWidth,in:sr.left>=r.left-0.5&&sr.right<=r.right+0.5&&sr.top>=r.top-0.5&&sr.bottom<=r.bottom+0.5,h:Math.round(r.height),lines:Math.round(sr.height/parseFloat(ss.lineHeight||'16')),sw:document.documentElement.scrollWidth,iw:innerWidth}});
  ok(pre+'title case "Go to Ball Don\'t Lie League", no uppercase transform',v.t==="Go to Ball Don't Lie League"&&!/uppercase/.test(v.tt),v);
  ok(pre+'text fits: white-space normal, no ellipsis, nothing clipped (scroll <= client), label inside the button, >= 44px',v.ws==='normal'&&!/ellipsis/.test(v.ell)&&v.asw<=v.acw&&v.ash<=v.ach&&v.ssw<=v.scw&&v.in&&v.h>=44,v);
  ok(pre+'no horizontal scroll',v.sw<=v.iw,v);
  if(SHOT){await P.page.evaluate(()=>scrollTo(0,0));await P.page.screenshot({path:path.join(SHOT,'after-'+w+'-buttons.png')})}
  await P.close()}
 /* Conference breakdown: every conference as a chip, counts sum to the roster, count desc then name, no "N other" chip, no overflow at 390 */
 for(const w of [1280,390]){const P=await open(process.env.APP,lg,w);const pre=w+'px conf chips: ';
  const R=await P.page.evaluate(()=>{const T=window.TEAMS_DATA,M=T.meta;const rows=[...document.querySelectorAll('#crows .crow')].map(r=>({mid:r.dataset.mid,chips:[...r.querySelectorAll('.cch .cc2')].map(c=>({n:+c.querySelector('b').textContent,k:c.textContent.replace(/^\s*\d+\s*/,'').trim(),r:c.getBoundingClientRect().right})),rr:r.getBoundingClientRect().right}));
   return{rows,iw:innerWidth,sw:document.documentElement.scrollWidth,meta:M}});
  const id=lg.id;const st=JSON.parse(await raw(AORIG,F.Keys(id).meta));
  /* expected per manager from the stored picks (rosters = picks per owner) */
  const picks=[];for(let i=1;i<=64;i++){const v=await raw(AORIG,F.Keys(id).pick(st.epoch||1,i)).catch(()=>'');if(v)try{picks.push(JSON.parse(v))}catch(e){}}
  const exp={};picks.forEach(p=>{const o=p.owner||p.o||p.mid,t=String(p.tid||p.t);const c=(R.meta[t]||{}).c||'Other';(exp[o]=exp[o]||{})[c]=(exp[o][c]||0)+1});
  ok(pre+'8 manager rows',R.rows.length===8,R.rows.length);
  const allConf=R.rows.every(r=>!exp[r.mid]||JSON.stringify(Object.keys(exp[r.mid]).sort())===JSON.stringify(r.chips.map(c=>c.k).sort()));
  ok(pre+'every conference on the roster has a chip (vs stored picks: '+picks.length+')',picks.length>0&&allConf,R.rows.slice(0,1));
  ok(pre+'chip counts sum to the roster size (8)',R.rows.every(r=>r.chips.reduce((a,c)=>a+c.n,0)===8),R.rows.map(r=>r.chips.reduce((a,c)=>a+c.n,0)));
  ok(pre+'counts match the roster per conference',R.rows.every(r=>!exp[r.mid]||r.chips.every(c=>exp[r.mid][c.k]===c.n)));
  ok(pre+'sorted by count desc, then conference name',R.rows.every(r=>r.chips.every((c,i,a)=>!i||a[i-1].n>c.n||(a[i-1].n===c.n&&a[i-1].k.localeCompare(c.k)<=0))));
  ok(pre+'no "N other" chip',R.rows.every(r=>r.chips.every(c=>!/^other$/i.test(c.k)||(exp[r.mid]&&exp[r.mid].Other))));
  ok(pre+'some roster has more than 3 conferences (the old cut-off is gone)',R.rows.some(r=>r.chips.length>3),R.rows.map(r=>r.chips.length));
  ok(pre+'chips wrap inside the page, no sideways scroll',R.sw<=R.iw&&R.rows.every(r=>r.chips.every(c=>c.r<=R.iw+0.5)),[R.sw,R.iw]);
  if(SHOT){await P.page.evaluate(()=>document.getElementById('rc_conf').scrollIntoView({block:'start'}));await sleep(300);await P.page.screenshot({path:path.join(SHOT,'after-'+w+'-conf.png')})}
  if(base){const B=await open(base.app,blg,w);if(SHOT){await B.page.evaluate(()=>document.getElementById('rc_conf').scrollIntoView({block:'start'}));await sleep(300);await B.page.screenshot({path:path.join(SHOT,'before-'+w+'-conf.png')})}await B.close()}
  await P.close()}

 /* loader: 3 bouncing balls + caption while the data is held, static under reduced motion, gone after load, no overflow */
 for(const [w,rm] of [[320,false],[390,false],[1280,false],[390,true]]){const desk=w>=900;const P=await L.phone('ld'+w+(rm?'rm':''),desk?{desktop:true,w,h:900}:{w,h:844});await P.page.setBypassServiceWorker(true);
  if(rm)await P.page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k}))},lg.id,lg.me);
  const held=[];let hold=true;await P.page.setRequestInterception(true);P.page.on('request',r=>{if(hold&&r.url().indexOf('/api/data/')>=0)held.push(r);else r.continue().catch(()=>{})});
  const pre=w+'px loader'+(rm?' (reduced motion)':'')+': ';
  await P.page.goto(process.env.APP+'/recap.html?l='+lg.id,{waitUntil:'domcontentloaded'});await P.page.waitForSelector('#loading',{timeout:15000});await sleep(700);
  const v=await P.page.evaluate(()=>{const l=document.getElementById('loading'),b=[...l.querySelectorAll('.dr2balls>span')],cs=b.map(x=>getComputedStyle(x));
   return{n:b.length,emoji:b.map(x=>x.textContent).join(''),hidden:l.querySelector('.dr2balls').getAttribute('aria-hidden'),role:l.getAttribute('role'),live:l.getAttribute('aria-live'),cap:(l.querySelector('.dr2cap')||{}).textContent,
    anim:cs.map(c=>c.animationName),delay:cs.map(c=>c.animationDelay),sw:document.documentElement.scrollWidth,iw:innerWidth,lr:Math.round(l.getBoundingClientRect().right)}});
  ok(pre+'3 basketball emoji, aria-hidden, in a role=status aria-live=polite box',v.n===3&&v.emoji==='🏀🏀🏀'&&v.hidden==='true'&&v.role==='status'&&v.live==='polite',v);
  ok(pre+'caption "Loading the final rosters…" under the balls',v.cap==='Loading the final rosters…',v.cap);
  if(rm)ok(pre+'animation-name is none on every ball',v.anim.every(a=>a==='none'),v.anim);
  else ok(pre+'balls bounce (dr2bounce) with staggered delays',v.anim.every(a=>a==='dr2bounce')&&new Set(v.delay).size===3,[v.anim,v.delay]);
  ok(pre+'no overflow / sideways scroll',v.sw<=v.iw&&v.lr<=v.iw,v);
  if(SHOT&&!rm&&(w===390||w===1280))await P.page.screenshot({path:path.join(SHOT,'after-'+w+'-loader.png')});
  hold=false;held.splice(0).forEach(r=>r.continue().catch(()=>{}));await P.page.waitForSelector('#rc_foot',{timeout:20000});await sleep(500);
  ok(pre+'loader gone after the recap loads',!(await P.page.$('#loading'))&&!(await P.page.$('.dr2balls')));
  ok(pre+'no page errors',P.errs.length===0,P.errs);await P.close()}
 /* XSS: the league name is escaped */
 {const x=await mk(API,'<img src=x onerror="window.__xss=1">"&\'<b>');const P=await open(process.env.APP,x,1280);const I=await info(P);
  ok('XSS name: shown as text, no element injected, no script ran',!I.inj&&/^Go to .*"&' League$/.test(I.btn.label)&&!/<img|<b>/.test(I.btn.html)&&/&amp;/.test(I.btn.html),I.btn);ok('XSS: no page errors',P.errs.length===0,P.errs);await P.close()}
 /* long name at 390 */
 {const long='The Extremely Long Named Fantasy Basketball Association Of Friends And Family';const x=await mk(API,long);const P=await open(process.env.APP,x,390);const I=await info(P);
  ok('390 long name: no horizontal scroll and the button stays inside the page',I.sw<=I.iw&&I.btn.ar<=I.iw,[I.sw,I.iw,I.btn.ar]);ok('390 long name: full label visible, not clipped (scrollWidth <= clientWidth), no ellipsis',I.btn.sw<=I.btn.cw&&I.btn.ell!=='ellipsis'&&I.btn.label==='Go to '+long+' League',I.btn);
  if(SHOT)await P.page.screenshot({path:path.join(SHOT,'after-390-longname.png')});await P.close()}
 /* no name -> old behaviour; mock with parent name (UI helpers, in page) */
 {const x=await mk(API,'');const P=await open(process.env.APP,x,390);const I=await info(P);ok('empty league name (saved as the default "League") keeps "Back to my league"',I.btn.label==='Back to my league',I.btn.label);
  const u=await P.page.evaluate(()=>[UI.mockBack({parent:'',parentName:'X'}).label,UI.goLeagueLabel('  Friday   Hoops '),UI.goLeagueLabel(null),UI.goLeagueLabel('Friday Hoops League'),UI.esc(UI.goLeagueLabel('<img src=x onerror=1>'))]);ok('UI helpers: no parent -> Back to home; name trimmed; no name -> Back to my league; no "League League"; esc of a raw name',u[0]==='Back to home'&&u[1]==='Go to Friday Hoops League'&&u[2]==='Back to my league'&&u[3]==='Go to Friday Hoops League'&&u[4]==='Go to &lt;img src=x onerror=1&gt; League',u);await P.close()}
 /* mock setup page from a league: same label, new tab only on desktop */
 for(const w of [1280,390]){const P=await L.phone('m'+w,w>=900?{desktop:true,w,h:900}:{w,h:844});await P.page.setBypassServiceWorker(true);
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k}))},lg.id,lg.me);
  await P.page.goto(process.env.APP+'/mock.html?from='+lg.id);await P.page.waitForSelector('#mockback',{timeout:15000});await sleep(1500);
  const b=await P.page.evaluate(()=>{const a=document.getElementById('mockback');return{t:a.innerText.trim(),target:a.getAttribute('target'),rel:a.getAttribute('rel'),sw:document.documentElement.scrollWidth,iw:innerWidth}});
  ok(w+'px mock setup: "Go to Ball Don\'t Lie League"',b.t==="Go to Ball Don't Lie League",b.t);ok(w+'px mock setup: '+(w>=900?'new tab':'same tab'),w>=900?(b.target==='_blank'&&/noopener/.test(b.rel)):(b.target==null&&b.rel==null),b);ok(w+'px mock setup: no sideways scroll, no errors',b.sw<=b.iw&&P.errs.length===0,[b,P.errs]);await P.close()}
}catch(e){bad++;console.log('EXCEPTION',e.stack)}finally{await L.close()}
 console.log(`\n${n-bad} / ${n} checks passed`);process.exit(bad?1:0)})();
