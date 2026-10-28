(function(){const F=FBN,U=UI,esc=U.esc;const id=F.parseCode(U.qs().get('l')||'')||'';const T=U.loadTeams();
document.getElementById('top').innerHTML=U.header({sub:'Draft recap'});const app=document.getElementById('app');
if(!id){app.innerHTML='<div class="card"><h2>No league</h2><a href="index.html">Home</a></div>';return}
app.innerHTML='<div class="card mut" id="loading">Loading the final rosters…</div>';
const ACT={csv:()=>dl('csv'),json:()=>dl('json')};let D=null;
function dl(k){const nm=(D.meta.name.replace(/[^a-z0-9]+/gi,'-')||'league')+'-draft.';if(k==='csv')U.download(nm+'csv',F.toCSV(D.state,D.managers,T.TEAMS,T.META),'text/csv');else U.download(nm+'json',JSON.stringify(F.toJSONExport(D.state,D.managers,T.TEAMS,T.META,D.meta),null,2),'application/json')}
FBNLeague.load(id,{pool:T.POOL}).then(d=>{D=d;if(!d.meta){app.innerHTML='<div class="card" id="nf"><h2>League not found</h2><a href="index.html">Home</a></div>';return}
 const st=d.state,m=d.meta;
 if(m.status==='lobby'){app.innerHTML=`<div class="card"><h2>${esc(m.name)}</h2><p class="mut">The draft has not started yet.</p><a class="btn" href="${esc(U.pageUrl('room.html',{l:id}))}">Go to the lobby</a></div>`+U.buildTag();U.bind(ACT);return}
 const done=st.status==='complete';
 app.innerHTML=`<div class="card" id="recaphead"><div class="small mut">${done?(st.endedEarly?'ENDED EARLY':'FINAL'):'DRAFT IN PROGRESS'}</div><h2 style="margin:2px 0">${esc(m.name)}</h2><div class="small mut">${st.picks.length} of ${st.total} picks · ${m.settings.type==='snake'?'Snake':'Linear'} · ${m.settings.rounds} teams each</div><div class="row" style="margin-top:10px"><button class="btn pri" data-a="csv" id="csvbtn">Export CSV</button><button class="btn" data-a="json" id="jsonbtn">Export JSON</button><a class="btn" href="${esc(U.pageUrl('room.html',{l:id,watch:1}))}">Draft room</a><a class="btn" href="${esc(U.pageUrl('league.html',{l:id}))}" id="leaguehome">League standings</a></div></div>`+UI.rosters(st,d.managers,T)+U.buildTag();U.bind(ACT);
}).catch(e=>{app.innerHTML='<div class="card bad">Could not load the league: '+esc(e.message||e)+'</div>'});U.registerSW();
})();
