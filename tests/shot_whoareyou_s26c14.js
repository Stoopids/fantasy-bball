/* s26c14: 'Who are you?' picker: Just watching button first, full width, >=44px. APP/API env, mock store. SHOTDIR=dir */
const L=require('./lib.js');const {seed}=require('./seed_league.js');const {sleep,API}=L;
(async()=>{let bad=0;const ok=(m,c,x)=>{if(c)console.log('  ok  '+m);else{bad++;console.log('FAIL  '+m+' '+JSON.stringify(x))}};try{const id=await seed(API,{});
 for(const w of [390,320]){const P=await L.phone('who'+w,{w,h:844});await P.go('room.html?l='+id);await P.page.waitForSelector('#watchbtn',{timeout:20000});await sleep(800);
  const r=await P.page.evaluate(()=>{const ov=document.querySelector('#overlay .ov');const b=document.getElementById('watchbtn').getBoundingClientRect();const items=[...ov.querySelectorAll('a,button,input')];const o=ov.getBoundingClientRect();return{first:items[0].id,h:b.height,w:b.width,ow:o.width,ovf:document.documentElement.scrollWidth>innerWidth}});
  ok(w+': Just watching is the first control, full width, >= 44px tall, no overflow',r.first==='watchbtn'&&r.h>=44&&r.w>=Math.min(300,r.ow-40)&&!r.ovf,r);
  if(w===390)await P.page.screenshot({path:process.env.SHOTDIR+'/whoareyou-390.png'});ok(w+': no page errors',!P.errs.length,P.errs);await P.close()}}catch(e){bad++;console.log('exception '+e.stack)}process.exit(bad?1:0)})();
