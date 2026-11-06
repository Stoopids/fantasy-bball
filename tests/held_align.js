/* Held alignment checks: shared helpers, filters, quick bet, copy-after-save, chat modes, tally nav.
   node tests/held_align.js
   Uses a local static server and an in-memory store. No live ledger writes. */
const http=require('http'),fs=require('fs'),path=require('path');
const {seed}=require('./seed_league.js');
const L=require('./lib.js');
const root=path.join(__dirname,'..');
let n=0,bad=0;const fails=[];
function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}}

function sharedCheck(){
  const vm=require('vm');
  const ctx={window:{},document:{readyState:'loading',addEventListener(){},createElement(){return {style:{},setAttribute(){},appendChild(){}}},head:{appendChild(){}},body:{appendChild(){}},getElementById(){return null},querySelectorAll(){return []}},navigator:{},localStorage:{getItem(){return null},setItem(){}}};
  ctx.window=ctx;ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'shared/ui.js'),'utf8'),ctx);
  const U=ctx.SHARED_UI;
  const w=U.entryHead('wiu'),r=U.entryHead('rq');
  ok('write heading is the short agreed line',/Bet already discussed\./.test(w)&&/WRITE IT UP|Write it Up/.test(w));
  ok('request heading keeps the stoop line and a blue class',/Nothing agreed yet\? Find a stoop who wants to feel something\./.test(r)&&/entry-hd-rq/.test(r));
  const box=U.whenBox({e:s=>s,kind:'unknown',step:'7',game:true,pick:id=>'data-when="'+id+'"'});
  ok('settlement question has no sorting-only suffix and offers End game',/7\. When can this be settled\?/.test(box)&&!/sorting only/i.test(box)&&/End game/.test(box));
  ok('when classes use the device day',U.whenClass({wk:'date',est:U.estToday()})==='today'&&U.whenClass({wk:'date',est:'2000-01-01'})==='over'&&U.whenClass({wk:'game'})==='game'&&U.whenClass({wk:'season'})==='season'&&U.whenClass({})==='none');
  const RQ=U.Requests({e:s=>String(s),me:()=>'a',others:()=>[{id:'b',emoji:'',nick:'Bee'}],nick:id=>id,real:id=>id,canWrite:()=>true,amounts:[5],stake:x=>x+' pushups',games:()=>[],tname:s=>s,dateET:()=>'',get:async()=>'{"reqs":[]}',set:async()=>{},placeBet:async()=>{},render(){}});
  const clip=RQ.waText({by:'Ann',to:['Bee'],amt:10,odds:[2,1],txt:'Duke beats UNC',lab:'Duke',exp:Date.now()+999999,cov:'game'},'bet');
  const bomb=RQ.waText({by:'Ann',to:['Bee'],amt:10,odds:[1,1],txt:'Duke beats UNC',lab:'Duke',exp:Date.now()+999999,cov:'game'},'new');
  ok('created bet copy uses the burst and pushups',clip.startsWith('💥')&&/10 pushups/.test(clip)&&!/\$/.test(clip),clip);
  ok('request copy keeps the bomb',bomb.startsWith('💣')&&/pushups/.test(bomb)&&!/\$/.test(bomb),bomb);
}

