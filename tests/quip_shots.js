const L=require('./lib.js');const {seedRecap}=require('./recap_seed.js');const {sleep}=L;
(async()=>{const id=await seedRecap(null,{power:true});let q=[];
for(const [w,d] of [[390,false],[1280,true]]){const P=await L.phone('q'+w,{w,h:900,desktop:d});await P.go('recap.html?l='+id+'#tab=rosters');await P.page.waitForSelector('#hlcard',{timeout:20000});await sleep(1500);
 const el=await P.page.$('#hlcard');await el.screenshot({path:'/workspace/draftroom-notes/s25-setup/'+w+'_recap_steals_reaches_quips.png'});
 q=await P.page.$$eval('[data-quip]',a=>a.map(e=>e.closest('.hl').innerText.replace(/\n/g,' | ')));
 await P.page.reload({waitUntil:'domcontentloaded'});await P.page.waitForSelector('#hlcard');await sleep(800);const q2=await P.page.$$eval('[data-quip]',a=>a.map(e=>e.closest('.hl').innerText.replace(/\n/g,' | ')));
 console.log(w,'stable on refresh:',JSON.stringify(q)===JSON.stringify(q2),'errs',P.errs);await P.close()}
console.log(q.join('\n'));await L.close()})();
