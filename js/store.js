/* The ONLY module that talks to the shared store (textdb.dev today). A Supabase phase swaps this file (same 3 functions:
   get(key)->text, set(key,obj), blank(key)); everything else uses FBN.Keys() for names.  See README "Storage". */
(function(){
const DEFAULT_BASE='https://textdb.dev/api/data/';
/* Test hook, honoured ONLY on localhost / 127.0.0.1 and only as a same-origin path (e.g. /api/data/). On any real host the store is always textdb.dev. */
let override=null;try{const o=localStorage.getItem('fbn.store');if(o&&/^\/[A-Za-z0-9/_.-]*$/.test(o)&&(location.hostname==='localhost'||location.hostname==='127.0.0.1'))override=location.origin+o}catch(e){}
const Store={base:override||DEFAULT_BASE,real:!override,
  async fetchT(url,opt,ms){const ac=new AbortController();const to=setTimeout(()=>ac.abort(),ms);try{const r=await fetch(url,Object.assign({},opt,{signal:ac.signal}));if(!r.ok)throw new Error('HTTP '+r.status);return await r.text()}finally{clearTimeout(to)}},
  url(key){return this.base+encodeURIComponent(key)},
  get(key,ms){return this.fetchT(this.url(key),{cache:'no-store'},ms||8000)},                         /* '' when the key does not exist yet */
  set(key,obj,ms){return this.fetchT(this.url(key),{method:'POST',headers:{'Content-Type':'text/plain'},body:typeof obj==='string'?obj:JSON.stringify(obj)},ms||10000)},   /* text/plain: textdb double-encodes JSON content-type */
  blank(key){return this.set(key,'')}};
/* ---- Pick-slot resilience (s24 stuck-pick fix). Applies ONLY to pick-slot keys (<id>-e<epoch>-p<n>); every other key behaves as before. ----
   Reads: retry a 5xx / network error a few times with backoff, then fall back to the alternate keys <slot key>-a1, -a2, -a3.
   Precedence for one slot: the ORIGINAL key wins whenever it is readable and not empty; otherwise the lowest-numbered alternate that holds a value; otherwise empty.
   Writes: to the original key (retried); if it keeps failing (or it was just seen unreadable) to the first alternate that accepts the write. Nothing is ever deleted or overwritten in the original key.
   The raw getter / setter above stay available as Store.rawGet / Store.rawSet. */
const PICKRE=/-e\d+-p(\d+)$/,ALTS=[1,2,3],BADMS=20000,ALTGAP=12000;
const rawGet=Store.get.bind(Store),rawSet=Store.set.bind(Store);Store.rawGet=rawGet;Store.rawSet=rawSet;
Store.delays=[350,800];                                    /* backoff between tries (ms): 3 tries per key */
/* a stored pick value counts as 'a value' only if it looks like a pick entry (JSON with id, n, owner, tid); garbage is treated like empty: a valid alternate beats it */
const okEntry=t=>{try{let d=JSON.parse(t);if(typeof d==='string')d=JSON.parse(d);return!!(d&&typeof d==='object'&&typeof d.id==='string'&&+d.n>0&&typeof d.owner==='string'&&d.tid!=null)}catch(e){return false}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const transient=e=>{const m=/^HTTP (\d+)/.exec((e&&e.message)||'');return m?(+m[1]>=500||+m[1]===429||+m[1]===408):true};   /* 4xx other than 408/429 is final; network errors / timeouts are transient */
const PS={};const ps=k=>PS[k]||(PS[k]={badR:0,badW:0,src:0,state:'ok',at:0,n:0});
function note(key,state){const q=ps(key);const m=PICKRE.exec(key);q.n=m?+m[1]:0;const was=q.state;q.state=state;q.at=Date.now();if(state==='fail'&&was!=='fail')q.since=Date.now();if(was!==state)fire(key,state,was)}
function fire(key,state,was){try{window.dispatchEvent(new CustomEvent('fbn:pickstate',{detail:{key,state,was,n:ps(key).n,src:ps(key).src}}))}catch(e){}}
async function tries(fn,n){let err;const d=Store.delays;for(let i=0;i<n;i++){try{return await fn()}catch(e){err=e;if(!transient(e)||i===n-1)break;await wait(d[Math.min(i,d.length-1)])}}throw err}
Store.isPickKey=k=>PICKRE.test(String(k));
Store.altKey=(k,a)=>k+'-a'+a;
/* slots that cannot be read or saved right now (unresolved), newest first; entries expire if nothing touched them for 45 s */
Store.stuck=function(){const now=Date.now();return Object.keys(PS).map(k=>({key:k,n:PS[k].n,state:PS[k].state,since:PS[k].since,at:PS[k].at})).filter(x=>x.state==='fail'&&now-x.at<45000).sort((a,b)=>a.n-b.n)};
Store.pickInfo=k=>PS[k]?Object.assign({},PS[k]):null;
Store.retryNow=function(){Object.keys(PS).forEach(k=>{PS[k].badR=0;PS[k].badW=0})};      /* the next read tries the original key again */
Store.get=async function(key,ms,o){if(!PICKRE.test(String(key)))return rawGet(key,ms);o=o||{};const q=ps(key);let origErr=null,junk='';
  if(q.badR>Date.now())origErr=q.err||new Error('HTTP 500');
  else{try{const v=await tries(()=>rawGet(key,ms),q.badR?1:3);q.badR=0;if(v){if(okEntry(v)){q.src=0;note(key,'ok');return v}junk=v}}      /* original readable and not empty: it wins */
    catch(e){if(!transient(e))throw e;origErr=e;q.err=e;q.badR=Date.now()+BADMS}}
  /* an empty / junk original: the alternate is looked at on the first read, when writing, when it is known to hold the slot, and then at most every 12 s (keeps the read rate of a healthy room flat) */
  if(!origErr&&!o.write&&q.src===0&&q.altAt&&Date.now()-q.altAt<ALTGAP){note(key,'ok');return junk}
  q.altAt=Date.now();
  const rd=async a=>{try{return{a,v:await rawGet(Store.altKey(key,a),ms)}}catch(e){return{a,err:e}}};
  let rs=await Promise.all((origErr?ALTS:[1]).map(rd));
  if(!origErr&&rs[0].err)rs=rs.concat(await Promise.all(ALTS.slice(1).map(rd)));
  const hit=rs.filter(r=>r.v&&okEntry(r.v)).sort((x,y)=>x.a-y.a)[0];
  if(hit){q.src=hit.a;note(key,'ok');return hit.v}
  if(!origErr){q.src=0;note(key,'ok');return junk}                                  /* readable and empty everywhere */
  if(o.write&&rs.some(r=>r.v===''&&!r.err)){q.src=0;note(key,'fail');return''}    /* the writer may continue: no value exists in any readable key */
  note(key,'fail');const e=new Error(origErr.message||'HTTP 500');e.stuck=true;throw e};
Store.set=async function(key,obj,ms){if(!PICKRE.test(String(key)))return rawSet(key,obj,ms);const q=ps(key);const now=Date.now();
  const useAlt=q.src>0||q.badR>now||q.badW>now;let origErr=null;
  if(!useAlt){let r;try{r=await tries(()=>rawSet(key,obj,ms),3)}catch(e){if(!transient(e))throw e;origErr=e;q.badW=Date.now()+BADMS}
    if(!origErr){/* s23 (BUG-3): textdb can accept the WRITE and then answer every READ of that key with 500. Read it back once; if the read fails, keep a copy in the first alternate right away so every page can read the pick. */
      let rbErr=null;try{await rawGet(key,ms)}catch(e){if(/^HTTP 5\d\d/.test((e&&e.message)||''))rbErr=e}   /* only a server error counts here; a rate limit, timeout or offline moment does not move the pick */
      if(!rbErr){note(key,'ok');return r}
      q.badR=Date.now()+BADMS;q.err=rbErr;origErr=rbErr}}
  const order=q.src>0?[q.src].concat(ALTS.filter(a=>a!==q.src)):ALTS;let last=origErr;
  for(const a of order){try{const r=await tries(()=>rawSet(Store.altKey(key,a),obj,ms),3);q.src=a;note(key,'ok');fire(key,'alt',q.state);return r}catch(e){last=e;if(!transient(e))throw e}}
  note(key,'fail');throw last};
window.Store=Store;
})();
