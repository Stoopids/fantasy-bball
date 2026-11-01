/* s26c14 (QA interim mo4 BUG-1): in a GROUP mock every device runs the bot personalities, not only the creator's.
   A pers4 group mock (2 humans away + 6 bots, 12 rounds, no clock) is opened on 2 devices that are both NOT the creator (no mockopts in localStorage).
   Every bot pick must be inside its personality's guard window (js/mock-bots.js), both devices must have written bot picks, and every slot holds exactly one pick
   (no duplicates when two devices race the same bot pick). Mock store only (fbn.store=/api/data/), textdb.dev blocked. APP/API env. */
const L=require('./lib.js');const F=require('../js/core.js');const {seed}=require('./seed_league.js');const {sleep}=L;const API=process.env.API;const fs=require('fs'),path=require('path');
const W={};new Function('window',fs.readFileSync(path.join(__dirname,'../assets/teams.js'),'utf8'))(W);const TD=W.TEAMS_DATA;const POOL=TD.teams.map(r=>String(r[0]));
const B=require('../js/mock-bots.js');
let n=0,bad=0;const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,600):''))}};
const post=(k,v)=>fetch(API+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(v)});const gj=async k=>F.parseJ(await (await fetch(API+encodeURIComponent(k))).text());
(async()=>{try{
 const R=12;const id=await seed(API,{managers:8,rounds:R,live:true,clockSecs:null,picksMade:0,mock:true});const I=seed.info;const K=F.Keys(id);const m=await gj(K.meta);
 const humans=[I.managers[0],I.managers[1]];const bots=I.managers.slice(2).map(x=>x.id);
 m.over=m.over||{};humans.forEach(h=>m.over[h.id]={away:true});bots.forEach(b=>m.over[b]={away:true,bot:true});m.mock=true;m.mockOpts={seat:'any',bots:'pers4',dealt:B.deal(id,bots)};m.startedAt=Date.now();
 await post(K.meta,m);
 const Ps=[];for(const [i,w] of [[0,390],[1,1280]]){const h=humans[i];const P=await L.phone('dev'+i,w>700?{desktop:true,w,h:900}:{w,h:844});
   await P.page.setRequestInterception(true);P.page.on('request',r=>{if(/textdb\.dev/.test(r.url()))r.abort();else r.continue()});
   await P.go('room.html?l='+id+'#as='+h.id+'&k='+h.k);Ps.push(P)}
 const mo=await Ps[0].page.evaluate(id=>localStorage.getItem('mockopts.'+id),id);ok('neither device is the creator (no mockopts.<id>)',!mo);
 const tot=8*R;const t0=Date.now();let got=[];
 while(Date.now()-t0<900000){got=[];for(let k=1;k<=tot;k++){const e=await gj(K.pick(m.epoch,k));if(!(e&&e.tid))break;got.push(e)}if(got.length>=tot)break;await sleep(5000)}
 ok('group mock finished: '+got.length+'/'+tot+' picks in '+Math.round((Date.now()-t0)/1000)+'s',got.length===tot);
 const taken=[],outside=[],writers={};let botPicks=0;
 got.forEach((e,i)=>{const nn=i+1;const avail=POOL.filter(t=>!taken.includes(t));
  if(bots.includes(e.owner)){botPicks++;const key=B.forBot(id,e.owner,m.mockOpts.dealt);const P=B.BY[key];const r=Math.floor((nn-1)/8)+1;const ord=B.consensus(avail,TD.meta,P.wo);
   const nw=Math.min(14,ord.length,Math.max(1,Math.round(P.win[0]+P.win[1]*(r-1))));const pos=ord.indexOf(String(e.tid));writers[e.w]=(writers[e.w]||0)+1;if(pos<0||pos>=nw)outside.push(nn+':'+key+':pos'+pos+'/win'+nw+':w='+e.w)}
  taken.push(String(e.tid))});
 ok('every bot pick ('+botPicks+') is inside its personality guard window',botPicks>0&&outside.length===0,outside);
 ok('bot picks were written by more than one device ('+JSON.stringify(writers)+')',Object.keys(writers).length>=2,writers);
 ok('exactly one pick per slot, no team twice',new Set(taken).size===taken.length&&got.every((e,i)=>e.n==null||+e.n===i+1));
 for(const P of Ps)ok(P.name+': 0 JS errors',!P.errs.length,P.errs);
}catch(e){bad++;console.log('FAIL  crashed: '+(e&&e.stack||e))}
 await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed');process.exit(bad?1:0)})();
