/* s26c7 conference points + League total tests — node tests/test_confpts.js */
const assert=require('assert');const S=require('../js/scoring.js');let pass=0,fail=0;
const t=(n,f)=>{try{f();pass++;console.log('ok  ',n)}catch(e){fail++;console.log('FAIL',n,e.message)}};
const side=(id,score,seed)=>({id:String(id),score,seed:seed==null?null:seed});let gid=0;
const G=(kind,day,round,h,a,status)=>({id:'g'+(++gid),day,status:status||'final',kind,round:round||'',home:h,away:a});
const MG=[{mid:'a',name:'Ana'},{mid:'b',name:'Ben'}];const OWN={'1':'a','2':'a','3':'b'};
t('S.POINTS has conf_reg 4 and conf_tourn 4',()=>{assert.equal(S.POINTS.conf_reg,4);assert.equal(S.POINTS.conf_tourn,4)});
t('conf_reg and conf_tourn awarded once each (same team both, duplicate-safe)',()=>{
  const ct={'1':{conf:'ACC',confRegChamp:true,confTournChamp:true,confTournStarted:true}};
  const a=S.confPoints(ct,[],OWN,MG).find(r=>r.mid==='a');assert.equal(a.score,8);
  assert.equal(a.events.filter(e=>e.kind==='conf_reg').length,1);assert.equal(a.events.filter(e=>e.kind==='conf_tourn').length,1)});
t('conf_reg not awarded before the conf tournament starts',()=>{const ct={'1':{conf:'ACC',confRegChamp:true},'9':{conf:'ACC'}};
  const reg=[G('conf','2027-02-20','',side(1,70),side(9,60))];
  assert.equal(S.confPoints(ct,reg,OWN,MG).find(r=>r.mid==='a').score,0);
  const sched=reg.concat([G('conf','2027-03-10','Quarterfinals',side(9,null),side(8,null),'scheduled')]);
  assert.equal(S.confPoints(ct,sched,OWN,MG).find(r=>r.mid==='a').score,0)});
t('conf_reg awarded once a conf tournament game of the same conference is played',()=>{const ct={'1':{conf:'ACC',confRegChamp:true},'9':{conf:'ACC'}};
  const gs=[G('conf','2027-03-10','Quarterfinals',side(9,70),side(8,60))];assert.equal(S.confPoints(ct,gs,OWN,MG).find(r=>r.mid==='a').score,4);
  assert.equal(S.confPoints(ct,[G('conf','2027-03-10','Quarterfinals',side(7,70),side(8,60))],OWN,MG).find(r=>r.mid==='a').score,0,'other conference');
  assert.equal(S.confPoints({'1':{confRegChamp:true,confTournStarted:true}},[],OWN,MG).find(r=>r.mid==='a').score,4,'explicit flag')});
t('unowned / missing conf data: no crash, zero',()=>{assert.ok(S.confPoints(null,null,OWN,MG).every(r=>r.score===0));assert.ok(S.confPoints({'99':{confTournChamp:true}},[],OWN,MG).every(r=>r.score===0))});
t('League total = sum of breakdown, includes NCAA points and conf points',()=>{
  const gs=[G('reg','2026-11-10','',side(1,80),side(9,70)),G('reg','2026-11-11','',side(3,80),side(9,70)),G('conf','2027-03-10','Final',side(2,70),side(8,60)),
    G('ncaa','2027-03-20','1st Round',side(3,80,12),side(9,60,5))];const field={'3':{seed:12},'9':{seed:5}};
  const ct={'2':{conf:'B10',confRegChamp:true,confTournChamp:true}};
  const L=S.leagueTotals(S.fullSeason(gs,OWN,MG),S.tournament(gs,field,OWN,MG),S.confPoints(ct,gs,OWN,MG));
  L.forEach(r=>assert.equal(r.total,Object.values(r.breakdown).reduce((x,y)=>x+y,0)));
  const b=L.find(r=>r.mid==='b'),a=L.find(r=>r.mid==='a');
  assert.equal(b.breakdown.ncaa,5+2+4);assert.equal(b.total,1+11);assert.equal(a.total,2+8);assert.equal(L[0].mid,'b');assert.equal(L[0].place,1)});
console.log(pass+' passed, '+fail+' failed');process.exit(fail?1:0);
