/* Unit tests for js/scoring.js  —  node tests/test_scoring.js */
const assert=require('assert');const S=require('../js/scoring.js');
let pass=0,fail=0;const T=[];const t=(n,f)=>T.push([n,f]);
const side=(id,score,seed)=>({id:String(id),short:'T'+id,score,seed:seed==null?null:seed});
let gid=0;const G=(kind,day,round,h,a,status)=>({id:'g'+(++gid),day,status:status||'final',kind,round:round||'',start:day+'T18:00Z',home:h,away:a});
const MG=[{mid:'a',name:'Ana'},{mid:'b',name:'Ben'},{mid:'c',name:'Cy'}];
const OWN={'1':'a','2':'a','3':'b','4':'b','5':'c','6':'c'};   // team -> manager
/* ---------- Full Season ---------- */
t('final game detection: needs both scores and no tie',()=>{assert.ok(S.isFinal(G('reg','2026-11-10','',side(1,70),side(9,60))));assert.ok(!S.isFinal(G('reg','2026-11-10','',side(1,70),side(9,70))));assert.ok(!S.isFinal(G('reg','2026-11-10','',side(1,null),side(9,null),'scheduled')));assert.equal(S.winnerSide(G('reg','d','',side(1,50),side(2,60))).id,'2')});
t('Full Season counts wins by manager, ignores NCAA tournament and unfinished games',()=>{const gs=[G('reg','2026-11-10','',side(1,80),side(9,70)),G('reg','2026-11-11','',side(2,60),side(3,61)),G('conf','2027-03-05','Semifinals',side(5,70),side(1,65)),G('ncaa','2027-03-20','1st Round',side(3,80,5),side(9,60,12)),G('reg','2027-01-05','',side(4,0),side(8,0),'scheduled')];
  const r=S.fullSeason(gs,OWN,MG);const by=Object.fromEntries(r.map(x=>[x.mid,x]));assert.equal(by.a.wins,1);assert.equal(by.a.losses,2);assert.equal(by.b.wins,1);assert.equal(by.b.losses,0);assert.equal(by.c.wins,1);assert.equal(by.c.losses,0);assert.equal(r.length,3)});
t('Full Season: games between two drafted teams count for both managers',()=>{const r=S.fullSeason([G('reg','d','',side(1,70),side(3,60))],OWN,MG);const by=Object.fromEntries(r.map(x=>[x.mid,x]));assert.equal(by.a.wins,1);assert.equal(by.b.losses,1)});
t('Full Season tiebreak: wins, then win %, then point difference, then name; places are shared when fully tied',()=>{
  const gs=[G('reg','d1','',side(1,90),side(9,60)),G('reg','d2','',side(3,61),side(9,60)),G('reg','d3','',side(4,50),side(9,60)),G('reg','d4','',side(5,80),side(9,70))];
  // a: 1 win (+30), b: 1 win (+1) 1 loss, c: 1 win (+10)
  const r=S.fullSeason(gs,OWN,MG);assert.deepEqual(r.map(x=>x.mid),['a','c','b']);assert.equal(r[0].place,1);assert.equal(r[2].place,3);
  const tie=S.fullSeason([],OWN,MG);assert.ok(tie.every(x=>x.place===1&&x.tied));assert.deepEqual(tie.map(x=>x.name),['Ana','Ben','Cy'])});
t('Full Season: per-team lines',()=>{const r=S.fullSeason([G('reg','d','',side(1,80),side(9,70)),G('reg','d','',side(2,50),side(8,70))],OWN,MG);const a=r.find(x=>x.mid==='a');assert.equal(a.teamList.length,2);assert.deepEqual(a.teamList.map(x=>x.tid+':'+x.w+'-'+x.l),['1:1-0','2:0-1'])});
t('Full Season with no data: everyone at 0, no crash',()=>{const r=S.fullSeason([],{},MG);assert.equal(r.length,3);assert.ok(r.every(x=>x.wins===0&&x.pct===0));assert.doesNotThrow(()=>S.fullSeason(null,null||{},MG))});
/* ---------- Tournament ---------- */
t('upset: the worse seed number must win; equal seeds, First Four, missing seeds and non-NCAA games do not count',()=>{
  assert.ok(S.isUpset(G('ncaa','d','1st Round',side(1,60,12),side(2,50,5))));assert.ok(!S.isUpset(G('ncaa','d','1st Round',side(1,60,5),side(2,50,12))));assert.ok(!S.isUpset(G('ncaa','d','2nd Round',side(1,60,4),side(2,50,4))));
  assert.ok(!S.isUpset(G('ncaa','d','First Four',side(1,60,16),side(2,50,11))));assert.ok(!S.isUpset(G('ncaa','d','1st Round',side(1,60,null),side(2,50,5))));assert.ok(!S.isUpset(G('reg','d','',side(1,60,12),side(2,50,5))));assert.ok(!S.isUpset(G('ncaa','d','1st Round',side(1,60,12),side(2,70,5))))});
