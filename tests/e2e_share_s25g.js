/* s25-full share options on every invite/share spot: setup links, room invite card, room "Links & QR" sheet, the links card ("Your links").
   Copy link + "Copied", native share when available, Text (sms:) + WhatsApp (wa.me) when not, Email always. No shared URL or text may carry k= or any secret.
   node tests/e2e_share_s25g.js (APP/API env, mock store). Shots -> SHOTS or /workspace/draftroom-notes/s25-full/share */
const L=require('./lib.js');const {sleep}=L;const OUT=process.env.SHARE_SHOTS||'/workspace/draftroom-notes/s25-full/share';require('fs').mkdirSync(OUT,{recursive:true});
let n=0,bad=0;const fails=[];const ok=(t,c,x)=>{n++;if(c)console.log('  ok  '+t);else{bad++;fails.push(t);console.log('FAIL  '+t+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,300):''))}};
const SECRET=/(^|[#?&;\s])(k|as|cm)=|\b[0-9a-f]{32}\b/i;
async function create(P,nm){await P.go('setup.html');await P.page.waitForSelector('#next');await P.page.type('#f_name',nm);await P.page.type('#f_mgr','Ann');await P.page.type('#f_team','Hoop');
 for(let i=0;i<15&&await P.page.$('#next');i++){await P.page.click('#next');await sleep(200)}await P.page.click('#create');await P.page.waitForSelector('#lcard',{timeout:20000})}
const targets=P=>P.page.evaluate(()=>[...document.querySelectorAll('[data-sr]')].map(b=>({id:b.id,kind:b.dataset.sr,href:b.getAttribute('href')||'',url:b.dataset.sru||'',text:b.dataset.srt||'',h:b.getBoundingClientRect().height})));
const secretFree=(ts,shared)=>{const bad=[];for(const t of ts){let dec='';try{dec=decodeURIComponent(t.href)}catch(e){dec=t.href}for(const v of [t.href,dec,t.url,t.text])if(SECRET.test(v))bad.push(t.id+': '+v.slice(0,80))}
  for(const d of shared||[])for(const v of [d.url||'',d.text||''])if(SECRET.test(v))bad.push('shared: '+v.slice(0,80));return bad};
(async()=>{try{
for(const share of [true,false])for(const [w,desk] of [[390,false],[1280,true]]){const tag=(share?'share':'noshare')+'_'+w;
 const P=await L.phone('s'+tag,{w,h:desk?900:844,desktop:desk});
 await P.page.evaluateOnNewDocument(sh=>{window.__shared=[];window.__copied=[];if(sh)navigator.share=async d=>{window.__shared.push(d)};else{try{delete Navigator.prototype.share}catch(e){}navigator.share=undefined}
   try{Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.__copied.push(t)}},configurable:true})}catch(e){}},share);
 await create(P,'Share '+w);await sleep(400);
 let ts=await targets(P);const sp=ts.filter(t=>/^sr_(invite|room|watch)_/.test(t.id)||/^lc_sr_/.test(t.id));
 ok(tag+' setup: invite, room, spectator and links-card rows all have Copy link and Email',['sr_invite','sr_room','sr_watch','lc_sr'].every(p=>ts.some(t=>t.id===p+'_copy')&&ts.some(t=>t.id===p+'_email')),ts.map(t=>t.id));
 ok(tag+' setup: '+(share?'native Share shown, Text/WhatsApp hidden':'no native Share: Text (sms:) and WhatsApp (wa.me) shown'),share?ts.some(t=>t.id==='sr_invite_share')&&!ts.some(t=>t.kind==='sms'||t.kind==='wa'):(!ts.some(t=>t.kind==='share')&&ts.some(t=>t.id==='sr_invite_sms'&&t.href.startsWith('sms:?&body='))&&ts.some(t=>t.id==='sr_invite_wa'&&t.href.startsWith('https://wa.me/?text='))),ts.filter(t=>/invite/.test(t.id)));
 ok(tag+' setup: private links (manager, commissioner) have no share row',!(await P.page.$('#sr_mine'))&&!(await P.page.$('#sr_commish')));
 ok(tag+' setup: every share button is at least 44 px tall',sp.every(t=>t.h>=44),sp.map(t=>[t.id,t.h]));
 await P.page.click('#sr_invite_copy');await sleep(300);const cc=await P.page.evaluate(()=>({t:document.getElementById('sr_invite_copy').textContent,c:window.__copied.slice(-1)[0]||''}));
 ok(tag+' setup: Copy link copies the invite link and shows "Copied"',/Copied/.test(cc.t)&&/join\.html\?l=/.test(cc.c),cc);
 if(share){await P.page.click('#sr_invite_share');await sleep(300);const sd=await P.page.evaluate(()=>window.__shared.slice(-1)[0]);ok(tag+' setup: Share calls navigator.share with the join link',!!sd&&/join\.html\?l=/.test(sd.url||''),sd)}
 await P.page.evaluate(()=>document.getElementById('lnk_invite').scrollIntoView());await sleep(200);await P.page.screenshot({path:OUT+'/setup_links_'+tag+'.png'});
 const shared1=await P.page.evaluate(()=>window.__shared);ok(tag+' setup: no share target URL or text, and nothing shared, carries k= or a secret',secretFree(ts,shared1).length===0,secretFree(ts,shared1));
 /* room: lobby invite card, Links & QR sheet, Your links card */
 const room=await P.page.$eval('#toRoom',a=>a.getAttribute('href'));await P.page.goto(new URL(room,P.page.url()).href);await P.page.waitForSelector('#invitecard',{timeout:20000});await sleep(800);
 /* s25-full FINAL SPEC (Paul): the lobby card is Copy invite link + Share; Text / WhatsApp / Email live in More > Links & QR */ts=await targets(P);ok(tag+' room invite card: Copy invite link + Share (navigator.share or copy fallback)',!!(await P.page.$('#invcopy'))&&!!(await P.page.$('#invshare')),ts.map(t=>t.id));
 await P.page.evaluate(()=>document.getElementById('invitecard').scrollIntoView());await sleep(200);await P.page.screenshot({path:OUT+'/room_invite_'+tag+'.png'});
 if(share){await P.page.click('#invshare');await sleep(300)}
 await P.page.evaluate(()=>{const m=document.getElementById('invmore');if(m)m.click()});await sleep(200);await P.page.click('#showqr');await P.page.waitForSelector('#srsheet',{timeout:5000});await sleep(300);const ts2=await targets(P);ok(tag+' room Links & QR sheet has the share row (Copy, Email'+(share?', Share':', Text, WhatsApp')+')',ts2.some(t=>t.id==='srsheet_copy')&&ts2.some(t=>t.id==='srsheet_email')&&(share||ts2.some(t=>t.id==='srsheet_sms')&&ts2.some(t=>t.id==='srsheet_wa')),ts2.map(t=>t.id));
 await P.page.screenshot({path:OUT+'/room_sheet_'+tag+'.png'});await P.page.evaluate(()=>{const b=document.querySelector('[data-a=sheetbg]');if(b)b.click()});await sleep(300);
 await P.page.evaluate(()=>{const t=document.getElementById('tab_more');if(t)t.click()});await sleep(800);const yl=await P.page.evaluate(()=>{const b=document.querySelector('[data-a=yourlinks],#yourlinks');if(b){b.click();return true}return false});await sleep(600);
 const ts3=await targets(P);ok(tag+' room Your links card has the invite share row',yl&&ts3.some(t=>t.id==='lc_sr_copy'),ts3.map(t=>t.id));if(yl)await P.page.screenshot({path:OUT+'/room_yourlinks_'+tag+'.png'});
 const shared2=await P.page.evaluate(()=>window.__shared);ok(tag+' room: no share target URL or text, and nothing shared, carries k= or a secret',secretFree(ts.concat(ts2,ts3),shared2).length===0,secretFree(ts.concat(ts2,ts3),shared2));
 const g=await P.page.evaluate(()=>({a:UI.shareRow({url:'https://x/room.html?l=AB#as=1&k=2'}),b:UI.shareRow({text:'my link https://x/#cm=abc'}),c:UI.shareRow({url:'https://x/join.html?l=AB'}).length>0}));
 ok(tag+' guard: a URL or text with a secret gets no share row at all',g.a===''&&g.b===''&&g.c,g);
 ok(tag+' no page errors',P.errs.length===0,P.errs);await P.close()}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
