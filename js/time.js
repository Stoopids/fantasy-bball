(function(){const F=FBN,U=UI,esc=U.esc;const q=U.qs();const t=Math.floor(+q.get('t')),n=(q.get('n')||'the draft').slice(0,60);const tz=U.tz();
document.getElementById('top').innerHTML=U.header({sub:'Draft time'});const app=document.getElementById('app');
const raw=q.get('t');const okT=t>0&&isFinite(t)&&!isNaN(new Date(t).getTime())&&t>=Date.UTC(2020,0,1)&&t<=Date.UTC(2100,0,1);
if(!okT){app.innerHTML='<div class="card" id="badtime"><h2>'+(raw?'This link is not valid':'No draft time set')+'</h2><p class="mut small">'+(raw?'The draft time in this link cannot be read.':'This link has no time.')+' Ask the commissioner for the invite link.</p></div>'+U.buildTag();U.bind({});return}
const l=F.startsLine(t,tz);
app.innerHTML=`<div class="card" id="timecard"><div class="small mut">${esc(n)}</div><h2 id="when" style="color:var(--acc);margin:4px 0">${esc(l.you)}</h2><div class="small mut" id="utc">${esc(F.fmtUtc(t))}</div><div class="small mut">Shown in your time zone: ${esc(F.tzCity(tz))}</div><div style="margin-top:12px;font-weight:800;font-size:20px" id="cd"></div></div>`+U.buildTag();
const tick=()=>{const d=t-Date.now();document.getElementById('cd').textContent=d>0?'In '+F.countdownText(d):'The draft time has arrived'};tick();setInterval(tick,1000);U.bind({});U.registerSW();
})();
