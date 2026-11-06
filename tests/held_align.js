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
  const {srv,port,mem}=await start();
  const base='http://127.0.0.1:'+port;
  process.env.API=base+'/api/data/';
  const id=await seed(process.env.API,{rounds:8});
  const info=seed.info;
  const me=info.managers[0];
  const now=Date.now();
  const lid=String(id).toLowerCase();
  mem.set('fbn1-'+lid+'-pr-'+me.id,JSON.stringify({t:now}));
  mem.set('fbn1-'+lid+'-pr-'+info.managers[1].id,JSON.stringify({t:now-5*3600e3}));
  mem.set('fbn1-'+lid+'-chat',JSON.stringify({version:1,msgs:[{id:'heldhist',ts:now-60000,who:me.id,text:'History stays'}]}));
  async function open(hash,opt){
    opt=opt||{};
    const who=opt.who||me;
    const P=await L.phone('held',{desktop:!!opt.desk,w:opt.w||(opt.desk?1280:390),h:opt.h||(opt.desk?900:844)});
    await P.page.evaluateOnNewDocument((store,mid,k,lid,restore)=>{try{localStorage.setItem('fbn.store',store);localStorage.setItem('fbn.me.'+lid,JSON.stringify({mid,k}));if(restore)sessionStorage.setItem('lchat.mode.'+lid,'pop')}catch(e){}},'/api/data/',who.id,who.k,id,!!opt.restore);
    await P.page.setRequestInterception(true);
    P.page.on('request',r=>{const u=r.url();if(/site\.api\.espn\.com|espncdn/.test(u))r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
    await P.page.goto(base+'/league.html?l='+id+(hash||'#games'),{waitUntil:'domcontentloaded'});
    await P.page.waitForSelector('#lbody',{timeout:25000});
    await L.sleep(800);
    return P}
  let P=await open('#games',{desk:true,w:1280,h:900});
  let g=await P.page.evaluate(()=>{
    const pills=[...document.querySelectorAll('.gfone .rkseg-b, .gfone .gf2-s, .gfone .gf2-b')].filter(e=>e.offsetParent);
    const box=e=>{const r=e.getBoundingClientRect();return {t:(e.innerText||e.placeholder||e.getAttribute('aria-label')||'').slice(0,24),w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top)}};
    const chips=[...document.querySelectorAll('.ggrid>.gm:not(.gfin) .gside a.chip')].slice(0,3).map(e=>{const r=e.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)}});
    const qb=[...document.querySelectorAll('.qb-btn')];
    const qb0=qb[0],qbBoltEl=qb0&&qb0.querySelector('.qb-bolt');
    const live=document.body.innerText.includes('LIVE')&&[...document.querySelectorAll('.gm')].some(el=>/LIVE/.test(el.innerText)&&el.querySelector('.qb-btn'));
    const fin=[...document.querySelectorAll('.gfin, .gm.gfin, button.gsum')];
    const foot=(document.getElementById('foot')||{}).innerText||'';
    const fresh=document.getElementById('fresh');
    const onl=document.getElementById('onlStrip');
    const os=onl?getComputedStyle(onl):null;
    const day=document.getElementById('gDaySel');
    const cs=day?getComputedStyle(day):null;
    const ctx=document.createElement('canvas').getContext('2d');
    if(cs)ctx.font=cs.font;
    const labels=day?[...day.options].map(o=>o.text):[];
    const worst='Yesterday · Wed, Sep 30, 2026';
    const pad=cs?parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight):0;
    const inner=day?day.clientWidth-pad:0;
    const row=document.querySelector('.gfone');
    const nav=document.getElementById('ltabs');
    const first=document.querySelector('.gfone .rkseg-b');
    const card=document.querySelector('.ggrid>.gm:not(.gfin)');
    const pair=card?[...card.querySelectorAll(':scope > .gside a.chip, :scope .gside a.chip')].slice(0,2):[];
    const teamGap=pair.length===2?Math.round(pair[1].getBoundingClientRect().top-pair[0].getBoundingClientRect().bottom):null;
    const ownerBeside=!!(card&&[...card.querySelectorAll(':scope>.gside')].some(row=>row.querySelector('a.chip')&&row.querySelector('.opill')));
    const navGap=nav&&first?Math.round(first.getBoundingClientRect().top-nav.getBoundingClientRect().bottom):null;
    return {pills:pills.map(box),rows:[...new Set(pills.map(e=>Math.round(e.getBoundingClientRect().top)))],chips,teamGap,ownerBeside,navGap,qb:qb.length,qbBg:qb0?getComputedStyle(qb0).backgroundColor:'',qbFg:qb0?getComputedStyle(qb0).color:'',qbBolt:qbBoltEl?getComputedStyle(qbBoltEl).color:'',hasBolt:!!qbBoltEl,liveQb:!!live,finalQb:[...document.querySelectorAll('.gfin .qb-btn, .gm.gfin .qb-btn')].length,foot,freshHidden:!fresh||fresh.hidden,onlWrap:os?os.flexWrap:'',over:document.documentElement.scrollWidth>innerWidth+2,tally:[...document.querySelectorAll('#ltabs a')].filter(a=>getComputedStyle(a).display!=='none').map(a=>a.getAttribute('data-v')),day:{labels,longest:labels.slice().sort((a,b)=>ctx.measureText(b).width-ctx.measureText(a).width)[0]||'',worst,worstW:Math.round(ctx.measureText(worst).width),inner:Math.round(inner),font:cs?cs.font:'',rowScroll:row?row.scrollWidth:0,rowClient:row?row.clientWidth:0}};
  });
  ok('upcoming, past and the filters share one 28px row under the nav',g.pills.length>=7&&Math.max(...g.rows)-Math.min(...g.rows)<=2&&g.pills.every(p=>p.h===28)&&g.pills.some(p=>/Upcoming/.test(p.t))&&g.pills.some(p=>/Past/.test(p.t))&&g.pills.some(p=>/Stoop vs Stoop/.test(p.t))&&g.navGap>=0&&g.navGap<=12,g);
  ok('team pills stay 200x40 and touch with no gap',g.chips.length>0&&g.chips.every(c=>c.w===200&&c.h===40)&&g.teamGap===0&&g.ownerBeside,g);
  ok('quick bet uses the request blue, white text, and the lightning icon',g.qb>0&&g.qbBg==='rgb(30, 58, 138)'&&g.qbFg==='rgb(255, 255, 255)'&&g.qbBolt==='rgb(255, 255, 255)'&&g.hasBolt,{qb:g.qb,bg:g.qbBg,fg:g.qbFg,bolt:g.qbBolt});
  ok('games footer drops the time-zone line and the standings update',!/time zone/i.test(g.foot)&&g.freshHidden,g.foot);
  ok('desktop nav has no Tally tab',!g.tally.includes('tally'),g.tally);
  ok('games page does not overflow at 1280 and the longest day label fits the day control',!g.over&&g.day.worstW<=g.day.inner,g.day);
  console.log('  day '+JSON.stringify(g.day));
  console.log('  layout navGap='+g.navGap+' teamGap='+g.teamGap);
  console.log('  pills '+JSON.stringify(g.pills));
  await P.page.hover('.qb-btn');
  await L.sleep(300);
  ok('hover does not open quick bet',!(await P.page.$('.qb-pick, .qbd')));
  await P.page.click('.qb-btn');
  await L.sleep(300);
  const clickQ=await P.page.evaluate(()=>({open:!!document.querySelector('.qb-pick, .qbd'),titles:document.querySelectorAll('.qb-s[title], .qbs-o[title]').length}));
  ok('click opens quick bet and its choices have no hover title',clickQ.open&&clickQ.titles===0,clickQ);
  await P.page.keyboard.press('Escape');
  await P.page.screenshot({path:'/opt/cursor/artifacts/next-games-desktop.png'});
  await P.close();

  P=await open('#games',{w:390,h:844});
  const phone=await P.page.evaluate(()=>{
    const more=[...document.querySelectorAll('#ltabs a.nm-x')].map(a=>a.getAttribute('data-v'));
    const main=[...document.querySelectorAll('#ltabs a:not(.nm-x), #ltabs .nm-b')].map(a=>(a.innerText||'').replace(/\s+/g,' ').trim());
    const over=document.documentElement.scrollWidth>innerWidth+2;
    const row=document.querySelector('.gfone');
    const controls=[...document.querySelectorAll('.gfone .rkseg-b, .gfone .gf2-s, .gfone .gf2-b')].filter(e=>e.offsetParent);
    const tops=[...new Set(controls.map(e=>Math.round(e.getBoundingClientRect().top)))];
    const rr=row?row.getBoundingClientRect():{width:0,right:0};
    const nav=document.getElementById('ltabs'), first=document.querySelector('.gfone .rkseg-b');
    const card=document.querySelector('.ggrid>.gm:not(.gfin)');
    const pair=card?[...card.querySelectorAll('.gside a.chip')].slice(0,2):[];
    return {more,main,over,tops,n:controls.length,rowW:Math.round(rr.width),rowRight:Math.round(rr.right),rowScroll:row?row.scrollWidth:0,vw:innerWidth,page:document.documentElement.scrollWidth,navGap:nav&&first?Math.round(first.getBoundingClientRect().top-nav.getBoundingClientRect().bottom):null,teamGap:pair.length===2?Math.round(pair[1].getBoundingClientRect().top-pair[0].getBoundingClientRect().bottom):null,h:controls[0]?Math.round(controls[0].getBoundingClientRect().height):0};
  });
  ok('phone More still holds Tally and the other extra tabs',phone.more.includes('tally')&&phone.more.includes('profile')&&phone.more.includes('rules'),phone);
  ok('phone games controls stay on one contained scrolling row',phone.n>=7&&Math.max(...phone.tops)-Math.min(...phone.tops)<=2&&!phone.over&&phone.rowRight<=phone.vw+1&&phone.rowScroll>phone.rowW,phone);
  console.log('  phone390 '+JSON.stringify(phone));
  ok('phone nav-to-controls gap stays tight and team pills touch',phone.navGap>=0&&phone.navGap<=12&&phone.teamGap===0&&phone.h===28,phone);
  await P.page.screenshot({path:'/opt/cursor/artifacts/next-games-phone.png'});
  await P.page.evaluate(()=>{const r=document.querySelector('.gfone');if(r)r.scrollLeft=r.scrollWidth});
  await L.sleep(150);
  await P.page.screenshot({path:'/opt/cursor/artifacts/next-games-phone-scrolled.png'});
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
  const ident=await P.page.evaluate(()=>{
    const lin=c=>{c=c/255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
    const L=s=>{const n=s.match(/\d+/g).map(Number);return 0.2126*lin(n[0])+0.7152*lin(n[1])+0.0722*lin(n[2])};
    const ratio=(a,b)=>{const x=L(a),y=L(b),hi=Math.max(x,y),lo=Math.min(x,y);return (hi+0.05)/(lo+0.05)};
    const hd=document.querySelector('.entry-hd-rq'),btn=document.querySelector('.rq-send');
    const form=document.getElementById('b27Form'),rq=document.getElementById('rqForm');
    return {hd:hd?getComputedStyle(hd).backgroundColor:'',btn:btn?getComputedStyle(btn).backgroundColor:'',btnFg:btn?getComputedStyle(btn).color:'',ratio:btn?Math.round(ratio(getComputedStyle(btn).backgroundColor,getComputedStyle(btn).color)*10)/10:0,wiuChange:!!(form&&form.querySelector('a[href*="join.html"]')),rqChange:!!(rq&&rq.querySelector('a[href*="join.html"]')),wiuYou:/you are\s/i.test(form?form.innerText:''),rqYou:/you are\s/i.test(rq?rq.innerText:'')};
  });
  console.log('  request-blue '+JSON.stringify(ident));
  ok('request blue matches quick bet and stays readable',ident.hd==='rgb(30, 58, 138)'&&ident.btn==='rgb(30, 58, 138)'&&ident.btnFg==='rgb(255, 255, 255)'&&ident.ratio>=4.5,ident);
  ok('bet forms drop the identity changer and keep working from profile',!ident.wiuChange&&!ident.rqChange&&!ident.wiuYou&&!ident.rqYou,ident);
  await P.page.hover('.entry-wiu .s27-tipk');
  await L.sleep(250);
  ok('hover does not open a bet detail',!(await P.page.$('.s27-pop')));
  await P.page.click('.entry-wiu .s27-tipk');
  await L.sleep(200);
  ok('click opens the bet detail',!!(await P.page.$('.s27-pop')));
  await P.page.keyboard.press('Escape');
  await L.sleep(100);
  ok('escape closes the bet detail',!(await P.page.$('.s27-pop')));
  await P.page.hover('.entry-rq .s27-tipk');
  await L.sleep(350);
  ok('hover does not open a request detail',!(await P.page.$('.s27-pop')));
  await P.page.hover('#b27Sum, .b27-sum, .entry-wiu');
  await L.sleep(250);
  ok('hovering the write-up summary does not open a detail',!(await P.page.$('.s27-pop')));
  await P.page.click('#b27KindPool');
  await L.sleep(250);
  const pool=await P.page.evaluate(()=>{const f=document.getElementById('b27Form'),rq=document.getElementById('rqForm');return {kind:f&&f.dataset.kind,bet:(document.getElementById('b27KindBet')||{}).innerText||'',pool:(document.getElementById('b27KindPool')||{}).innerText||'',betOn:(document.getElementById('b27KindBet')||{}).getAttribute&&document.getElementById('b27KindBet').getAttribute('aria-pressed'),poolOn:document.getElementById('b27KindPool').getAttribute('aria-pressed'),amt:!!(f&&f.querySelector('#b27En, .b27-amt, #b27Text, input')),rq:!!(rq&&rq.querySelector('#b27KindPool, .b27-kind')),you:/you are\s/i.test((f||{}).innerText||'')}});
  ok('write it up pills sit together and pool is an empty view',pool.kind==='pool'&&pool.poolOn==='true'&&pool.betOn==='false'&&/One side vs another/.test(pool.bet)&&/Pool \/ buy-in/.test(pool.pool)&&!pool.amt&&!pool.rq&&!pool.you,pool);
  await P.page.screenshot({path:'/opt/cursor/artifacts/next-pool-empty.png'});
  await P.page.click('#b27KindBet');
  await L.sleep(200);
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
  await P.page.hover('.b27-c');
  await L.sleep(200);
  await P.page.hover('.b27-m');
  await L.sleep(200);
  const add=await P.page.$('.s25add');
  if(add){await add.hover();await L.sleep(450)}
  const hovered=await P.page.evaluate(()=>({pop:!!document.querySelector('.s27-pop'),who:!!document.querySelector('.s25wl'),pk:!!document.querySelector('.s25pk'),titles:[...document.querySelectorAll('.b27-c [title], .s25rx[title]')].map(e=>e.getAttribute('title')).filter(t=>t&&!/Copy this/.test(t))}));
  ok('hovering a placed bet card does not open a detail',!hovered.pop&&!hovered.who&&!hovered.pk&&hovered.titles.length===0,hovered);
  if(add){await add.click();await L.sleep(200);ok('click opens the reaction list',!!(await P.page.$('.s25pk')));await P.page.keyboard.press('Escape');await L.sleep(150);ok('escape closes the reaction list',!(await P.page.$('.s25pk')))}
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
  await P.page.screenshot({path:'/opt/cursor/artifacts/held-request-phone.png'});
  const filled=await P.page.evaluate(()=>document.body.innerText.includes('pushups')||document.body.innerText.includes('Virginia'));
  ok('filled request shows the bet text',filled);
  await P.close();

  const ben=info.managers[1];
  P=await open('#bets',{desk:true,who:ben});
  await P.page.waitForSelector('#b27Text',{timeout:10000});
  await P.page.click('#ltabs a[data-v=profile]');
  await P.page.waitForSelector('#profileTeam',{timeout:8000});
  const prof=await P.page.evaluate(()=>({team:(document.getElementById('profileTeam')||{}).innerText||'',name:(document.getElementById('profileName')||{}).innerText||''}));
  ok('profile shows the switched device identity',/Blazers|Ben/.test(prof.team+' '+prof.name),prof);
  await P.page.click('#ltabs a[data-v=bets]');
  await P.page.waitForSelector('#b27Text',{timeout:8000});
  const noRow=await P.page.evaluate(()=>({change:!!document.querySelector('#b27Form a[href*="join.html"]'),you:/you are\s/i.test((document.getElementById('b27Form')||{}).innerText||'')}));
  ok('the switched profile still has no identity row on the form',!noRow.change&&!noRow.you,noRow);
  await P.page.evaluate(()=>{const t=document.querySelector('#b27Text');t.value='Ben keeps this bet';t.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-lb=opp]').click();document.querySelector('[data-lb=amt]').click()});
  await L.sleep(200);
  await P.page.click('#b27Place');
  await P.page.waitForSelector('#b27Confirm',{timeout:5000});
  await P.page.click('[data-lb=confirm]');
  await P.page.waitForFunction(()=>/Placed/.test((document.getElementById('b27Msg')||{}).innerText||''),{timeout:10000});
  const savedAs=await P.page.evaluate(bid=>window.LBETS.bets().filter(b=>b.text==='Ben keeps this bet').map(b=>({by:b.by,posted:b.postedBy})),ben.id);
  ok('the new bet is saved as the profile identity',savedAs.length===1&&savedAs[0].by===ben.id&&savedAs[0].posted===ben.id,savedAs);
  await P.page.screenshot({path:'/opt/cursor/artifacts/next-bets-profile-identity.png'});
  await P.close();

  P=await open('#teams',{desk:true,w:1280,h:900});
  await P.page.waitForSelector('#allteams td:first-child .chip',{timeout:10000});
  await L.sleep(300);
  const teams=await P.page.evaluate(()=>{const root=document.getElementById('allteams');const chips=[...root.querySelectorAll('td:first-child .chip')];const sizes=chips.map(c=>{const r=c.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),clip:c.scrollWidth>c.clientWidth+1,t:((c.querySelector('.cn')||c).textContent||'').replace(/\s+/g,' ').trim()}});const card=root.querySelector('.card.tap').getBoundingClientRect();const stoop=root.querySelector('td.to');const team=root.querySelector('td:first-child');const gap=stoop&&team?Math.round(stoop.getBoundingClientRect().left-team.getBoundingClientRect().right):null;const longest=sizes.slice().sort((a,b)=>b.t.length-a.t.length)[0];return {n:sizes.length,ws:[...new Set(sizes.map(s=>s.w))],hs:[...new Set(sizes.map(s=>s.h))],table:Math.round(card.width),vw:innerWidth,over:document.documentElement.scrollWidth>innerWidth+2,gap,longest:longest&&longest.t,atw:root.style.getPropertyValue('--atw'),clip:sizes.some(s=>s.clip),games:document.querySelectorAll('.ggrid .chip').length}});
  console.log('  allteams '+JSON.stringify(teams));
  ok('all teams badges are one size, fit the longest name, and the table is not full-bleed',teams.n>3&&teams.ws.length===1&&teams.hs.length===1&&teams.hs[0]===32&&!teams.clip&&teams.table<teams.vw-40&&!teams.over&&teams.gap!=null&&teams.gap<80,teams);
  await P.page.screenshot({path:'/opt/cursor/artifacts/next-allteams-desktop.png'});
  await P.close();
  P=await open('#teams',{w:390,h:844});
  await P.page.waitForSelector('#allteams',{timeout:10000});
  await L.sleep(300);
  const teamsPhone=await P.page.evaluate(()=>{const root=document.getElementById('allteams');const card=root.querySelector('.card.tap');const chips=[...root.querySelectorAll('td:first-child .chip')];const w=[...new Set(chips.map(c=>Math.round(c.getBoundingClientRect().width)))];return {over:document.documentElement.scrollWidth>innerWidth+2,page:document.documentElement.scrollWidth,vw:innerWidth,scroll:card.scrollWidth>card.clientWidth+2||root.scrollWidth>root.clientWidth+2,ws:w}});
  ok('phone all teams scrolls inside the table',!teamsPhone.over&&teamsPhone.page<=teamsPhone.vw+1,teamsPhone);
  await P.page.screenshot({path:'/opt/cursor/artifacts/next-allteams-phone.png'});
  await P.close();

  mem.set('fbn1-'+lid+'-pr-'+ben.id,JSON.stringify({t:Date.now()-5*3600e3}));
  P=await open('#games',{desk:true,restore:true});
  P.page.on('pageerror',err=>console.log('PAGE '+err.message));
  const measure=()=>P.page.evaluate(()=>{
    const c=document.getElementById('chat');
    const panel=document.getElementById('chatpanel');
    const pr=panel?panel.getBoundingClientRect():null;
    const row=document.getElementById('chatpres');
    const rr=row?row.getBoundingClientRect():null;
    const launch=document.getElementById('chatlaunch');
    const name=row&&row.querySelector('.onl-p.on');
    const kids=row?[...row.children]:[];
    return {
      cls:c.className,pad:getComputedStyle(document.body).paddingBottom,chatH:getComputedStyle(document.documentElement).getPropertyValue('--chatH').trim(),
      panel:pr?{w:Math.round(pr.width),right:Math.round(innerWidth-pr.right),bottom:Math.round(innerHeight-pr.bottom),top:Math.round(pr.top)}:null,
      row:rr?{top:Math.round(rr.top),bottom:Math.round(rr.bottom),fs:name?getComputedStyle(name).fontSize:'',wrap:getComputedStyle(row).flexWrap,scroll:row.scrollWidth,client:row.clientWidth,tops:[...new Set(kids.map(e=>Math.round(e.getBoundingClientRect().top)))],over:document.documentElement.scrollWidth>innerWidth+2}:null,
      who:(document.getElementById('chatwho')||{}).innerText||'',switcher:!!document.querySelector('#chatwho select, #chat [data-a=pres]'),
      snd:(document.getElementById('chatSnd')||{}).innerText||'',launch:!!launch,
      anim:getComputedStyle(launch||document.querySelector('.chat-t')||c).animationName,
      badge:(document.getElementById('chatbadge')||{}).textContent||'',
      on:[...((row&&row.querySelectorAll('.onl-p.on'))||[])].map(e=>e.innerText),
      lastSeen:[...((row&&row.querySelectorAll('.onl-p.last'))||[])].map(e=>e.innerText),
      heads:[...((row&&row.querySelectorAll('.onl-h'))||[])].map(e=>e.innerText),
      hist:(document.getElementById('chatlist')||{}).innerText||'',
      preview:(document.getElementById('chatlast')||{}).innerText||''
    };
  });
  const chatKey='fbn1-'+lid+'-chat';
  const putChat=(msgs)=>mem.set(chatKey,JSON.stringify({version:msgs.length,msgs}));
  const dbg=await P.page.evaluate(()=>({html:(document.getElementById('chatpres')||{}).innerHTML||'',cls:(document.getElementById('chat')||{}).className||''}));
  console.log('  chatdbg '+JSON.stringify(dbg).slice(0,700));
  await P.page.waitForFunction(()=>{const p=document.getElementById('chatpres');return p&&/Online/.test(p.innerText)&&/5h ago/.test(p.innerText)},{timeout:8000});
  const landed=await measure();
  ok('a fresh load stays closed even if an old session said open',/chat-off/.test(landed.cls)&&landed.launch&&!landed.panel&&landed.pad==='0px'&&landed.chatH==='0px',landed);
  ok('online names are labeled, 14px, one row, and stale presence is not called online',landed.heads[0]==='Online'&&landed.heads.includes('Last seen')&&landed.on.some(t=>/Ana/.test(t))&&!landed.on.some(t=>/ago|Ben/.test(t))&&landed.lastSeen.some(t=>/Ben/.test(t)&&/5h ago/.test(t))&&landed.row.fs==='14px'&&landed.row.wrap==='nowrap'&&landed.row.tops.length===1&&!landed.row.over,landed);
  ok('unread is a steady highlight, not a blink',/unread/.test(landed.cls)&&landed.badge==='1'&&landed.anim==='none',landed);
  await P.page.screenshot({path:'/opt/cursor/artifacts/next-chat-off.png'});
  await P.page.reload({waitUntil:'domcontentloaded'});
  await P.page.waitForSelector('#chatlaunch',{timeout:15000});
  await P.page.waitForFunction(()=>/chat-off/.test(document.getElementById('chat').className)&&document.getElementById('chatbadge')&&!document.getElementById('chatbadge').hidden,{timeout:8000});
  const reloaded=await measure();
  ok('reload stays on the launcher',/chat-off/.test(reloaded.cls)&&reloaded.launch&&!reloaded.panel&&reloaded.anim==='none',reloaded);
  putChat([{id:'heldhist',ts:now-60000,who:me.id,text:'History stays'},{id:'heldnew',ts:Date.now(),who:ben.id,text:'Arrived while closed'}]);
  await P.page.waitForFunction(()=>{const b=document.getElementById('chatbadge'),c=document.getElementById('chat');return b&&b.textContent==='2'&&/chat-off/.test(c.className)},{timeout:15000});
  ok('a message that arrives while closed highlights the launcher and does not open chat',true);
  await P.page.click('#ltabs a[data-v=bets]');
  await P.page.waitForSelector('#b27Form',{timeout:8000});
  const onBets=await measure();
  ok('the online row stays readable on Bets while chat is closed',/chat-off/.test(onBets.cls)&&onBets.on.some(t=>/Ana/.test(t))&&onBets.row.fs==='14px',onBets);
  await P.page.screenshot({path:'/opt/cursor/artifacts/next-online-bets.png'});
  await P.page.click('#chatlaunch');
  await L.sleep(400);
  const chat=await measure();
  ok('opening is a 320px panel with a read-only name and does not cover the online row',chat.panel&&chat.panel.w===320&&chat.panel.right>=10&&chat.panel.right<=16&&/Ana|Aces/.test(chat.who)&&!chat.switcher&&/Sound off/.test(chat.snd)&&/History stays/.test(chat.hist)&&/Arrived while closed/.test(chat.hist)&&chat.row.bottom<=chat.panel.top+2,chat);
  await P.page.screenshot({path:'/opt/cursor/artifacts/next-chat-pop.png'});
  putChat([{id:'heldhist',ts:now-60000,who:me.id,text:'History stays'},{id:'heldnew',ts:now,who:ben.id,text:'Arrived while closed'},{id:'heldopen',ts:Date.now(),who:me.id,text:'Arrived while open'}]);
  await P.page.waitForFunction(()=>/Arrived while open/.test((document.getElementById('chatlist')||{}).innerText||'')&&/chat-pop/.test(document.getElementById('chat').className),{timeout:15000});
  ok('a message that arrives while open stays in the open panel',true);
  await P.page.click('#chatMin');
  await L.sleep(300);
  const bar=await measure();
  ok('Minimize restores the bottom bar and keeps the online row',/chat-bar/.test(bar.cls)&&!bar.panel&&bar.heads[0]==='Online'&&bar.on.some(t=>/Ana/.test(t))&&/History stays|Arrived/.test(bar.preview),bar);
  await P.page.screenshot({path:'/opt/cursor/artifacts/next-chat-bar.png'});
  putChat([{id:'heldhist',ts:now-60000,who:me.id,text:'History stays'},{id:'heldnew',ts:now,who:ben.id,text:'Arrived while closed'},{id:'heldopen',ts:now,who:me.id,text:'Arrived while open'},{id:'heldmin',ts:Date.now(),who:ben.id,text:'Arrived while minimized'}]);
  await P.page.waitForFunction(()=>{const c=document.getElementById('chat');return /chat-bar/.test(c.className)&&/Arrived while minimized/.test((document.getElementById('chatlast')||{}).innerText||'')},{timeout:15000});
  ok('a message that arrives while minimized updates the bar and leaves it minimized',true);
  await P.page.click('#chatbar');
  await L.sleep(250);
  await P.page.click('#chatX');
  await L.sleep(250);
  const off=await measure();
  ok('X closes to the launcher and the online row remains',/chat-off/.test(off.cls)&&off.launch&&off.heads.includes('Online')&&off.on.some(t=>/Ana/.test(t))&&!off.on.some(t=>/5h ago/.test(t)),off);
  await P.page.click('#chatlaunch');
  await L.sleep(300);
  const back=await measure();
  ok('the launcher reopens the same history',/chat-pop/.test(back.cls)&&back.panel&&back.panel.w===320&&/Arrived while minimized/.test(back.hist)&&/History stays/.test(back.hist),back);
  await P.page.screenshot({path:'/opt/cursor/artifacts/next-chat-reopen.png'});
  await P.page.goto(base+'/help.html#howto-filters',{waitUntil:'domcontentloaded'});
  await L.sleep(300);
  await P.page.screenshot({path:'/opt/cursor/artifacts/held-filters-guide.png'});
  await P.close();
  await L.close();
  srv.close();
  console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED\n'+fails.join('\n'):''));
  process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
