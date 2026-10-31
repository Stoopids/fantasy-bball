/* s24: Bets list filters, one row like the reference (Person: Everyone / Me / each manager  x  Status: Any status / Open / Settled / Wash / Waiting on me  x  "search terms...").
   Results per option, combined filters, persistence across reload, #bets/f=<p>-<s> hash round trip, deep link to a hidden bet resets the filters,
   identity-free storage and copied links, watcher behaviour, empty states + counts, 44px / no overflow at 320 / 360 / 390 / 1280, pushups only.
   node tests/e2e_betfilter_s24.js  (APP / API env, mock store). Screenshots to SHOTS (default /workspace/league-site-work/compare-s24). */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep,APP}=L;const F=require('../js/core.js');
const SH=process.env.SHOTS||'/workspace/league-site-work/compare-s24';
let n=0,bad=0;const fails=[];function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}
const base=process.env.API||'http://localhost:9996/api/data/';const post=(k,v)=>fetch(base+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});
const MONEY=/\b(wager\w*|payout|prize|cash|money|dollars?|lottery|jackpot|gambl\w*|USD|IDR|Rp)\b|\$\s?\d/i;
async function phone(id,info,i,o){o=o||{};const P=await L.phone('f'+Math.random().toString(36).slice(2,6),o.w?{desktop:o.w>=1000,w:o.w,h:o.w>=1000?900:800}:{});
  if(i!=null)await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[i].id,k:info.managers[i].k});
  await P.page.evaluateOnNewDocument(()=>{window.__copied=[];try{delete Navigator.prototype.share}catch(e){}Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:t=>{window.__copied.push(t);return Promise.resolve()}}})});return P}
