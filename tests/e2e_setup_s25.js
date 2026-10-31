/* s25 setup.html polish: banner, nav under form, What you get, centered card, optional league photo saved in meta.settings.photo. Mock store. Shots -> SHOTS dir. */
const L=require('./lib.js');const F=require('../js/core.js');const {sleep,APP,API}=L;const path=require('path');
const OUT=process.env.SHOTS||'/workspace/draftroom-notes/s25-setup';
let n=0,bad=0;const ok=(t,c,x)=>{n++;if(c)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const shot=(P,f)=>P.page.screenshot({path:OUT+'/'+f+'.png',fullPage:true});
(async()=>{try{
for(const [w,desk] of [[390,false],[1280,true]]){
 const P=await L.phone('s'+w,{w,h:desk?900:844,desktop:desk});await P.go('setup.html');await P.page.waitForSelector('#next');await sleep(400);
 const g=await P.page.evaluate(()=>{const n=document.querySelector('.wnav').getBoundingClientRect(),b=document.getElementById('body').getBoundingClientRect(),a=document.getElementById('app').getBoundingClientRect(),i=document.querySelector('.sbanner');
  return{gap:n.top-b.bottom,pos:getComputedStyle(document.querySelector('.wnav')).position,aw:a.width,al:a.left,vw:innerWidth,ban:i&&i.complete&&i.naturalWidth>0,src:i&&i.getAttribute('src'),wyg:document.getElementById('wyg').innerText,txt:document.body.innerText}});
 ok(w+': nav is directly under the form (not sticky)',g.pos==='static'&&g.gap>=0&&g.gap<40,g);
 ok(w+': local banner shown',g.ban&&g.src==='assets/setup-banner.svg',g);
 ok(w+': What you get list',['8 managers','Snake draft','64 picks','Season-long scoring','Pushup challenges'].every(s=>g.wyg.includes(s)),g.wyg);
 ok(w+': card centered, max 560px',g.aw<=561&&Math.abs(g.al-(g.vw-g.aw)/2)<2,g);
 ok(w+': no money wording / STOOPIDS',!/money|prize|payout|\$|STOOPIDS/i.test(g.txt));
 await P.page.type('#f_name','Shot League');await P.page.type('#f_mgr','Ann');await P.page.type('#f_team','Hoopers');await shot(P,w+'_step01_you');
 /* bad file */
 const inp=await P.page.$('#f_lphoto');await inp.uploadFile(path.join(__dirname,'fixtures/notimage.txt'));await sleep(500);
 ok(w+': non-image refused politely',/not a picture/.test(await P.page.$eval('#lphotoerr',e=>e.innerText)));
 if(desk){/* photo path */
  await (await P.page.$('#f_lphoto')).uploadFile(path.join(__dirname,'fixtures/lphoto.jpg'));await P.page.waitForSelector('img#lphotoprev',{timeout:8000}).catch(()=>{});await sleep(400);
  const ph=await P.page.evaluate(()=>({src:document.querySelector('.sbanner').src,info:document.getElementById('lphotoinfo').innerText}));
  ok('photo: banner swaps to resized JPEG under 40KB, 256px edge',/^data:image\/jpeg/.test(ph.src)&&ph.src.length*.75<40960&&/256×160/.test(ph.info),ph.info);
  await shot(P,w+'_step01_you_withphoto');
  await P.page.click('#rmlphoto');await sleep(300);ok('photo: remove restores default banner',(await P.page.$eval('.sbanner',e=>e.getAttribute('src')))==='assets/setup-banner.svg');
  await (await P.page.$('#f_lphoto')).uploadFile(path.join(__dirname,'fixtures/lphoto.jpg'));await P.page.waitForSelector('img#lphotoprev',{timeout:8000})}
 let i=2;for(;;){const nx=await P.page.$('#next');if(!nx)break;await P.page.click('#next');await sleep(350);const t=await P.page.$eval('#stepno',e=>e.innerText).catch(()=>'');await shot(P,w+'_step'+String(i).padStart(2,'0')+'_'+(await P.page.evaluate(()=>(document.querySelector('.q')||{}).innerText||'')).replace(/\W+/g,'-').slice(0,20));i++;if(i>15)break}
 ok(w+': reached confirm',!!(await P.page.$('#create')));
 if(desk){await P.page.click('#create');await P.page.waitForSelector('#toRoom',{timeout:20000}).catch(()=>{});await sleep(500);
  const id=await P.page.evaluate(()=>{const a=document.getElementById('toRoom');return a&&new URL(a.href).searchParams.get('l')});
  const mt=F.parseJ(await (await fetch(API+encodeURIComponent(F.Keys(id).meta))).text());
  ok('photo saved in meta.settings.photo; managers 8',mt&&/^data:image\/jpeg/.test(mt.settings.photo||'')&&mt.settings.managers===8,mt&&mt.settings&&{m:mt.settings.managers,p:(mt.settings.photo||'').slice(0,30)});
  await shot(P,w+'_created');}
 ok(w+': no page errors',P.errs.length===0,P.errs);await P.close()}
/* no-photo create stores no photo */
{const P=await L.phone('np',{});await P.go('setup.html');await P.page.waitForSelector('#next');await P.page.type('#f_name','No Photo');await P.page.type('#f_mgr','Bo');await P.page.type('#f_team','B');
 for(let i=0;i<15&&await P.page.$('#next');i++){await P.page.click('#next');await sleep(250)}await P.page.click('#create');await P.page.waitForSelector('#toRoom',{timeout:20000});
 const id=await P.page.evaluate(()=>new URL(document.getElementById('toRoom').href).searchParams.get('l'));const mt=F.parseJ(await (await fetch(API+encodeURIComponent(F.Keys(id).meta))).text());
 ok('no photo: settings has no photo, default banner',!mt.settings.photo);await shot(P,'390_created_nophoto');await P.close()}
}catch(e){bad++;console.log('CRASH',e)}await L.close();console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)})();
