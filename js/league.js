/* League loader: reads ALL league keys once (meta, manager slots, profiles, picks) and returns the derived state.
   Stage 2 pages (league home, standings, team cards) call FBNLeague.load(id) and read the same keys the room writes. */
(function(){
const F=FBN;
async function load(id,opt){opt=opt||{};const K=F.Keys(id);const out={id,K,meta:null,claims:{},profiles:{},managers:[],entries:{},state:null};
  const d=F.parseJ(await Store.get(K.meta));if(!F.exists(d))return out;out.meta=F.normalizeMeta(d);const m=out.meta;
  await Promise.all(Array.from({length:m.settings.managers},(_,k)=>k+1).map(async i=>{out.claims[i]=F.parseClaim(await Store.get(K.slot(i,m.slotGen[i]||0)).catch(()=>''))}));
  const j=F.joinedList(m,out.claims);
  await Promise.all(j.map(async c=>{try{const p=F.parseProfile(await Store.get(K.mgr(c.mid)));if(p)out.profiles[c.mid]=p}catch(e){}}));
  out.managers=F.managersView(m,out.claims,out.profiles);
  if(m.status!=='lobby'){const tot=F.totalPicks(m.order,m.settings.rounds);const real=[];for(let k=1;k<=tot;k++){const sl=F.slotAt(m.order,k,m.settings.type,m.settings.rounds);if(!(sl&&F.redraftSkip(m,sl)))real.push(k)}for(let n=0;n<real.length;n+=6){const ns=real.slice(n,n+6);
      const rs=await Promise.all(ns.map(k=>Store.get(K.pick(m.epoch,k)).then(F.parseEntry).catch(()=>null)));ns.forEach((k,x)=>{out.entries[k]=rs[x]});if(rs.some(r=>!r))break}}
  out.state=F.deriveState(m,out.entries,{},opt.pool?new Set(opt.pool):null);return out}
window.FBNLeague={load};
})();
