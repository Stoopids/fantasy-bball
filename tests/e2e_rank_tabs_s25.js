/* s25: AP Top 25 badge + Standings 'League | AP / NET' toggle; tab order + date-windowed Redraft / Postseason tabs (injectable now), Practice the redraft button.
   AP comes from a saved copy of the REAL ESPN rankings answer (tests/fixtures/espn_rankings_ap_2026-10-19.json, served to the page by interception; GET only),
   NET from the staged data/net.json. Unit part: LTABS.visible / LRANK.badge in Node. TZ=Asia/Jakarta node tests/e2e_rank_tabs_s25.js (APP / API env; SHOTS=dir) */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const {seed}=require('./seed_league.js');const {sleep}=L;const root=path.join(__dirname,'..');
const TZ=process.env.TZ||'Asia/Jakarta';const SH=process.env.SHOTS||'';
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  ['+TZ+'] '+name);else{bad++;console.log('FAIL  ['+TZ+'] '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,700):''))}}
const AP=fs.readFileSync(path.join(__dirname,'fixtures/espn_rankings_ap_2026-10-19.json'),'utf8');const APJ=JSON.parse(AP);const APR={};APJ.rankings.find(x=>x.type==='ap').ranks.forEach(r=>APR[r.team.id]=r.current);
const NET=JSON.parse(fs.readFileSync(path.join(root,'data/net.json'),'utf8'));const NETR={};NET.ranks.forEach(r=>NETR[r.id]=r.rank);
const ORDER=['standings','games','bets','rosters','teams','postseason','redraft','rules','archive'];
/* ---- unit ---- */
require('../js/league-d.js');const W=globalThis.LTABS;const at=s=>new Date(s).getTime();   /* local wall-clock times in TZ */
ok('unit: Nov 2026 -> no Redraft, no Postseason',!W.visible('redraft',at('2026-11-15T12:00'))&&!W.visible('postseason',at('2026-11-15T12:00')));
ok('unit: Redraft from Jan 6 00:00 local (Jan 5 23:59 hidden)',!W.visible('redraft',at('2027-01-05T23:59'))&&W.visible('redraft',at('2027-01-06T00:00')));
ok('unit: no redraft state -> hidden after Jan 20 end of day',W.visible('redraft',at('2027-01-20T23:59'))&&!W.visible('redraft',at('2027-01-21T00:00')));
ok('unit: redraft open/live -> still shown after Jan 20; complete -> hidden',W.visible('redraft',at('2027-01-25T12:00'),{redraft:'open'})&&!W.visible('redraft',at('2027-01-10T12:00'),{redraft:'done'}));
ok('unit: Postseason Mar 1 .. Apr 6 (no title-game date in the data)',!W.visible('postseason',at('2027-02-28T23:59'))&&W.visible('postseason',at('2027-03-01T00:00'))&&W.visible('postseason',at('2027-04-06T23:59'))&&!W.visible('postseason',at('2027-04-07T00:00')));
ok('unit: Postseason ends title-game day + 1 when the data has it',W.visible('postseason',at('2027-04-06T12:00'),{champDay:'2027-04-05'})&&!W.visible('postseason',at('2027-04-07T00:00'),{champDay:'2027-04-05'}));
ok('unit: list() keeps the order and drops hidden tabs cleanly',W.list(ORDER,at('2026-11-15T12:00')).join()==='standings,games,bets,rosters,teams,rules,archive');
globalThis.LRANK=undefined;
const base=process.env.API||'http://localhost:9996/api/data/';
async function open(id,info,w,o){o=o||{};const P=await L.phone('rk'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:o.h||900,tz:TZ});
  await P.page.evaluateOnNewDocument((id,me,now,sv)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me));if(now)localStorage.setItem('fbn.now',now);if(sv)localStorage.setItem('standingsView',sv)},id,{mid:info.managers[0].id,k:info.managers[0].k},o.now||'',o.sv||'');
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);const seen=[];
  P.page.on('request',r=>{const u=new URL(r.url());if(u.hostname==='site.api.espn.com'&&/\/rankings$/.test(u.pathname)){seen.push(r.method());r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:AP})}
    else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
  await P.go('league.html?l='+id+'#'+(o.hash||'standings'));await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await sleep(1200);P.seen=seen;return P}
