/* s24: draft room tabs and recap section links are real <a href="#tab=..."> links.
   Ctrl/Cmd-click, Shift-click, middle-click and the context menu are left to the browser (no preventDefault, a new tab/window opens);
   a plain left click switches in place. 44px targets, role=tab and aria-selected kept. At 390 and 1280.
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_anchor.js */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API||'http://localhost:9996/api/data/';
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<(ms||15000)){try{const v=await fn();if(v)return v}catch(e){}await sleep(250)}return false};
const TABS=['board','teams','my','chat','more'];
/* dispatch a synthetic click / auxclick / contextmenu and report whether the app called preventDefault */
const synth=(P,sel,init,type)=>P.page.evaluate((sel,init,type)=>{const a=document.querySelector(sel);let prevented=null;
  const spy=e=>{prevented=e.defaultPrevented};window.addEventListener(type,spy,{once:true});
  /* stop the browser from really navigating/opening after our check: the window listener runs last (bubble), then we cancel */
  const stop=e=>{e.preventDefault()};window.addEventListener(type,stop,{once:true});
  a.dispatchEvent(new MouseEvent(type,Object.assign({bubbles:true,cancelable:true,view:window},init)));return {prevented,hash:location.hash,tab:document.body.dataset.tab||''}},sel,init,type);
(async()=>{try{
const id=await seed(API,{rounds:2});const I=seed.info;const me=I.managers[0];
for(const w of [390,1280]){const pre=w+'px ';const P=await L.phone('a'+w,w===1280?{desktop:true,w:1280,h:900}:{});await P.page.setBypassServiceWorker(true).catch(()=>{});
  await P.go('room.html?l='+id+'#as='+me.id+'&k='+me.k);await waitFor(()=>P.page.evaluate(()=>!!document.querySelector('#tabs [data-t]')),20000);await sleep(800);
  const g=await P.page.evaluate(()=>[...document.querySelectorAll('#tabs [data-t]')].map(a=>({tag:a.tagName,href:a.getAttribute('href'),role:a.getAttribute('role'),sel:a.getAttribute('aria-selected'),h:a.getBoundingClientRect().height,w:a.getBoundingClientRect().width,t:a.dataset.t})));
  ok(pre+'room: every tab is <a href="#tab=name"> with role=tab',g.length===5&&g.every(a=>a.tag==='A'&&a.href==='#tab='+a.t&&a.role==='tab'),g);
  ok(pre+'room: tab targets >= 44px',g.every(a=>a.h>=44&&a.w>=44),g.map(a=>[a.h,a.w]));
  ok(pre+'room: exactly one aria-selected=true',g.filter(a=>a.sel==='true').length===1,g.map(a=>a.sel));
  const url0=P.page.url();
  for(const [lab,init,type] of [['Ctrl-click',{ctrlKey:true,button:0},'click'],['Cmd-click',{metaKey:true,button:0},'click'],['Shift-click',{shiftKey:true,button:0},'click'],['middle-click',{button:1},'auxclick'],['middle-click (click event)',{button:1},'click'],['right-click menu',{button:2},'contextmenu']]){
    const r=await synth(P,'#tab_chat',init,type);ok(pre+'room: '+lab+' is not prevented and does not switch in place',r.prevented===false&&r.tab!=='chat',r)}
  /* a real Ctrl-click with the mouse: the browser opens #tab=chat in a new tab, this page stays put */
  const b=await L.launch();const before=(await b.targets()).length;
  const box=await (await P.page.$('#tab_teams')).boundingBox();await P.page.keyboard.down('Control');await P.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await P.page.keyboard.up('Control');
  const nt=await waitFor(async()=>{const ts=(await b.targets()).filter(t=>t.type()==='page'&&/#tab=teams$/.test(t.url()));return ts[0]||null},6000);
  const here=await P.page.evaluate(()=>({tab:document.body.dataset.tab,hash:location.hash}));
  ok(pre+'room: real Ctrl-click opens #tab=teams in a new tab, the current page stays on its tab',!!nt&&here.tab!=='teams'&&P.page.url()===url0,{nt:!!nt,here,before});
  if(nt){const np=await nt.page();if(np){await waitFor(()=>np.evaluate(()=>document.body.dataset.tab==='teams'),15000);ok(pre+'room: the new tab opens on Teams',await np.evaluate(()=>document.body.dataset.tab==='teams'));await np.close()}}
  /* plain left click switches in place */
  await P.page.click('#tab_my').catch(async()=>{await P.page.evaluate(()=>document.querySelector('#tab_my').click())});await sleep(500);
  const p=await P.page.evaluate(()=>({tab:document.body.dataset.tab,hash:location.hash,sel:document.querySelector('#tab_my').getAttribute('aria-selected')}));
  ok(pre+'room: plain left click switches in place (hash #tab=my, aria-selected)',p.tab==='my'&&p.hash==='#tab=my'&&p.sel==='true',p);
  /* recap section links */
  await P.go('recap.html?l='+id);await waitFor(()=>P.page.evaluate(()=>!!document.querySelector('#rcnav a[data-rt]')),20000);await sleep(600);
  const rg=await P.page.evaluate(()=>[...document.querySelectorAll('#rcnav a[data-rt]')].map(a=>({href:a.getAttribute('href'),t:a.dataset.rt,h:a.getBoundingClientRect().height})));
  ok(pre+'recap: section links are <a href="#tab=name">',rg.length>0&&rg.every(a=>a.href==='#tab='+a.t),rg);
  ok(pre+'recap: section links >= 44px tall',rg.every(a=>a.h>=44),rg.map(a=>a.h));
  const last=rg[rg.length-1]&&rg[rg.length-1].t;
  for(const [lab,init,type] of [['Ctrl-click',{ctrlKey:true,button:0},'click'],['Shift-click',{shiftKey:true,button:0},'click'],['middle-click',{button:1},'auxclick'],['right-click menu',{button:2},'contextmenu']]){
    const r=await synth(P,'#rcnav_'+last,init,type);ok(pre+'recap: '+lab+' is not prevented',r.prevented===false,r)}
  const r2=await synth(P,'#rcnav_'+last,{button:0},'click');ok(pre+'recap: plain left click is handled in place (prevented, hash #tab='+last+')',r2.prevented===true&&r2.hash==='#tab='+last,r2);
  ok(pre+'no page errors',P.errs.length===0,P.errs);await P.close()}
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e)}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));await L.close();process.exit(bad?1:0)})();