const go=async(P,id,h)=>{await P.go('league.html?l='+id+(h||'#bets'));await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await P.page.waitForSelector('#b27FCount',{timeout:20000});await sleep(300)};
const shown=P=>P.page.$$eval('#lbody [data-bet]',a=>a.map(x=>x.querySelector('.b27-t').innerText).sort());
const all=P=>P.page.$$eval('#lbody [data-bet]',a=>a.length);
const pick=async(P,sel,v)=>{await P.page.select(sel,v);await sleep(350)};
const state=P=>P.page.evaluate(()=>({p:(document.getElementById('b27FP')||{}).value,s:(document.getElementById('b27FS')||{}).value,h:location.hash,q:(document.getElementById('b27FQ')||{}).value,c:(document.getElementById('b27FCount')||{}).innerText||''}));
(async()=>{try{
  const id=await seed();const info=seed.info;const M=info.managers.map(m=>m.id);const K=i=>F.Keys(id).base+'-bets-'+M[i];const T=Date.now()-3600e3;let u=0;
  const ev=(k,o)=>Object.assign({k,u:'fu'+(++u).toString().padStart(6,'0'),ts:T+u*1000},o);
  const P_=(id_,to,text)=>ev('p',{id:id_,to:M[to],amt:10,a:1,b:1,text});
  const logs=[[],[],[],[],[],[],[],[]];
  const bet=(by,to,id_,text,o)=>{o=o||{};logs[by].push(P_(id_,to,text));if(o.acc){logs[to].push(ev('a',{id:id_}))}if(o.rb)logs[by].push(ev('s',{id:id_,r:o.rb}));if(o.ro)logs[to].push(ev('s',{id:id_,r:o.ro}));if(o.fix)logs[o.fix].push(ev('fr',{id:id_,fx:'fxq'+id_.slice(-4),r:'o'}))};
  bet(0,1,'fbet000001','B1 Ana asks Ben');                       // mine, open
  bet(1,0,'fbet000002','B2 Ben asks Ana');                       // mine, waiting, open
  bet(2,3,'fbet000003','B3 Cy asks Dee');                        // open (Cy, Dee)
  bet(0,2,'fbet000004','B4 Ana beat Cy',{acc:1,rb:'b',ro:'b'});  // mine, settled (Cy)
  bet(3,0,'fbet000005','B5 Dee Ana wash',{acc:1,rb:'p',ro:'p'}); // mine, settled, wash (Dee)
  bet(1,2,'fbet000006','B6 Ben reported',{acc:1,rb:'b'});        // open (Ben, Cy)
  bet(2,0,'fbet000007','B7 Cy reported vs Ana',{acc:1,rb:'o'});  // mine, waiting (answer), open (Cy)
  bet(3,1,'fbet000008','B8 Dee beat Ben',{acc:1,rb:'b',ro:'b'}); // settled (Dee, Ben)
  bet(0,3,'fbet000009','B9 Ana Dee fix asked',{acc:1,rb:'b',ro:'b',fix:3}); // mine, settled, waiting (fix confirm)
  for(let i=0;i<8;i++)await post(K(i),{v:1,ev:logs[i]});
  const A=await phone(id,info,0);await go(A,id);
  {const s0=await state(A);ok('default: Everyone + Any status + empty search, count line "Showing 9 bets", all 9 bets on the page, no filter in the URL',s0.p==='all'&&s0.s==='all'&&s0.q===''&&s0.c==='9'&&(await all(A))===9&&s0.h==='#bets',s0)}
  const ph=await A.page.evaluate(()=>{const r=[...document.querySelectorAll('#b27Flt select, #b27Flt input')].map(e=>e.getBoundingClientRect());const fit=(()=>{const c=document.createElement('canvas').getContext('2d');const q=document.getElementById('b27FQ'),st=getComputedStyle(q);c.font=st.fontSize+' '+st.fontFamily;const sel=document.getElementById('b27FS'),ss=getComputedStyle(sel);const w=c.measureText('search terms...').width<=q.clientWidth-parseFloat(st.paddingLeft)-parseFloat(st.paddingRight);c.font=ss.fontSize+' '+ss.fontFamily;return w&&c.measureText('Any status').width<=sel.clientWidth-parseFloat(ss.paddingLeft)-parseFloat(ss.paddingRight)})();return{fit,ph:document.getElementById('b27FQ').placeholder,row:r.length===3&&Math.abs(r[0].top-r[2].top)<2,h:r.map(x=>Math.round(x.height))}});
  ok('390px: Person, Status and "search terms..." sit on one row, 44px tall, labels not cut off',ph.ph==='search terms...'&&ph.fit&&ph.row&&ph.h.every(x=>x>=44),ph);
  /* s24 layout = STOOPIDS 2026-27 Bets block order */
  const ord=await A.page.evaluate(()=>{const y=id=>{const e=document.getElementById(id);return e?e.getBoundingClientRect().top+scrollY:null};const lb=document.getElementById('lbody');const first=[...lb.children].find(e=>e.offsetHeight>0);const intro=document.getElementById('b27Intro');
    return{first:first&&first.id,seg:y('b27Seg'),form:y('b27Form'),owes:y('b27Owes'),open:y('b27OpenNote'),flt:y('b27Flt'),wait:y('b27ForYou'),card:y(document.querySelector('#lbody [data-bet]').id||'x')||document.querySelector('#lbody [data-bet]').getBoundingClientRect().top+scrollY,intro:y('b27Intro'),liveIn:!!intro.querySelector('#b27Head #b27Top')&&intro.lastElementChild.id==='b27Head',last:lb.lastElementChild&&lb.lastElementChild.id,hl:/💪 Bets/.test(lb.innerText),cnt:(document.getElementById('b27FCnt')||{}).innerText||'',introT:intro.innerText}});
  ok('Bets block order matches STOOPIDS 2026-27 + s25k sub-tabs: #b27Seg (Write it Up / Tally) first, then form, totals, Still open, filter row ("Showing 9 bets"), waiting section, bet cards, intro card last with the live line as its last line; no headline; wording unchanged',
    !ord.hl&&ord.first==='b27Seg'&&ord.seg<ord.form&&ord.form<ord.owes&&ord.owes<ord.open&&ord.open<ord.flt&&ord.flt<ord.wait&&ord.wait<ord.intro&&ord.liveIn&&ord.last==='b27Intro'&&/^Showing 9 bets$/.test(ord.cnt.trim())&&/Bets here are just for fun, a challenge between friends, and are always paid in pushups\./.test(ord.introT)&&/This page just records who bet what and who owes whom\. The other manager has to accept a bet, and the manager who placed it settles it\./.test(ord.introT)&&/live/.test(ord.introT),ord);
  await A.page.evaluate(()=>{document.getElementById('lshare').scrollIntoView({block:'start'});scrollBy(0,-60)});await sleep(200);await A.page.screenshot({path:SH+'/s24_intro_top_390.png'});
  await A.page.evaluate(()=>{document.getElementById('b27Intro').scrollIntoView({block:'center'})});await sleep(200);await A.page.screenshot({path:SH+'/s24_intro_bottom_390.png'});
  const opts=await A.page.evaluate(()=>({p:[...document.querySelectorAll('#b27FP option')].map(o=>o.textContent),s:[...document.querySelectorAll('#b27FS option')].map(o=>o.textContent)}));
  ok('Person select: Everyone, Me, then the 8 managers; Status: Any status, Open, Settled, Wash, Waiting on me',opts.p[0]==='Everyone'&&opts.p[1]==='Me'&&opts.p.length===10&&/Ana/.test(opts.p[2])&&/Hal/.test(opts.p[9])&&opts.s.join()==='Any status,Open,Settled,Wash,Waiting on me',opts);
  const cases=[['me','all',['B1','B2','B4','B5','B7','B9']],['me','waiting',['B2','B7','B9']],['all','waiting',['B2','B7','B9']],['all','open',['B1','B2','B3','B6','B7']],['all','settled',['B4','B5','B8','B9']],['all','wash',['B5']],['3','all',['B3','B4','B6','B7']],['3','settled',['B4']],['4','wash',['B5']],['me','open',['B1','B2','B7']]];
  for(const [p,s,exp] of cases){await pick(A,'#b27FP',p);await pick(A,'#b27FS',s);const got=(await shown(A)).map(t=>t.split(' ')[0]);const st=await state(A);
    ok(`filter Person=${p} Status=${s}: ${exp.join(',')} (count line "Showing ${exp.length} of 9 bets", hash #bets/f=${p}-${s})`,got.join()===exp.join()&&st.c===exp.length+' of 9'&&st.h==='#bets/f='+p+'-'+s,{got,st})}
  /* search terms: bet text and manager names, live, combined */
  await pick(A,'#b27FP','all');await pick(A,'#b27FS','all');await A.page.click('#b27FQ');await A.page.keyboard.type('WASH');await sleep(400);let sq=await state(A);
  ok('search "WASH" (case-insensitive, live while typing, focus kept): only B5, hash #bets/f=all-all/q=WASH',(await shown(A)).map(t=>t.split(' ')[0]).join()==='B5'&&sq.c==='1 of 9'&&sq.h==='#bets/f=all-all/q=WASH'&&(await A.page.evaluate(()=>document.activeElement&&document.activeElement.id))==='b27FQ',sq);
  await A.page.$eval('#b27FQ',e=>{e.value='';e.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(300);await A.page.click('#b27FQ');await A.page.keyboard.type('hal');await sleep(400);
  ok('search by manager name: "hal" finds no bet (Hal is in none) and shows the empty line',(await shown(A)).length===0&&/matching “hal”/.test(await A.page.$eval('#b27FEmpty',e=>e.innerText).catch(()=>'')));
  await A.page.$eval('#b27FQ',e=>{e.value='dee';e.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(300);await pick(A,'#b27FS','settled');
  ok('search + status combine: "dee" + Settled = B5, B8, B9',(await shown(A)).map(t=>t.split(' ')[0]).join()==='B5,B8,B9',await shown(A));
  await pick(A,'#b27FP','me');ok('all three combine: Me + Settled + "dee" = B5, B9',(await shown(A)).map(t=>t.split(' ')[0]).join()==='B5,B9');
  await A.page.$eval('#b27FQ',e=>{e.value='';e.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(300);
  /* screenshots */
  await pick(A,'#b27FP','all');await pick(A,'#b27FS','all');await A.page.evaluate(()=>document.getElementById('b27Flt').scrollIntoView({block:'start'}));await A.page.evaluate(()=>scrollBy(0,-70));await sleep(200);
  const box=await A.page.evaluate(()=>{const a=document.getElementById('b27Flt').getBoundingClientRect(),b=document.getElementById('b27Flt').getBoundingClientRect();return{x:0,y:Math.max(0,a.top-14),width:innerWidth,height:b.bottom-a.top+42}});
  await A.page.evaluate(()=>document.activeElement&&document.activeElement.blur());await sleep(100);await A.page.screenshot({path:'/tmp/s24_vp.png'});{const C0=await A.ctx.newPage();await C0.setViewport({width:390,height:Math.ceil(box.height)});await C0.setContent(`<body style="margin:0;overflow:hidden"><img style="display:block;margin-top:-${Math.floor(box.y)}px" src="data:image/png;base64,${require('fs').readFileSync('/tmp/s24_vp.png').toString('base64')}"></body>`);await sleep(200);await C0.screenshot({path:SH+'/s24_flt_default_row_390.png'});await C0.close()}
  {const fsx=require('fs');const ref=fsx.readFileSync('/workspace/bets_filter_ref.png').toString('base64'),our=fsx.readFileSync(SH+'/s24_flt_default_row_390.png').toString('base64');const C=await A.ctx.newPage();await C.setViewport({width:1060,height:400});
    await C.setContent(`<body style="margin:0;background:#0b0e14;color:#eee;font:14px system-ui;display:flex;flex-direction:column;gap:14px;padding:12px;align-items:flex-start"><div><div>Reference (bets_filter_ref.png, 1024 wide)</div><img style="display:block;margin-top:6px" src="data:image/png;base64,${ref}"></div><div><div>s24 at 390px</div><img style="display:block;margin-top:6px" src="data:image/png;base64,${our}"></div></body>`);await sleep(300);await C.screenshot({path:SH+'/s24_flt_side_by_side_ref.png',fullPage:true});await C.close()}
  await pick(A,'#b27FP','me');await pick(A,'#b27FS','waiting');await A.page.evaluate(()=>(document.getElementById('b27Flt').scrollIntoView({block:'start'}),scrollBy(0,-72)));await sleep(200);await A.page.screenshot({path:SH+'/s24_flt_me_waiting_390.png'});
  await pick(A,'#b27FP','3');await pick(A,'#b27FS','all');await A.page.evaluate(()=>(document.getElementById('b27Flt').scrollIntoView({block:'start'}),scrollBy(0,-72)));await sleep(200);await A.page.screenshot({path:SH+'/s24_flt_person_cy_390.png'});
  await pick(A,'#b27FP','all');await pick(A,'#b27FS','settled');await A.page.evaluate(()=>(document.getElementById('b27Flt').scrollIntoView({block:'start'}),scrollBy(0,-72)));await sleep(200);await A.page.screenshot({path:SH+'/s24_flt_settled_390.png'});
  /* "open" view: a native select's popup is drawn by the OS and never appears in a headless screenshot, so for this one picture both selects are shown as open lists (size=N, test-only) */
  await A.page.evaluate(()=>{for(const s of ['b27FP','b27FS']){const e=document.getElementById(s);e.size=e.options.length;e.style.height='auto'}(document.getElementById('b27Flt').scrollIntoView({block:'start'}),scrollBy(0,-72))});await sleep(200);await A.page.screenshot({path:SH+'/s24_flt_both_selects_open_390.png'});
  /* persistence + storage */
  await pick(A,'#b27FP','me');await pick(A,'#b27FS','waiting');
  const stored=await A.page.evaluate(id=>localStorage.getItem('fbn.x.'+id+'.betf'),id);ok('remembered per league on this device as {p:"me",s:"waiting"} (no manager id stored)',stored==='{"p":"me","s":"waiting"}'&&!M.some(m=>stored.includes(m)),stored);
  await A.page.reload({waitUntil:'domcontentloaded'});await A.page.waitForSelector('#b27FCount',{timeout:20000});await sleep(500);let st=await state(A);
  ok('reload keeps Me + Waiting on me (URL #bets/f=me-waiting, 3 bets)',st.p==='me'&&st.s==='waiting'&&st.h==='#bets/f=me-waiting'&&(await shown(A)).length===3,st);
  {const A2=await phone(id,info,0);await A2.page.evaluateOnNewDocument(id=>localStorage.setItem('fbn.x.'+id+'.betf','{"p":"me","s":"waiting"}'),id);await go(A2,id,'#bets');const s2=await state(A2);
  ok('a fresh open of plain #bets on this device uses the remembered filter and writes it into the URL',s2.p==='me'&&s2.s==='waiting'&&s2.h==='#bets/f=me-waiting',s2);await A2.page.close()}
  await A.page.evaluate(()=>{location.hash='#bets'});await sleep(400);ok('typing plain #bets keeps the filter and puts it back into the URL',(await state(A)).h==='#bets/f=me-waiting');
  /* copy link */
  await A.page.click('#cptab');await sleep(200);const cp=await A.page.evaluate(()=>window.__copied.slice(-1)[0]);
  ok('Copy link with a filter: ?l=CODE#bets/f=me-waiting, no manager id or k=',cp===APP+'/league.html?l='+id+'#bets/f=me-waiting'&&!M.some(m=>cp.includes(m))&&!/k=|as=/.test(cp),cp);
  /* hash round trip from a link */
  const B=await phone(id,info,1);await go(B,id,'#bets/f=3-settled');st=await state(B);
  ok('hash -> filters: #bets/f=3-settled opens Person=Cy, Status=Settled (B4 only)',st.p==='3'&&st.s==='settled'&&(await shown(B)).map(t=>t.split(' ')[0]).join()==='B4',st);
  await pick(B,'#b27FS','open');st=await state(B);ok('filters -> hash: changing Status rewrites the hash in place (#bets/f=3-open)',st.h==='#bets/f=3-open',st);
  await B.page.evaluate(()=>{location.hash='#bets/f=all-open/q=ben'});await sleep(500);st=await state(B);ok('hash with search: #bets/f=all-open/q=ben -> Open + "ben" (B1, B2, B6)',st.s==='open'&&st.q==='ben'&&(await shown(B)).map(t=>t.split(' ')[0]).join()==='B1,B2,B6',{st,s:await shown(B)});
  await B.page.evaluate(()=>{location.hash='#bets/f=all-wash'});await sleep(500);st=await state(B);ok('typing a new filter hash applies it (Everyone + Wash)',st.p==='all'&&st.s==='wash'&&(await shown(B)).length===1,st);
  /* deep link to a hidden bet */
  await pick(B,'#b27FP','me');await pick(B,'#b27FS','wash');await B.page.$eval('#b27FQ',e=>{e.value='zzz';e.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(300);
  await B.page.goto(APP+'/league.html?l='+id+'#bets/fbet000003',{waitUntil:'domcontentloaded'});await B.page.waitForSelector('[data-bet="fbet000003"].dl-hl',{timeout:15000}).catch(()=>{});st=await state(B);
  ok('deep link to a bet the filters hide (Ben: Me + Wash + "zzz", link to Cy vs Dee): filters and search reset, card shown and highlighted, no "not found"',st.p==='all'&&st.s==='all'&&st.q===''&&!!(await B.page.$('[data-bet="fbet000003"].dl-hl'))&&!(await B.page.$('#dlmiss')),st);
  /* empty state */
  await pick(B,'#b27FP','8');await pick(B,'#b27FS','settled');const em=await B.page.$eval('#b27FEmpty',e=>e.innerText).catch(()=>'');
  ok('empty state: short line per filter + "Show all bets"',/No settled bets that Hal is in/.test(em)&&/0 of 9/.test((await state(B)).c),em);
  await B.page.click('#b27FReset');await sleep(300);st=await state(B);ok('"Show all bets" resets both selects and the search',st.p==='all'&&st.s==='all'&&st.q===''&&(await all(B))===9&&st.h==='#bets',st);
  /* watcher */
  const W=await phone(id,info,null);await W.page.evaluateOnNewDocument(id=>localStorage.setItem('fbn.x.'+id+'.betf','{"p":"me","s":"waiting"}'),id);await go(W,id,'#bets/f=me-waiting');
  const wo=await W.page.evaluate(()=>({p:[...document.querySelectorAll('#b27FP option')].map(o=>o.value),s:[...document.querySelectorAll('#b27FS option')].map(o=>o.value),note:(document.getElementById('b27FltNote')||{}).innerText||''}));
  ok('watcher: no "Me" and no "Waiting on me" options; a me/waiting link shows everyone with a short note',!wo.p.includes('me')&&!wo.s.includes('waiting')&&/need your own manager link/.test(wo.note)&&(await all(W))===9,wo);
  await pick(W,'#b27FP','2');ok('watcher: person filter works (Ben: B1,B2,B6,B8)',(await shown(W)).map(t=>t.split(' ')[0]).join()==='B1,B2,B6,B8');await W.page.close();
  /* layout */
  for(const w of [320,360,390,1280]){const P=await phone(id,info,0,{w});await go(P,id,'#bets/f=me-all');const a=await P.page.evaluate(()=>{const s=[...document.querySelectorAll('#b27Flt select, #b27Flt input, #b27Flt button')].map(e=>e.getBoundingClientRect());return{small:s.filter(r=>r.height<43.5||r.width<43.5).length,over:document.documentElement.scrollWidth>innerWidth+1,flt:document.getElementById('b27Flt').getBoundingClientRect().right<=innerWidth}});
    const t=await P.page.$eval('#lbody',e=>e.innerText);const rows=await P.page.evaluate(()=>new Set([...document.querySelectorAll('#b27Flt select, #b27Flt input')].map(e=>Math.round(e.getBoundingClientRect().top))).size);
    ok(w+'px: filter controls >= 44px, no overflow, pushups only, '+(w<360?'wraps to 2 rows':'one row'),!a.small&&!a.over&&a.flt&&!MONEY.test(t)&&/pushups/.test(t)&&rows===(w<360?2:1),{a,rows});ok(w+'px: intro is the last block on the Bets page',await P.page.evaluate(()=>document.getElementById('lbody').lastElementChild.id==='b27Intro'));ok(w+'px: no page errors',P.errs.length===0,P.errs);await P.page.close()}
  ok('no page errors (Ana, Ben)',A.errs.length===0&&B.errs.length===0,[A.errs,B.errs]);
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