const tabs=P=>P.page.evaluate(()=>[...document.querySelectorAll('#ltabs a.tb')].map(a=>{const r=a.getBoundingClientRect();return{v:a.dataset.v,top:Math.round(r.top),h:Math.round(r.height),w:Math.round(r.width)}}));
const perRow=t=>{const m={};t.forEach(x=>m[x.top]=(m[x.top]||0)+1);return Object.values(m)};
const stack=(a,b,out)=>require('child_process').execFileSync('python3',['-c',"import sys;from PIL import Image;a=Image.open(sys.argv[1]);b=Image.open(sys.argv[2]);c=Image.new('RGB',(max(a.width,b.width),a.height+b.height+12),(16,19,26));c.paste(a,(0,0));c.paste(b,(0,a.height+12));c.save(sys.argv[3])",a,b,out]);
(async()=>{try{
  const id=await seed(null,{rounds:8});const info=seed.info;
  /* ---- badge ---- */
  let P=await open(id,info,390,{now:'2026-11-15T12:00'});
  const b=await P.page.evaluate(()=>{const cs=[...document.querySelectorAll('#lbody .chip.school-chip')];return cs.map(c=>{const h=c.getAttribute('href')||'',id=(/\/id\/(\d+)/.exec(h)||[])[1]||null,k=c.querySelector('.rkb'),s=k&&getComputedStyle(k),nm=c.querySelector('.cn');return{id,b:k?k.textContent:null,first:!!(k&&nm&&nm.firstChild===k),st:s?[s.fontWeight,s.borderRadius,s.backgroundColor,s.color,s.marginRight,s.verticalAlign,s.lineHeight,s.paddingTop+' '+s.paddingLeft].join('|'):null}})});
  const withId=b.filter(x=>x.id);ok('standings chips carry ESPN ids ('+withId.length+')',withId.length>=20,b.slice(0,3));
  ok('ranked teams show "#N" = their AP rank, before the name',withId.filter(x=>APR[x.id]).length>=5&&withId.filter(x=>APR[x.id]).every(x=>x.b==='#'+APR[x.id]&&x.first),withId.filter(x=>APR[x.id]).slice(0,5));
  ok('unranked teams show nothing',withId.filter(x=>!APR[x.id]).length>=5&&withId.filter(x=>!APR[x.id]).every(x=>x.b===null));
  ok('badge style: 700, pill, #FFD400 on #111, 4px gap, vertical-align 1px, padding 1px 5px',withId.filter(x=>x.b).every(x=>/^700\|999px\|rgb\(255, 212, 0\)\|rgb\(17, 17, 17\)\|4px\|1px\|/.test(x.st)&&/1px 5px$/.test(x.st)),withId.find(x=>x.b));
  ok('AP fetched with GET only',P.seen.length>=1&&P.seen.every(m=>m==='GET'),P.seen);
  /* ---- toggle ---- */
  const seg=()=>P.page.evaluate(()=>[...document.querySelectorAll('.segv .seg')].map(s=>{const r=s.getBoundingClientRect(),c=getComputedStyle(s);return{t:s.textContent,p:s.getAttribute('aria-pressed'),h:Math.round(r.height),w:Math.round(r.width),bg:c.backgroundColor,fg:c.color}}));
  let s=await seg();ok('Standings toggle "League | AP / NET", League pressed by default, taps >= 44px',s.length===2&&s[0].t==='League'&&s[1].t==='AP / NET'&&s[0].p==='true'&&s[1].p==='false'&&s.every(x=>x.h>=44&&x.w>=44)&&s[0].bg==='rgb(255, 212, 0)'&&s[1].fg==='rgb(187, 187, 187)',s);
  ok('League view = the standings rows',await P.page.$$eval('.strow',x=>x.length)===8);
  const nTabs=(await tabs(P)).length;
  await P.page.click('.segv .seg[data-v=rank]');await sleep(400);s=await seg();
  const rk=await P.page.evaluate(()=>({ap:[...document.querySelectorAll('#rkap .rkrow')].map(r=>({id:r.dataset.tid,v:r.querySelector('.rkv').textContent,o:r.querySelector('.rko').textContent,mut:r.querySelector('.rko').classList.contains('mut')})),net:[...document.querySelectorAll('#rknet .rkrow')].map(r=>({id:r.dataset.tid,v:r.querySelector('.rkv').textContent})),ls:localStorage.getItem('standingsView'),strow:document.querySelectorAll('.strow').length}));
  ok('AP / NET pressed, stored as standingsView=apnet, tab count unchanged',s[1].p==='true'&&s[0].p==='false'&&rk.ls==='apnet'&&(await tabs(P)).length===nTabs&&rk.strow===0,{s,ls:rk.ls});
  ok('AP list: 25 rows in poll order, "AP #N · NET M" (real ranks), manager in muted text',rk.ap.length===25&&rk.ap.every((r,i)=>APR[r.id]===i+1&&r.v===('AP #'+(i+1))+(NETR[r.id]?' · NET '+NETR[r.id]:''))&&rk.ap.every(r=>r.mut&&r.o.length>0),rk.ap.slice(0,4));
  ok('NET list: drafted teams in NET order with their staged rank',rk.net.length>=10&&rk.net.every((r,i,a)=>r.v.includes('NET '+NETR[r.id])&&(i===0||NETR[a[i-1].id]<NETR[r.id])),rk.net.slice(0,4));
  await P.page.reload({waitUntil:'domcontentloaded'});await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await sleep(900);s=await seg();ok('choice remembered after reload',s[1].p==='true',s);
  await P.page.focus('.segv .seg[data-v=league]');await P.page.keyboard.press('Enter');await sleep(300);s=await seg();ok('keyboard: Enter switches back to League',s[0].p==='true',s);
  await P.close();
  for(const w of [320,390,1280]){P=await open(id,info,w,{now:'2026-11-15T12:00',sv:'apnet'});const o=await P.page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth}));ok(w+'px AP / NET: no horizontal overflow',o.sw<=o.iw,o);await P.close()}
  /* ---- tabs by date ---- */
  for(const [lab,now,exp] of [['Nov','2026-11-15T12:00',ORDER.filter(t=>t!=='redraft'&&t!=='postseason')],['Jan 10','2027-01-10T12:00',ORDER.filter(t=>t!=='postseason')],['Mar 15','2027-03-15T12:00',ORDER.filter(t=>t!=='redraft')]]){
    for(const w of [390,1280]){P=await open(id,info,w,{now,h:w===390?844:900});const t=await tabs(P);ok(lab+' '+w+'px: tabs in order '+exp.join(','),t.map(x=>x.v).join()===exp.join(),t.map(x=>x.v));
      if(w===390)ok(lab+' 390px: 4 per row, taps >= 44px',perRow(t).slice(0,-1).every(c=>c===4)&&t.every(x=>x.h>=44),perRow(t));else ok(lab+' 1280px: one row',perRow(t).length===1,perRow(t));
      if(lab==='Jan 10'){await P.page.evaluate(()=>{const a=document.querySelector('#ltabs a[data-v=redraft]');a.click()});await sleep(500);
        const pb=await P.page.evaluate(()=>{const a=document.getElementById('redraftmock'),c=document.getElementById('redraftcard');if(!a)return null;const r=a.getBoundingClientRect(),q=c.getBoundingClientRect();return{h:Math.round(r.height),w:Math.round(r.width),cw:Math.round(q.width),href:a.getAttribute('href'),t:a.textContent}});
        ok(lab+' '+w+'px: "Practice the Redraft" full width, >= 44px, mock.html?l=<league>&mode=redraft',pb&&pb.h>=44&&Math.abs(pb.w-pb.cw)<=1&&/\/mock\.html\?l=[^&]+&mode=redraft$/.test(pb.href)&&pb.href.includes(encodeURIComponent(id))&&pb.t==='Practice the Redraft',pb)}
      if(SH)await P.page.screenshot({path:path.join(SH,'s25_tabs_'+lab.replace(' ','').toLowerCase()+'_'+w+'.png')});await P.close()}}
  for(const w of [320,360]){P=await open(id,info,w,{now:'2027-01-10T12:00'});const t=await tabs(P);const pr=perRow(t);ok(w+'px: 3 per row (8 tabs), no overflow',pr.slice(0,-1).every(c=>c===3)&&await P.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),pr);await P.close()}
  P=await open(id,info,390,{now:'2026-11-15T12:00',hash:'postseason'});let r=await P.page.evaluate(()=>({h:location.hash,on:(document.querySelector('#ltabs a.on')||{}).dataset.v,st:document.querySelectorAll('.strow').length}));
  ok('deep link to a hidden tab (#postseason in Nov) falls back to Standings',r.on==='standings'&&r.st===8&&!/postseason/.test(r.h),r);await P.close();
  P=await open(id,info,390,{now:'2026-11-15T12:00',hash:'redraft'});r=await P.page.evaluate(()=>({on:(document.querySelector('#ltabs a.on')||{}).dataset.v,pm:!!document.getElementById('redraftmock')}));ok('deep link #redraft in Nov falls back to Standings',r.on==='standings'&&!r.pm,r);await P.close();
  /* ---- screenshots ---- */
  if(SH){for(const w of [390,1280,1600]){
      P=await open(id,info,w,{now:'2027-01-10T12:00',h:w===390?900:700});await P.page.screenshot({path:path.join(SH,'s25_taborder_'+w+'.png')});await P.close();
      P=await open(id,info,w,{now:'2026-11-15T12:00',h:2400});const clip=async hh=>{const y=await P.page.evaluate(()=>Math.round(document.querySelector('.segv').getBoundingClientRect().top+scrollY-10));return{x:0,y,width:w,height:hh}};await P.page.evaluate(()=>{const c=document.getElementById('chat');if(c)c.style.visibility='hidden'});await P.page.screenshot({path:'/tmp/rk_a.png',clip:await clip(w===390?900:560)});await P.page.click('.segv .seg[data-v=rank]');await sleep(400);await P.page.evaluate(()=>{const c=document.getElementById('chat');if(c)c.style.visibility='hidden'});await P.page.screenshot({path:'/tmp/rk_b.png',clip:await clip(w===390?1500:1100)});stack('/tmp/rk_a.png','/tmp/rk_b.png',path.join(SH,'s25_rankings_'+w+'.png'));await P.close();console.log('  shots '+w)}}
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));await L.close();process.exit(bad?1:0)})();
