/* s25 links card (setup + room "Your links"), label renames. Mock store. Shots -> SHOTS dir. */
const L=require('./lib.js');const {sleep}=L;const OUT=process.env.SHOTS||'/workspace/draftroom-notes/s25-setup';
let n=0,bad=0;const ok=(t,c,x)=>{n++;if(c)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const shot=(P,f,full)=>P.page.screenshot({path:OUT+'/'+f+'.png',fullPage:full!==false});
async function create(P,nm){await P.go('setup.html');await P.page.waitForSelector('#next');await P.page.type('#f_name',nm);await P.page.type('#f_mgr','Ann');await P.page.type('#f_team','Hoop');
 for(let i=0;i<15&&await P.page.$('#next');i++){await P.page.click('#next');await sleep(200)}await P.page.click('#create');await P.page.waitForSelector('#lcard',{timeout:20000})}
const st=P=>P.page.evaluate(()=>({room:document.getElementById('toRoom').getAttribute('aria-disabled'),btns:[...document.querySelectorAll('.lcbtns [data-lc]')].map(b=>b.innerText.trim()),email:(document.getElementById('emailme')||null)===null,txt:document.body.innerText}));
(async()=>{try{
for(const [w,desk] of [[390,false],[1280,true]]){
 /* share present, a cancelled share does not count */
 const P=await L.phone('l'+w,{w,h:desk?900:844,desktop:desk});
 await P.page.evaluateOnNewDocument(()=>{window.__shareMode='abort';navigator.share=async d=>{window.__shared=d;if(window.__shareMode==='abort'){const e=new Error('x');e.name='AbortError';throw e}};
   window.__dl=[];const oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download){window.__dl.push(this.download);return}return oc.call(this)}});
 await create(P,'Links '+w);let s=await st(P);
 ok(w+': four buttons in order Share, Copy all, Download file, Email; old Email-me button gone',JSON.stringify(s.btns)===JSON.stringify(['Share','Copy all','Download file','Email'])&&s.email,s.btns);
 ok(w+': continue locked before saving',s.room==='true');ok(w+': label "Copy draft reminder", no old labels',/Copy draft reminder/.test(s.txt)&&!/Copy reminder message|Share invite\b/.test(s.txt));
 await shot(P,w+'_links_card_locked');
 const before=P.page.url();await P.page.evaluate(()=>document.getElementById('toRoom').click());await sleep(300);ok(w+': tapping locked Open my league stays on the page',P.page.url()===before);
 await P.page.click('#lc_share');await sleep(300);s=await st(P);ok(w+': share cancel (AbortError) does not unlock',s.room==='true');
 if(desk){await P.page.click('#lc_download');await sleep(300);ok('download makes a .txt via Blob and unlocks',(await P.page.evaluate(()=>window.__dl[0]||''))==='Links-1280-links.txt'&&(await st(P)).room==='false')}
 else{await P.page.evaluate(()=>window.__shareMode='ok');await P.page.click('#lc_share');await sleep(300);const sh=await P.page.evaluate(()=>window.__shared.text);ok('390: share sends all links incl. commissioner link and unlocks',/Commissioner link/.test(sh)&&/#cm=/.test(sh)&&(await st(P)).room==='false')}
 await shot(P,w+'_links_card_saved');
 /* room: Your links for the commissioner */
 const href=await P.page.$eval('#toRoom',a=>a.href);const id=new URL(href).searchParams.get('l');await P.page.goto(href.split('#')[0],{waitUntil:'domcontentloaded'});await P.page.waitForSelector('[data-a="tab"][data-t="more"]',{timeout:20000});await sleep(800);
 await P.page.click('[data-a="tab"][data-t="more"]');await P.page.waitForSelector('#yourlinks',{timeout:8000}).catch(()=>{});ok(w+': room More shows Your links for the commissioner',!!(await P.page.$('#yourlinks')));
 await P.page.$eval('#yourlinkscard',e=>e.scrollIntoView());await sleep(200);await shot(P,w+'_room_yourlinks_button',false);
 await P.page.click('#yourlinks');await P.page.waitForSelector('#lcard',{timeout:5000}).catch(()=>{});await sleep(300);
 const t=await P.page.evaluate(()=>[...document.querySelectorAll('#sheetwrap .lcbtns [data-lc]')].map(b=>b.innerText.trim()));ok(w+': Your links sheet has the four options',t.length===4,t);
 const em=await P.page.$eval('#lc_email',a=>decodeURIComponent(a.href));ok(w+': rebuilt links include commissioner + manager links from this device',/#cm=[0-9a-f]{32}/.test(em)&&/as=/.test(em));
 await shot(P,w+'_room_yourlinks_sheet',false);ok(w+': no page errors',P.errs.length===0,P.errs);
 await P.page.evaluate(()=>{const b=document.querySelector('[data-a="sheetbg"]');if(b)b.click()});await sleep(300);await P.page.click('[data-a="tab"][data-t="my"]');await P.page.waitForSelector('#queuehow',{timeout:8000}).catch(()=>{});
 const qh=await P.page.$eval('#queuehow',e=>{e.scrollIntoView({block:'center'});return e.innerText}).catch(()=>'');ok(w+': My Team queue help is the s25-full text exactly (Paul via NCAA; the old "How your queue works" wording was replaced)',qh.trim()==='Time runs out? We pick for you: your queue first, then best available.'&&!/and the league auto-picks/.test(qh),qh);await sleep(200);await shot(P,w+'_myteam_queuehow',false);
 /* spectator / non-commish: no button */
 const Q=await L.phone('q'+w,{w,desktop:desk});await Q.go('room.html?l='+id+'&watch=1');await Q.page.waitForSelector('[data-a="tab"][data-t="more"]',{timeout:20000});await sleep(800);await Q.page.click('[data-a="tab"][data-t="more"]');await sleep(500);
 ok(w+': not shown to a non-commissioner',!(await Q.page.$('#yourlinks')));await Q.close();await P.close()}
}catch(e){bad++;console.log('CRASH',e)}await L.close();console.log(`\n${n-bad}/${n} passed`);process.exit(bad?1:0)})();