function mime(f){return {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'}[path.extname(f)]||'application/octet-stream'}

function start(){
  const mem=new Map();
  return new Promise(resolve=>{
    const srv=http.createServer((q,s)=>{
      const u=new URL(q.url,'http://127.0.0.1');
      if(u.pathname.startsWith('/api/data/')){
        const k=decodeURIComponent(u.pathname.slice('/api/data/'.length));
        if(q.method==='POST'){let b='';q.on('data',c=>b+=c);q.on('end',()=>{mem.set(k,b);s.writeHead(200,{'content-type':'text/plain','access-control-allow-origin':'*'});s.end('ok')})}
        else{s.writeHead(200,{'content-type':'text/plain','access-control-allow-origin':'*'});s.end(mem.get(k)||'')}
        return}
      let f=path.normalize(path.join(root,u.pathname));
      if(!f.startsWith(root)){s.writeHead(403);return s.end('no')}
      if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
      if(!fs.existsSync(f)){s.writeHead(404);return s.end('nf')}
      s.writeHead(200,{'content-type':mime(f),'cache-control':'no-store'});fs.createReadStream(f).pipe(s);
    });
    srv.listen(0,'127.0.0.1',()=>resolve({srv,port:srv.address().port,mem}))});
}

(async()=>{
  sharedCheck();
  const {srv,port}=await start();
  const base='http://127.0.0.1:'+port;
  process.env.API=base+'/api/data/';
  const id=await seed(process.env.API,{rounds:8});
  const info=seed.info;
  const me=info.managers[0];
  async function open(hash,opt){
    opt=opt||{};
    const P=await L.phone('held',{desktop:!!opt.desk,w:opt.w||(opt.desk?1280:390),h:opt.h||(opt.desk?900:844)});
    await P.page.evaluateOnNewDocument((store,mid,k,lid)=>{try{localStorage.setItem('fbn.store',store);localStorage.setItem('fbn.me.'+lid,JSON.stringify({mid,k}))}catch(e){}},'/api/data/',me.id,me.k,id);
    await P.page.setRequestInterception(true);
    P.page.on('request',r=>{const u=r.url();if(/site\.api\.espn\.com|espncdn/.test(u))r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
    await P.page.goto(base+'/league.html?l='+id+(hash||'#games'),{waitUntil:'domcontentloaded'});
    await P.page.waitForSelector('#lbody',{timeout:25000});
    await L.sleep(800);
    return P}
  let P=await open('#games',{desk:true,w:1280,h:900});
  let g=await P.page.evaluate(()=>{
    const pills=[...document.querySelectorAll('.gf3 .gfpills > *, .gf3 .gfwhen > *')].filter(e=>e.offsetParent);
    const box=e=>{const r=e.getBoundingClientRect();return {t:(e.innerText||e.getAttribute('aria-label')||'').slice(0,24),w:Math.round(r.width),h:Math.round(r.height)}};
    const chips=[...document.querySelectorAll('.ggrid>.gm:not(.gfin) .gside a.chip')].slice(0,3).map(e=>{const r=e.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)}});
    const qb=[...document.querySelectorAll('.qb-btn')];
    const live=document.body.innerText.includes('LIVE')&&[...document.querySelectorAll('.gm')].some(el=>/LIVE/.test(el.innerText)&&el.querySelector('.qb-btn'));
    const fin=[...document.querySelectorAll('.gfin, .gm.gfin, button.gsum')];
    const foot=(document.getElementById('foot')||{}).innerText||'';
    const fresh=document.getElementById('fresh');
    const onl=document.getElementById('onlStrip');
    const os=onl?getComputedStyle(onl):null;
    return {pills:pills.map(box),chips,qb:qb.length,qbBg:qb[0]?getComputedStyle(qb[0]).backgroundColor:'',liveQb:!!live,finalQb:[...document.querySelectorAll('.gfin .qb-btn, .gm.gfin .qb-btn')].length,foot,freshHidden:!fresh||fresh.hidden,onlWrap:os?os.flexWrap:'',over:document.documentElement.scrollWidth>innerWidth+2,tally:[...document.querySelectorAll('#ltabs a')].filter(a=>getComputedStyle(a).display!=='none').map(a=>a.getAttribute('data-v'))};
  });
  ok('five games filter controls are 150x32 and the day select is 149',g.pills.length===5&&g.pills.filter(p=>p.w===150&&p.h===32).length===4&&g.pills.some(p=>p.w===149&&p.h===32),g.pills);
  ok('upcoming team pills are 200x40',g.chips.length>0&&g.chips.every(c=>c.w===200&&c.h===40),g.chips);
  ok('quick bet shows on upcoming cards and stays yellow',g.qb>0&&/255,\s*212,\s*0|rgb\(255, 212, 0\)/.test(g.qbBg),{qb:g.qb,bg:g.qbBg});
  ok('games footer drops the time-zone line and the standings update',!/time zone/i.test(g.foot)&&g.freshHidden,g.foot);
  ok('desktop nav has no Tally tab',!g.tally.includes('tally'),g.tally);
  ok('games page does not overflow at 1280',!g.over);
  await P.page.screenshot({path:'/opt/cursor/artifacts/held-games-desktop.png'});
  await P.close();

  P=await open('#games',{w:390,h:844});
  const phone=await P.page.evaluate(()=>{
    const more=[...document.querySelectorAll('#ltabs a.nm-x')].map(a=>a.getAttribute('data-v'));
    const main=[...document.querySelectorAll('#ltabs a:not(.nm-x), #ltabs .nm-b')].map(a=>(a.innerText||'').replace(/\s+/g,' ').trim());
    const over=document.documentElement.scrollWidth>innerWidth+2;
    const groups=[...document.querySelectorAll('.gf3 > .gf2')].map(e=>e.className);
    return {more,main,over,groups};
  });
  ok('phone More still holds Tally and the other extra tabs',phone.more.includes('tally')&&phone.more.includes('profile')&&phone.more.includes('rules'),phone);
  ok('phone games filters stay in two groups without page overflow',phone.groups.some(c=>/gfpills/.test(c))&&phone.groups.some(c=>/gfwhen/.test(c))&&!phone.over,phone);
  await P.page.screenshot({path:'/opt/cursor/artifacts/held-games-phone.png'});
  await P.close();

  P=await open('#bets',{desk:true,w:1280,h:900});
  await P.page.waitForSelector('.entry-pair',{timeout:10000});
  const bet=await P.page.evaluate(()=>{
    const pair=document.querySelector('.entry-pair');
    const cols=[...pair.children].map(e=>{const r=e.getBoundingClientRect();return Math.round(r.width)});
    const hw=document.querySelector('.entry-hd-wiu h2'),hr=document.querySelector('.entry-hd-rq h2');
    const hs=hw?getComputedStyle(hw):null,rs=hr?getComputedStyle(hr):null;
    const rq=document.querySelector('.entry-hd-rq');
    return {cols,wh:hs&&hs.fontSize,rh:rs&&rs.fontSize,wu:(hw||{}).innerText,rq:(hr||{}).innerText,sub:(document.querySelector('.entry-hd-wiu .entry-sub-d')||{}).innerText,rsub:(document.querySelector('.entry-hd-rq .entry-sub-d')||{}).innerText,rqBg:rq?getComputedStyle(rq).backgroundColor:'',desk:[...document.querySelectorAll('.ob-desk button')].map(b=>b.innerText),phoneHidden:getComputedStyle(document.querySelector('.ob-phone')).display};
  });
  ok('desktop forms are equal halves with 22px headings',bet.cols.length===2&&Math.abs(bet.cols[0]-bet.cols[1])<8&&bet.wh==='22px'&&bet.rh==='22px',bet);
  ok('headings and subtitles match the held lines',/WRITE IT UP/.test(bet.wu)&&/REQUEST A BET/.test(bet.rq)&&bet.sub==='Bet already discussed.'&&/Find a stoop who wants to feel something/.test(bet.rsub),bet);
  ok('request heading is blue and desktop has two bet tabs',/30,\s*58,\s*138|rgb\(30, 58, 138\)/.test(bet.rqBg)&&bet.desk.join('|')==='Write it Up or Request|All Bets',bet);
  await P.page.evaluate(()=>{const t=document.querySelector('#b27Text');t.value='Duke beats UNC';t.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-lb=opp]').click();document.querySelector('[data-lb=amt]').click()});
  await L.sleep(200);
  await P.page.click('#b27Place');
  await P.page.waitForSelector('#b27Confirm',{timeout:5000});
  await P.page.evaluate(()=>{const c=navigator.clipboard||(navigator.clipboard={});c.writeText=async function(t){c._last=t;c._n=(c._n||0)+1}});
  await P.page.click('[data-lb=confirm]');
  await P.page.waitForFunction(()=>/Placed/.test((document.getElementById('b27Msg')||{}).innerText||''),{timeout:10000});
  const saved=await P.page.evaluate(()=>{const m=(document.getElementById('b27Msg')||{}).innerText||'';return {m,clip:navigator.clipboard._last||'',n:navigator.clipboard._n||0}});
  ok('copy happens only after the save and uses pushups plus the burst',saved.n===1&&/💥/.test(saved.clip)&&/pushups/.test(saved.clip)&&!/\$/.test(saved.clip)&&/Placed/.test(saved.m),saved);
  await P.page.click('[data-ob=all]');
  await P.page.waitForSelector('#b27Flt',{timeout:5000});
  const filt=await P.page.evaluate(()=>({
    st:(document.getElementById('b27FS')||{}).value,ac:(document.getElementById('b27FA')||{}).value,wh:(document.getElementById('b27FW')||{}).value,
    link:(document.querySelector('#b27Flt a')||{}).innerText,tally:!!document.querySelector('#b27Tally summary'),sum:(document.querySelector('#b27Tally summary')||{}).innerText
  }));
  ok('all bets defaults to Open, Any, Any time and keeps Tally inside the list',filt.st==='open'&&filt.ac==='any'&&filt.wh==='any'&&/How these filters work/.test(filt.link)&&filt.tally&&/Who owes who/.test(filt.sum),filt);
  await P.page.screenshot({path:'/opt/cursor/artifacts/held-bets-filters-desktop.png'});
  await P.page.evaluate(()=>{const n=document.getElementById('b27Tally');if(n){n.open=true;n.scrollIntoView({block:'start'})}});
  await L.sleep(200);
  await P.page.screenshot({path:'/opt/cursor/artifacts/held-tally-desktop.png'});
  await P.close();

  P=await open('#bets',{w:390,h:844});
  await P.page.waitForSelector('.ob-phone',{timeout:10000});
  await P.page.click('.ob-phone [data-v=request]');
  await L.sleep(300);
  const req=await P.page.evaluate(()=>{
    const h=document.querySelector('.entry-hd-rq h2');
    const s=h?getComputedStyle(h):null;
    const shown=document.querySelector('.entry-rq')&&getComputedStyle(document.querySelector('.entry-rq')).display!=='none';
    const wiu=document.querySelector('.entry-wiu')&&getComputedStyle(document.querySelector('.entry-wiu')).display;
    return {tabs:[...document.querySelectorAll('.ob-phone button')].map(b=>b.innerText),size:s&&s.fontSize,white:s&&s.whiteSpace,shown,wiu,q:(document.querySelector('[data-tip=when]')||{}).innerText};
  });
  ok('phone keeps three bet tabs and a smaller single-line request heading',req.tabs.join('|')==='Write it Up|Request|All Bets'&&req.shown&&req.wiu==='none'&&req.size==='13px'&&req.white==='nowrap',req);
  await P.page.evaluate(()=>{const t=document.querySelector('[data-rq-in=text]');if(t){t.value='Virginia beats Duke';t.dispatchEvent(new Event('input',{bubbles:true}))}const a=document.querySelector('[data-rq=amt]');if(a)a.click()});
  await L.sleep(200);
  await P.page.click('#chatX');
  await L.sleep(200);
  await P.page.screenshot({path:'/opt/cursor/artifacts/held-request-phone.png'});
  const filled=await P.page.evaluate(()=>document.body.innerText.includes('pushups')||document.body.innerText.includes('Virginia'));
  ok('filled request shows the bet text',filled);
  await P.close();

  P=await open('#games',{desk:true});
  const chat=await P.page.evaluate(()=>{
    const c=document.getElementById('chat');
    const r=c.getBoundingClientRect();
    const who=document.getElementById('chatwho');
    return {cls:c.className,w:Math.round(r.width),right:Math.round(innerWidth-r.right),bottom:Math.round(innerHeight-r.bottom),pad:getComputedStyle(document.body).paddingBottom,who:(who||{}).innerText,switcher:!!c.querySelector('select, [data-a=pres]'),x:!!document.getElementById('chatX'),min:!!document.getElementById('chatMin'),snd:(document.getElementById('chatSnd')||{}).innerText};
  });
  ok('chat opens as a 320px corner overlay with no page padding',chat.w===320&&chat.right>=10&&chat.right<=16&&chat.pad==='0px'&&/Ana|Aces/.test(chat.who)&&!chat.switcher&&/Sound off/.test(chat.snd),chat);
  await P.page.screenshot({path:'/opt/cursor/artifacts/held-chat-desktop.png'});
  await P.page.click('#chatX');
  await L.sleep(200);
  const off=await P.page.evaluate(()=>({cls:document.getElementById('chat').className,launch:!!document.getElementById('chatlaunch')}));
  ok('X hides chat to a launcher',/chat-off/.test(off.cls)&&off.launch,off);
  await P.page.click('#chatlaunch');
  await P.page.click('#chatMin');
  await L.sleep(200);
  const bar=await P.page.evaluate(()=>{const c=document.getElementById('chat');const r=c.getBoundingClientRect();return {cls:c.className,w:Math.round(r.width),left:Math.round(r.left)}});
  ok('Minimize restores the full-width bottom bar',/chat-bar/.test(bar.cls)&&bar.left===0&&bar.w>600,bar);
  await P.page.goto(base+'/help.html#howto-filters',{waitUntil:'domcontentloaded'});
  await L.sleep(300);
  await P.page.screenshot({path:'/opt/cursor/artifacts/held-filters-guide.png'});
  await P.close();
  await L.close();
  srv.close();
  console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED\n'+fails.join('\n'):''));
  process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
