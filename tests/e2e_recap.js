/* Draft recap page (recap.html): 11 sections in order, seeded complete 8 managers x 8 rounds, at 390 and 1280. Mock store only.
   needs: node tools/mock_textdb.js 9995 "$PWD" 9996        node tests/e2e_recap.js   (APP / API env) */
const L=require('./lib.js');const fs=require('fs'),path=require('path');const {seedRecap}=require('./recap_seed.js');const {seed}=require('./seed_league.js');const {sleep}=L;
let n=0,bad=0;const fails=[];const ok=(name,c,x)=>{n++;if(c)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
const root=path.join(__dirname,'..');const tsrc=fs.readFileSync(path.join(root,'assets/teams.js'),'utf8');const TD=JSON.parse(tsrc.slice(tsrc.indexOf('{'),tsrc.lastIndexOf('}')+1));
const RE=/^https:\/\/www\.espn\.com\/mens-college-basketball\/team\/_\/id\/\d+$/;
/* s25b (Paul-approved layout): card, grade, league grades, your 8 picks, awards, buttons; the older sections live in the Full draft details opener (rcextra), then the footer */
/* s25-full (Paul via NCAA): What's next is right under the hero; the full recap is inline; How grades work (details#rc_foot) is checked in e2e_recap_s25full */
const ORDER=['recaphead','rc_site','powerrecap_s','rc_grades',/* s25-full: My picks removed (repeat) */'rc_awards','rc_order','rc_rosters','rc_outlook','rc_conf','rc_times'];
const sc=t=>(String(t).match(/[.!?](?=\s|$)/g)||[]).length;
const MONEY=/\b(bets?|betting|wager\w*|gambl\w*|lotter\w*|jackpot|payout|prize\w*|cash|money|dollars?|USD|IDR|Rp|odds)\b|\$\s?\d/i;
async function open(P,id,me){await P.page.setBypassServiceWorker(true);if(me)await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify({mid:me.id,k:me.k}))},id,me);await P.go('recap.html?l='+id);await P.page.waitForSelector('#rc_foot',{timeout:25000});await sleep(900);await P.page.evaluate(()=>{const x=document.getElementById('rcextra');if(x)x.open=true});await sleep(200)}
(async()=>{try{
  const idP=await seedRecap(null,{power:true});const info=seedRecap.info;const me=info.managers[5];
  const idN=await seedRecap(null,{});const infoN=seedRecap.info;
  const idS6=await seedRecap(null,{managers:6,times:false});const infoS6=seedRecap.info;
  const idT=await seed(null,{rounds:8});                                   // pick times all within milliseconds (not usable)
  const idLive=await seed(null,{rounds:8,picksMade:20,live:true});
  for(const [w,h,desk] of [[390,844,false],[1280,900,true]]){
    const Q=await L.phone("rc"+w,desk?{desktop:true,w,h}:{});await open(Q,idP,me);
    const o=await Q.page.evaluate(()=>{const ids=[...document.querySelectorAll('#app>section,#app>footer,#rcextra>section')].map(e=>e.id);const h2=id=>{const e=document.getElementById(id);return e?e.innerText.trim():null};
      return{ids,msg:(document.getElementById('rc1_h')||{}).innerText,h2:(document.getElementById('powerrecap_s_h')||{}).innerText,count:(document.getElementById('rccount')||{}).innerText,over:document.documentElement.scrollWidth>innerWidth+1,
        txt:document.getElementById('app').innerText,bigline:(document.getElementById('rcsiteline')||{}).innerText,big:[...document.querySelectorAll('#app a,#app button')].filter(e=>/^(League site|Back to my league)$/.test(e.innerText.trim())).map(e=>e.id),
        h2s:[...document.querySelectorAll('#app h2')].map(e=>e.innerText.trim())}});
    ok(w+'px: sections in the required order (1 congrats, 2 recap, league grades, 3 order, 4 spin, 5 rosters, 6 outlook, 7 conference, 8 pick times, 9 awards, 10 What\'s next + League site, 11 footer)',JSON.stringify(o.ids)===JSON.stringify(ORDER),o.ids);
    ok(w+'px: section 1 message (s25-full: no repeat of FINAL or the Redraft countdown) reads "Good luck this season!"',o.msg==='Good luck this season!',o.msg);
    ok(w+'px: Redraft countdown line shows days to go',/\d+ days? to go until the Redraft on January 20, 2027/.test(o.count||''),o.count);
    ok(w+'px: section 2 heading is exactly "Your grade" (s25b)',o.h2==='Your grade',o.h2);
    ok(w+'px: exactly one "League site" button/link in the page body (the big one, #rcsite) and the line under it',o.big.length===1&&o.big[0]==='rcsite'/* s25-full: one Back to my league button in the What's next row (the line under it was removed with the Practice-only line) */,{big:o.big,line:o.bigline});
    ok(w+'px: no money or betting words in the recap output',!MONEY.test(o.txt),(o.txt.match(MONEY)||[])[0]);
    ok(w+'px: dates are Month Day, Year (no numeric or abbreviated dates)',!/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\bJan\b\.? \d|\b\d{4}-\d{2}-\d{2}\b/.test(o.txt));
    ok(w+'px: no horizontal overflow',!o.over);
    /* grade card for the viewing manager */
    const g=await Q.page.evaluate(()=>({grade:(document.getElementById('rcgrade')||{}).innerText,sum:(document.getElementById('rcsummary')||{}).innerText,btn:(document.getElementById('rcdeepbtn')||{}).innerText,exp:(document.getElementById('rcdeepbtn')||{getAttribute(){}}).getAttribute('aria-expanded'),deepHidden:(document.getElementById('rcdeep')||{}).hidden,empty:!!document.getElementById('rcempty'),h:(document.getElementById('rcdeepbtn')||{getBoundingClientRect(){return{height:0}}}).getBoundingClientRect().height}));
    ok(w+'px: matching league: viewer sees a grade A+ to D, a 4-sentence summary and a "Deeper analysis" button (collapsed, >= 44px), no empty state',/^[A-D][+-]?$/.test(g.grade||'')&&sc(g.sum)===4&&g.btn.trim()==='Deeper analysis'&&g.exp==='false'&&g.deepHidden===true&&!g.empty&&g.h>=43.5,g);
    await Q.page.click('#rcdeepbtn');await sleep(200);
    const d=await Q.page.evaluate(()=>({exp:document.getElementById('rcdeepbtn').getAttribute('aria-expanded'),vis:!document.getElementById('rcdeep').hidden,t:document.getElementById('rcdeep').innerText,btn:document.getElementById('rcdeepbtn').innerText.trim()}));
    ok(w+'px: one tap on Deeper analysis opens the 10-sentence deep dive',d.exp==='true'&&d.vis&&sc(d.t)>=9&&sc(d.t)<=11,{n:sc(d.t),exp:d.exp});
    await Q.page.click('#rcdeepbtn');await sleep(150);ok(w+'px: a second tap closes it again',await Q.page.$eval('#rcdeep',e=>e.hidden));
    /* draft order */
    await Q.page.evaluate(()=>document.querySelectorAll('#rc_order details.rdgrp').forEach(d=>d.open=true))/* s25-full: rounds are collapsible; open them all to check every row */;
    const ro=await Q.page.evaluate(()=>{const rows=[...document.querySelectorAll('#rc_order .dorow')];const grp=[...document.querySelectorAll('#rc_order .rdgrp')];
      return{rows:rows.map(r=>({n:+r.dataset.n,o:r.dataset.o,href:(r.querySelector('a.tlink')||{}).href||null,txt:r.querySelector('.dm').innerText,mine:r.classList.contains('mine'),h:Math.round(r.getBoundingClientRect().height),left:Math.round(r.getBoundingClientRect().left)})),grp:grp.map(g=>g.querySelectorAll('.dorow').length),heads:[...document.querySelectorAll('#rc_order .rdh')].map(h=>h.innerText.replace(/\s+/g,' ').trim()),sticky:getComputedStyle(document.querySelector('#rc_order .rdh')).position}});
    const exp=info.picks.map((p,i)=>({n:i+1,o:p.managerId,tid:p.teamId}));
    ok(w+'px: draft order has 64 rows (8 managers x 8 rounds) in 8 round groups of 8',ro.rows.length===64&&ro.grp.length===8&&ro.grp.every(x=>x===8),{rows:ro.rows.length,grp:ro.grp});
    ok(w+'px: rows follow the snake order: pick numbers 1..64 ascending, owner and school of every pick match the draft',ro.rows.every((r,i)=>r.n===i+1&&r.o===exp[i].o&&r.href===('https://www.espn.com/mens-college-basketball/team/_/id/'+exp[i].tid)),ro.rows.find((r,i)=>!(r.n===i+1&&r.o===exp[i].o&&r.href===('https://www.espn.com/mens-college-basketball/team/_/id/'+exp[i].tid))));
    ok(w+'px: round 2 runs backward (pick 9 = the manager who had pick 8) and round headers say so',ro.rows[8].o===ro.rows[7].o&&/Round 2.*reversed/.test(ro.heads[1])&&/Round 1/.test(ro.heads[0]),ro.heads.slice(0,2));
    ok(w+'px: rows are compact (>= 44 px, <= 60 px) and the viewing manager\'s 8 picks are marked',ro.rows.every(r=>r.h>=44&&r.h<=60)&&ro.rows.filter(r=>r.mine).length===8,{mine:ro.rows.filter(r=>r.mine).length});
    ok(w+'px: round headers are sticky',ro.sticky==='sticky',ro.sticky);
    ok(w+'px: '+(desk?'two columns':'one column')+' of rows',new Set(ro.rows.slice(0,8).map(r=>r.left)).size===(desk?2:1),[...new Set(ro.rows.slice(0,8).map(r=>r.left))]);
    /* other sections */
    const s=await Q.page.evaluate(()=>{const c=id=>document.querySelectorAll(id).length;const conf=[...document.querySelectorAll('#crows .orow')].map(r=>[...r.querySelectorAll('.cc2 b')].reduce((a,b)=>a+(+b.innerText),0));
      return{spin:document.getElementById('rc_spin'),ord:c('#rc_ordlist li'),ros:c('#rc_rosters .roster'),steals:c('#steals .hl'),reaches:c('#reaches .hl'),str:c('#rc_rosters .strength'),out:c('#orows .orow'),conf,crows:c('#crows .orow'),times:document.getElementById('rc_times').innerText,trows:c('#trows .orow'),aw:[...document.querySelectorAll('#awgrid .awt')].map(e=>e.innerText),how:(document.getElementById('rcgradehow')||{}).innerText,share:!!(document.getElementById('rcshare')||document.getElementById('rcsharegrade')),csv:!!document.getElementById('csvbtn'),json:!!document.getElementById('jsonbtn'),
        order:(()=>{const f=document.getElementById('rc_foot'),e=document.getElementById('exportrow'),b=document.getElementById('rc_site'),bs=document.getElementById('rcsite'),m=document.getElementById('rcmore');/* s25-full (League e2e_sitelink): exports moved out of More to the very bottom, after the footer */const x=document.getElementById('rc_export');return!!x&&x.contains(e)&&!(m&&m.contains(e))&&(bs.compareDocumentPosition(e)&4)>0&&(f.compareDocumentPosition(e)&4)>0&&!x.nextElementSibling.matches('section,details,footer')})()}});
    ok(w+'px: no "How the order was set" section (s25-full j: it repeated Full draft order)',!s.spin&&!/How the order was set/.test(await Q.page.$eval('#app',e=>e.textContent)));
    ok(w+'px: rosters side by side: 8 compact cards (no team count, avg rank or Strength line); no steals / reaches card (s25-full: Awards keeps Steal of the Draft)',s.ros===8&&s.str===0&&!/avg rank|\b8 teams\b/.test(await Q.page.$eval('#rc_rosters',e=>e.textContent))&&s.steals===0&&s.reaches===0&&!(await Q.page.$('#hlcard')),{ros:s.ros,str:s.str,st:s.steals,re:s.reaches});
    ok(w+'px: tournament outlook and conference breakdown have a row per manager; conference counts add up to 8 each',s.out===8&&s.crows===8&&s.conf.every(x=>x===8),s.conf);
    ok(w+'px: pick times are labelled approximate, 8 manager rows, median shown',/approximate/i.test(s.times)&&s.trows===8&&/median/.test(s.times),s.times.slice(0,120));
    ok(w+'px: awards present (Chalk Boss, Cinderella Hunter, Fastest Finger, Last-Second Larry)',['Chalk Boss','Cinderella Hunter','Fastest Finger','Last-Second Larry'].every(a=>s.aw.includes(a)),s.aw);
    ok(w+'px: footer explains how grades work; share link button; CSV / JSON export small, at the very bottom below the footer (s25-full)',/How grades work/.test(await Q.page.$eval('#rc_foot',e=>e.textContent))&&/rough preseason guide/.test(await Q.page.$eval('#rc_foot',e=>e.textContent))&&s.share&&s.csv&&s.json&&s.order,s);
    /* every school link, 44 px, controls */
    const a=await Q.page.evaluate(()=>{const A=[...document.querySelectorAll('#app a.tlink')];return{n:A.length,bad:A.filter(x=>!/^https:\/\/www\.espn\.com\/mens-college-basketball\/team\/_\/id\/\d+$/.test(x.href)||x.target!=='_blank'||!/noopener/.test(x.rel)||!/noreferrer/.test(x.rel)).length,small:A.filter(x=>x.getBoundingClientRect().height<43.5).length,
      btns:[...document.querySelectorAll('#app button:not(.lnkbtn),#app a.btn')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height<43.5}).map(b=>b.id||b.className),chips:document.querySelectorAll('#app .chip').length,plainChips:[...document.querySelectorAll('#app .chip')].filter(c=>!c.closest('a.tlink')).length}});
    ok(w+'px: every school chip on the page is an ESPN link (correct URL, target=_blank, noopener noreferrer), links >= 44 px tall ('+a.n+' links)',a.n>=130&&a.bad===0&&a.small===0&&a.plainChips===0,a);
    ok(w+'px: buttons are >= 44 px (except the small export text links)',a.btns.length===0,a.btns);
    ok(w+'px: no page errors',Q.errs.length===0,Q.errs);
    ok(w+'px: no sticky League site bar (s23 design)',!(await Q.page.$('#stickysite')));
    await Q.page.close();
    /* spectator: no viewer card, the module lists all managers */
    const S=await L.phone('rs'+w,desk?{desktop:true,w,h}:{});await open(S,idP,null);await sleep(600);
    const sp=await S.page.evaluate(()=>({cards:document.querySelectorAll('#powerrecap .card.pr').length,mine:!!document.getElementById('rcmine'),empty:!!document.getElementById('rcempty')}));
    ok(w+'px: spectator (no manager on this device): all 8 managers\' grades from the module, no empty state',sp.cards===8&&!sp.mine&&!sp.empty,sp);ok(w+'px: spectator: no page errors',S.errs.length===0,S.errs);await S.page.close();
    /* a real league that is not in the example file: grade, 4-sentence summary and 10-sentence deeper analysis are GENERATED from its own rosters */
    const E=await L.phone('re'+w,desk?{desktop:true,w,h}:{});await open(E,idN,infoN.managers[2]);await sleep(500);
    const e=await E.page.evaluate(()=>({grade:(document.getElementById('rcgrade')||{}).innerText,sum:(document.getElementById('rcsummary')||{}).innerText,empty:!!document.getElementById('rcempty'),gen:!!document.getElementById('rcgen'),h:(document.getElementById('powerrecap_s_h')||{}).innerText,deepHidden:(document.getElementById('rcdeep')||{}).hidden}));
    ok(w+'px: real league not in the example file: generated grade A+ to D, 4-sentence summary, Deeper analysis collapsed, "built from this league\'s rosters" note, no empty state',/^[A-D][+-]?$/.test(e.grade||'')&&sc(e.sum)===4&&e.gen&&!e.empty&&e.deepHidden===true&&e.h==='Your grade',e);
    await E.page.click('#rcdeepbtn');await sleep(200);const ed=await E.page.$eval('#rcdeep',x=>({v:!x.hidden,t:x.innerText}));
    ok(w+'px: generated deeper analysis is 10 sentences after one tap',ed.v&&sc(ed.t)===10,{n:sc(ed.t)});
    ok(w+'px: generated text has no money or betting words',!MONEY.test(e.sum+' '+ed.t));
    const E2=await L.phone('re2'+w,desk?{desktop:true,w,h}:{});await open(E2,idN,infoN.managers[2]);const g1=await E2.page.$eval('#rcsummary',x=>x.innerText);ok(w+'px: generated text is deterministic (same league, same text on reload)',g1===e.sum);await E2.page.close();
    ok(w+'px: generated league: no page errors',E.errs.length===0,E.errs);await E.page.close();
    /* generation impossible (6 managers): honest empty state, never a made-up grade */
    const E6=await L.phone('r6'+w,desk?{desktop:true,w,h}:{});await open(E6,idS6,infoS6.managers[2]);await sleep(400);
    const e6=await E6.page.evaluate(()=>({t:(document.getElementById('rcempty')||{}).innerText||'',grade:!!document.getElementById('rcgrade'),deep:!!document.getElementById('rcdeepbtn')}));
    ok(w+'px: league with only 6 managers (nothing to analyse): "Your draft recap will appear here." and no grade',/^Your draft recap will appear here\./.test(e6.t)&&!e6.grade&&!e6.deep,e6);ok(w+'px: empty state: no page errors',E6.errs.length===0,E6.errs);await E6.page.close();
    /* unusable pick times */
    const T=await L.phone('rt'+w,desk?{desktop:true,w,h}:{});await open(T,idT,null);const tt=await T.page.$eval('#rc_times',e=>e.innerText);
    ok(w+'px: pick times that cannot be used show a short honest note instead of numbers',/not recorded in a usable way/.test(tt)&&!/median/.test(tt),tt.slice(0,160));await T.page.close();
    /* draft still going */
    const V=await L.phone('rv'+w,desk?{desktop:true,w,h}:{});await V.page.setBypassServiceWorker(true);await V.go('recap.html?l='+idLive);await V.page.waitForSelector('#rc_foot',{timeout:25000});await sleep(500);
    const v=await V.page.evaluate(()=>({ids:[...document.querySelectorAll('#app>section,#app>footer,#rcextra>section')].map(e=>e.id),dis:document.getElementById('rcsite').disabled,rows:document.querySelectorAll('#rc_order .dorow').length,left:document.querySelectorAll('#rc_order .dorow .dc .chip').length}));
    ok(w+'px: unfinished draft: partial recap (order board with 20 picks made, disabled League site button, no grades)',v.rows===64&&v.left===20&&v.dis&&!v.ids.includes('powerrecap_s')&&v.ids[0]==='recaphead',v);ok(w+'px: unfinished draft: no page errors',V.errs.length===0,V.errs);await V.page.close()}
  console.log('\n'+(n-bad)+'/'+n+' passed'+(bad?'  FAILED: '+fails.join(' | '):''));process.exitCode=bad?1:0}catch(e){console.log(e.stack);process.exitCode=1}finally{await L.close()}})();