const FIELD={'1':{seed:12},'2':{seed:5},'3':{seed:1},'4':{seed:16},'5':{seed:8},'6':{seed:9}};
t('Tournament points: entry 5, win 2, upset +4, play-in win 1',()=>{const gs=[G('ncaa','2027-03-17','First Four',side(4,70,16),side(8,60,16)),G('ncaa','2027-03-19','1st Round',side(1,60,12),side(2,50,5)),G('ncaa','2027-03-19','1st Round',side(3,90,1),side(4,50,16))];
  const r=S.tournament(gs,FIELD,OWN,MG);const by=Object.fromEntries(r.map(x=>[x.mid,x]));
  assert.equal(by.a.score,5+5+2+4);   // teams 1 and 2 enter (10), team 1 wins (+2) and upsets (+4)
  assert.equal(by.b.score,5+5+1+2);   // 3 and 4 enter, 4 wins the play-in (+1), 3 wins (+2) over a 16 seed (not an upset)
  assert.equal(by.a.upsets,1);assert.equal(by.b.upsets,0);assert.equal(by.a.wins,1);assert.equal(by.b.wins,1);assert.equal(by.c.score,5+5)});
t('Tournament: Final Four points once per team; champion bonus; rounds in order',()=>{const gs=[G('ncaa','d1','Elite 8',side(1,70,3),side(8,60,2)),G('ncaa','d2','Final Four',side(1,70,3),side(3,60,1)),G('ncaa','d3','National Championship',side(1,80,3),side(5,70,4))];
  const r=S.tournament(gs,{'1':{seed:3},'3':{seed:1},'5':{seed:4}},OWN,MG);const a=r.find(x=>x.mid==='a');const f4=a.events.filter(e=>e.kind==='final4');assert.equal(f4.length,1);assert.equal(a.events.filter(e=>e.kind==='champ').length,1);
  assert.equal(a.score,5+6+4+4+3+4);   // entry + 3 wins + 2 upsets (seed 3 beat seed 2, seed 3 beat seed 1) + F4 + champ (team 2 is not in the field list: no penalty because the field is incomplete)
  const b=r.find(x=>x.mid==='b');assert.equal(b.score,5+3);   // team 3 entered and reached the F4 via the F4 game it played
  assert.equal(r[0].mid,'a')});
t('Tournament: "missed the field" only counts once the field list is complete (>=64 teams)',()=>{const big={};for(let i=100;i<164;i++)big[i]={seed:1+(i%16)};big['1']={seed:3};delete big['100'];const own=Object.assign({},OWN,{'200':'a'});
  const r=S.tournament([],big,own,MG);assert.ok(r.locked);const a=r.find(x=>x.mid==='a');assert.ok(a.events.some(e=>e.kind==='missed'&&e.tid==='200'));assert.ok(a.events.some(e=>e.kind==='missed'&&e.tid==='2'));assert.equal(a.score,5-1-1);
  const small=S.tournament([],FIELD,own,MG);assert.ok(!small.locked);assert.ok(!small.find(x=>x.mid==='a').events.some(e=>e.kind==='missed'))});
t('Tournament tiebreak: more upsets, then more wins; shared place if identical',()=>{const gs=[G('ncaa','d','1st Round',side(1,60,12),side(9,50,5)),G('ncaa','d','1st Round',side(3,60,1),side(10,50,16)),G('ncaa','d','1st Round',side(5,60,8),side(11,50,9))];
  const r=S.tournament(gs,{},OWN,MG);const sc=Object.fromEntries(r.map(x=>[x.mid,x.score]));assert.equal(sc.a,5+2+4);assert.equal(sc.b,5+2);assert.equal(sc.c,5+2);assert.equal(r[0].name,'Ana');   // seed 8 beating seed 9 is not an upset; b and c tie on score, upsets and wins -> shared place 2, name order
  assert.equal(r[0].place,1);assert.ok(!r[0].tied);assert.equal(r[1].place,2);assert.equal(r[2].place,2);assert.ok(r[1].tied);assert.equal(r[1].name,'Ben')});
