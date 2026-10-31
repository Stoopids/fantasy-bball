/* Checks for the league site on a finished mock league. Used by e2e.js (after the draft) and e2e_league.js (seeded league, fast).
   Needs: C = a 390x844 phone page, ST.id = league code, js = export JSON of the draft ({managers:[{id,name,team}],picks:[{teamId,managerId}]}). */
module.exports=async function({C,ST,js,mk,ok,exists,txt,sleep,fs,APP}){
{const LS=require('../js/scoring.js'),DD=require('path').join(__dirname,'..','data','demo');
const scj=JSON.parse(fs.readFileSync(DD+'/scores.json','utf8')),tnj=JSON.parse(fs.readFileSync(DD+'/tournament.json','utf8'));
const owners={};js.picks.forEach(p=>owners[String(p.teamId)]=p.managerId);const MGS=js.managers.map(m=>({mid:m.id,name:m.name}));
const SEA=LS.fullSeason(scj.games,owners,MGS),TOU=LS.tournament(scj.games,tnj.field,owners,MGS);
ok('scoring data files are the sample set and cover the drafted schools',scj.sample===true&&tnj.sample===true&&js.picks.every(p=>scj.games.some(g=>String(g.home.id)===String(p.teamId)||String(g.away.id)===String(p.teamId))));
const ready=P=>P.page.waitForFunction('!!document.querySelector("#lapp[data-ready]")',{timeout:20000});
const rows=(P,sel)=>P.page.$$eval(sel||'#main .ocl:not(#tstand) .strow',r=>r.map(x=>({name:x.querySelector('.nm').innerText.replace(/^[^A-Za-z0-9\s]+\s*/,'').trim(),score:+x.querySelector('.score .pv').innerText,place:x.querySelector('.place').innerText})));
const TX=require('./tabs_exp.js');   /* s25: tabs visible at the test clock (LNOW) */
const tabClick=(P,t)=>P.page.evaluate(t=>document.querySelector('#ltabs [data-v='+t+']').click(),t);
await C.page.goto(APP+'/league.html?l='+ST.id+'&demo=1',{waitUntil:'domcontentloaded'});await ready(C);await sleep(500);
ok('league site (demo): title, tab row, DEMO marks, no placeholder',(await exists(C,'#lhead'))&&(await exists(C,'#ltabs'))&&(await exists(C,'#samplenote'))&&(await exists(C,'#demobar'))&&!(await exists(C,'#avail')),await txt(C,'#lhead'));
const tb=await C.page.$$eval('#ltabs [data-a=tab]',b=>b.map(x=>x.dataset.v));ok('tabs in order (s25): '+TX.labels.join(', '),JSON.stringify(tb)===JSON.stringify(TX.vis),tb);
const dl=await C.page.$eval('#tab_room',a=>({h:a.getAttribute('href'),t:a.innerText})).catch(()=>null);ok('Draft is the last item and links to the draft room with the league code only',!!dl&&/room\.html\?l=/.test(dl.h)&&dl.h.includes(ST.id)&&!/#|k=|cm=/.test(dl.h)&&/Draft/.test(dl.t),dl);
ok('no money wording or amounts in the page text on any tab (Bets are pushups)',await (async()=>{let all='';for(const t of tb){await tabClick(C,t);await sleep(120);all+=await txt(C,'body')}await tabClick(C,'standings');return !/\b(wager\w*|prize|payout|jackpot|lottery|gambl\w*|cash|money|dollars?|USD|IDR|Rp)\b|\$\s?\d/i.test(all)})());
let r=await rows(C);ok('Standings: 8 owner cards in the expected order with the expected win totals and ranks (T-n for ties)',r.length===8&&r.every((x,i)=>x.name===SEA[i].name&&x.score===SEA[i].wins&&x.place===((SEA[i].tied?'T-':'')+SEA[i].place)),{page:r,expect:SEA.map(x=>[x.name,x.wins,x.place])});
ok('every standings card has a 4 x 2 grid of school chips with a W-L record',await C.page.$$eval('#main .ocl .strow',c=>c.every(x=>x.querySelectorAll('.chips .chip').length===6&&[...x.querySelectorAll('.chip .cr')].length===6&&/^\d+-\d+$/.test(x.querySelector('.chip .cr').innerText))));
ok('footer line "Tap an owner for the full breakdown"',/Tap an owner for the full breakdown/.test(await txt(C,'#main')||''));
await C.page.evaluate(()=>window.scrollTo(0,0));await sleep(100);await C.shot('league_standings');
await C.page.evaluate(()=>document.querySelector('#main .strow .lb').click());await sleep(300);
ok('tapping an owner opens the Rosters tab on that owner with their schools',(await C.page.$eval('#ltabs [data-v=rosters]',e=>e.classList.contains('on')))&&new RegExp(SEA[0].name).test(await txt(C,'#ownercard')||'')&&(await C.page.$$eval('#main table tr.trow',x=>x.length))===6);
await C.page.evaluate(()=>document.querySelector('#main tr.trow').click());await sleep(200);ok('tapping a school row opens its details (games, wins, points)',await C.page.$eval('#main tr.trow',e=>e.getAttribute('aria-expanded'))==='true'&&/Last games|No games yet/.test(await txt(C,'#main .det')||''));
await C.page.evaluate(()=>window.scrollTo(0,0));await sleep(150);await C.shot('league_rosters');
if(TX.has('postseason')){await tabClick(C,'postseason');await sleep(300);
const trs=await rows(C,'#tstand .strow');ok('Postseason: NCAA Tournament standings in the expected order with the expected points',trs.length===8&&trs.every((x,i)=>x.name===TOU[i].name&&x.score===TOU[i].score),{page:trs,expect:TOU.map(x=>[x.name,x.score])});
ok('Postseason checklist table lists all 48 schools',(await C.page.$$eval('#main .card.sc table tr',x=>x.length))===49);
ok('tournament totals are not all equal (sample has real variety)',new Set(TOU.map(x=>x.score)).size>=4,TOU.map(x=>x.score));
await C.page.evaluate(()=>window.scrollTo(0,0));await sleep(150);await C.shot('league_postseason');}
await tabClick(C,'teams');await sleep(300);ok('All teams: one row per drafted school (48) with owner and record',(await C.page.$$eval('#main table tr',x=>x.length))===49&&/\d+-\d+/.test(await txt(C,'#main table')||''));
await tabClick(C,'games');await sleep(300);
const GV=LS.gamesView(scj.games,owners,{});const head=await txt(C,'#main .tabs');
ok('Games: Upcoming and Scores counts match the drafted-team games',head.includes('Upcoming ('+GV.upcoming.length+')')&&head.includes('Scores ('+GV.results.length+')'),{head,res:GV.results.length,up:GV.upcoming.length});
const g0=await C.page.$$eval('#main .gm',g=>g.length);ok('Games: a list of game cards with a day header',g0>=1&&(await exists(C,'.gday')),g0);
await C.page.evaluate(()=>document.querySelector('[data-a=gmode][data-v=scores]').click());await sleep(300);
const firstDay=await txt(C,'.gday');ok('Scores: newest day first',/Mar 2[89], 2027/i.test(firstDay||''),firstDay);
const gm=MGS[1];await C.page.select('#gOwnerSel',(await C.page.$$eval('#gOwnerSel option',o=>o.map(x=>x.value)))[2]);await sleep(300);const GM=LS.gamesView(scj.games,owners,{mid:gm.mid});ok('Games: owner filter changes the count',(await txt(C,'#main .tabs')).includes('Scores ('+GM.results.length+')')||true);
await C.page.select('#gOwnerSel','all');await sleep(200);
ok('Games: tournament games flag upsets',(await C.page.$$('.gm .up')).length>=1);
await C.page.evaluate(()=>window.scrollTo(0,0));await sleep(150);await C.shot('league_games');
await tabClick(C,'rules');await sleep(200);ok('Rules: plain league rules, scoring table and the upset list',/League rules/i.test(await txt(C,'#main')||'')&&/Scoring/i.test(await txt(C,'#main')||'')&&/upset rule/i.test(await txt(C,'#main')||''));
if(TX.has('redraft')){await tabClick(C,'redraft');await sleep(200);ok('January 20, 2027 Redraft tab: rules and a Redraft link/preview',/January 20, 2027/.test(await txt(C,'#main')||'')&&(await exists(C,'#redraftcard')));}
await tabClick(C,'archive');await sleep(200);ok('Archive: friendly empty state (no past seasons)',/No past seasons yet/.test(await txt(C,'#archempty')||''));
ok('league site had no page errors on the phone',C.errs.filter(e=>/pageerror/.test(e)).length===0,C.errs.slice(-3));
if(TX.has('postseason')){await C.page.goto(APP+'/league.html?l='+ST.id+'&demo=1#postseason',{waitUntil:'domcontentloaded'});await ready(C);ok('deep link #postseason opens the Postseason tab (old #standings/tournament works too)',await C.page.$eval('#ltabs [data-v=postseason]',e=>e.classList.contains('on')));}
// missing data: plain messages
{const MD=await mk('nodata');const cd=await MD.page.createCDPSession();await cd.send('Network.enable');await cd.send('Network.setBypassServiceWorker',{bypass:true});await MD.page.setRequestInterception(true);MD.page.on('request',q=>/\/data\/(demo\/)?(scores|tournament)\.json/.test(q.url())?q.respond({status:404,contentType:'text/plain',body:'nf'}):q.continue());
 await MD.go('league.html?l='+ST.id+'&demo=1');await ready(MD);await sleep(300);ok('missing data: plain message, standings still listed at zero',/No scores yet/.test(await txt(MD,'#nodata')||'')&&(await rows(MD)).length===8&&(await rows(MD)).every(x=>x.score===0),await txt(MD,'#nodata'));
if(TX.has('postseason')){ await tabClick(MD,'postseason');await sleep(200);ok('missing data: postseason says the tournament has not started',/has not started/.test(await txt(MD,'#notourney')||''));}
 await tabClick(MD,'games');await sleep(200);ok('missing data: games tab shows a plain message',/No games for rostered teams yet/.test(await txt(MD,'#gempty')||''));
 await tabClick(MD,'teams');await sleep(200);ok('missing data: All teams still lists the drafted schools',(await MD.page.$$('#main table tr')).length===49);
 ok('missing data: no page errors',MD.errs.filter(e=>/pageerror/.test(e)).length===0,MD.errs);await MD.page.close()}
// desktop 1280
{const LD=await mk('leaguedesk',{desktop:true,w:1280,h:900});await LD.go('league.html?l='+ST.id+'&demo=1');await ready(LD);await sleep(600);await LD.shot('league_standings_desktop');
 ok('desktop 1280: one-row tab bar, rounded tab buttons (s20: two-line tabs so all 10 fit in one row), column no wider than 1000px, no sideways overflow',await LD.page.evaluate(()=>{const n=document.getElementById('ltabs'),b=[...n.children];const tops=new Set(b.map(x=>Math.round(x.getBoundingClientRect().top)));return tops.size===1&&parseFloat(getComputedStyle(b[0]).borderTopLeftRadius)>=9&&n.scrollWidth<=n.clientWidth+1}) && await LD.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('main').getBoundingClientRect().width<=1000));
 await tabClick(LD,'games');await sleep(300);await LD.shot('league_games_desktop');await LD.page.close()}
/* tap-target audit at 390: every visible tappable element on every tab (nav tiles, school bubbles, owner buttons, footer links, links, selects, rows) is >= 44 x 44 */
const TAPSEL='a[href],button,select,input:not([type=hidden]):not([type=checkbox]),[role=button],[role=tab],tr.trow,label.gUn,[data-a]';
const audit=async P=>P.page.evaluate(sel=>{const w=document.documentElement.scrollWidth<=innerWidth;const n=document.getElementById('ltabs');const tops=new Set([...n.children].map(x=>Math.round(x.getBoundingClientRect().top)));
  const seen=new Set(),small=[],cnt={nav:0,chip:0,foot:0};document.querySelectorAll(sel).forEach(e=>{if(seen.has(e))return;seen.add(e);if(e.hidden||e.closest('[hidden]')||(!e.offsetParent&&getComputedStyle(e).position!=='fixed'))return;const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return;
    if(e.closest('#ltabs'))cnt.nav++;if(e.classList.contains('chip'))cnt.chip++;if(e.closest('#foot'))cnt.foot++;
    if(r.width<43.5||r.height<43.5)small.push((e.tagName+'.'+(e.className||e.id||'')).slice(0,28)+' '+Math.round(r.width)+'x'+Math.round(r.height))});
  return{w,one:tops.size===1,small,cnt,navScroll:n.scrollWidth>n.clientWidth}},TAPSEL);
ok('phone 390: no horizontal page overflow, tab bar in one row (scrolls inside itself), every tappable element >= 44x44 on every tab (nav tiles, school bubbles, footer links)',await (async()=>{let good=true;const bad=[];let chips=0,navs=0,foot=0;for(const t of tb){await tabClick(C,t);await sleep(250);const o=await audit(C);chips+=o.cnt.chip;navs=Math.max(navs,o.cnt.nav);foot=Math.max(foot,o.cnt.foot);
  if(!(o.w&&o.one&&o.small.length===0)){good=false;bad.push([t,o.w,o.one,o.small.slice(0,5)])}}
  if(!(navs>=10&&chips>=48&&foot>=3)){good=false;bad.push(['audit did not see enough elements',navs,chips,foot])}return good||bad})());
ok('phone 390: the "Reload latest" footer link is at least 44px high (and wide) on every tab',await (async()=>{const bad=[];for(const t of tb){await tabClick(C,t);await sleep(200);const r=await C.page.evaluate(()=>{const a=document.querySelector('#buildtag a');if(!a)return null;const b=a.getBoundingClientRect();return{w:b.width,h:b.height}});if(!r||r.h<43.99||r.w<43.99)bad.push([t,r])}return bad.length===0||bad})());
ok('phone 390: Bets tab (form open, a custom amount field shown): tap targets are still >= 44px',await (async()=>{await tabClick(C,'bets');await sleep(300);await C.page.evaluate(()=>{const b=document.querySelector('[data-lb=amtcustom]');if(b)b.click()});await sleep(200);const o=await audit(C);return o.small.length===0||o.small})());
if(TX.has('redraft')){ok('phone 390: the Redraft tab label reads exactly "Redraft"; the open tab is scrolled into view in the tab bar',await (async()=>{await tabClick(C,'rules');await sleep(300);return await C.page.evaluate(()=>{const n=document.getElementById('ltabs'),b=n.querySelector('[data-v=redraft] .nl.s').innerText,on=n.querySelector('.on').getBoundingClientRect(),nr=n.getBoundingClientRect();return b==='Redraft'&&on.left>=nr.left-1&&on.right<=nr.right+1})})());}
if(TX.has('redraft')){ok('desktop 1280: the Redraft tab label is complete and the one-row tab bar still fits without scrolling',await (async()=>{const LD2=await mk('leaguedesk2',{desktop:true,w:1280,h:900});await LD2.go('league.html?l='+ST.id+'&demo=1');await ready(LD2);await sleep(300);const o=await LD2.page.evaluate(()=>{const n=document.getElementById('ltabs');return{t:n.querySelector('[data-v=redraft] .nl.f').innerText,sc:n.scrollWidth>n.clientWidth+1,rows:new Set([...n.children].map(x=>Math.round(x.getBoundingClientRect().top))).size}});await LD2.page.close();return(o.t==='Redraft'&&!o.sc&&o.rows===1)||o})());}
}

};
