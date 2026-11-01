/* s26mo4: MOCK-ONLY bot personalities. Used only by js/mock.js for bots in a mock draft created on this device; real leagues never call this.
   Paul: edit the PERSONALITIES table below (label, how far it may reach, how strongly it leans). Picks are always inside a guard window:
   the top N available teams by consensus (power rank), N = win[0] + win[1]*(round-1), capped at WIN_MAX. Weight = exp(-position/temp) * lean.
   Randomness is seeded by the mock id + bot + pick number, so a mock replays identically. */
(function(root){
const POWER=['SEC','Big Ten','Big 12','ACC'],P5=POWER.concat(['Big East']),WIN_MAX=14;
const PERSONALITIES=[
 {key:'chalk',   label:'Chalk',          win:[3,0.5],temp:1.0,wo:0.5},
 {key:'bigconf', label:'Big conference', win:[6,1],  temp:2.5,confs:POWER,inConf:2.5,outConf:0.5,wo:0.4},
 {key:'value',   label:'Value hunter',   win:[6,1],  temp:2.5,valuePer10:1.0,wo:0.7},   /* lean per 10 places NET is better than power rank */
 {key:'upside',  label:'Upside',         win:[7,1.5],temp:3.5,midMajor:2.5,midMajorRounds:5,wo:0.6},
 {key:'homer',   label:'Homer',          win:[6,1],  temp:2.5,homer:4,wo:0.3},
 {key:'balanced',label:'Balanced',       win:[6,1],  temp:2.5,repeat:0.35,wo:0.5}
];
const BY={};PERSONALITIES.forEach(p=>BY[p.key]=p);
let NET=null;/* tid -> NET rank (data/net.json), loaded by mock.js on mock rooms only */
function setNet(j){try{const m={};(j.ranks||[]).forEach(r=>{m[String(r.id)]=+r.rank});NET=m}catch(e){}}
function hash32(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h>>>0}
function mul(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
/* deal personalities to the bots of one mock: all six once (shuffled), extra bots get a random one */
function deal(mockId,mids){const r=mul(hash32('deal:'+mockId));const k=PERSONALITIES.map(p=>p.key);for(let i=k.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[k[i],k[j]]=[k[j],k[i]]}
  const o={};mids.forEach((m,i)=>{o[m]=i<k.length?k[i]:k[Math.floor(r()*k.length)]});return o}
function forBot(mockId,mid,dealt){const k=dealt&&dealt[mid];if(k&&BY[k])return k;return PERSONALITIES[hash32('pers:'+mockId+':'+mid)%PERSONALITIES.length].key}
/* s26c14 (Paul 'more variety'): consensus = blended rank wo*o (KenPom) + (1-wo)*p (STOOPID rank), wo per personality (0.3-0.7); no p -> behind every ranked team (p = maxP + o).
   wo omitted -> the old p order (power rank first, unranked after, stable by id). */
const BCACHE=new WeakMap();
function blendRank(meta,wo){let c=BCACHE.get(meta);if(!c){c={};BCACHE.set(meta,c)}if(c[wo])return c[wo];const ids=Object.keys(meta).filter(t=>meta[t]&&typeof meta[t]==='object');const maxP=ids.reduce((a,t)=>Math.max(a,+meta[t].p>0?+meta[t].p:0),0);
  const O=t=>+meta[t].o>0?+meta[t].o:(+meta[t].p>0?366+(+meta[t].p):999);const sc={};ids.forEach(t=>{const p=+meta[t].p>0?+meta[t].p:maxP+O(t);sc[t]=wo*O(t)+(1-wo)*p});
  const r={};ids.slice().sort((a,b)=>(+meta[b].p>0)-(+meta[a].p>0)||sc[a]-sc[b]||O(a)-O(b)||(a<b?-1:1)).forEach((t,i)=>{r[t]=i+1});return c[wo]=r}
function consensus(avail,meta,wo){if(wo!=null){const r=blendRank(meta,+wo);return avail.slice().sort((a,b)=>(r[a]||1e9)-(r[b]||1e9)||(a<b?-1:a>b?1:0))}const p=t=>+((meta[t]||{}).p)||0;return avail.slice().sort((a,b)=>{const x=p(a),y=p(b);if(x&&y)return x-y;if(x)return-1;if(y)return 1;return a<b?-1:a>b?1:0})}
let ERANK=null;function eRank(meta){if(!ERANK){ERANK={};Object.keys(meta).filter(t=>meta[t].e!=null).sort((a,b)=>meta[b].e-meta[a].e).forEach((t,i)=>ERANK[t]=i+1)}return ERANK}
function homerConf(mockId,mid,meta){const c=[...new Set(Object.keys(meta).filter(t=>+meta[t].p>0&&+meta[t].p<=60).map(t=>meta[t].c))].sort();return c[hash32('homer:'+mockId+':'+mid)%c.length]}
/* o: {key, avail, meta, round, mine:[tid], rng, mockId, mid} -> {tid, pos, n} */
function choose(o){const P=BY[o.key]||BY.chalk,meta=o.meta||{};const ord=consensus(o.avail,meta,P.wo);if(!ord.length)return null;
  const n=Math.min(WIN_MAX,ord.length,Math.max(1,Math.round(P.win[0]+P.win[1]*((o.round||1)-1))));const win=ord.slice(0,n);
  const conf=t=>(meta[t]||{}).c||'';const hc=P.homer?homerConf(o.mockId,o.mid,meta):null;const cnt={};(o.mine||[]).forEach(t=>{cnt[conf(t)]=(cnt[conf(t)]||0)+1});
  const w=win.map((t,i)=>{let x=Math.exp(-i/P.temp);const m=meta[t]||{};
    if(P.confs)x*=P.confs.indexOf(m.c)>=0?P.inConf:P.outConf;
    if(P.valuePer10){const pr=+m.p||0;const nr=NET&&NET[t]?NET[t]:(eRank(meta)[t]||0);if(pr&&nr&&pr>nr)x*=1+P.valuePer10*Math.min(3,(pr-nr)/10)}
    if(P.midMajor&&(o.round||1)<=P.midMajorRounds&&P5.indexOf(m.c)<0)x*=P.midMajor;
    if(hc&&m.c===hc)x*=P.homer;
    if(P.repeat!=null)x*=Math.pow(P.repeat,cnt[m.c]||0);return x});
  const tot=w.reduce((a,b)=>a+b,0);let r=o.rng()*tot;for(let i=0;i<win.length;i++){r-=w[i];if(r<=0)return{tid:win[i],pos:i,n}}return{tid:win[win.length-1],pos:win.length-1,n}}
const api={PERSONALITIES,BY,deal,forBot,choose,consensus,blendRank,setNet,hash32,mul,label:k=>(BY[k]||{}).label||'',homerConf,_net:()=>NET};
root.FBNBots=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
