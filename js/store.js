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
window.Store=Store;
})();
