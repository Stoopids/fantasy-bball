/* Draft recap page. Sections, top to bottom: 1 congratulations + Redraft countdown, 2 "Take a look at your draft recap!" (grade, 4-sentence summary, Deeper analysis; only from a real
   analysis file, never made up), 3 full draft order by round, 4 how the order was set, 5 rosters side by side + top 3 steals / reaches, 6 tournament outlook, 7 conference breakdown,
   8 pick times (approximate), 9 draft-day awards, 10 the one big League site button, 11 footer (how grades work, share link, small CSV / JSON export). Every school goes through U.teamChip / U.teamLink. */
(function(){const F=FBN,U=UI,esc=U.esc;const id=F.parseCode(U.qs().get('l')||'')||'';const T=U.loadTeams();
document.getElementById('top').innerHTML=U.header({sub:'Draft recap'});const app=document.getElementById('app');
if(!id){app.innerHTML='<div class="card"><h2>No league</h2><a href="index.html">Home</a></div>';return}
app.innerHTML='<div class="card mut" id="loading">Loading the final rosters…</div>';
const recapUrl=()=>U.pageUrl('recap.html',{l:id});
const ACT={csv:()=>dl('csv'),json:()=>dl('json'),
  grrow:el=>{const p=document.getElementById(el.getAttribute('aria-controls'));if(!p)return;if(GRD[p.id]!=null){p.innerHTML=GRD[p.id];delete GRD[p.id]}const open=p.hidden;p.hidden=!open;el.setAttribute('aria-expanded',open?'true':'false');el.parentNode.classList.toggle('open',open)},
  invitewatch:()=>{const m=D&&D.meta?D.meta.name:'';U.share({title:(m||'League')+' draft',text:'Watch our draft board and recap (read-only):',url:U.pageUrl('room.html',{l:id,watch:1})})},
  sharegrade:()=>shareGrade(),
  share:()=>{const m=D&&D.meta?D.meta.name:'';U.share({title:(m||'League')+' draft recap',text:'Take a look at our draft recap!',url:recapUrl()})},
  deep:el=>{const p=document.getElementById(el.getAttribute('aria-controls'));if(!p)return;const open=p.hidden;p.hidden=!open;el.setAttribute('aria-expanded',open?'true':'false');el.querySelector('span').textContent=open?'Hide deeper analysis':'Deeper analysis'}};
let D=null;
function dl(k){const nm=(D.meta.name.replace(/[^a-z0-9]+/gi,'-')||'league')+'-draft.';if(k==='csv')U.download(nm+'csv',F.toCSV(D.state,D.managers,T.TEAMS,T.META),'text/csv');else U.download(nm+'json',JSON.stringify(F.toJSONExport(D.state,D.managers,T.TEAMS,T.META,D.meta),null,2),'application/json')}
/* s23 (item 9): "Share my grade" draws a square image on a canvas (no network) and shares it as a PNG, or downloads it where sharing files is not possible */
function gradePng(){const g=GRADE;const c=document.createElement('canvas');c.width=c.height=1080;const x=c.getContext('2d');
  x.fillStyle='#10131a';x.fillRect(0,0,1080,1080);x.fillStyle='#ffd23f';x.fillRect(0,0,1080,16);x.fillRect(0,1064,1080,16);x.textAlign='center';
  const fit=(t,max,px,w)=>{t=String(t||'');let s=px;x.font=w+' '+s+'px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';while(x.measureText(t).width>max&&s>20){s-=4;x.font=w+' '+s+'px system-ui,-apple-system,Segoe UI,Roboto,sans-serif'}return t};
  x.fillStyle='#9aa3b5';x.fillText(fit('FANTASY BBALL · DRAFT GRADE',960,40,'800'),540,110);
  x.fillStyle='#ffffff';x.fillText(fit(g.league,960,52,'800'),540,190);
  x.fillStyle='#ffd23f';x.font='900 340px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';x.fillText(g.grade,540,560);
  x.fillStyle='#ffffff';x.fillText(fit(g.team,960,72,'900'),540,700);x.fillStyle='#c7cede';x.fillText(fit(g.name,960,48,'700'),540,770);
  x.fillStyle='#4ade80';x.fillText(fit(g.rank+' in power rankings',960,52,'800'),540,870);
  if(g.best){x.fillStyle='#9aa3b5';x.fillText(fit('Best pick: '+g.best,960,40,'700'),540,950)}
  return new Promise(r=>c.toBlob(b=>r(b),'image/png'))}
async function shareGrade(){if(!GRADE)return;const b=await gradePng();if(!b){U.toast('Could not make the image');return}const nm='my-draft-grade.png';
  try{const f=new File([b],nm,{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'My draft grade',text:'My draft grade: '+GRADE.grade});return}}catch(e){if(e&&e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=nm;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);U.toast('Image saved: '+nm)}
const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmtDate=ts=>{const d=new Date(+ts);return isFinite(d)?MON[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear():''};
const fmtDur=ms=>{const s=Math.round(ms/1000);return s<60?s+' sec':Math.floor(s/60)+' min '+String(s%60).padStart(2,'0')+' sec'};
const fmtLong=ms=>{const m=Math.round(ms/60000);return m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0')+' min'};
const median=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),k=s.length>>1;return s.length%2?s[k]:(s[k-1]+s[k])/2};
let ONROWS=null,ONGRADES=null,GRADE=null;const GRD={};/* League grades row details, built when a row is first opened */
const GC=g=>({'A+':'g-Ap','A':'g-A','A-':'g-A','B+':'g-B','B':'g-B','B-':'g-B','C+':'g-C','C':'g-C','C-':'g-C','D+':'g-D','D':'g-D','D-':'g-D','F':'g-D'}[g]||'g-C');/* set by the render below: makes Rosters side by side and the awards follow the Power section's rows (the call to wirePower stays exactly as League's tests expect) */
let TSTL=false;/* League's rule: strip a leading "Test " only when the LEAGUE NAME starts with the whole word "Test" (the example league); a real league shows every name as written */
const disp=n=>{n=String(n==null?'':n);if(!TSTL)return n;const t=n.replace(/^Test\s+(?=\S)/,'');return(!t.trim()||/^test$/i.test(t.trim()))?n:t};
const sec=(idv,h,body,cls)=>`<section class="rsec${cls?' '+cls:''}" id="${esc(idv)}" aria-labelledby="${esc(idv)}_h"><h2 id="${esc(idv)}_h">${esc(h)}</h2>${body}</section>`;
FBNLeague.load(id,{pool:T.POOL}).then(d=>{D=d;if(!d.meta){app.innerHTML='<div class="card" id="nf"><h2>League not found</h2><a class="btn" href="index.html">Home</a></div>';return}
 const st=d.state,m=d.meta;TSTL=/^test(?![A-Za-z0-9])/i.test(String(m.name==null?'':m.name).trim());
 if(m.status==='lobby'){app.innerHTML=`<div class="card"><h2>${esc(m.name)}</h2><p class="mut">The draft has not started yet.</p><a class="btn" href="${esc(U.pageUrl('room.html',{l:id}))}">Go to the lobby</a></div>`+U.buildTag();
 U.bind(ACT);return}
 const done=st.status==='complete',redr=F.redraftLive(m);
 const real=st.real||st.picks;const MG=d.managers;const mgOf=mid=>MG.find(y=>y.mid===mid)||{mid,name:'Manager',team:''};const nameOf=mid=>mgOf(mid).name;
 const me=U.getMe(id),myMid=me&&me.mid&&MG.some(x=>x.mid===me.mid)?me.mid:'';
 const chip=(tid,o)=>U.teamChip(T.TEAMS,tid,o);
 const META=T.META,rosters=F.rosters(st,MG);let rt=F.rosterRatings(rosters.map(r=>({mid:r.mgr.mid,picks:r.picks})),META);
 /* ONE strength / rank definition for the whole page: League's generator (js/power-gen.js; the same one FBNPower.resolve uses for the Power rankings section). Rosters side by side and the Chalk Boss award read rt, which wirePower re-points at the section's own rows when the example file text is used. Without 8 full rosters (generator returns null) the old preseason rating stays and no Power section is shown. */
 try{const G=done&&window.FBNPowerGen?FBNPowerGen.generate({managers:MG,state:st,teams:T.TEAMS,meta:META}):null;if(G&&G.length){rt={};G.forEach(r=>{rt[r._mid]={mid:r._mid,strength:r.strength,place:r.rank}})}}catch(e){}
 const RT=()=>Object.assign({},T,{RK:rt});
 const sn=tid=>(T.TEAMS[tid]&&(T.TEAMS[tid].short||T.TEAMS[tid].name))||tid;
 /* ---- 1 congratulations ---- */
 const cd=F.redraftCountdown(Date.now(),U.tz());
 const msg=!done?'The draft is under way.':st.endedEarly?'The draft ended early. See you again '+F.REDRAFT.asOfLabel+' for the Redraft!':redr?'Congratulations! The Redraft is complete. Good luck this season!':'Congratulations! The draft is complete. See you '+F.REDRAFT.asOfLabel+' for the Redraft!';
 /* s23 (item 9): a finished draft opens on a full-screen confetti banner (the confetti is CSS only and is skipped with reduced motion) */
 const CONF=done?'<div class="confetti" aria-hidden="true">'+Array.from({length:28},(_,k)=>`<i style="left:${esc((k*37)%100)}%;animation-delay:${esc(((k*53)%30)/10)}s;background:${esc(['#ffd23f','#4ade80','#60a5fa','#f472b6','#fb923c','#a78bfa'][k%6])}"></i>`).join('')+'</div>':'';
 const s1hero=done?`<section class="rsec rchero" id="recaphead" aria-labelledby="rc1_h">${CONF}<div class="rcemo" aria-hidden="true">🎉🏀🏆🎊</div><div class="rclbl" id="rcfinal">${esc(st.endedEarly?'ENDED EARLY':'FINAL')} · ${real.length} OF ${st.realTotal==null?st.total:st.realTotal} PICKS</div><h1 id="rc1_h" class="rcmsg">${esc(msg)}</h1>`
  +(!redr&&cd.state!=='past'?`<div class="rccount" id="rccount"><b>${esc(cd.text)}</b> until the Redraft on ${esc(F.REDRAFT.asOfLabel)}</div>`:'')
  +`<div class="small mut">${esc(m.name)}</div><a class="btn pri rcdown" id="rcdown" href="#powerrecap_s">See how you scored ↓</a></section>`:'';
 const s1=`<section class="card rsec" id="recaphead" aria-labelledby="rc1_h"><div class="small mut">${done?(st.endedEarly?'ENDED EARLY':'FINAL'):'DRAFT IN PROGRESS'}</div><h2 id="rc1_h" style="margin:2px 0 6px">${esc(msg)}</h2>`
  +(done&&!redr&&cd.state!=='past'?`<div class="rccount" id="rccount"><b>${esc(cd.text)}</b> until the Redraft on ${esc(F.REDRAFT.asOfLabel)}</div>`:'')
  +`<div class="small mut">${esc(m.name)} · ${real.length} of ${st.realTotal==null?st.total:st.realTotal} picks · ${m.settings.type==='snake'?'Snake':'Linear'} · ${redr?'Redraft: '+m.settings.rounds+' round'+(m.settings.rounds===1?'':'s')+' (rosters include kept teams)':m.settings.rounds+' teams each'}</div><div class="row" style="margin-top:6px"><a class="btn sm" id="rc_room" href="${esc(U.roomHref(id))}">Draft room</a></div></section>`;
 /* ---- 2 grades (filled in by the analysis file when it matches this league) ---- */
 const s2=sec('powerrecap_s','Here is how you scored',`<div id="powerrecap"><div class="card rcempty" id="rcempty"><b>Your draft recap will appear here.</b><div class="small mut" style="margin-top:4px">${done?'A grade, a short summary and a deeper analysis are added once this league’s drafts have been analysed. Nothing is made up.':'It appears after the draft is complete.'}</div></div></div>`);
 /* ---- 3 full draft order ---- */
 const O=st.order||[],L2=O.length;let s3='';
 {let h=`<p class="small mut rcnote">${m.settings.type==='snake'?'Snake draft: the order reverses every round, so the last manager picks twice in a row.':'Linear draft: the same order every round.'} Your picks are marked.</p>`;
  for(let r=0;r<st.rounds;r++){const rev=st.type==='snake'&&r%2;
   h+=`<div class="rdgrp" data-round="${esc(r+1)}"><h3 class="rdh">Round ${r+1}<small>${st.type==='snake'?(rev?' · order reversed':' · order 1 to '+L2):''}</small></h3><ol class="dolist">`;
   for(let i=0;i<L2;i++){const n=r*L2+i+1;const own=rev?O[L2-1-i]:O[i];const p=st.picks[n-1];const o=p&&p.owner||own;
    const sk=p?!!p.skip:(redr&&F.redraftSkip(m,{round:r+1,owner:own}));
    h+=`<li class="dorow${esc(o===myMid?' mine':'')}${esc(sk?' skip':'')}" data-n="${n}" data-o="${esc(o)}"><span class="dn">#${n}</span><span class="dm"><b>${esc(nameOf(o))}</b></span><span class="dc">${sk?'<span class="mut small">no pick (no drop)</span>':p&&p.tid?chip(p.tid,{sm:1}):'<span class="mut small">not picked yet</span>'}</span></li>`}
   h+='</ol></div>'}
  s3=sec('rc_order','Full draft order',h)}
 if(!done){/* partial page while the draft is still going */}
 /* ---- 4 how the order was set ---- */
 let s4='';
 {const spun=F.spinCompleted(m);const sp=(m.respins||[]).filter(r=>r&&r.kind==='spin').pop();const sts=(sp&&+sp.ts)||(m.spin&&+m.spin.ts)||0;
  const first=O[0],last=O[L2-1];
  s4=sec('rc_spin','How the order was set',`<p class="rcnote">${spun?'The wheel set the order'+(sts?' on '+esc(fmtDate(sts)):'')+'. One spin per league, no do-overs.':'The order was set before the draft. No wheel spin is recorded for this league.'}${st.type==='snake'&&L2>1?' '+esc(nameOf(last))+' picked #'+L2+' and #'+(L2+1)+' overall because a snake order reverses each round.':''}</p><ol class="ordlist" id="rc_ordlist">${O.map((mid,i)=>`<li class="${esc(mid===myMid?'mine':'')}"><span class="dn">${i+1}</span><span class="dm"><b>${esc(nameOf(mid))}</b><small>${esc(mgOf(mid).team)}</small></span></li>`).join('')}</ol>`)}
 /* ---- 5 rosters + steals / reaches ---- */
 const diffs=real.filter(p=>p&&!p.skip&&!p.kept&&p.tid&&p.n>0&&+(META[p.tid]||{}).p>0).map(p=>({p,rank:+META[p.tid].p,diff:p.n-META[p.tid].p}));
 const steals=diffs.filter(x=>x.diff>0).sort((a,b)=>b.diff-a.diff||a.p.n-b.p.n).slice(0,3),reaches=diffs.filter(x=>x.diff<0).sort((a,b)=>a.diff-b.diff||a.p.n-b.p.n).slice(0,3);
 const hr=(k,x,after)=>`<div class="hl" data-k="${esc(k)}"><span class="seedtag">#${x.p.n}</span><div class="grow">${chip(x.p.tid,{sm:1})}<div class="small mut">${esc(nameOf(x.p.owner))} · power rank ${x.rank} · taken ${Math.abs(x.diff)} pick${Math.abs(x.diff)===1?'':'s'} ${after}</div></div></div>`;
 const hl=(k,t,list,after,none)=>`<div class="hlcol" id="${k}"><h3>${t}</h3>${list.length?list.map((x,i)=>hr(k+(i+1),x,after)).join(''):`<div class="small mut">${none}</div>`}</div>`;
 const s5=sec('rc_rosters','Rosters side by side',UI.rosters(st,MG,RT())+`<div class="card" id="hlcard"><div class="hlcols">${hl('steals','Top 3 steals',steals,'after its rank','none yet (needs picks of ranked teams)')}${hl('reaches','Top 3 reaches',reaches,'before its rank','none: nobody took a team before its rank')}</div><div class="tiny mut" style="margin-top:8px"><b>Strength</b> is out of 100: the average score of the roster’s schools, from each school’s power rank and projected seed (see How grades work). Higher is better; rank is the order in the Power rankings. A steal is a team taken after its rank; a reach is one taken before it.</div></div>`);
 /* ---- 6 tournament outlook + 7 conferences ---- */
 const seedOf=tid=>F.seedNum(META[tid]);
 const outl=rosters.map(r=>{const sd=r.picks.map(p=>({tid:p.tid,s:seedOf(p.tid)})).filter(x=>x.s!=null);return{mgr:r.mgr,n:r.picks.length,field:sd.length,top4:sd.filter(x=>x.s<=4).length,long:sd.length?sd.reduce((a,b)=>b.s>a.s?b:a):null,avg:sd.length?Math.round(sd.reduce((a,b)=>a+b.s,0)/sd.length*10)/10:null}});
 const s6=sec('rc_outlook','Tournament outlook',`<p class="small mut rcnote">Projected NCAA Tournament seeds from the team table. They are estimates, not official. A school without a projected seed is not counted.</p><div class="orows" id="orows">${outl.map(o=>`<div class="orow${esc(o.mgr.mid===myMid?' mine':'')}" data-mid="${esc(o.mgr.mid)}"><div class="on"><b>${esc(o.mgr.name)}</b><small>${esc(o.mgr.team)}</small></div><div class="os"><span><b>${o.field}</b> in the field</span><span><b>${o.top4}</b> top-4 seed${o.top4===1?'':'s'}</span><span>${o.avg==null?'avg seed n/a':'avg seed <b>'+o.avg+'</b>'}</span></div><div class="ol">${o.long?'Longest shot: '+chip(o.long.tid,{sm:1})+' <span class="small mut">seed '+o.long.s+'</span>':'<span class="small mut">No projected seeds on this roster</span>'}</div></div>`).join('')}</div>`);
 const conf=rosters.map(r=>{const c={};r.picks.forEach(p=>{const k=(META[p.tid]||{}).c||'Other';c[k]=(c[k]||0)+1});const l=Object.keys(c).sort((a,b)=>c[b]-c[a]||a.localeCompare(b));return{mgr:r.mgr,c,l,n:r.picks.length}});
 const s7=sec('rc_conf','Conference breakdown',`<div class="orows" id="crows">${conf.map(x=>{const top=x.l.slice(0,3),rest=x.l.slice(3).reduce((a,k)=>a+x.c[k],0);const heavy=x.l.length&&x.c[x.l[0]]>=4&&x.l[0]!=='Other';
  return `<div class="orow crow${esc(x.mgr.mid===myMid?' mine':'')}" data-mid="${esc(x.mgr.mid)}"><div class="on"><b>${esc(x.mgr.name)}</b><small>${esc(x.mgr.team)}</small></div><div class="cch">${top.map(k=>`<span class="cc2"><b>${x.c[k]}</b> ${esc(k)}</span>`).join('')}${rest?`<span class="cc2"><b>${rest}</b> other</span>`:''}</div>${heavy?`<div class="small mut cheavy">Heavy on ${esc(x.l[0])}: ${x.c[x.l[0]]} of ${x.n}.</div>`:''}</div>`}).join('')}</div>`);
 /* ---- 8 pick times (approximate) ---- */
 const seq=real.filter(p=>p&&!p.skip&&!p.kept&&p.tid&&+p.ts>0);let prev=+m.resumeAt>0?+m.resumeAt:+m.startedAt>0?+m.startedAt:0;const times=[];
 seq.forEach(p=>{if(prev>0){const dt=p.ts-prev;if(dt>=0&&dt<12*36e5)times.push({p,dt})}prev=p.ts});
 const usable=times.length>=Math.max(4,seq.length/2)&&median(times.map(x=>x.dt))>=1000;
 const by={};rosters.forEach(r=>{by[r.mgr.mid]={mgr:r.mgr,dt:[],auto:0}});times.forEach(x=>{if(by[x.p.owner])by[x.p.owner].dt.push(x.dt)});real.forEach(p=>{if(p&&!p.skip&&(p.auto||p.by==='auto')&&by[p.owner])by[p.owner].auto++});
 const brows=Object.values(by).map(b=>Object.assign(b,{med:median(b.dt)}));
 let s8;
 if(!usable)s8=sec('rc_times','Pick times (approximate)','<p class="small mut rcnote" id="rctimesnote">Pick times were not recorded in a usable way for this league, so no speed stats are shown.</p>');
 else{const longest=times.reduce((a,b)=>b.dt>a.dt?b:a);const spanMs=(+m.endedAt>0&&+m.startedAt>0)?m.endedAt-m.startedAt:(seq.length?seq[seq.length-1].ts-(+m.startedAt||seq[0].ts):0);
  s8=sec('rc_times','Pick times (approximate)',`<p class="small mut rcnote" id="rctimesnote">Approximate. Times come from when each pick was saved, so pauses, undo and a closed page make some picks look slow. The median (middle value) is used so one slow pick does not skew it.</p><div class="tstats"><div class="card tstat"><b>${esc(fmtDur(median(times.map(x=>x.dt))))}</b><small>league median per pick</small></div><div class="card tstat"><b>${esc(fmtDur(longest.dt))}</b><small>longest pick: #${longest.p.n}, ${esc(nameOf(longest.p.owner))}</small></div>${spanMs>0?`<div class="card tstat"><b>${esc(fmtLong(spanMs))}</b><small>draft length, start to finish</small></div>`:''}</div><div class="orows" id="trows">${brows.map(b=>`<div class="orow trw${esc(b.mgr.mid===myMid?' mine':'')}" data-mid="${esc(b.mgr.mid)}"><div class="on"><b>${esc(b.mgr.name)}</b><small>${esc(b.mgr.team)}</small></div><div class="os"><span>${b.med==null?'median n/a':'median <b>'+esc(fmtDur(b.med))+'</b>'}</span><span><b>${b.auto}</b> auto-pick${b.auto===1?'':'s'}</span></div></div>`).join('')}</div>`)}
 /* ---- 9 awards ---- */
 const mkAwards=()=>{const aw=[];
 {const st0=Object.values(rt).filter(x=>x.place);const top=st0.filter(x=>x.place===1);
  if(top.length&&(top[0].strength==null||top[0].strength>0)){aw.push(['Chalk Boss','Rank 1 in the power rankings above (strongest roster)',esc(top.map(x=>nameOf(x.mid)).join(' and '))+(top[0].strength==null?'':' · strength '+top[0].strength)])}
  const lo=outl.filter(o=>o.long).sort((a,b)=>b.long.s-a.long.s)[0];if(lo&&lo.long.s>=5)aw.push(['Cinderella Hunter','Took the longest projected shot',esc(lo.mgr.name)+' · '+chip(lo.long.tid,{sm:1})+' <span class="small mut">seed '+lo.long.s+'</span>']);
  if(usable){const t=brows.filter(b=>b.dt.length>=3&&b.med!=null).sort((a,b)=>a.med-b.med);if(t.length>=2){aw.push(['Fastest Finger','Lowest median pick time (approximate)',esc(t[0].mgr.name)+' · '+esc(fmtDur(t[0].med))]);aw.push(['Last-Second Larry','Highest median pick time (approximate)',esc(t[t.length-1].mgr.name)+' · '+esc(fmtDur(t[t.length-1].med))])}}
  const sx=steals[0];if(sx)aw.push(['Steal of the Draft','Best value against power rank',esc(nameOf(sx.p.owner))+' · '+chip(sx.p.tid,{sm:1})+' <span class="small mut">pick #'+sx.p.n+', rank '+sx.rank+'</span>'])}
 return sec('rc_awards','Draft-day awards',aw.length?`<div class="awgrid" id="awgrid">${aw.map(a=>`<div class="card aw"><div class="awt">${esc(a[0])}</div><div class="small mut">${esc(a[1])}</div><div class="awv">${a[2]}</div></div>`).join('')}</div><div class="tiny mut">Just for fun, from the numbers above.</div>`:'<p class="small mut rcnote">Awards appear once there are enough picks.</p>');};
 const s9=mkAwards();
 /* ---- 10 big League site button ---- */
 /* s23 (item 9): League grades (all 8 rosters ranked; filled in with the grades below) and the bottom buttons: See my team + League site, Share my grade, Invite friends to watch, More (exports + watch link) */
 const sG=`<section class="rsec" id="rc_grades" aria-labelledby="rc_grades_h" hidden><h2 id="rc_grades_h">League grades</h2><p class="small mut rcnote">All ${MG.length} teams, best first. Tap a team for its summary, picks and deeper analysis.</p><ol class="grlist" id="grlist"></ol></section>`;
 const watchUrl=U.pageUrl('room.html',{l:id,watch:1});
 const s10=`<section class="rsec rcbig" id="rc_site" aria-label="What's next"><h2>What’s next</h2>${done?`<div class="rcnext"><a class="btn pri block endbig" id="rcmyteam" href="${esc(U.pageUrl('room.html',{l:id,tab:'my'}))}">${myMid?'See my team':'See the teams'}</a><a class="btn block endbig" id="rcsite" href="${esc(U.pageUrl('league.html',{l:id}))}">League site</a></div>`:`<button class="btn block endbig" id="rcsite" disabled aria-disabled="true">League site · after the draft</button>`}<p class="rcline" id="rcsiteline">Games start early November 2026 · Redraft ${esc(F.REDRAFT.asOfLabel)} (drop up to ${F.REDRAFT.maxDrops} teams)</p>
  <div class="row rcshare"><button class="btn grow" data-a="sharegrade" id="rcsharegrade" hidden>Share my grade</button><button class="btn grow" data-a="invitewatch" id="rcinvite">Invite friends to watch</button></div>
  <details class="rcmore" id="rcmore"><summary>More</summary><div class="exportrow" id="exportrow"><span class="mut">Save a copy:</span><button class="lnkbtn" data-a="csv" id="csvbtn">Export CSV</button><button class="lnkbtn" data-a="json" id="jsonbtn">Export JSON</button></div><div class="small" style="margin-top:6px">Watch link (read-only): <a id="rcwatch" href="${esc(watchUrl)}">${esc(watchUrl)}</a></div><div class="row" style="margin-top:6px"><button class="btn sm" data-a="share" id="rcshare">Share this recap</button>${done?`<a class="btn sm" id="rc_room" href="${esc(U.roomHref(id))}">Draft room</a>`:''}</div></details></section>`;
 /* ---- 11 footer ---- */
 const s11=`<footer class="rsec rcfoot" id="rc_foot"><h2 style="font-size:16px">How grades work</h2><p class="small mut" id="rcgradehow">Each roster is graded A+ to D by where it ranks among the 8. The rank comes from a strength score: every school gets a score from its preseason power rank (rank 1 is best, an unranked school counts 0) averaged with its projected tournament seed (seed 1 is best, no seed counts 0), and a roster’s strength is the average score of all its schools, out of 100. Conference and last record only appear in the written analysis, not in the grade. The same strength and rank are used in the Power rankings, Rosters side by side and the awards. It is a rough preseason guide, not a prediction. Pick times are approximate, projected seeds are estimates, and no grade is shown unless this league’s rosters have been analysed.</p></footer>`;
 app.innerHTML=(done?s1hero+s2+sG:s1)+s3+(done?s4:'')+s5+(done?s6+s7+s8+s9:'')+s10+s11+U.buildTag();U.bind(ACT);
 /* s23: no sticky League site bar on the recap; the big buttons are at the bottom (What's next) */
 ONROWS=mt=>{
   /* the example league's hand-written file text has its own ranking: make rosters + awards follow the Power section's order */
   const nr={};let diff=false;mt.forEach(r=>{const mid=r._m&&r._m.mid;if(!mid)return;const old=rt[mid]||{};const tids=(rosters.find(x=>x.mgr.mid===mid)||{picks:[]}).picks.map(p=>META[p.tid]||{});const stg=r.generated?r.strength:null;/* hand-written file text has its own ranking: show the rank only, never a strength number that could disagree with it */nr[mid]={mid,strength:stg,place:r.rank};if(old.place!==r.rank)diff=true});
   if(diff||!Object.keys(rt).length){rt=nr;const g=document.getElementById('rosgrid');if(g)g.outerHTML=UI.rosters(st,MG,RT());const a=document.getElementById('rc_awards');if(a)a.outerHTML=mkAwards()}};
 const ord=k=>{const v=k%100;return k+((v>=11&&v<=13)?'th':(['th','st','nd','rd'][k%10]||'th'))};
 ONGRADES=(mt,mine,gcls)=>{
  const picksOf=mid=>(rosters.find(x=>x.mgr.mid===mid)||{picks:[]}).picks;
  const best=mid=>{const ps=picksOf(mid).filter(p=>p.tid);if(!ps.length)return null;return ps.slice().sort((a,b)=>((+(META[a.tid]||{}).p||999)-(+(META[b.tid]||{}).p||999))||a.n-b.n)[0].tid};
  const list=document.getElementById('grlist'),secG=document.getElementById('rc_grades');
  if(list&&secG){const rows=mt.slice().sort((a,b)=>a.rank-b.rank);
   list.innerHTML=rows.map((r,i)=>{const mid=r._m.mid,b=best(mid),own=mid===myMid,did='grd'+i;const paras=FBNPower.sentences?FBNPower.sentences(r.recap):[String(r.recap||'')];
    GRD[did]=`<p class="rcsum">${esc(r.short)}</p><div class="grpicks">${picksOf(mid).filter(p=>p.tid).map(p=>chip(p.tid,{sm:1})).join('')}</div><h3 class="small">Deeper analysis</h3>${paras.map(t=>`<p class="small">${esc(t)}</p>`).join('')}`;
    return `<li class="grli${esc(own?' mine':'')}" data-mid="${esc(mid)}"><button type="button" class="grrow" data-a="grrow" aria-expanded="false" aria-controls="${esc(did)}"><span class="grk">#${esc(r.rank)}</span><span class="rcgrade sm ${esc(gcls(r.grade))}">${esc(r.grade)}</span><span class="grt"><b>${esc(disp(r._m.team))}${own?' <span class="tag pri">You</span>':''}</b><small>${esc(disp(r._m.name))}</small></span><span class="grb">${b?'<small class="mut">Best school</small>'+esc(sn(b)):''}</span><span class="grc" aria-hidden="true">▾</span></button>
     <div class="grdet" id="${esc(did)}" hidden></div></li>`}).join('');
   secG.hidden=false}
  if(!mine)return;
  const my=diffs.filter(x=>x.p.owner===myMid);const bp=my.filter(x=>x.diff>0).sort((a,b)=>b.diff-a.diff)[0],bo=my.filter(x=>x.diff<0).sort((a,b)=>a.diff-b.diff)[0];
  const sum=document.getElementById('rcsummary');
  if(sum)sum.insertAdjacentHTML('beforebegin',`<div class="rcrank" id="rcrank"><b>${esc(ord(+mine.rank))}</b> of ${MG.length} in power rankings</div>`);
  const deepb=document.getElementById('rcdeepbtn');
  if(deepb)deepb.insertAdjacentHTML('beforebegin',`<div class="rcchips" id="rcchips">${bp?`<span class="cc2" id="rcbest"><b>Best pick</b> ${esc(sn(bp.p.tid))} <span class="mut">#${bp.p.n}, rank ${bp.rank}</span></span>`:''}${bo?`<span class="cc2" id="rcbold"><b>Boldest</b> ${esc(sn(bo.p.tid))} <span class="mut">#${bo.p.n}, rank ${bo.rank}</span></span>`:''}</div>`);
  const host=document.getElementById('rcmine');if(host)host.insertAdjacentHTML('beforeend',`<div class="row rcjump"><a class="btn grow" id="rcgradesjump" href="#rc_grades">See all league grades</a><a class="btn grow" id="rcfulljump" href="#rc_order">See full draft recap</a></div>`);
  GRADE={grade:mine.grade,team:disp(mine._m.team),name:disp(mine._m.name),rank:ord(+mine.rank)+' of '+MG.length,league:m.name,best:bp?sn(bp.p.tid):''};
  const sg=document.getElementById('rcsharegrade');if(sg)sg.hidden=false};
 if(done)wirePower(d,st,MG,myMid);
}).catch(e=>{app.innerHTML='<div class="card bad">Could not load the league: '+esc(e.message||e)+'</div>'});
/* section 2: the viewer's grade card from data/power-rankings.json through the League Site module (FBNPower.match / mount). Anything that does not match this league's managers and rosters leaves the empty state. */
function wirePower(d,st,MG,myMid){const host=document.getElementById('powerrecap');if(!host||!window.FBNPower||!(FBNPower.resolve||FBNPower.match))return;
  const o={done:true,managers:MG,state:st,teams:T.TEAMS};
  /* FBNPower.resolve: the hand-written text only on an exact match with data/power-rankings.json, otherwise text generated from this league's own 8 rosters (js/power-gen.js), otherwise null = the empty state stays */
  fetch('data/power-rankings.json?b='+encodeURIComponent(window.FBN_BUILD||''),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null).then(rows=>FBNPower.resolve?FBNPower.resolve(o,rows):Promise.resolve(FBNPower.match(rows,o))).then(mt=>{
    if(!mt||!mt.length)return;try{if(ONROWS)ONROWS(mt)}catch(e){}
    /* a school-less roster has no average rank: show a dash, never a blank (power-render.js, League's file, prints the raw value) */
    try{const fix=()=>host.querySelectorAll('#powerrank .pmeta b').forEach(b=>{if(!b.textContent.trim()||/^(null|undefined|NaN)$/.test(b.textContent.trim()))b.textContent='–'});fix();new MutationObserver(fix).observe(host,{childList:true,subtree:true})}catch(e){}
    const mine=myMid&&mt.find(r=>r._m.mid===myMid);
    if(!mine){const e=document.getElementById('rcempty');if(e)e.remove();FBNPower.mount(host,o);try{if(ONGRADES)ONGRADES(mt,null,GC)}catch(e){}return}
    const gcls={'A+':'g-Ap','A':'g-A','A-':'g-A','B+':'g-B','B':'g-B','B-':'g-B','C+':'g-C','C':'g-C','C-':'g-C','D+':'g-D','D':'g-D','D-':'g-D','F':'g-D'}[mine.grade]||'g-C';
    const ps=FBNPower.sentences?(()=>{const s=FBNPower.sentences(mine.recap),a=[];for(let i=0;i<s.length;i+=4)a.push(s.slice(i,i+4).join(' '));return a})():[String(mine.recap||'')];
    host.innerHTML=`<div class="card rcmine" id="rcmine"><div class="rcgrow"><span class="rcgrade ${esc(gcls)}" id="rcgrade" aria-label="Your grade ${esc(mine.grade)}">${esc(mine.grade)}</span><div class="grow"><b>${esc(disp(mine._m.team))}</b><div class="small mut">${esc(disp(mine._m.name))} · #${esc(mine.rank)} of ${MG.length} in this league · average power rank ${esc(mine.avgPowerRank==null||mine.avgPowerRank===''?'–':mine.avgPowerRank)}</div></div></div><p class="rcsum" id="rcsummary">${esc(mine.short)}</p><button type="button" class="btn deepbtn" id="rcdeepbtn" data-a="deep" aria-expanded="false" aria-controls="rcdeep"><span>Deeper analysis</span></button><div id="rcdeep" class="rcdeep" hidden>${ps.map(p=>`<p>${esc(p)}</p>`).join('')}</div>${mine.generated?'<div class="tiny mut" id="rcgen" style="margin-top:8px">Analysis built from this league’s rosters.</div>':''}</div>`;try{if(ONGRADES)ONGRADES(mt,mine,GC)}catch(e){}
  }).catch(()=>{})}
U.registerSW();
})();