t('Tournament with no games or no field: zeros, no crash',()=>{const r=S.tournament([],{},OWN,MG);assert.ok(r.every(x=>x.score===0));assert.doesNotThrow(()=>S.tournament(null,null,OWN,MG))});
t('unfinished NCAA games score nothing yet (entry only)',()=>{const r=S.tournament([G('ncaa','d','1st Round',side(1,0,12),side(2,0,5),'scheduled')],{'1':{seed:12},'2':{seed:5}},OWN,MG);assert.equal(r.find(x=>x.mid==='a').score,10)});
t('custom point values are honoured',()=>{const r=S.tournament([G('ncaa','d','1st Round',side(1,60,12),side(9,50,5))],{},OWN,MG,{entry:0,win:10,upset:1});assert.equal(r.find(x=>x.mid==='a').score,11)});
t('upset list: newest first, with owner',()=>{const gs=[G('ncaa','2027-03-19','1st Round',side(1,60,12),side(9,50,5)),G('ncaa','2027-03-21','2nd Round',side(3,60,4),side(2,50,1)),G('ncaa','2027-03-20','2nd Round',side(5,60,1),side(2,50,4))];const u=S.upsets(gs,OWN);assert.equal(u.length,2);assert.equal(u[0].game.day,'2027-03-21');assert.equal(u[0].owner,'b');assert.equal(u[1].owner,'a')});
/* ---------- games page ---------- */
t('games view: only games with a drafted team; results newest first, upcoming soonest first; manager and kind filters',()=>{
  const gs=[G('reg','2026-11-10','',side(1,80),side(9,70)),G('reg','2026-11-12','',side(3,80),side(9,70)),G('reg','2026-11-14','',side(8,80),side(9,70)),G('reg','2027-02-01','',side(1,0),side(9,0),'scheduled'),G('reg','2027-01-01','',side(3,0),side(9,0),'scheduled'),G('ncaa','2027-03-19','1st Round',side(1,60,12),side(9,50,5))];
  const v=S.gamesView(gs,OWN);assert.equal(v.total,5);assert.deepEqual(v.results.map(g=>g.day),['2027-03-19','2026-11-12','2026-11-10']);assert.deepEqual(v.upcoming.map(g=>g.day),['2027-01-01','2027-02-01']);
  assert.equal(S.gamesView(gs,OWN,{mid:'b'}).total,2);assert.equal(S.gamesView(gs,OWN,{kind:'ncaa'}).total,1);assert.equal(S.gamesView(gs,OWN,{kind:'season'}).total,4);assert.equal(S.gamesView([],OWN).total,0)});
t('data validation gives plain messages',()=>{assert.ok(S.validateScores(null));assert.ok(S.validateScores({games:'x'}));assert.ok(S.validateScores({games:[{home:{id:1}}]}));assert.equal(S.validateScores({games:[]}),null);assert.ok(S.validateTournament({}));assert.equal(S.validateTournament({field:{}}),null)});
t('team tournament status: out, alive, champion, not in the field',()=>{const gs=[G('ncaa','d1','1st Round',side(1,60,12),side(2,50,5)),G('ncaa','d2','2nd Round',side(3,60,1),side(1,50,12)),G('ncaa','d3','2nd Round',side(4,60,2),side(5,50,7),'scheduled')];const F={'1':{seed:12},'2':{seed:5},'3':{seed:1},'4':{seed:2},'5':{seed:7}};
  assert.deepEqual(S.teamTourney('2',gs,F),{seed:5,state:'out',round:'1st Round'});assert.deepEqual(S.teamTourney('1',gs,F),{seed:12,state:'out',round:'2nd Round'});assert.deepEqual(S.teamTourney('3',gs,F),{seed:1,state:'alive',round:'Sweet 16'});assert.equal(S.teamTourney('4',gs,F).round,'2nd Round');assert.equal(S.teamTourney('99',gs,F).state,'none');
  const cg=[G('ncaa','d','National Championship',side(3,80,1),side(4,70,2))];assert.equal(S.teamTourney('3',cg,{}).state,'champ');assert.equal(S.teamTourney('4',cg,{}).state,'out')});
t('ownerMap from picks',()=>{assert.deepEqual(S.ownerMap([{tid:'1',owner:'a'},{tid:2,owner:'b'}]),{'1':'a','2':'b'})});
t('real data files that ship are empty and not marked sample; sample files exist only in data/demo',()=>{const fs=require('fs'),path=require('path');const d=path.join(__dirname,'..','data');const r=JSON.parse(fs.readFileSync(d+'/scores.json','utf8')),rt=JSON.parse(fs.readFileSync(d+'/tournament.json','utf8'));assert.equal(S.validateScores(r),null);assert.equal(S.validateTournament(rt),null);assert.ok(!r.sample&&!rt.sample&&r.games.length===0&&Object.keys(rt.field).length===0)});
t('demo data files are in the documented format and marked SAMPLE',()=>{const fs=require('fs'),path=require('path');const d=path.join(__dirname,'..','data','demo');if(!fs.existsSync(d+'/scores.json'))return;const sc=JSON.parse(fs.readFileSync(d+'/scores.json','utf8')),tn=JSON.parse(fs.readFileSync(d+'/tournament.json','utf8'));assert.equal(S.validateScores(sc),null);assert.equal(S.validateTournament(tn),null);assert.ok(sc.sample&&/SAMPLE/.test(sc.label));assert.ok(tn.sample&&/SAMPLE/.test(tn.label));assert.ok(sc.games.length>200);assert.ok(Object.keys(tn.field).length>=64);
  sc.games.forEach(g=>{assert.ok(['reg','conf','ncaa'].includes(g.kind));assert.ok(['final','scheduled','live'].includes(g.status))});assert.ok(!/bet|stake|prize|payout|wager/i.test(JSON.stringify(sc).replace(/Bethune/g,'')))});
(async()=>{for(const [n,f] of T){try{await f();pass++;console.log('  ok  '+n)}catch(e){fail++;console.log('FAIL  '+n+'\n      '+(e&&e.message||e))}}console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0)})();
