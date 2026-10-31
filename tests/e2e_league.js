/* Fast league-site check: seeds a finished league straight into the mock store (no draft), then runs the same league checks as e2e.js.
   node tests/e2e_league.js   (needs: node tools/mock_textdb.js 9995 . 9996 running) */
const L=require('./lib.js');const fs=require('fs');const {seed}=require('./seed_league.js');const {sleep,APP}=L;
let n=0,bad=0;const fails=[];
function ok(name,cond,extra){n++;if(cond)console.log('  ok  '+name);else{bad++;fails.push(name);console.log('FAIL  '+name+(extra!==undefined?'  -> '+JSON.stringify(extra).slice(0,300):''))}}
const exists=(P,sel)=>P.page.$(sel).then(x=>!!x);const txt=(P,sel)=>P.page.$eval(sel,e=>e.innerText).catch(()=>null);
const phones=[];const mk=async(name,opt)=>{const p=await L.phone(name,opt);phones.push(p);return p};
(async()=>{try{const id=await seed();const ST={id};const js=seed.info;const C=await mk('C');
  await require('./league_step.js')({C,ST,js,mk,ok,exists,txt,sleep,fs,APP});
}catch(e){bad++;fails.push('exception: '+e.message);console.log(e.stack)}finally{await L.close();console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)}})();
