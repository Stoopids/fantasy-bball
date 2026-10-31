/* shared: seed the s26c3 league in the mock store and open the owner breakdown (Rosters tab) for manager 0 */
const path=require('path');
module.exports=async function(L,root,w,fx,id,info){const P=await L.phone('ob'+Math.random().toString(36).slice(2,6),{desktop:w>=760,w,h:1100});
  await P.page.evaluateOnNewDocument((id,me)=>{localStorage.setItem('fbn.me.'+id,JSON.stringify(me))},id,{mid:info.managers[0].id,k:info.managers[0].k});
  await P.page.setBypassServiceWorker(true);await P.page.setRequestInterception(true);
  P.page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/data/scores.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify(fx.scores)});
    else if(u.pathname==='/data/tournament.json')r.respond({status:200,contentType:'application/json',body:JSON.stringify(fx.tournament)});
    else if(u.hostname==='site.api.espn.com')r.respond({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"events":[]}'});else r.continue()});
  await P.go('league.html?l='+id+'#rosters');await P.page.waitForSelector('#lapp[data-ready]',{timeout:25000});await L.sleep(700);
  await P.page.evaluate(mid=>{const b=document.querySelector('[data-a=pickowner][data-mid="'+mid+'"]');if(b)b.click()},info.managers[0].id);await L.sleep(500);
  await P.page.evaluate(()=>window.scrollTo(0,0));return P};
