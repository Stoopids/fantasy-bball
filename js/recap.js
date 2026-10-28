/* Draft recap page. Sections, top to bottom: 1 congratulations + Redraft countdown, 2 "Take a look at your draft recap!" (grade, 4-sentence summary, Deeper analysis; only from a real
   analysis file, never made up), 3 full draft order by round, 4 how the order was set, 5 rosters side by side + top 3 steals / reaches, 6 tournament outlook, 7 conference breakdown,
   8 pick times (approximate), 9 draft-day awards, 10 the one big League site button, 11 footer (how grades work, share link, small CSV / JSON export). Every school goes through U.teamChip / U.teamLink. */
(function(){const F=FBN,U=UI,esc=U.esc;const id=F.parseCode(U.qs().get('l')||'')||'';const T=U.loadTeams();
document.getElementById('top').innerHTML=U.header({sub:'Draft recap'});const app=document.getElementById('app');
if(!id){app.innerHTML='<div class="card"><h2>No league</h2><a href="index.html">Home</a></div>';return}
app.innerHTML='<div class="card mut" id="loading">Loading the final rosters…</div>';
const recapUrl=()=>U.pageUrl('recap.html',{l:id});
const ACT={csv:()=>dl('csv'),json:()=>dl('json'),
  share:()=>{const m=D&&D.meta?D.meta.name:'';U.share({title:(m||'League')+' draft recap',text:'Take a look at our draft recap!',url:recapUrl()})},
  deep:el=>{const p=document.getElementById(el.getAttribute('aria-controls'));if(!p)return;const open=p.hidden;p.hidden=!open;el.setAttribute('aria-expanded',open?'true':'false');el.querySelector('span').textContent=open?'Hide deeper analysis':'Deeper analysis'}};
let D=null;
function dl(k){const nm=(D.meta.name.replace(/[^a-z0-9]+/gi,'-')||'league')+'-draft.';if(k==='csv')U.download(nm+'csv',F.toCSV(D.state,D.managers,T.TEAMS,T.META),'text/csv');else U.download(nm+'json',JSON.stringify(F.toJSONExport(D.state,D.managers,T.TEAMS,T.META,D.meta),null,2),'application/json')}
const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmtDate=ts=>{const d=new Date(+ts);return isFinite(d)?MON[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear():''};
const fmtDur=ms=>{const s=Math.round(ms/1000);return s<60?s+' sec':Math.floor(s/60)+' min '+String(s%60).padStart(2,'0')+' sec'};
const fmtLong=ms=>{const m=Math.round(ms/60000);return m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0')+' min'};
const median=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),k=s.length>>1;return s.length%2?s[k]:(s[k-1]+s[k])/2};
let TSTL=false;/* League's rule: strip a leading "Test " only when the LEAGUE NAME starts with the whole word "Test" (the example league); a real league shows every name as written */
const disp=n=>{n=String(n==null?'':n);if(!TSTL)return n;const t=n.replace(/^Test\s+(?=\S)/,'');return(!t.trim()||/^test$/i.test(t.trim()))?n:t};
const sec=(idv,h,body,cls)=>`<section class="rsec${cls?' '+cls:''}" id="${esc(idv)}" aria-labelledby="${esc(idv)}_h"><h2 id="${esc(idv)}_h">${esc(h)}</h2>${body}</section>`;
FBNLeague.load(id,{pool:T.POOL}).then(d=>{D=d;if(!d.meta){app.innerHTML='<div class="card" id="nf"><h2>League not found</h2><a href="index.html">Home</a></div>';return}
 const st=d.state,m=d.meta;TSTL=/^test(?![A-Za-z0-9])/i.test(String(m.name==null?'':m.name).trim());
 if(m.status==='lobby'){app.innerHTML=`<div class="card"><h2>${esc(m.name)}</h2><p class="mut">The draft has not started yet.</p><a class="btn" href="${esc(U.pageUrl('room.html',{l:id}))}">Go to the lobby</a></div>`+U.buildTag();
 U.bind(ACT);return}
 const done=st.status==='complete',redr=F.redraftLive(m);
 const real=st.real||st.picks;const MG=d.managers;const mgOf=mid=>MG.find(y=>y.mid===mid)||{mid,name:'Manager',team:''};const nameOf=mid=>mgOf(mid).name;
 const me=U.getMe(id),myMid=me&&me.mid&&MG.some(x=>x.mid===me.mid)?me.mid:'';
 const chip=(tid,o)=>U.teamChip(T.TEAMS,tid,o);
 const META=T.META,rosters=F.rosters(st,MG);const rt=F.rosterRatings(rosters.map(r=>({mid:r.mgr.mid,picks:r.picks})),META);
 const sn=tid=>(T.TEAMS[tid]&&(T.TEAMS[tid].short||T.TEAMS[tid].name))||tid;
 /* ---- 1 congratulations ---- */
 const cd=F.redraftCountdown(Date.now(),U.tz());
 const msg=!done?'The draft is under way.':st.endedEarly?'The draft ended early. See you again '+F.REDRAFT.asOfLabel+' for the Redraft!':redr?'Congratulations! The Redraft is complete. Good luck this season!':'Congratulations! The draft is complete. See you again '+F.REDRAFT.asOfLabel+' for the Redraft!';
 const s1=`<section class="card rsec" id="recaphead" aria-labelledby="rc1_h"><div class="small mut">${done?(st.endedEarly?'ENDED EARLY':'FINAL'):'DRAFT IN PROGRESS'}</div><h2 id="rc1_h" style="margin:2px 0 6px">${esc(msg)}</h2>`
  +(done&&!redr&&cd.state!=='past'?`<div class="rccount" id="rccount"><b>${esc(cd.text)}</b> until the Redraft on ${esc(F.REDRAFT.asOfLabel)}</div>`:'')
  +`<div class="small mut">${esc(m.name)} · ${real.length} of ${st.realTotal==null?st.total:st.realTotal} picks · ${m.settings.type==='snake'?'Snake':'Linear'} · ${redr?'Redraft: '+m.settings.rounds+' round'+(m.settings.rounds===1?'':'s')+' (rosters include kept teams)':m.settings.rounds+' teams each'}</div><div class="row" style="margin-top:6px"><a class="btn sm" id="rc_room" href="${esc(U.roomHref(id))}">Draft room</a></div></section>`;
 /* ---- 2 grades (filled in by the analysis file when it matches this league) ---- */
 const s2=sec('powerrecap_s','Take a look at your draft recap!',`<div id="powerrecap"><div class="card rcempty" id="rcempty"><b>Your draft recap will appear here.</b><div class="small mut" style="margin-top:4px">${done?'A grade, a short summary and a deeper analysis are added once this league’s drafts have been analysed. Nothing is made up.':'It appears after the draft is complete.'}</div></div></div>`);
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
 const s5=sec('rc_rosters','Rosters side by side',UI.rosters(st,MG,T)+`<div class="card" id="hlcard"><div class="hlcols">${hl('steals','Top 3 steals',steals,'after its rank','none yet (needs picks of ranked teams)')}${hl('reaches','Top 3 reaches',reaches,'before its rank','none: nobody took a team before its rank')}</div><div class="tiny mut" style="margin-top:8px"><b>Strength</b> is the average of 100 minus each team’s power rank (an unranked team scores 0). Higher is better. A steal is a team taken after its rank; a reach is one taken before it.</div></div>`);
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
 const aw=[];
 {const st0=Object.values(rt).filter(x=>x.strength!=null);const mx=st0.length?Math.max.apply(null,st0.map(x=>x.strength)):null;
  if(mx!=null&&mx>0){const w=st0.filter(x=>x.strength===mx).map(x=>nameOf(x.mid));aw.push(['Chalk Boss','Strongest roster by preseason power rank',esc(w.join(' and '))+' · strength '+mx])}
  const lo=outl.filter(o=>o.long).sort((a,b)=>b.long.s-a.long.s)[0];if(lo&&lo.long.s>=5)aw.push(['Cinderella Hunter','Took the longest projected shot',esc(lo.mgr.name)+' · '+chip(lo.long.tid,{sm:1})+' <span class="small mut">seed '+lo.long.s+'</span>']);
  if(usable){const t=brows.filter(b=>b.dt.length>=3&&b.med!=null).sort((a,b)=>a.med-b.med);if(t.length>=2){aw.push(['Fastest Finger','Lowest median pick time (approximate)',esc(t[0].mgr.name)+' · '+esc(fmtDur(t[0].med))]);aw.push(['Last-Second Larry','Highest median pick time (approximate)',esc(t[t.length-1].mgr.name)+' · '+esc(fmtDur(t[t.length-1].med))])}}
  const sx=steals[0];if(sx)aw.push(['Steal of the Draft','Best value against power rank',esc(nameOf(sx.p.owner))+' · '+chip(sx.p.tid,{sm:1})+' <span class="small mut">pick #'+sx.p.n+', rank '+sx.rank+'</span>'])}
 const s9=sec('rc_awards','Draft-day awards',aw.length?`<div class="awgrid" id="awgrid">${aw.map(a=>`<div class="card aw"><div class="awt">${esc(a[0])}</div><div class="small mut">${esc(a[1])}</div><div class="awv">${a[2]}</div></div>`).join('')}</div><div class="tiny mut">Just for fun, from the numbers above.</div>`:'<p class="small mut rcnote">Awards appear once there are enough picks.</p>');
 /* ---- 10 big League site button ---- */
 const s10=`<section class="rsec rcbig" id="rc_site" aria-label="League site">${done?`<a class="btn pri block endbig" id="rcsite" href="${esc(U.pageUrl('league.html',{l:id}))}">League site</a>`:`<button class="btn block endbig" id="rcsite" disabled aria-disabled="true">League site · after the draft</button>`}<p class="rcline" id="rcsiteline">Here is the League site with stats, overall points, and historical data!</p></section>`;
 /* ---- 11 footer ---- */
 const s11=`<footer class="rsec rcfoot" id="rc_foot"><h2 style="font-size:16px">How grades work</h2><p class="small mut" id="rcgradehow">Each roster is graded A+ to D from the strength of its schools: their preseason power rank, conference and projected seed. The strength number is the average of 100 minus each school’s power rank (unranked = 0). It is a rough preseason guide, not a prediction. Pick times are approximate, projected seeds are estimates, and no grade is shown unless this league’s rosters have been analysed.</p><div class="row"><button class="btn sm" data-a="share" id="rcshare">Share this recap</button></div><div class="exportrow" id="exportrow"><span class="mut">Save a copy:</span><button class="lnkbtn" data-a="csv" id="csvbtn">Export CSV</button><button class="lnkbtn" data-a="json" id="jsonbtn">Export JSON</button></div></footer>`;
 app.innerHTML=s1+(done?s2:'')+s3+(done?s4:'')+s5+(done?s6+s7+s8+s9:'')+s10+s11+U.buildTag();U.bind(ACT);
 if(done){let st2=document.getElementById('stickysite');if(!st2){st2=document.createElement('a');st2.id='stickysite';st2.className='stickysite rc btn pri';st2.textContent='League site';document.body.appendChild(st2)}st2.href=U.pageUrl('league.html',{l:id});document.body.classList.add('hasstick','recapp');
  /* the sticky copy only shows while the big League site button is off screen (never two big buttons at once) */
  try{const big=document.getElementById('rcsite');if(big&&'IntersectionObserver' in window){new IntersectionObserver(es=>{st2.hidden=es[es.length-1].isIntersecting}).observe(big)}}catch(e){}}
 if(done)wirePower(d,st,MG,myMid);
}).catch(e=>{app.innerHTML='<div class="card bad">Could not load the league: '+esc(e.message||e)+'</div>'});
/* section 2: the viewer's grade card from data/power-rankings.json through the League Site module (FBNPower.match / mount). Anything that does not match this league's managers and rosters leaves the empty state. */
function wirePower(d,st,MG,myMid){const host=document.getElementById('powerrecap');if(!host||!window.FBNPower||!(FBNPower.resolve||FBNPower.match))return;
  const o={done:true,managers:MG,state:st,teams:T.TEAMS};
  /* FBNPower.resolve: the hand-written text only on an exact match with data/power-rankings.json, otherwise text generated from this league's own 8 rosters (js/power-gen.js), otherwise null = the empty state stays */
  fetch('data/power-rankings.json?b='+encodeURIComponent(window.FBN_BUILD||''),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null).then(rows=>FBNPower.resolve?FBNPower.resolve(o,rows):Promise.resolve(FBNPower.match(rows,o))).then(mt=>{
    if(!mt||!mt.length)return;const mine=myMid&&mt.find(r=>r._m.mid===myMid);
    if(!mine){const e=document.getElementById('rcempty');if(e)e.remove();FBNPower.mount(host,o);return}
    const gcls={'A+':'g-Ap','A':'g-A','A-':'g-A','B+':'g-B','B':'g-B','B-':'g-B','C+':'g-C','C':'g-C','C-':'g-C','D+':'g-D','D':'g-D','D-':'g-D','F':'g-D'}[mine.grade]||'g-C';
    const ps=FBNPower.sentences?(()=>{const s=FBNPower.sentences(mine.recap),a=[];for(let i=0;i<s.length;i+=4)a.push(s.slice(i,i+4).join(' '));return a})():[String(mine.recap||'')];
    host.innerHTML=`<div class="card rcmine" id="rcmine"><div class="rcgrow"><span class="rcgrade ${esc(gcls)}" id="rcgrade" aria-label="Your grade ${esc(mine.grade)}">${esc(mine.grade)}</span><div class="grow"><b>${esc(disp(mine._m.team))}</b><div class="small mut">${esc(disp(mine._m.name))} · #${esc(mine.rank)} of ${MG.length} in this league · average power rank ${esc(mine.avgPowerRank)}</div></div></div><p class="rcsum" id="rcsummary">${esc(mine.short)}</p><button type="button" class="btn deepbtn" id="rcdeepbtn" data-a="deep" aria-expanded="false" aria-controls="rcdeep"><span>Deeper analysis</span></button><div id="rcdeep" class="rcdeep" hidden>${ps.map(p=>`<p>${esc(p)}</p>`).join('')}</div>${mine.generated?'<div class="tiny mut" id="rcgen" style="margin-top:8px">Analysis built from this league’s rosters.</div>':''}</div>`;
  }).catch(()=>{})}
U.registerSW();
})();
