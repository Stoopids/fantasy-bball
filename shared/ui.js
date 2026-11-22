/* shared/ui.js v1.23.0: ONE table of input limits and shared wording, loaded by BOTH sites.
   Edit here only, copy to the other repo by hand, and run scripts/check_shared.sh.
   Each site keeps its old values as fallbacks, so the pages still work if this file fails to load. */
(function(g){var LIMITS={team:15,stoopName:12,leagueName:24,chat:200,betText:140,paste:300,payouts:120,stake:20,item:40,odds:9};
var STRINGS={maxLen:'Keep it to {n} characters or fewer.',nameTooLong:'Keep the name to {n} characters or fewer.',teamTooLong:'Keep the team name to {n} characters or fewer.',checkedNow:'checked just now',online:'Who\u2019s online'};
function t(k,n){var s=STRINGS[k];return s==null?'':String(s).replace('{n}',n)}
function showLine(s){s=String(s==null?'':s).replace(/\b(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun|Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat)\b\.?,?\s*/gi,'');
  s=s.replace(/\s*\(([^)]+)\)/g,function(all,inner,offset,whole){var m=/^(.*?)\s+vs\.?\s+(.*?)(?:,\s*([A-Za-z]{3}\s+\d{1,2}))?\s*$/i.exec(String(inner).trim());if(!m)return all;var before=whole.slice(0,offset).toLowerCase(),L=m[1].trim().toLowerCase(),R=m[2].trim().toLowerCase();if(!L||!R||before.indexOf(L)<0||before.indexOf(R)<0)return all;if(m[3]&&before.indexOf(m[3].toLowerCase())<0)return ', '+m[3];return ''});
  return s.replace(/\s+,/g,',').replace(/,\s*,/g,',').replace(/\s{2,}/g,' ').trim()}
g.SHARED_UI={version:'1.22.0',LIMITS:LIMITS,STRINGS:STRINGS,t:t,showLine:showLine};})(typeof window!=='undefined'?window:globalThis);

/* ---- shared modules (step 4). Source of truth: stoopids/stoopids shared/; copy to fantasy-bball and run scripts/check_shared.sh ---- */
/* sortCmp(a,b,kind,dir): kind 's' = text A-Z (case-insensitive), 'r' = rank (null/'–' always last), 'n' = number. Used by the All teams table on both sites. */
(function(g){if(!g.SHARED_UI)return;g.SHARED_UI.sortCmp=function(a,b,kind,d){if(kind==='r'){var an=a==null,bn=b==null;if(an||bn)return an-bn;return d*(a-b)}if(kind==='s')return d*String(a||'').localeCompare(String(b||''),undefined,{sensitivity:'base'});return d*((a||0)-(b||0))}})(typeof window!=='undefined'?window:globalThis);
/* Length guard: when typing or pasting hits an input's maxlength, show a short note (wording from STRINGS.maxLen). Browser only. */
/*<MAXLEN-GUARD>*/(function(){if(typeof document==="undefined"||typeof window==="undefined"||window.__mlg)return;window.__mlg=1;
function note(m){let n=document.getElementById('mlnote');if(!n){n=document.createElement('div');n.id='mlnote';n.setAttribute('role','status');n.style.cssText='position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:#111827;color:#fff;border:1px solid #FFD400;padding:8px 14px;border-radius:999px;z-index:99999;font-size:13px;font-weight:700;pointer-events:none;max-width:90vw;text-align:center';document.body.appendChild(n)}n.textContent=(window.SHARED_UI?SHARED_UI.t('maxLen',m):'Keep it to '+m+' characters or fewer.');n.hidden=false;clearTimeout(n._t);n._t=setTimeout(()=>{n.hidden=true},3000)}
const ok=el=>el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA')&&el.maxLength>0&&el.type!=='password';
document.addEventListener('input',e=>{const el=e.target;if(!ok(el))return;const m=el.maxLength,t=el.value.trim();if(t.length>m){el.value=t.slice(0,m);note(m)}},true);
document.addEventListener('paste',e=>{const el=e.target;if(!ok(el))return;let d='';try{d=e.clipboardData.getData('text')||''}catch(_){}const s=el.selectionStart||0,f=el.selectionEnd||0;if((el.value.slice(0,s)+d+el.value.slice(f)).trim().length>el.maxLength)note(el.maxLength)},true);
document.addEventListener('keydown',e=>{const el=e.target;if(!ok(el)||e.key.length!==1||e.ctrlKey||e.metaKey)return;if(el.value.length>=el.maxLength&&el.selectionStart===el.selectionEnd)note(el.maxLength)},true)})();/*</MAXLEN-GUARD>*/

/* Who's online strip: on = [name HTML], off = [[name HTML, ms since last seen or Infinity]], ago(ms) -> 'x min ago'. Returns the strip's inner HTML (same on both sites). */
(function(g){if(!g.SHARED_UI)return;var U=g.SHARED_UI;
U.onlineStrip=function(on,off,ago){var live=on.length?on.map(function(n){return '<span class="onl-p on" title="Online now"><i class="pd"></i>'+n+'</span>'}).join(''):'<span class="onl-none">nobody</span>';var was=off.map(function(x){return '<span class="onl-p" title="Last seen"><i class="pd off"></i>'+x[0]+' <small>'+(x[1]===Infinity?'not seen yet':ago(x[1]))+'</small></span>'}).join('');return '<span class="onl-g onl-now"><b class="onl-h">Online</b>'+live+'</span>'+(was?'<span class="onl-g onl-was"><b class="onl-h">Last seen</b>'+was+'</span>':'')};
/* Online dot on a Standings card: toggles .isonl and the small dot after the name (no layout shift). */
U.markOnline=function(c,yes){c.classList.toggle('isonl',!!yes);var w=c.querySelector('.who');if(!w)return;var b=w.querySelector('.onlb');if(yes&&!b){b=document.createElement('span');b.className='onlb';b.title='Online now';(w.querySelector('b')||w).appendChild(b)}else if(!yes&&b)b.remove()};
/* 'checked just now' after a manual Refresh: ts = click time (0 = never). */
U.checkedText=function(ts,now){if(!ts)return '';var a=(now||Date.now())-ts;return ' \u00b7 checked '+(a<6e4?'just now':Math.round(a/6e4)+' min ago')};
})(typeof window!=='undefined'?window:globalThis);

/* ESPN helpers + half scores (step 4 part 3). Pure functions: same output on both sites. */
(function(g){if(!g.SHARED_UI)return;var U=g.SHARED_UI;var esc=function(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
function lvStatus(e){
  const n=((((e||{}).status||{}).type)||{}).name||'';
  const m={STATUS_FINAL:'final',STATUS_SCHEDULED:'scheduled',STATUS_POSTPONED:'postponed',STATUS_CANCELED:'canceled',STATUS_SUSPENDED:'postponed',STATUS_DELAYED:'live'};
  if(Object.prototype.hasOwnProperty.call(m,n))return m[n];
  return /PROGRESS|HALF|END_|OVERTIME/.test(n)?'live':'other';
}
function lvParse(e){
  try{
    const c=(e.competitions||[])[0];if(!c)return null;
    const stype=(e.season||{}).type;if(stype===1)return null;
    const note=(((c.notes||[])[0])||{}).headline||'';
    const ncaa=stype===3&&note.indexOf("NCAA Men's Basketball Championship")===0;
    const comps=c.competitors||[];if(comps.length!==2)return null;
    const side=x=>{const t=x.team||{};let sc=x.score;sc=(sc!=null&&/^-?\d+$/.test(String(sc).trim()))?parseInt(sc,10):null;
      const seed=(x.curatedRank||{}).current;
      return {id:t.id?String(t.id):null,score:sc,win:!!x.winner,seed:(ncaa&&seed&&seed<99)?seed:null,ls:(x.linescores||[]).map(l=>l&&(l.displayValue!=null?l.displayValue:l.value))}};
    const home=comps.find(x=>x.homeAway==='home')||comps[0],away=comps.find(x=>x.homeAway==='away')||comps[1];
    const st=e.status||{},ty=st.type||{};
    return {id:String(e.id),status:lvStatus(e),detail:String(ty.shortDetail||ty.detail||''),start:e.date||null,home:side(home),away:side(away)};
  }catch(_){return null}
}
function boxParse(j){const c=((j.header||{}).competitions||[])[0]||{};const L={};(j.leaders||[]).forEach(t=>{const tid=String((t.team||{}).id||'');L[tid]={};(t.leaders||[]).forEach(k=>{const a=(k.leaders||[])[0];if(a)L[tid][k.name]={n:(a.athlete||{}).shortName||(a.athlete||{}).displayName||'',v:a.displayValue||''}})});
  return {teams:(c.competitors||[]).map(t=>({id:String((t.team||{}).id||t.id||''),ab:(t.team||{}).abbreviation||'',ha:t.homeAway,ls:(t.linescores||[]).map(x=>x.displayValue!=null?x.displayValue:x.value),sc:t.score,ld:L[String((t.team||{}).id||t.id||'')]||{}})).sort((a,b)=>a.ha==='away'?-1:1)}}
U.espnStatus=lvStatus;U.espnEvent=lvParse;U.espnBox=boxParse;
/* halfScores(g,s,first,BOX): the 1H/2H/OT + total cells for one team row (HS-INLINE) */
function hsLs(g,s,BOX){var L=g._lv&&g._lv.ls;if(L){var a=s===g.away?L.a:L.h;if(a&&a.length)return a}if(Array.isArray(s.ls)&&s.ls.length)return s.ls;try{var b=BOX&&BOX[String(g.id)];if(b&&b.teams){var t=b.teams.find(function(t){return String(t.id)===String(s.id)});if(t&&t.ls&&t.ls.length)return t.ls}}catch(e){}return null}
U.halfLs=hsLs;U.halfScores=function(g,s,first,BOX){var tot=s.score!=null?esc(String(s.score)):'';var A=hsLs(g,g.away,BOX),H=hsLs(g,g.home,BOX);if(!A&&!H)return tot;var n=Math.max(2,(A||[]).length,(H||[]).length),me=(s===g.away?A:H)||[],lab=function(i){return i<2?(i+1)+'H':(n>3?'OT'+(i-1):'OT')};var h='';for(var i=0;i<n;i++){var v=me[i];h+='<span class="hsq"'+(first?' data-h="'+lab(i)+'"':'')+'>'+'<i>'+(v!=null&&v!==''?esc(String(v)):'&nbsp;')+'</i>'+'</span>'}return '<span class="hsg">'+h+'<span class="hst"'+(first?' data-h="T"':'')+'>'+tot+'</span></span>'};

  /* STEP5-STANDINGS: one owner-card list for the Standings tab (both sites). rows: {mid,rank,emoji,team,person,gold,total,chips,lbAttr} */
  SHARED_UI.standingsList=function(rows,se){var e=se||function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
    var mx=Math.max.apply(null,[10].concat(rows.map(function(r){return r.total})));
    return '<div class="ocl">'+rows.map(function(r){return '<div class="card oc strow"'+(r.mid!=null?' data-mid="'+e(r.mid)+'"':'')+'><div class="lb" '+r.lbAttr+'>'+
      '<div class="rank place">'+e(r.rank)+'</div>'+
      '<div class="who"><b class="nm">'+e(r.emoji)+' '+e(r.team)+'</b><small><span class="mn">'+e(r.person)+'</span>'+(r.wl?'<span class="mrec" title="Combined team record">'+e(r.wl)+'</span>':'')+(r.gold||'')+'</small></div>'+
      '<div class="pts score"><span class="pv">'+r.total+'</span><small>Points</small></div></div>'+
      '<div class="bar"><i style="width:'+(Math.max(0,r.total)/mx*100)+'%"></i></div>'+
      '<div class="chips school-grid">'+r.chips+'</div></div>'}).join('')+'</div>'};

  /* STEP5-GAMES: collapsed FINAL game card (summary button + hidden body), both sites. o: {cls,attr,open,away:{name,score,win},home,upset,btnAttr,bodyCls,bodyAttr,body} */
  SHARED_UI.finalCard=function(o){var e=o.esc||function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
    var sc=function(s){return e(s.name)+' '+(s.score!=null?e(String(s.score)):'')};var op=!!o.open,st=o.status||'FINAL';
    return '<div class="'+o.cls+' gfin'+(op?' open':'')+(o.cls2||'')+'"'+(o.attr||'')+'><button type="button" class="gsum" '+o.btnAttr+' aria-expanded="'+op+'"'+(o.btnAttr2||'')+'><span class="gst">'+e(st)+'</span><span class="'+(o.away.win?'w':'')+'">'+sc(o.away)+'</span><span class="mut">·</span><span class="'+(o.home.win?'w':'')+'">'+sc(o.home)+'</span>'+(o.upset?'<span>😱</span>':'')+'<span class="gch" aria-hidden="true">'+(op?'▾':'▸')+'</span></button><div class="'+(o.bodyCls||'gbody')+'"'+(o.bodyAttr||'')+(op?'':' hidden')+'>'+o.body+'</div></div>'};

  /* STEP9-AUTOSETTLE: suggestion only, never writes. o={e, live:bool, who:'Paul'|'' (''=tied/wash), sc:'score text', btn:'<button…>' (final only), note} */
  SHARED_UI.autoLine=function(o){var e=o.e,w=o.who?e(o.who):(o.live?'Tied':'Wash');
    return '<div class="s29-auto au-'+(o.live?'live':'fin')+'" data-au="'+(o.live?'live':'final')+'"><div class="s25sg">Suggested winner: <b>'+w+'</b>'+(o.sc?' ('+e(o.sc)+')':'')+'</div>'+(o.btn?'<div class="s25sg-act">'+o.btn+'</div>':'')+(o.note?'<div class="note">'+e(o.note)+'</div>':'')+'</div>'};
  SHARED_UI.AUTO_NOTE='After the final we suggest the winner. Nothing is settled until someone taps Confirm.';
  /* REFRESH-NOW: on-demand refresh, both sites. sel = the Refresh button selector (looked up again after re-render); tasks = functions returning promises
     (data reload with cache bypass, ESPN check), run in parallel, each capped at 8 s so it never hangs; then done() re-renders; read-only. */
  SHARED_UI.refreshNow=function(sel,tasks,done){var q=function(){return document.querySelector(sel)},b=q();if(SHARED_UI._rfBusy)return;SHARED_UI._rfBusy=true;
    if(b){b.disabled=true;b.setAttribute('aria-busy','true');b.innerHTML='<i class="lvsp" aria-hidden="true"></i>Refreshing\u2026'}
    var cap=function(t){return Promise.race([Promise.resolve().then(t).catch(function(){}),new Promise(function(r){setTimeout(r,8000)})])};
    return Promise.all((tasks||[]).map(cap)).then(function(){try{done&&done()}catch(e){}}).finally(function(){SHARED_UI._rfBusy=false;var x=q();if(x){x.disabled=false;x.removeAttribute('aria-busy');x.innerHTML='&#8635; Refresh';var u=x.parentNode&&x.parentNode.querySelector('.rf-upd');if(!u){u=document.createElement('span');u.className='rf-upd note';x.insertAdjacentElement('afterend',u)}u.textContent='Updated just now'}})};
  /* STANDINGS-FOOT: one footnote line under Standings: optional COVID note (trusted text) · AP rankings link */
  SHARED_UI.footNote=function(c){return '<p class="fine gfoot">'+(c?c+' \u00b7 ':'')+'# Rankings: <a href="https://www.espn.com/mens-college-basketball/rankings" target="_blank" rel="noopener">AP Top 25 (ESPN)</a></p>'};
  /* TALLY-ONE: one table per person: what they owe each person (rows owe columns), then Bets · Won · Lost · Net on the right. R=[{id,name,lost,won,net,bets}] (all people, real short names), M(row,col)->amount owed. o={e,fmt,rowKey,tblAttr} */
  SHARED_UI.tallyTable=function(R,M,o){var e=o.e,f=o.fmt,z='<span class="tz">\u2013</span>',S=R.slice().sort(function(a,b){return (b.net||0)-(a.net||0)});
    var h='<div class="card sc tt-w"><table class="tt"'+(o.tblAttr||' data-tally="people"')+'><thead><tr><th class="tt-p">Person</th>'+R.map(function(c){return '<th class="n tt-o" title="owes '+e(c.name)+'">'+e(c.name)+'</th>'}).join('')+'<th class="n tt-s1 tt-sum">Bets</th><th class="n tt-sum">Won</th><th class="n tt-sum">Lost</th><th class="n tt-sum">Net</th></tr></thead><tbody>';
    S.forEach(function(r){var n=+r.net||0;h+='<tr '+(o.rowKey||'data-pid')+'="'+e(r.id)+'"><th class="tt-p" scope="row">'+e(r.name)+'</th>'+
      R.map(function(c){if(c.id===r.id)return '<td class="n tt-d">'+z+'</td>';var v=M(r.id,c.id)||0,w=M(c.id,r.id)||0;return '<td class="n'+(v?' bad':'')+'">'+(v?f(v):z)+'</td>'}).join('')+'<td class="n tt-s1 tt-sum">'+(r.bets||z)+'</td><td class="n tt-sum">'+(r.won?f(r.won):z)+'</td><td class="n tt-sum">'+(r.lost?f(r.lost):z)+'</td><td class="n tt-sum"><b class="'+(n>0?'good':n<0?'bad':'')+'">'+(n?(n>0?'+':'-')+f(Math.abs(n)):z)+'</b></td>'+'</tr>'});
    h+='</tbody></table></div><div class="note tt-k">Person columns: what each row owes that person. Bets · Won · Lost · Net on the right.</div>';
    /* If settled today: net balances, then greedy (largest debtor pays largest creditor) = fewest payments */
    var bal=R.map(function(p){var b=0;R.forEach(function(q){if(q.id!==p.id)b+=(M(q.id,p.id)||0)-(M(p.id,q.id)||0)});return {n:p.name,b:Math.round(b*100)/100}}),pay=[];
    for(var k=0;k<50;k++){var d=null,c=null;bal.forEach(function(x){if(x.b<-0.004&&(!d||x.b<d.b))d=x;if(x.b>0.004&&(!c||x.b>c.b))c=x});if(!d||!c)break;var v=Math.round(Math.min(-d.b,c.b)*100)/100;pay.push(e(d.n)+' pays '+e(c.n)+' '+f(v));d.b+=v;c.b-=v}
    return h+(pay.length?'<div class="card tt-s"><b>If settled today</b>'+pay.map(function(x){return '<div class="tset">'+x+'</div>'}).join('')+'</div>':'')};
  /* STEP5-BETS: "Who Owes Who" matrix (rows owe columns), both sites. P: [{id,label,title}], M(rowId,colId)->amount, o: {esc,fmt,h2Attr,tblAttr,rowKey} */
  SHARED_UI.owesMatrix=function(P,M,o){var e=o.esc,t=function(p){return p.title!=null?' title="'+e(p.title)+'"':''};
    return '<h2'+(o.h2Attr||'')+'>Who Owes Who</h2><div class="swipe">↔ Swipe sideways to see every column</div><div class="card sc"><table class="mx"'+(o.tblAttr||' data-tally="owes"')+'><tr><th>owes ↓ / to →</th>'+
      P.map(function(p){return '<th'+t(p)+'>'+e(p.label)+'</th>'}).join('')+'</tr>'+
      P.map(function(r){return '<tr '+o.rowKey+'="'+e(r.id)+'"><td'+t(r)+'><b>'+e(r.label)+'</b></td>'+P.map(function(c){var v=M(r.id,c.id);return r.id===c.id?'<td class="z">·</td>':v?'<td>'+o.fmt(v)+'</td>':'<td class="z">0</td>'}).join('')+'</tr>'}).join('')+'</table></div>'};

  /* STEP5-RECAP: one draft-grade card on Recap, both sites. c: {mid?,grade,team,person,slot,short,deep,has,soon} */
  SHARED_UI.gradeCard=function(c,e){var gr=c.grade?String(c.grade).trim().slice(0,3):'';
    return '<div class="d27c"'+(c.mid!=null?' data-mid="'+e(c.mid)+'"':'')+'><div class="d27h"><span class="d27g'+(gr?'':' tbd')+'">'+(gr?e(gr):'?')+'</span><div><b>'+e(c.team)+'</b><small>'+e(c.person)+' · slot '+c.slot+'</small></div></div>'+
      (c.has?(c.short?'<p>'+e(c.short)+'</p>':'')+(c.deep?'<details><summary>More</summary><p>'+e(c.deep)+'</p></details>':''):'<p class="d27soon">'+c.soon+'</p>')+'</div>'};

  /* STEP5-TEAMS: All-teams sort note start, both sites (the tables themselves differ: STOOPIDS <table>, League div grid). */
  SHARED_UI.sortedBy=function(k){var L={tm:'Team',ow:'Stoop',rec:'Rec',pts:'Pts',cf:'Conf',ap:'AP',net:'NET',sr:'STOOPID',kp:'KenPom'};return k?'Sorted by '+(L[k]||'')+' (tap the header again to flip).':'Sorted by best record. Tap any header to sort by it.'};

  /* STEP5-ARCHIVE: Season archive empty state, both sites (wording still differs per site). */
  SHARED_UI.archiveEmpty=function(attr,title,note){return '<h2>🗂️ Season archive</h2><div '+attr+'><b>'+title+'</b><div class="note">'+note+'</div></div>'};

  /* STEP6-BREAKDOWN: STOOPIDS Breakdown cards (one table per owner), both sites.
     cards: [{attr,hAttr,rank,emoji,team,person,gold,total,rows:[{attr,drop,title,chip,cells:[n],cellAttr:[s],total}]}], cols: [[label,title]] */
  SHARED_UI.pCell=function(v){return v?'<b class="'+(v<0?'bad':'')+'">'+(v>0?v:'\u2212'+(-v))+'</b>':'<span class="mut">\u2014</span>'};
  SHARED_UI.pointsList=function(cards,cols,e,wrapAttr){var pc=SHARED_UI.pCell;
    var hd='<tr><th class="pn" scope="col"><span class="sr">Team</span></th>'+cols.map(function(c){return '<th scope="col" title="'+e(c[1])+'">'+c[0]+'</th>'}).join('')+'<th class="ptot" scope="col" title="Team total">Tot</th></tr>';
    return '<div class="orl q"'+(wrapAttr||'')+'>'+cards.map(function(o){return '<div class="card pcard"'+(o.attr||'')+'><div class="orh"'+(o.hAttr||'')+'><span class="rank">'+o.rank+'</span><div class="who"><b>'+e(o.emoji)+' '+e(o.team)+'</b><small>'+e(o.person)+(o.gold||'')+'</small></div><div class="pts">'+o.total+'<small>Points</small></div></div><div class="ptw"><table class="ptab">'+hd+
      o.rows.map(function(r){return '<tr class="prow'+(r.drop?' drop':'')+'"'+(r.attr||'')+'><td class="pn" title="'+e(r.title)+'">'+r.chip+'</td>'+r.cells.map(function(v,i){return '<td'+((r.cellAttr&&r.cellAttr[i])||'')+'>'+pc(v||0)+'</td>'}).join('')+'<td class="ptot">'+r.total+'</td></tr>'}).join('')+'</table></div></div>'}).join('')+'</div>'};

  /* STEP6-TEAMS: STOOPIDS All-teams table, both sites. o: {filters(html),heads:[[k,label,title,cls]],sk,sd,btn(k)->attrs,rows:[{attr,cells:[[cls,attr,html]]}],e} */
  SHARED_UI.teamsTable=function(o){var e=o.e;
    var th=function(h){var k=h[0],on=o.sk===k;return '<th class="'+(h[3]==null?'n s27-sort':h[3])+'" aria-sort="'+(on?(o.sd>0?'ascending':'descending'):'none')+'"><button type="button" title="'+e(h[2])+'. Tap to sort" '+o.btn(k)+'>'+h[1]+'<i aria-hidden="true">'+(on?(o.sd>0?'▲':'▼'):'↕')+'</i></button></th>'};
    var html='<div class="tapf" role="group" aria-label="Filter by owner">'+o.filters+'</div><div class="card tap s27-rk"><table><tr>'+o.heads.map(th).join('')+'</tr>'+
      o.rows.map(function(r){return '<tr'+(r.attr||'')+'>'+r.cells.map(function(c){return '<td'+(c[0]?' class="'+c[0]+'"':'')+(c[1]||'')+'>'+c[2]+'</td>'}).join('')+'</tr>'}).join('')+'</table></div>';
    setTimeout(function(){try{SHARED_UI.atBadgeFit()}catch(e){}},0);return html};
  /* All-teams badges: one width, the longest name in this table, and one height. Hidden filter rows still count. */
  SHARED_UI.atBadgeFit=function(){var cards=document.querySelectorAll('.card.tap.s27-rk');if(!cards.length)return;cards.forEach(function(card){
    var chips=[].slice.call(card.querySelectorAll('td:first-child .chip'));if(!chips.length)return;
    var probe=chips[0].cloneNode(true);probe.style.cssText='position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;width:max-content;min-width:0;max-width:none;height:30px;min-height:30px;display:inline-flex';
    document.body.appendChild(probe);var max=0,longest='';
    chips.forEach(function(c){probe.className=c.className;probe.innerHTML=c.innerHTML;var w=probe.offsetWidth;var label=(c.textContent||'').replace(/\s+/g,' ').trim();if(w>max){max=w;longest=label}});
    probe.remove();if(max>0){card.style.setProperty('--at-badge',max+'px');card.setAttribute('data-at-long',longest)}});};

  /* STEP6-BETS: New bet question tips (STOOPIDS wording), both sites */
  SHARED_UI.TIPS={who:'Tap one or more managers. Several = one bet, one result.',text:'Write it as you say it: "Kansas -4 beats Duke".',amt:function(min){return 'Minimum '+min},odds:'If you’re right, they owe amount × first ÷ second. Even = 1-1.',
    /* STEP12-TIPS: Pool form question tips (the old grey notes under each Pool step) */
    pterms:'Say what the pool is, e.g. “STOOPIDS season-long tournament pool”.',ppl:'You’re in automatically. Tap everyone else who’s in.',buy:function(min){return 'Buy-in per person, minimum '+min+'. The pot is buy-in × people in.'},pay:'Amounts only; you pick who finished where when you settle it. They must add up to the pot. Optional: leave blank to fill in when it’s over.'};

  /* STEP7-TALLY: Bets > Tally header card, empty note and per-person table, both sites */
  SHARED_UI.tallyTop=function(attr,emptyAttr,empty){return '<div class="card"'+(attr||'')+'><b>🧮 Tally · 2026-27</b><div class="note">From the 2026-27 shared ledger only. Rows owe columns.</div></div>'+(empty?'<div class="card note"'+emptyAttr+'>No 2026-27 bets with amounts yet.</div>':'')};
  SHARED_UI.tallyPeople=function(rows,o){var f=o.fmt;
    return '<div class="card sc"><table'+o.tblAttr+'><tr><th>Person</th><th class="n">Lost</th><th class="n">Won</th><th class="n">Net +/-</th><th class="n">Bets</th><th class="n">Fines</th></tr>'+rows.map(function(r){var n=r.net;
      return '<tr '+o.rowKey+'="'+o.e(r.id)+'"><td'+(r.tdAttr||'')+'>'+r.nameHtml+'</td><td class="n">'+f(r.lost)+'</td><td class="n">'+f(r.won)+'</td><td class="n"><b class="'+(n>0?'good':n<0?'bad':'')+'">'+(n>0?'+':n<0?'-':'')+f(Math.abs(n))+'</b></td><td class="n">'+r.bets+'</td><td class="n">'+(r.fines?f(r.fines):o.zero)+'</td></tr>'}).join('')+'</table></div>'};

  /* STEP7-RECAP: Recap "Weekly write-ups" section (newest first; empty note), both sites. items: [{kind,date,title,body}] */
  /* STEP8-REQUEST: "Request a bet" (core). One shared module, each site passes an adapter A:
     A.e(esc) A.me() A.others()->[{id,emoji,nick}] A.nick(id) A.canWrite() A.games()->[{id,g,label,start,status,period}]
     A.tname(side) A.dateET(g) A.get()->Promise<text> A.set(text)->Promise A.placeBet(req,meId)->Promise A.render() A.amounts
     Storage (option A): its OWN record per site {v:1,reqs:[...]}; each invited Stoop can accept once; every acceptance is its own bet; closes when all N slots are taken (write, re-read, check the slot).
     A request auto-cancels when its own window starts (full game: tip-off; 2nd half: halftime) or at the poster's expiry, whichever first. */
  SHARED_UI.Requests=function(A){
    var e=A.e,S={f:null,list:[],at:0,busy:false,msg:'',bad:false,loading:false,arm:null};
      var nf=function(){return{gid:'',side:'',cov:'game',odds:[1,1],amt:5,amtTxt:'',to:[],mode:'start',n:3,at:'',est:'',wk:'game',whenPick:false,expPick:false,lineOn:false,lineKind:'',lineSide:0,linePts:'',lineBase:'',lineSideKey:'',parlay:false,legs:[],pyGid:''}};S.f=nf();
    var HALF_MS=70*60000;
    function parse(t){try{var o=JSON.parse(t||'{}');if(typeof o==='string')o=JSON.parse(o);return Array.isArray(o.reqs)?o.reqs.filter(function(r){return r&&r.id}):[]}catch(x){return[]}}
    function rid(){return 'rq'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
    var GC=null,GT=0;function games(){var n=Date.now();if(!GC||n-GT>2000){GC=A.games()||[];GT=n}return GC}
    function game(id){return games().find(function(x){return String(x.id)===String(id)})}
    function winStart(r,g){var st=Date.parse(r.start||(g&&g.start));if(!st)return Infinity;return r.cov==='2h'?st+HALF_MS:st}
    function started(r,now){var g=game(r.gid);if(r.cov==='2h'){if(g&&(g.status==='final'||(g.period&&+g.period>=2)))return true;return now>=winStart(r,g)}
      if(g&&g.status&&g.status!=='scheduled')return true;return now>=winStart(r,g)}
    function tk(r){return (r.took||[]).map(function(x){return x.m})}
    function reqTerms(r){if(!r)return '';return [r.status,r.lab||'',r.txt||'',r.amt,(r.odds||[]).join('-'),(r.to||[]).slice().sort().join(','),tk(r).length,(r.dec||[]).length,r.exp,r.wk||'',r.est||'',r.slots==null?'':r.slots,r.by||''].join('\u001f')}
    function reqHash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
    function stAttr(r){return ' data-st="'+reqHash(reqTerms(r))+'"'}
    var ARM_MS=30000;
    function armLive(a){return !!(a&&a.at&&Date.now()-a.at<ARM_MS)}
    function dropArm(){if(!S.arm)return;if(!armLive(S.arm)){S.arm=null;return}var r=S.list.find(function(x){return x.id===S.arm.id});if(!r){S.arm=null;return}if(S.arm.act==='csend')return;var terms=S.arm.act==='caccept'||S.arm.act==='cno'?(r.offer?offerKey(r.offer):''):reqTerms(r);if(terms!==S.arm.terms)S.arm=null}
    function armed(id,act,terms){return !!(S.arm&&armLive(S.arm)&&S.arm.id===id&&S.arm.act===act&&S.arm.terms===terms)}
    function armHold(id,act,terms){if(S.busy)return false;dropArm();if(armed(id,act,terms)){S.arm=null;clearTimeout(S.armT);return true}S.arm={id:id,act:act,terms:terms,at:Date.now()};clearTimeout(S.armT);S.armT=setTimeout(function(){if(S.arm&&Date.now()-S.arm.at>=ARM_MS){S.arm=null;A.render()}},ARM_MS+40);A.render();return false}
    function armLab(act,n){return 'Tap again to '+act+(n!=null&&n!==''?' #'+n:'')}
    function slots(r){return Math.min(r.to.length,+r.slots||r.to.length)}
    function live(r,now){return r.status==='open'&&tk(r).length<slots(r)&&now<r.exp&&!started(r,now)}
    function left(ms){var m=Math.max(1,Math.round(ms/60000)),d=Math.round(m/1440);return m<60?m+'m':m<48*60?Math.round(m/60)+'h':d<60?d+' days':d<330?Math.round(d/30)+' months':Math.round(d/365)<=1?'1 year':Math.round(d/365)+' years'}
    var YEAR=366*86400000;
    function expAt(f,now,ws){if(f.mode==='start')return ws||null;var x;if(f.mode==='at'){x=Date.parse(f.at);if(isNaN(x))return null}else{var n=+f.n;if(!(n>0))return null;x=now+n*({m:60000,h:3600000,d:86400000,w:604800000,mo:2592000000}[f.mode]||3600000)}return x>now+YEAR?null:x}
    function sides(g){return SHARED_UI.qbOptions(g,{name:A.tname,date:A.dateET(g)})}
    function hasBothTeams(tt,g){var low=String(tt||'').toLowerCase(),a=String(A.tname(g.away)||'').toLowerCase(),h=String(A.tname(g.home)||'').toLowerCase();return !!(a&&h&&low.indexOf(a)>=0&&low.indexOf(h)>=0)}
    function pick(g,f){var tt=String(f.text||'').trim().slice(0,A.maxText||140);if(f.parlay&&f.legs&&f.legs.length>=2)return {k:'txt',si:0,lab:tt||'Parlay',other:'',txt:tt||'Parlay'};if(!g)return tt?{k:'txt',si:0,lab:tt,other:'',txt:tt}:null;if(tt&&!(f.side&&(function(){var q=f.side.split(':'),oo=sides(g).find(function(x){return x.k===q[0]});return oo&&oo.s[+q[1]]&&(oo.s[+q[1]].lab===tt||oo.s[+q[1]].txt===tt)})()))return {k:'txt',si:0,lab:tt,other:'',txt:tt+(hasBothTeams(tt,g)?'':' ('+A.tname(g.away)+' vs '+A.tname(g.home)+', '+A.dateET(g)+')')};if(!f.side)return null;var p=f.side.split(':'),o=sides(g).find(function(x){return x.k===p[0]}),s=o&&o.s[+p[1]];var ot=o.s[1-(+p[1])];return s?{k:p[0],si:+p[1],lab:s.lab,other:ot?ot.lab:'',txt:(f.cov==='2h'?'2nd half: ':'')+s.txt}:null}
    function hold(base,extra){var by={};(base||[]).forEach(function(r){if(r&&r.id)by[r.id]=r});(extra||[]).forEach(function(r){if(r&&r.id)by[r.id]=r});return Object.keys(by).map(function(k){return by[k]})}
    /* rev bumps on every save. A read that started before that save must not replace the rows just written. */
    var rev=0;
    function mergeRead(server){return hold(server,S.list)}
    /* The confirming read can still be the copy from before this save. Keep the rows just written on screen instead of waiting for the next poll to notice them. */
    async function write(mut,ok){var posted=null;for(var k=0;k<3;k++){var cur;try{cur=parse(await A.get())}catch(e){if(!posted)throw e;break}if(ok(cur)){S.list=mergeRead(cur);S.at=Date.now();return S.list}var next=mut(cur);await A.set(JSON.stringify({v:1,reqs:next}));posted=next;rev++;S.list=hold(cur,next);S.at=Date.now();
        await new Promise(function(r){setTimeout(r,350+Math.random()*400)});try{var back=parse(await A.get());if(ok(back)){S.list=hold(back,posted);S.at=Date.now();return S.list}}catch(e){}}if(posted&&ok(posted)){S.list=hold(S.list,posted);S.at=Date.now();return S.list}throw new Error('conflict')}
    function responseEvents(list,me){var out=[];(list||[]).forEach(function(r){if(!r||r.by!==me||!r.id)return;var sum=sl(String(r.txt||r.lab||'Request').replace(/\s+/g,' ').trim()).slice(0,90);
      (r.took||[]).forEach(function(t){if(t&&t.m&&t.m!==me)out.push({key:'a:'+r.id+':'+t.m,who:t.m,resp:'accepted',sum:sum,id:r.id})});
      (r.dec||[]).forEach(function(m){if(m&&m!==me)out.push({key:'d:'+r.id+':'+m,who:m,resp:'declined',sum:sum,id:r.id})})});return out}
    function clearNotes(){S.noteT=S.noteT||{};if(typeof document==='undefined')return;var h=document.getElementById('rqNotes');if(h)h.textContent='';Object.keys(S.noteT).forEach(function(k){clearTimeout(S.noteT[k])});S.noteT={}}
    function dismissNote(key){if(S.noteT&&S.noteT[key]){clearTimeout(S.noteT[key]);delete S.noteT[key]}if(typeof document==='undefined')return;var n=document.querySelector('.rq-n[data-key="'+key.replace(/"/g,'')+'"]');if(n)n.remove()}
    function pushNote(ev){if(typeof document==='undefined'||!document.body)return;S.noteT=S.noteT||{};var host=document.getElementById('rqNotes');
      if(!host){host=document.createElement('div');host.id='rqNotes';host.className='rq-notes';host.setAttribute('aria-live','polite');host.setAttribute('aria-relevant','additions');document.body.appendChild(host);
        if(!S.noteEsc){S.noteEsc=1;document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;var last=document.querySelector('#rqNotes .rq-n:last-child');if(!last)return;dismissNote(last.getAttribute('data-key'))})}}
      if(host.querySelector('.rq-n[data-key="'+ev.key.replace(/"/g,'')+'"]'))return;
      var name=nmOf(ev.who),row=document.createElement('div');row.className='rq-n'+(ev.resp==='declined'?' dec':'');row.setAttribute('data-key',ev.key);row.setAttribute('role','status');
      var text=document.createElement('div');text.className='rq-nt';
      var b=document.createElement('b');b.textContent=name+' '+ev.resp;text.appendChild(b);
      var s=document.createElement('span');s.textContent=ev.sum;text.appendChild(s);
      var i=document.createElement('span');i.className='rq-ni';i.textContent='Request '+ev.id;text.appendChild(i);
      var x=document.createElement('button');x.type='button';x.className='rq-nx';x.setAttribute('aria-label','Dismiss');x.textContent='\u2715';x.addEventListener('click',function(){dismissNote(ev.key)});
      row.appendChild(text);row.appendChild(x);host.appendChild(row);
      S.noteT[ev.key]=setTimeout(function(){dismissNote(ev.key)},5000)}
    function observe(list){var me=A.me();if(!me){S.noteMe='';S.noteKeys=null;clearNotes();return}
      var events=responseEvents(list,me);
      if(S.noteMe!==me||!S.noteKeys){S.noteMe=me;S.noteKeys={};events.forEach(function(ev){S.noteKeys[ev.key]=1});clearNotes();return}
      var fresh=events.filter(function(ev){return !S.noteKeys[ev.key]});
      events.forEach(function(ev){S.noteKeys[ev.key]=1});fresh.forEach(function(ev){pushNote(ev);if(A.ping)A.ping()})}
    async function load(){if(S.loading)return;S.loading=true;var seen=rev;S.at=Date.now();try{var got=parse(await A.get());if(rev!==seen){S.list=mergeRead(got);S.at=Date.now();observe(S.list);paint()}else{S.list=got;S.at=Date.now();observe(S.list);paint();
        var now=Date.now(),dead=S.list.filter(function(r){return r.status==='open'&&!live(r,now)}).map(function(r){return r.id});
        if(dead.length&&A.canWrite()&&rev===seen)await write(function(c){return c.map(function(r){return dead.indexOf(r.id)>=0&&r.status==='open'&&!live(r,now)?Object.assign({},r,{status:tk(r).length>=slots(r)?'full':'closed',endedAt:now}):r})},function(c){return c.every(function(r){return dead.indexOf(r.id)<0||r.status!=='open'})})}}
      catch(x){}S.loading=false;A.render()}
    function chips(f){var list=A.others(),gap=list.length%4;return '<div class="b27-opps rq-to" role="group" aria-label="Open to" style="--n:'+list.length+'">'+list.map(function(o){var on=f.to.indexOf(o.id)>=0;return '<button type="button" class="b27-chip op" data-rq="to" data-v="'+e(o.id)+'" aria-pressed="'+on+'" aria-label="'+e(o.nick)+'"><span class="ck" aria-hidden="true">✓</span><span class="em" aria-hidden="true">'+e(o.emoji||'')+'</span><span class="nm" aria-hidden="true"><span class="f">'+e(o.nick)+'</span><span class="sh">'+e(SHARED_UI.shortName(o.nick))+'</span><span class="xs">'+e(SHARED_UI.tinyName(o.nick))+'</span></span></button>'}).join('')+(gap?'<div class="b27-util" role="group" aria-label="Select people"><button type="button" class="s27-selb" data-rq="all"><span class="f">Select all</span><span class="s">All</span></button><button type="button" class="s27-selb" data-rq="clear">Clear</button></div>':'')+'</div>'}
    function card(r,now){var me=A.me(),inv=r.to.indexOf(me)>=0,dec=(r.dec||[]).indexOf(me)>=0;
      var nt=tk(r).length,mine=tk(r).indexOf(me)>=0;
      /* Still an invitation while it is open, even after one spot is taken. Settlement is the bet's label. */
      var stage=r.status==='open'?'Awaiting acceptance':'';
      var h='<div class="card rq-card" data-rq-id="'+e(r.id)+'"><div class="rq-top"><b>'+e(A.nick(r.by))+'</b>'+(stage?' <span class="note">· '+stage+'</span>':'')+'</div>'
        +explain(r)+'<div class="b27-due" data-due="'+SHARED_UI.whenShow(r)+'">'+e(SHARED_UI.whenText(r))+'</div>';
      if(mine)h+='<div class="note good">You accepted: it is your bet now.</div>';
      else if(me&&inv&&!dec&&r.by!==me&&A.canWrite()){var accOn=armed(r.id,'acc',reqTerms(r)),decOn=armed(r.id,'dec',reqTerms(r));h+='<div class="rq-act"><button type="button" class="btn rq-yes" data-rq="acc" data-v="'+e(r.id)+'"'+stAttr(r)+(S.busy?' disabled':'')+'>'+(accOn?armLab('accept',r.n):'Accept')+'</button><button type="button" class="btn sec rq-no" data-rq="dec" data-v="'+e(r.id)+'"'+stAttr(r)+(S.busy?' disabled':'')+'>'+(decOn?armLab('decline',r.n):'Decline')+'</button>'+(r.offer&&r.offer.by===me?'':'<button type="button" class="btn sec" data-rq="coffer" data-v="'+e(r.id)+'"'+(S.busy?' disabled':'')+'>Counter</button>')+'</div>';}
      else if(dec)h+='<div class="note">You declined.</div>';
      else if(me&&r.by===me&&A.canWrite()&&nt){var lessOn=armed(r.id,'slot-',reqTerms(r)),moreOn=armed(r.id,'slot+',reqTerms(r)),closeOn=armed(r.id,'close',reqTerms(r));h+='<div class="rq-act rq-spots"><span class="note">Spots</span><button type="button" class="btn sec" data-rq="slot-" data-v="'+e(r.id)+'"'+stAttr(r)+(S.busy||slots(r)<=nt+0?' disabled':'')+' aria-label="One spot less">'+(lessOn?armLab('remove a spot',r.n):'\u2212')+'</button><b>'+slots(r)+'</b><button type="button" class="btn sec" data-rq="slot+" data-v="'+e(r.id)+'"'+stAttr(r)+(S.busy||slots(r)>=r.to.length?' disabled':'')+' aria-label="One spot more">'+(moreOn?armLab('add a spot',r.n):'+')+'</button><button type="button" class="btn sec rq-no" data-rq="close" data-v="'+e(r.id)+'"'+stAttr(r)+(S.busy?' disabled':'')+'>'+(closeOn?armLab('close',r.n):'Close to others')+'</button></div>';}
      else if(me&&r.by===me&&A.canWrite()&&!nt){var cancelOn=armed(r.id,'cancel',reqTerms(r));h+='<div class="rq-act rq-own"><button type="button" class="btn sec" data-rq="edit" data-v="'+e(r.id)+'"'+stAttr(r)+(S.busy?' disabled':'')+'>Edit</button><button type="button" class="btn sec rq-no" data-rq="cancel" data-v="'+e(r.id)+'"'+stAttr(r)+(S.busy?' disabled':'')+'>'+(cancelOn?armLab('cancel',r.n):'Cancel')+'</button>'+'<button type="button" class="btn sec rq-cp" data-rq="cp" data-v="'+e(r.id)+'">Copy</button>'+'</div>';}
      if(r.offer&&!r.offer.ok){var ol=offerLine(r.offer),okey=offerKey(r.offer),yesOn=armed(r.id,'caccept',okey),noOn=armed(r.id,'cno',okey);
        if(me===r.by)h+='<div class="rq-off"><b>Counter from '+e((A.real||A.nick)(r.offer.by))+'</b><div>'+e(ol)+'</div><div class="rq-act"><button type="button" class="btn" data-rq="caccept" data-v="'+e(r.id)+'" data-st="'+reqHash(okey)+'"'+(S.busy?' disabled':'')+'>'+(yesOn?armLab('accept',r.n):'Accept these terms')+'</button><button type="button" class="btn sec" data-rq="cno" data-v="'+e(r.id)+'"'+(S.busy?' disabled':'')+'>'+(noOn?armLab('decline',r.n):'Decline counter')+'</button></div><div class="note">Nothing changes until you accept these exact terms.</div></div>';
        else if(me===r.offer.by)h+='<div class="note">Counter sent: '+e(ol)+'. Waiting on them to accept it.</div>';
        else h+='<div class="note">A counter is in. Only '+e((A.real||A.nick)(r.by))+' can accept it.</div>'}
      if(S.coff&&S.coff.id===r.id){var sendOn=armed(r.id,'csend',[S.coff.amt,S.coff.odds,S.coff.text].join('\u001f'));h+='<div class="rq-coff" data-v="'+e(r.id)+'"><div class="note">Propose a stake, spread, and odds. The original stays until they accept these exact terms.</div><input class="sb-in b27-in" data-co="amt" inputmode="numeric" placeholder="Stake" aria-label="Counter stake" value="'+e(S.coff.amt||'')+'"><input class="sb-in b27-in" data-co="odds" placeholder="Odds, 1-1" aria-label="Counter odds" value="'+e(S.coff.odds||'')+'"><input class="sb-in b27-in" data-co="text" maxlength="'+(A.maxText||140)+'" placeholder="Spread or bet" aria-label="Counter spread" value="'+e(S.coff.text!=null?S.coff.text:(r.lab||''))+'"><div class="rq-act"><button type="button" class="btn" data-rq="csend" data-v="'+e(r.id)+'"'+(S.busy?' disabled':'')+'>'+(sendOn?armLab('send',r.n):'Send counter')+'</button><button type="button" class="btn sec" data-rq="cx" data-v="'+e(r.id)+'">Cancel</button></div></div>';}
      if(r.status==='open'&&!(me&&r.by===me&&A.canWrite()&&!nt))h+='<div class="rq-act rq-copy">'+'<button type="button" class="btn sec rq-cp" data-rq="cp" data-v="'+e(r.id)+'">Copy</button>'+'</div>';   /* STEP14-COPY: every open card can copy the Bet Requested text */
      return h+'</div>'}
    function offerKey(o){o=o||{};return [o.by,o.amt,(o.odds||[]).join('-'),o.lab||'',o.txt||''].join('\u001f')}
    function sl(s){return SHARED_UI.showLine?SHARED_UI.showLine(s):String(s==null?'':s)}
    function offerLine(o){var a=o.odds&&o.odds[0],b=o.odds&&o.odds[1],od=+a===+b?'':' · '+a+'-'+b,m=rqMoney(o.amt);return (m?m+od+' · ':'')+sl(o.lab||o.txt||'')}
    function tipOf(f){var g=SHARED_UI.tipGame({games:games(),gid:f&&f.gid,text:f&&f.text,now:Date.now(),today:(typeof S25!=='undefined'&&S25.etDay)?S25.etDay(new Date()):'',dateFrom:(typeof S25!=='undefined'&&S25.dateFrom)?S25.dateFrom:null,day:(typeof S25!=='undefined'&&S25.etDay)?S25.etDay:null});if(g)return g;if(f&&f.gid){var hit=game(f.gid);if(hit&&Date.parse(hit.start))return hit}return null}
    function lineTeams(gw){if(!gw||!gw.g)return [];return [A.tname(gw.g.away),A.tname(gw.g.home)].filter(Boolean)}
    function linePosted(gw){var g=gw&&gw.g,ln=g&&g.line;if(!ln||!(+ln.sp>0))return null;var fav=String(ln.fav)===String(g.away.id)?g.away:String(ln.fav)===String(g.home.id)?g.home:null;if(!fav)return null;var dog=fav===g.away?g.home:g.away,sp=+ln.sp;return {fav:A.tname(fav),dog:A.tname(dog),sp:sp}}
    function linePtsOf(info,name){if(!info||!name)return null;if(name===info.fav)return -info.sp;if(name===info.dog)return info.sp;return null}
    function lineNum(s){var m=/^\s*([+-])?\s*(\d{1,2}(?:\.\d)?)\s*$/.exec(String(s||''));if(!m)return null;var n=Math.round(+m[2]*2)/2;if(m[1]==='-')n=-n;return n}
    function lineBit(n){n=+n;if(!n)return 'PK';return (n>0?'+':'')+n}
    function lineFair(gw,team,other,kind,pts){return SHARED_UI.linePrice?SHARED_UI.linePrice(gw&&gw.g,team,{kind:kind,pts:pts}):null}
    function lineLop(odds,fair){if(!fair||!odds||(+odds[0]===fair.a&&+odds[1]===fair.b))return false;var u=+odds[0]/+odds[1],r=fair.raw;return !!(r>0&&u>0&&Math.abs(u-r)/r>0.30)}
    function linePhrase(team,other,kind,pts,odds){odds=odds||[1,1];var tail=+odds[0]===+odds[1]?'':' \u00b7 '+odds[0]+'-'+odds[1],opp=other?' v '+other:'';if(kind==='ml')return team+' ML'+opp+tail;if(kind==='none'||pts===0)return team+' (no points)'+opp+tail;return team+' '+lineBit(pts)+opp+tail}
    function lineDay(gw){var g=gw&&gw.g;if(g&&g.day)return g.day;try{if(gw&&gw.start&&typeof S25!=='undefined'&&S25.etDay)return S25.etDay(gw.start)}catch(e){}return ''}
    function applyLine(f,useFair){var gw=game(f.gid),names=lineTeams(gw);if(names.length<2)return;var i=f.lineSide?1:0,team=names[i],other=names[1-i];
      if(!f.lineKind){if(f.lineBase)f.text=f.lineBase;f.rd=null;f.lineFair=null;if(f.lineSideKey)f.side=f.lineSideKey;f.odds=[1,1];f.oddC=false;f.oddTxt='';return}
      if(f.lineKind==='posted'){var infoP=linePosted(gw),ptsP=linePtsOf(infoP,team),dayP=lineDay(gw);f.odds=[1,1];f.oddC=false;f.oddTxt='';f.lineFair=null;f.side='';if(ptsP==null){if(f.lineBase)f.text=f.lineBase;f.rd=null;return}f.text=linePhrase(team,other,'custom',ptsP,[1,1]);if(dayP)f.rd={k:'spread',t:team,o:other,l:ptsP,sp:'mcbb',d:dayP};else f.rd=null;return}
      if(f.lineKind==='ml'){var qM=SHARED_UI.mlQuote(gw.g),sideM=i?gw.g.home:gw.g.away,favM=!!(qM&&String(sideM.id)===String(qM.favId));f.side='';f.lineFair=null;if(!qM){f.rd=null;return}f.odds=[qM.a,qM.b];f.oddC=qM.a!==qM.b;f.oddTxt=qM.label==='Even'?'':qM.label;f.text=team+' ML v '+other;var dayM=lineDay(gw);f.rd=dayM?{k:'ml',ml:1,t:team,o:other,l:null,sp:'mcbb',d:dayM,fav:favM?team:other}:null;return}
      var kind=f.lineKind,pts=null;if(kind==='custom'){pts=lineNum(f.linePts);if(pts==null)return;if(!pts)kind='none'}
      var fair=lineFair(gw,team,other,kind,pts);f.lineFair=fair;
      if(useFair&&fair){f.odds=[fair.a,fair.b];f.oddC=!rqChipOdds().some(function(o){return o[0]===fair.a&&o[1]===fair.b});f.oddTxt=fair.label}
      var odds=f.odds||[1,1],day=lineDay(gw);f.text=linePhrase(team,other,kind,pts,odds);f.side='';
      if(day)f.rd=kind==='none'?{k:'ml',t:team,o:other,l:null,sp:'mcbb',d:day}:{k:'spread',t:team,o:other,l:pts,sp:'mcbb',d:day}}
    function copyRd(rd){if(!rd||!rd.k||rd.k==='manual'||!rd.t||!rd.o||!rd.d)return null;var o={k:rd.k,t:rd.t,o:rd.o,l:rd.l==null?null:rd.l,sp:rd.sp||'mcbb',d:rd.d};if(rd.ou==='o'||rd.ou==='u')o.ou=rd.ou;if(rd.ml){o.ml=1;if(rd.fav)o.fav=rd.fav}return o}
    /* The description can change ("(no points) v", a spread, an O/U) without dropping the game. Prefer the reading already on the form. Otherwise read the text, but only if both teams are this game's teams, and keep the game's own date. */
    function pinReading(f,g){var keep=copyRd(f&&f.rd);if(keep)return keep;if(!f||f.parlay||!g||!g.g)return null;var day=g.g.day||lineDay(g);if(!day)return null;var names=[A.tname(g.g.away),A.tname(g.g.home)].filter(Boolean);if(names.length<2)return null;var low=names.map(function(n){return String(n).toLowerCase()});
      var parsed=null;try{if(typeof S25!=='undefined'&&S25.parse)parsed=S25.parse(f.text||'',g.start||'')}catch(e){}
      if(parsed&&parsed.k&&parsed.k!=='manual'&&low.indexOf(String(parsed.t||'').toLowerCase())>=0&&low.indexOf(String(parsed.o||'').toLowerCase())>=0){var hit=copyRd(Object.assign({},parsed,{d:day,sp:parsed.sp||'mcbb'}));if(hit)return hit}
      var m=/^(.*?)\s*(?:wins?\s*)?\(no points\)/i.exec(String(f.text||'').replace(/\s*·\s*\d+\s*-\s*\d+.*$/,'').trim());
      if(m){var i=low.indexOf(m[1].trim().toLowerCase());if(i>=0)return {k:'ml',t:names[i],o:names[1-i],l:null,sp:'mcbb',d:day}}
      return null}
    function lineBox(f,gw,bodyOnly){var names=lineTeams(gw);if(names.length<2)return '';var on=bodyOnly||!!f.lineOn,side=names[f.lineSide?1:0],info=linePosted(gw),pp=linePtsOf(info,side);
      var h=bodyOnly?'':'<div class="ln-wrap"><button type="button" class="b27-chip ln-go" data-rq="line" aria-expanded="'+(on?'true':'false')+'">Change the line</button>';
      if(!on)return h+'</div>';
      h+='<div class="ln-box" role="group" aria-label="Change the line">';
      h+='<div class="ln-row"><span class="ln-lab">If</span>'+names.map(function(n,i){return '<button type="button" class="b27-chip" data-rq="lside" data-v="'+i+'" aria-pressed="'+((f.lineSide?1:0)===i?'true':'false')+'">'+e(n)+'</button>'}).join('')+'<span class="ln-lab">wins</span></div>';
      h+='<div class="ln-row"><button type="button" class="b27-chip" data-rq="lnone" aria-pressed="'+(f.lineKind==='none'?'true':'false')+'">No points</button>';
      if(pp!=null)h+='<button type="button" class="b27-chip" data-rq="lpost" aria-pressed="'+(!f.lineKind||f.lineKind==='posted'?'true':'false')+'">'+e(side+' '+lineBit(pp))+'</button>';
      h+='<input class="sb-in b27-in rq-in ln-pts" data-rq-in="linePts" inputmode="decimal" placeholder="Custom, +7.5" aria-label="Custom spread" value="'+e(f.linePts||'')+'"></div>';
      var chips=[[1,1],[2,1],[3,1],[4,1],[5,1]],ca=+f.odds[0]||1,cb=+f.odds[1]||1;if(!(ca===1&&cb===1)&&!chips.some(function(o){return o[0]===ca&&o[1]===cb}))chips=chips.concat([[ca,cb]]);
      h+='<div class="ln-row"><span class="ln-lab">Odds if '+e(side)+' wins</span>'+chips.map(function(o){return '<button type="button" class="b27-chip" data-rq="odds" data-v="'+o[0]+'-'+o[1]+'" aria-pressed="'+(ca===o[0]&&cb===o[1]?'true':'false')+'">'+(o[0]===o[1]?'Even':o[0]+'-'+o[1])+'</button>'}).join('')+'</div>';
      if((f.lineKind==='none'||f.lineKind==='custom')&&f.lineFair)h+='<div class="ln-fair">Fair: about '+e(f.lineFair.label)+(lineLop(f.odds,f.lineFair)?' <span class="ln-lop">Lopsided</span>':'')+'</div>';
      if(f.lineKind==='none'||f.lineKind==='custom')h+='<div class="ln-terms">'+e(f.text||'')+'</div>';
      return h+'</div>'+(bodyOnly?'':'</div>')}
    function pySoon(){var now=Date.now(),out=[];(games()||[]).forEach(function(gw){var st=Date.parse(gw.start)||0;if(!gw.g||gw.g.status==='final'||!(st>now)||st>now+14*86400000)return;if(!gw.g.line||!(+gw.g.line.sp>0))return;out.push(gw)});return out.slice(0,24)}
    function pyLeg(gid,kind,side){var gw=game(gid);if(!gw||!gw.g)return null;var g=gw.g,names=[A.tname(g.away),A.tname(g.home)],i=side?1:0,team=names[i],other=names[1-i];if(!team||!other)return null;var info=linePosted(gw),pts=kind==='spread'?linePtsOf(info,team):0;if(kind==='spread'&&pts==null)return null;var fair=SHARED_UI.linePrice(g,team,{kind:kind==='spread'?'custom':'none',pts:pts});if(!fair)return null;return {gid:String(g.id),kind:kind==='spread'?'spread':'ml',t:team,o:other,l:kind==='spread'?pts:null,d:g.day||lineDay(gw),start:gw.start||g.start||'',lab:kind==='spread'?team+' '+lineBit(pts)+' v '+other:team+' (no points) v '+other,raw:fair.raw}}
    function pyRung(r){var n=[1,2,3,4,5,6,7,8,9,10,12,15,20,25,30,40,50];if(!(r>0))return null;if(r<1){var inv=pyRung(1/r);return inv?[inv[1],inv[0]]:null}var best=n[0],bd=1e9;for(var i=0;i<n.length;i++){var d=Math.abs(Math.log(n[i])-Math.log(Math.max(r,1)));if(d<bd){bd=d;best=n[i]}}return [best,1]}
    function pyPrice(legs){if(!legs||legs.length<2)return null;var dec=1;for(var i=0;i<legs.length;i++){var r=+legs[i].raw;if(!(r>0))return null;dec*=(r+1)}var pair=pyRung(dec-1);if(!pair)return null;return {a:pair[0],b:pair[1],label:pair[0]+'-'+pair[1],raw:dec-1}}
    function pySync(f,useFair){var legs=f.legs||[];f.lineKind='';f.rd=null;f.lineOn=false;if(legs.length<2){f.lineFair=null;f.text=legs.length?'Parlay · '+legs.length+(legs.length===1?' leg':' legs'):'';return}var fair=pyPrice(legs);f.lineFair=fair;if(useFair&&fair){f.odds=[fair.a,fair.b];f.oddC=!rqChipOdds().some(function(o){return o[0]===fair.a&&o[1]===fair.b});f.oddTxt=fair.label}var od=+f.odds[0]===+f.odds[1]?'1-1':f.odds[0]+'-'+f.odds[1];f.text='Parlay · '+legs.length+' legs · '+od;var first=legs.slice().sort(function(a,b){return String(a.start).localeCompare(String(b.start))})[0];if(first&&first.gid)f.gid=String(first.gid);f.expPick=false;f.whenPick=false;f.wk='game'}
    function pyOpen(f,gid){f.parlay=true;f.legs=[];f.lineOn=false;f.lineKind='';f.pyGid=String(gid||f.pyGid||'');if(!f.pyGid){var soon=pySoon();f.pyGid=soon[0]?String(soon[0].id):''}var gw=game(f.pyGid),side=0;if(gw&&gw.g&&gw.g.line){var fav=String(gw.g.line.fav)===String(gw.g.home.id)?1:0;side=fav}var leg=pyLeg(f.pyGid,'spread',side)||pyLeg(f.pyGid,'ml',side);if(leg)f.legs=[leg];pySync(f,true)}
    function pyBegin(gid){pyOpen(S.f,gid)}
    function pyAct(f,k,v){if(k==='parlay'){if(f.parlay){f.parlay=false;f.legs=[];f.lineFair=null;if(/^Parlay ·/.test(f.text||''))f.text='';return}pyOpen(f,f.pyGid||'');return}if(k==='pydel'){var ix=+v;if(f.legs&&ix>=0)f.legs.splice(ix,1);pySync(f,true);return}if(k==='pyadd'){if((f.legs||[]).length>=5)return;var bits=String(v||'').split(':'),leg=pyLeg(f.pyGid,bits[0]==='spread'?'spread':'ml',bits[1]==='1'?1:0);if(!leg)return;f.legs=f.legs||[];var at=f.legs.findIndex(function(L){return String(L.gid)===String(leg.gid)});if(at>=0)f.legs[at]=leg;else f.legs.push(leg);pySync(f,true);return}if(k==='pyGid'){f.pyGid=v;return}}
    function pySet(legs){var f=S.f;f.parlay=true;f.legs=(legs||[]).slice(0,5);f.lineOn=false;f.lineKind='';f.pyGid=f.legs[0]?String(f.legs[0].gid):'';pySync(f,true)}
    function pyBox(f,pfx,bodyOnly){pfx=pfx||'rq';var dq='data-'+pfx,di='data-'+pfx+'-in';var h=bodyOnly?'':('<div class="py-wrap"><button type="button" class="b27-chip ln-go" '+dq+'="parlay" aria-pressed="'+(f.parlay?'true':'false')+'" aria-expanded="'+(f.parlay?'true':'false')+'">Parlay</button>');if(!bodyOnly&&!f.parlay)return h+'</div>';var list=pySoon(),gid=f.pyGid||(list[0]&&String(list[0].id))||'';if(!f.pyGid&&gid)f.pyGid=gid;var gw=game(gid),names=gw? [A.tname(gw.g.away),A.tname(gw.g.home)]:[];
      h+='<div class="py-box" role="group" aria-label="Parlay">';
      (f.legs||[]).forEach(function(L,i){h+='<div class="py-leg"><span>'+(i+1)+'. '+e(L.lab)+'</span><button type="button" class="py-x" '+dq+'="pydel" data-v="'+i+'" aria-label="Remove leg">\u00d7</button></div>'});
      h+='<select class="sb-in b27-in rq-in" '+di+'="pyGid" aria-label="Add a game">'+list.map(function(g){var id=String(g.id),lab=A.tname(g.g.away)+' at '+A.tname(g.g.home)+(g.g.day?', '+ (A.dateET?A.dateET(g.g):g.g.day):'');return '<option value="'+e(id)+'"'+(id===String(f.pyGid)?' selected':'')+'>'+e(lab)+'</option>'}).join('')+'</select>';
      if(names.length===2&&(f.legs||[]).length<5){var info=linePosted(gw);h+='<div class="py-add">';names.forEach(function(n,i){var pts=linePtsOf(info,n),none=SHARED_UI.linePrice(gw.g,n,{kind:'none'});if(pts!=null)h+='<button type="button" class="b27-chip" '+dq+'="pyadd" data-v="spread:'+i+'">'+e(n+' '+lineBit(pts))+'</button>';if(none)h+='<button type="button" class="b27-chip" '+dq+'="pyadd" data-v="ml:'+i+'">'+e(n+' '+none.label)+'</button>'});h+='</div>'}
      h+='<div class="note">2 to 5 legs. The parlay hits only if every leg hits.</div>';
      if(f.lineFair)h+='<div class="ln-fair">Fair: about '+e(f.lineFair.label)+(lineLop(f.odds,f.lineFair)?' <span class="ln-lop">Lopsided</span>':'')+'</div>';
      if((f.legs||[]).length>=2)h+='<div class="ln-terms">'+e(f.text||'')+'</div>'+(f.legs||[]).map(function(L){return '<div class="py-leg">'+e(L.lab)+'</div>'}).join('');
      return h+'</div>'+(bodyOnly?'':'</div>')}
    function rqChipOdds(){return [[1,1],[2,1],[3,1],[4,1]]}
    function rqAmts(){return (A.amounts||[]).filter(function(a){return +a!==50})}
    /* Unmatched text shows a real expiry (3 days) and Not sure yet. Those visible choices are the pick; a matched game still uses tipoff and end of game until the person changes them. */
    function freeShown(f,hasGame){if(hasGame||!f||!String(f.text||'').trim())return;if(!f.expPick&&f.mode==='start'){f.mode='d';if(!(+f.n>0))f.n=3}if(!f.whenPick)f.wk='unknown'}
    function commitRqSelect(t){if(!t||!t.dataset)return;var k=t.dataset.rqIn,v=t.value,f=S.f;if(k==='mode'){if(f.mode===v&&f.expPick)return;f.mode=v;f.expPick=true}else if(k==='wkMenu'){var wk=v==='date'||v==='season'||v==='game'?v:'unknown';if(f.whenPick&&f.wk===wk)return;f.whenPick=true;f.wk=wk;if(wk!=='date')f.est=''}else return;A.render()}
    /* Parlay, Moneyline and Change the line sit on one row. Each opens its own options underneath, and only one stays open. */
    function betTools(f,g){var cur=f.tool||'',btn=function(k,lab){return '<button type="button" class="rq-tool" data-rq="tool" data-v="'+k+'" aria-pressed="'+(cur===k?'true':'false')+'">'+e(lab)+'</button>'};
      var h='<div class="rq-tools" role="group" aria-label="Bet type">'+btn('parlay','Parlay')+btn('ml','Moneyline')+btn('line','Change the line')+'</div>';
      if(cur==='parlay')h+='<div class="rq-tool-body">'+pyBox(f,'rq',true)+'</div>';
      else if(cur==='ml')h+='<div class="rq-tool-body"><div class="qbs-s">'+(g&&g.g&&SHARED_UI.mlQuote(g.g)?SHARED_UI.mlPills(g.g,{e:e,name:function(s){return A.tname(s)},stake:f.amt||5,on:function(i){return f.lineKind==='ml'&&(f.lineSide?1:0)===i},attr:function(i){return 'data-rq="lml" data-v="'+i+'"'}}):'<span class="note">No moneyline on this game.</span>')+'</div></div>';
      else if(cur==='line')h+='<div class="rq-tool-body">'+lineBox(f,g,true)+'</div>';
      return h}
    function form(){var f=S.f,now0=Date.now(),G=games().filter(function(x){var st=Date.parse(x.start)||0,ws=f.cov==='2h'?st+HALF_MS:st;if(String(x.id)===String(f.gid))return true;if(x.status==='final'||st>=now0+7*86400000)return false;if(f.cov==='2h')return !(x.period&&+x.period>=2)&&now0<ws;return x.status==='scheduled'&&now0<ws}),g=tipOf(f),me=A.me(),nOth=A.others().length;
      var timed=!!(g&&Date.parse(g.start));if(!f.expPick&&timed)f.mode='start';freeShown(f,timed);
      /* same template as Write it Up: header, Select all / Clear, numbered questions, Amount + Odds, summary, big button. Identity stays on Profile. */
      var h='<div class="card b27-form rq-form" id="rqForm">'+SHARED_UI.entryHead('rq')+(S.edit?'<div class="note">Editing this request. Nothing is posted until you save.</div>':'');
      /* STEP10: Select all / Clear sit right-aligned on the same line as question 1; the Stoop buttons stay on the next row */
      h+=(A.others().length%4?rqQ(1,'rqwho','Who is it open to?'):'<div class="rq-qrow">'+rqQ(1,'rqwho','Who is it open to?')+'<div class="s27-sel b27-selbar"><button type="button" class="s27-selb" data-rq="all"><span class="f">Select all</span><span class="s">All</span></button><button type="button" class="s27-selb" data-rq="clear">Clear</button></div></div>')+chips(f);
      h+=rqQ(2,'text','What\u2019s the bet?')+'<input class="sb-in b27-in rq-in" data-rq-in="text" maxlength="'+(A.maxText||140)+'" autocomplete="off" placeholder="e.g. Virginia -3" value="'+e(f.text||'')+'" aria-label="What\u2019s the bet?">'+betTools(f,g);
      var oc=!rqChipOdds().some(function(o){return +f.odds[0]===o[0]&&+f.odds[1]===o[1]})||f.oddC;
      h+='<div class="b27-ao"><div class="b27-ao-c">'+rqQ(3,'rqamt','Amount')+'<div class="b27-amts" role="group" aria-label="Amount">'+rqAmts().map(function(a){return '<button type="button" class="b27-amt" data-rq="amt" data-v="'+a+'" aria-pressed="'+(!f.amtC&&f.amt===a)+'">'+a+'</button>'}).join('')+'<button type="button" class="b27-amt cu" data-rq="amtc" aria-pressed="'+!!f.amtC+'">Custom</button></div>'+(f.amtC?'<div class="b27-cw"><input class="sb-in b27-in rq-in" data-rq-in="amtTxt" inputmode="numeric" placeholder="Whole number" value="'+e(f.amtTxt)+'" aria-label="Custom amount"></div>':'')+'</div>';
      h+='<div class="b27-ao-c">'+rqQ(4,'rqodds','Odds')+'<div class="b27-chips" role="group" aria-label="Odds">'+rqChipOdds().map(function(o){var on=!f.oddC&&+f.odds[0]===o[0]&&+f.odds[1]===o[1];return '<button type="button" class="b27-chip" data-rq="odds" data-v="'+o[0]+'-'+o[1]+'" aria-pressed="'+on+'">'+(o[0]===1?'Even':o[0]+'-'+o[1])+'</button>'}).join('')+'<button type="button" class="b27-chip cu" data-rq="oddc" aria-pressed="'+!!oc+'">Custom</button></div>'+(oc?'<div class="b27-cw"><input class="sb-in b27-in rq-in" data-rq-in="oddTxt" placeholder="e.g. 7-2 or 10-1" value="'+e(f.oddTxt||(f.odds[0]+'-'+f.odds[1]))+'" aria-label="Custom odds"></div>':'')+'</div></div>';
      /* STEP10: N works with no picks (empty = open to any Stoop, up to N); with picks N is clamped to the picked count */
      var nTo=f.to.length,nOth0=A.others().length,cap=nTo||nOth0,sl=f.sAll?cap:f.slots?Math.max(1,Math.min(f.slots,cap)):(nTo||1);
      h+=rqQ(5,'rqmany','Open to how many Stoops?')+'<div class="rq-spots"><button type="button" class="btn sec" data-rq="fslot-"'+(sl<=1?' disabled':'')+' aria-label="Fewer">\u2212</button><b>'+(f.sAll?'All':nTo?sl+' of '+nTo:sl+' of any')+'</b><button type="button" class="btn sec" data-rq="fslot+"'+(sl>=cap?' disabled':'')+' aria-label="More">+</button><button type="button" class="btn sec'+(f.sAll?' on':'')+'" data-rq="fslotall" aria-pressed="'+!!f.sAll+'">All</button><span class="note">each acceptance is its own bet</span></div>';
      h+='<div class="rq-exp-row">'+rqQ(6,'rqexp','Expires')+'<div class="rq-exp">'+(f.mode==='start'?'':f.mode==='at'?'<input class="sb-in b27-in rq-in" type="datetime-local" data-rq-in="at" value="'+e(f.at)+'" aria-label="Expires at">':'<input class="sb-in b27-in rq-in rq-num" data-rq-in="n" inputmode="numeric" value="'+e(f.n)+'" aria-label="Expires in">')+'<select class="sb-in b27-in rq-in rq-unit" data-rq-in="mode" aria-label="Unit">'+[['m','minutes'],['h','hours'],['d','days'],['w','weeks'],['mo','months'],['start','Tipoff'],['at','exact date/time']].map(function(m){return '<option value="'+m[0]+'"'+(f.mode===m[0]?' selected':'')+'>'+m[1]+'</option>'}).join('')+'</select></div>'+(f.mode==='start'?(timed?'<div class="note">It also closes by itself at tip-off.</div>':'<div class="note">Pick an expiry. Tipoff needs a matched game.</div>'):'')+'</div>';
      var rqHasGame=timed,rqKind=!f.whenPick?(timed?'game':'unknown'):(f.wk==='date'||f.wk==='season'||f.wk==='game'?f.wk:'unknown');
      h+=SHARED_UI.whenBox({e:e,kind:rqKind,est:f.est,seasonId:A.seasonId?A.seasonId():'',step:'7',game:true,gameNote:f.parlay&&f.legs&&f.legs.length?'Settles when the last game ends.':'',inputId:'rqEst',pick:function(id){return 'data-rq="when" data-v="'+id+'"'},dateAttr:'data-rq-in="est"'});
      var pv=rqPreview(f);
      h+='<div class="rq-prev" id="rqEx">'+pv.ex+'</div>';
      if(S.msg)h+='<div class="'+(S.bad?'b27-bad-t':'good')+' rq-msg" role="status">'+e(S.msg)+'</div>';
      return h+'<button type="button" class="btn b27-big rq-send" data-rq="send"'+(S.busy||!A.canWrite()?' disabled':'')+'>'+(S.edit?'Save changes':'Request bet')+'</button>'+(S.edit?'<button type="button" class="btn sec rq-send" data-rq="unedit">Stop editing</button>':'')+'</div>'}
    
function sbOnce(s){var n=0;return String(s||'').replace(/Stoopid bet:\s*/gi,function(){n++;return n===1?'Stoopid bet: ':''}).replace(/\.\s*,/g,',')}
    function sbIs(s){s=String(s||'');if(/Stoopid bet:/i.test(s))return true;try{if(typeof sbParse==='function'&&sbParse(s))return true}catch(e){}return false}
    function sbPay(match,creator,acceptor,winC,winO){if(sbIs(match))return creator+' wins '+winC+'. Otherwise, '+acceptor+' wins '+winO+'.';return sbOnce(match).replace(/\.+$/,'')+', '+creator+' wins '+winC+'. Otherwise, '+acceptor+' wins '+winO+'.'}
function oddsTxt(o){o=o||[1,1];return +o[0]===+o[1]?'even':o[0]+'-'+o[1]}
    function rqMoney(n){var x=Math.round(Number(n)*100)/100;if(!(x>0))return '';return '$'+(Math.abs(x-Math.round(x))<0.001?String(Math.round(x)):x.toFixed(2))}
    function rqWin(amt,a,b){a=+a||1;b=+b||1;return Math.max(1,Math.floor((amt*a*2+b)/(2*b)))}
    function rqTeam(lab){return String(lab||'').replace(/\s*[+-]\d+(?:\.\d+)?$/,'').trim()}
    function rqExp(f){if(f.mode==='start')return 'Tip';var n=+f.n,u={m:'m',h:'h',d:'d',w:'w',mo:'mo'};if(u[f.mode]&&n>0)return n+u[f.mode];if(f.mode==='at'&&f.at){var d=new Date(f.at);if(!isNaN(d)){var mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];return mo+' '+d.getDate()}}return ''}
    function expTxt(r,now){var ws=winStart(r,game(r.gid));return r.exp>=ws?(r.cov==='2h'?'when the 2nd half starts':'at tipoff'):'in '+left(r.exp-now)}
    function ifTxt(r,side){var s=String(side||''),k=r.k;if(k==='txt')return s?'If '+s+' hits':'If it misses';if(k==='ou')return 'If it goes '+s;s=s.replace(/\s[+-]\d+(\.\d+)?$/,k==='sp'?'$&':'');return 'If '+s+(k==='sp'?' covers':' wins')}
    function rqExpSaved(r){var ws=winStart(r,game(r.gid));if(ws<Infinity&&r.exp>=ws-1500)return r.cov==='2h'?'2nd half':'Tip';if(!r.exp)return '';var ms=r.exp-Date.now();return ms<=0?'closed':left(ms)}
    function personName(id){return (A.real||A.nick)(id)}
    function openTo(r){var to=r.to||[],n=to.length,sn=slots(r),nOth=A.others().length;if(!n)return 'any Stoop';if(n===1)return personName(to[0]);if(n>=nOth)return 'all Stoops';if(sn<n)return sn+' of '+n+' Stoops';return to.map(personName).join(', ')}
    function faceOf(r){if(r.legs&&r.legs.length>=2)return 'Parlay · '+r.legs.length+' legs';var lf=lineFace(r);if(lf)return lf;if(r.k==='ou'&&r.lab&&r.other)return sl(r.lab)+' v '+sl(r.other);if(r.k==='sp'&&r.lab&&r.other)return sl(String(r.lab).replace(/^2nd half:\s*/i,''))+' v '+rqTeam(sl(r.other));var t=sl(String(r.txt||r.lab||'').replace(/\s+/g,' ').trim());t=t.replace(/\s*\([^)]*\bvs\b[^)]*\)/ig,'').replace(/\s*·\s*\d+\s*-\s*\d+\s*$/,'').trim();return t||'the bet'}
    function payOf(r){if(!(+r.amt>0))return '';var o=r.odds||[1,1],creator=personName(r.by)||'You',n=(r.to||[]).length,acceptor=n===1?personName(r.to[0]):'the Stoop who accepts',winC=rqMoney(rqWin(r.amt,o[0],o[1])),winO=rqMoney(r.amt);if(r.legs&&r.legs.length>=2)return creator+' wins '+winC+' if every leg hits, '+acceptor+' wins '+winO+' otherwise.';var rd=r.rd;if(rd&&rd.ml&&rd.t&&rd.o){var cash=SHARED_UI.mlCash(r.amt,o[0],rd.fav===rd.t);return creator+' risks '+rqMoney(cash.risk)+' to win '+rqMoney(cash.win)+' if '+rd.t+' wins. '+acceptor+' risks '+rqMoney(cash.win)+' to win '+rqMoney(cash.risk)+' if '+rd.o+' wins.'}if(rd&&rd.k==='ml'&&rd.t&&rd.o)return creator+' wins '+winC+' if '+rd.t+' wins, '+acceptor+' wins '+winO+' if '+rd.o+' wins.';if(rd&&rd.k==='spread'&&rd.t&&rd.o)return creator+' wins '+winC+' if '+rd.t+' covers, '+acceptor+' wins '+winO+' if '+rd.o+' covers.';if(r.k==='sp'&&r.lab&&r.other)return creator+' wins '+winC+' if '+rqTeam(sl(r.lab))+' covers, '+acceptor+' wins '+winO+' if '+rqTeam(sl(r.other))+' covers.';if(r.k==='ou'&&r.lab&&r.other)return creator+' wins '+winC+' if '+sl(r.lab)+', '+acceptor+' wins '+winO+' if '+sl(r.other)+'.';return creator+' wins '+winC+'. Otherwise, '+acceptor+' wins '+winO+'.'}
    function explain(r){var o=r.odds||[1,1],face=faceOf(r),odds=+o[0]===+o[1]||String(face).indexOf(o[0]+'-'+o[1])>=0?'':' · '+o[0]+'-'+o[1],stake=(+r.amt>0?rqMoney(r.amt)+' ':'')+face+odds,exp=rqExpSaved(r),meta=['Open to '+openTo(r),lineDayLbl(r),exp?'Exp: '+exp:''].filter(Boolean).join(' · '),legs=(r.legs&&r.legs.length>=2)?r.legs.map(function(L){return '<div>'+e(parlayLegLine(L))+'</div>'}).join(''):'',pay=payOf(r);return '<div class="rq-face"><b>'+e(stake)+'</b>'+legs+(meta?'<div>'+e(meta)+'</div>':'')+(pay?'<div>'+e(pay)+'</div>':'')+'</div>'}
    function rqQ(n,tip,label){return '<div class="b27-q"><button type="button" class="s27-tipk" data-tip="'+tip+'" aria-expanded="false" onfocus="s27TipShow(this)" onclick="s27WhenClick(this)">'+n+'. '+label+'</button></div>'}
    function rqPreview(f){var g=game(f.gid),p=pick(g&&g.g,f),me=A.me(),amt=f.amtC?(+f.amtTxt>0?+f.amtTxt:null):f.amt,o=f.odds||[1,1];
      var nTo=f.to.length,nOth=A.others().length,nm=function(id){return (A.real||A.nick)(id)};
      var who=nTo===1?nm(f.to[0]):nTo?(nTo>=nOth?'all Stoops':f.to.map(nm).join(', ')):'any Stoop';
      var acceptor=nTo===1?who:'the Stoop who accepts',creator=nm(me)||'You';
      var typed=String(f.text||'').trim();
      if(!p&&!typed&&!(amt>0))return {sum:'',ex:''};
      var half=f.cov==='2h'?'2nd half: ':'',match=sbOnce(sl(typed||'Write the bet'));
      if(p&&(p.k==='sp'||p.k==='ou')&&p.lab&&p.other)match=sl(half+p.lab+' vs '+p.other);
      var stake=amt>0?rqMoney(amt):'',odds=(+o[0]===+o[1])||String(match).indexOf(o[0]+'-'+o[1])>=0?'':' · '+o[0]+'-'+o[1];
      var line1=sl(creator+': '+match+(stake?' · '+stake:'')+odds);
      var date=g&&A.dateET?A.dateET(g):'',exp=rqExp(f);
      var line2=[date,'Open to '+who,exp?'Exp: '+exp:''].filter(Boolean).join(' · ');
      var line3='';
      if(f.lineKind==='ml'&&f.rd&&f.rd.ml&&amt>0){var cashP=SHARED_UI.mlCash(amt,o[0],f.rd.fav===f.rd.t);line3=creator+' risks '+rqMoney(cashP.risk)+' to win '+rqMoney(cashP.win)+' if '+f.rd.t+' wins. '+acceptor+' risks '+rqMoney(cashP.win)+' to win '+rqMoney(cashP.risk)+' if '+f.rd.o+' wins.'}
      else if(p&&amt>0){var winC=rqMoney(rqWin(amt,o[0],o[1])),winO=rqMoney(amt);
        if(p.k==='sp')line3=rqTeam(p.lab)+' covers, '+creator+' wins '+winC+'. '+rqTeam(p.other)+' covers, '+acceptor+' wins '+winO+'.';
        else if(p.k==='ou')line3=p.lab+', '+creator+' wins '+winC+'. '+p.other+', '+acceptor+' wins '+winO+'.';
        else line3=sbPay(sbIs(match)?match:(p.lab||match),creator,acceptor,winC,winO)}
      return {sum:'',ex:'<b>'+e(line1)+'</b>'+(line2?'<div>'+e(line2)+'</div>':'')+(line3?'<div>'+e(line3)+'</div>':'')}}
    function rqPaintExplain(){var box=rqPreview(S.f),x=document.getElementById('rqEx');if(x)x.innerHTML=box.ex}
    function nmOf(id){return (A.real||A.nick)(id)}
    function descLine(r){var t=sl(String(r.txt||r.lab||'').replace(/\s+/g,' ').trim()),o=r.odds||[1,1];
      if(+o[0]===+o[1])return t;
      var od=o[0]+'-'+o[1];if(t.toLowerCase().indexOf(od.toLowerCase())>=0)return t;return (t?t+' ':'')+'at '+od}
    function vsRight(r,acc){if(acc)return nmOf(acc);if(r.to&&r.to.length===1)return nmOf(r.to[0]);var n=slots(r)||(r.to?r.to.length:0);return 'Open to '+n+' stoop'+(n===1?'':'s')}
    function parlayLegLine(L){if(!L)return '';if(L.kind==='spread'&&L.t&&L.o&&L.l!=null)return L.t+' '+lineBit(L.l)+' v '+L.o;if(L.t&&L.o)return L.t+' v '+L.o;return L.lab||''}
    function parlayDay(r){var legs=(r.legs||[]).slice().sort(function(a,b){return String(a.start||a.d||'').localeCompare(String(b.start||b.d||''))}),d=legs[0]&&legs[0].d||'';if(/^\d{4}-\d{2}-\d{2}/.test(d)){var p=String(d).split('-'),mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]-1];return mo+' '+Number(p[2])}return String(r.date||'').replace(/,?\s+20\d\d$/,'').replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+/i,'').trim()}
    function parlayWho(r,acc){if(acc)return nmOf(acc);if(r.to&&r.to.length===1)return nmOf(r.to[0]);var n=slots(r)||(r.to?r.to.length:0)||1;return n+' Stoop'+(n===1?'':'s')}
    function legLine(L){if(!L)return '';if(L.kind==='spread'&&L.t&&L.o&&L.l!=null)return L.t+' '+lineBit(L.l)+' v '+L.o;if((L.kind==='total'||L.k==='total')&&L.l!=null){var side=L.ou==='u'?'Under':'Over';return side+' '+L.l+' v '+(side==='Over'?'Under':'Over')+' '+L.l}if(L.kind==='ml'&&L.t&&L.o)return L.t+' (no points) v '+L.o;if(L.t&&L.o)return L.t+' v '+L.o;return ''}
    function expLbl(r){if(!r)return '';if(r.exp){var e=rqExpSaved(r);if(e)return e}if(r.wk==='season')return 'Season';if(r.wk==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(r.est||'')){var p=String(r.est).split('-'),mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]-1];return mo+' '+Number(p[2])}if(r.wk==='game')return r.cov==='2h'?'2nd half':'Tip';return ''}
    function freeDay(ms){try{var parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric'}).formatToParts(new Date(ms)),mo='',da='';parts.forEach(function(p){if(p.type==='month')mo=p.value;else if(p.type==='day')da=p.value});return mo&&da?mo+' '+da:''}catch(e){return ''}}
    function copyWho(r,kind,acc){if(kind==='bet'){var rights=(r.to||[]).map(nmOf).filter(Boolean);if(rights.length)return rights.join(', ')}if(kind==='acc')return vsRight(r,acc);if(r.legs&&r.legs.length>=2)return parlayWho(r,null);return vsRight(r,acc)}
    function parlayText(r,kind,acc){return copyText(r,kind,acc)}
    function lineDayLbl(r){var rd=r&&r.rd,d=rd&&rd.d||'';if(/^\d{4}-\d{2}-\d{2}/.test(d)){var p=String(d).split('-'),mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]-1];return mo+' '+Number(p[2])}if(r&&r.legs&&r.legs.length>=2)return parlayDay(r);return String(r&&r.date||'').replace(/,?\s+20\d\d$/,'').replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+/i,'').trim()}
    function lineFace(r){var rd=r&&r.rd;if(!rd)return '';if(rd.k==='total'&&rd.l!=null){var side=rd.ou==='u'?'Under':'Over';return side+' '+rd.l+' v '+(side==='Over'?'Under':'Over')+' '+rd.l}if(!rd.t||!rd.o)return '';if(rd.k==='spread'){var n=+rd.l;return rd.t+' '+(n===0?'PK':(n>0?'+':'')+n)+' v '+rd.o}if(rd.k==='ml')return rd.ml?rd.t+' ML v '+rd.o:rd.t+' (no points) v '+rd.o;return ''}
    /* A picked spread stores "Arizona -4" / "UConn +4" even when no reading was saved. A written sentence stays as written. */
    function spreadFromLab(r){if(!r||r.k!=='sp'||!r.lab)return '';var m=/^(.+?)\s+([+-]?\d+(?:\.\d+)?|pk)$/i.exec(String(r.lab).trim());if(!m)return '';var opp=String(r.other||'').replace(/\s+[+-]?\d+(?:\.\d+)?$/i,'').replace(/\s+pk$/i,'').trim();if(!opp)return '';var n=/pk/i.test(m[2])?0:+m[2];if(!isFinite(n))return '';return m[1]+' '+(n===0?'PK':(n>0?'+':'')+n)+' v '+opp}
    /* "Yale -4.5 vs Vermont +4.5, Nov 18" is one spread. Keep the first side and lift the date off the line. */
    function mirroredFace(text){var t=String(text||'').replace(/\s+/g,' ').trim();var m=/^(.*?)\s+([+-]\d+(?:\.\d+)?)\s+(?:vs\.?|v\.?|versus)\s+(.*?)\s+([+-]\d+(?:\.\d+)?)(?:\s*,\s*(.+))?$/i.exec(t);if(!m)return null;var a=+m[2],b=+m[4];if(!isFinite(a)||!isFinite(b)||Math.abs(a+b)>=0.05)return null;var day=String(m[5]||'').replace(/,?\s+20\d\d$/,'').trim();if(day&&!/^[A-Z][a-z]{2,8}\.?\s+\d{1,2}$/.test(day))day='';return {face:m[1].trim()+' '+(a===0?'PK':(a>0?'+':'')+a)+' v '+m[3].trim(),day:day}}
    function betFace(r){var face=lineFace(r)||spreadFromLab(r),extra='';if(!face){var mir=mirroredFace(r&&(r.txt||r.lab));if(mir){face=mir.face;extra=mir.day}}return {face:face,extra:extra}}
    function moneyLine(r){var o=r.odds||[1,1],od=+o[0]===+o[1]?'':' \u00b7 '+o[0]+'-'+o[1],right=copyWho(r,'bet')||'';return '$'+r.amt+' '+nmOf(r.by)+' v '+right+(r.each?' each':'')+od}
    function settledCopy(r){var got=betFace(r),face=got.face,day=lineDayLbl(r)||got.extra||'',win=r.winName?(' \u00b7 '+r.winName+' won'):'',mark=r.wash?'\uD83D\uDCA6':'\uD83C\uDF89';var head=r.wash?(mark+' Bet #'+r.n+' \u00b7 Wash '+mark):(mark+' Bet #'+r.n+' \u00b7 Settled'+win+' '+mark);var lines=[head];if(face)lines.push(face);else if(r.txt||r.lab)lines.push(String(r.txt||r.lab).replace(/\s+/g,' ').trim().replace(/\s+(?:vs\.?|versus)\s+/ig,' v '));if(day)lines.push(day);if(r.amt!=null&&r.amt!=='')lines.push(moneyLine(r));if(r.wash)lines.push('Result: \uD83D\uDCA6: nobody owes anything');return lines.filter(Boolean).join('\n')}
    /* Ready for someone else to settle: the viewer is in the bet, and the backer (Only X can enter result) has to enter it.
       Four lines. Winner is the name the page already suggested from the final, or omitted when there is no result or it is a push. */
    function settleWaitText(r){if(!r||!r.settleFor||r.n==null)return '';var face=lineFace(r),day=lineDayLbl(r),body=[];
      if(r.legs&&r.legs.length>=2){body.push('Parlay \u00b7 '+r.legs.length+' legs');r.legs.forEach(function(L){var x=legLine(L);if(x)body.push(x)})}
      else if(face)body.push(face);
      if(!body.length)return '';
      var win=r.winName&&r.winName!=='Wash'?String(r.winName):'';
      var lines=['\uD83C\uDF89 Bet #'+r.n+(win?' \u00b7 '+win+' Won':'')+' \uD83C\uDF89','Hey '+r.settleFor+', settle this bet!'].concat(body);
      if(day)lines.push(day);
      return lines.join('\n')}
    /* One copy for the form, the open-request card, an accepted bet, and a parlay. Built from the stored game reading, stake, names, odds and expiry. The saved sentence is not the source. */
    function acceptedCopy(r,acc){var o=r.odds||[1,1],left=nmOf(r.by),right=copyWho(r,'acc',acc),od=+o[0]===+o[1]?'':' \u00b7 '+o[0]+'\u2013'+o[1],lines=['\uD83D\uDCA5 $'+r.amt+' '+left+' v '+right+od+' \u2014 Accepted \uD83D\uDCA5'];
      if(r.legs&&r.legs.length>=2){lines.push('Parlay \u00b7 '+r.legs.length+' legs');r.legs.forEach(function(L){var x=legLine(L);if(x)lines.push(x)})}
      else if(r.rd&&r.rd.ml&&r.rd.t&&r.rd.o){var favPick=r.rd.fav===r.rd.t,cash=SHARED_UI.mlCash(r.amt,o[0],favPick);lines.push(r.rd.t+' v '+r.rd.o);lines.push('ML \u00b7 '+left+' wins '+rqMoney(cash.win)+' \u00b7 '+right+' wins '+rqMoney(cash.risk))}
      else{var got=betFace(r),face=got.face||String(r.txt||r.lab||'').replace(/\s+/g,' ').trim();if(face)lines.push(face)}
      var day=lineDayLbl(r);if(day)lines.push(day);return lines.filter(Boolean).join('\n')}
    function copyText(r,kind,acc){if(!r)return '';if(kind==='settle')return settleWaitText(r);if(kind==='settled')return settledCopy(r);if(kind==='acc')return acceptedCopy(r,acc);
      if(r.rd&&r.rd.ml&&r.rd.t&&r.rd.o){var mo=r.odds||[1,1],md=+mo[0]===+mo[1]?'':' \u00b7 '+mo[0]+'\u2013'+mo[1],mlL=nmOf(r.by),mlR=copyWho(r,kind,acc),mlBomb='\uD83D\uDCA3 $'+r.amt+' '+mlL+' v '+mlR+md+' \uD83D\uDCA3',favPick=r.rd.fav===r.rd.t,cash=SHARED_UI.mlCash(r.amt,mo[0],favPick),mlPay='ML \u00b7 '+mlL+' wins '+rqMoney(cash.win)+' \u00b7 '+mlR+' wins '+rqMoney(cash.risk),mlDay=lineDayLbl(r),mlExp=expLbl(r),mlWhen=[mlDay,mlExp?'Exp: '+mlExp:''].filter(Boolean).join(' \u00b7 '),mlLines=[mlBomb,r.rd.t+' v '+r.rd.o,mlPay];if(mlWhen)mlLines.push(mlWhen);if(kind==='acc')mlLines.push('Accepted');else if(kind==='del')mlLines.push('Deleted');else if(kind==='close')mlLines.push('Closed \u00b7 '+tk(r).length+' stoops in');return mlLines.join('\n')}
      var o=r.odds||[1,1],od=+o[0]===+o[1]?'':' \u00b7 '+o[0]+'-'+o[1],left=nmOf(r.by),right=copyWho(r,kind,acc),bomb='\uD83D\uDCA3 $'+r.amt+' '+left+' v '+right+od+' \uD83D\uDCA3',exp=expLbl(r),day=lineDayLbl(r),last=[day,exp?'Exp: '+exp:''].filter(Boolean).join(' \u00b7 '),lines=[bomb];
      if(r.legs&&r.legs.length>=2){var legs=r.legs.map(legLine).filter(Boolean);if(!legs.length)return '';lines.push('Parlay \u00b7 '+r.legs.length+' legs');legs.forEach(function(x){lines.push(x)})}
      else{var got=betFace(r),face=got.face;if(!day&&got.extra){day=got.extra;last=[day,exp?'Exp: '+exp:''].filter(Boolean).join(' \u00b7 ')}if(!face&&r.free){face=String(r.txt||r.lab||'').replace(/\s+/g,' ').trim();if(!day&&r.exp){day=freeDay(r.exp);last=[day,exp?'Exp: '+exp:''].filter(Boolean).join(' \u00b7 ')}}if(!face)return '';lines.push(face)}
      if(last)lines.push(last);
      if(kind==='acc')lines.push('Accepted');else if(kind==='del')lines.push('Deleted');else if(kind==='close')lines.push('Closed \u00b7 '+tk(r).length+' stoops in');
      return lines.filter(Boolean).join('\n')}
    function waText(r,kind,acc){var lined=copyText(r,kind,acc);if(lined)return lined;var left=nmOf(r.by),right=vsRight(r,kind==='acc'?acc:null),money='$'+r.amt+' '+left+' v '+right,desc=descLine(r);
      if(sbIs(r.txt)||sbIs(r.lab)){var o=r.odds||[1,1],od=+o[0]===+o[1]?'':' · '+o[0]+'-'+o[1],bet=sbOnce(sl(String(r.txt||r.lab||'').replace(/\s+/g,' ').trim())),whoM=money;
        if(kind==='bet'){var rights=(r.to||[]).map(nmOf).filter(Boolean),rightB=rights.length?rights.join(', '):right;whoM='$'+r.amt+' '+left+' v '+rightB}
        var lines=[whoM+od,bet];
        if(kind==='acc')lines.push('Accepted');
        else if(kind==='del')lines.push('Deleted');
        else if(kind==='close')lines.push('Closed · '+tk(r).length+' stoops in');
        else if(kind!=='bet')lines.push('Expires '+expTxt(r,Date.now()));
        return lines.filter(Boolean).join('\n')}
      if(kind==='bet'){var rights2=(r.to||[]).map(nmOf).filter(Boolean),rightB2=rights2.length?rights2.join(', '):right,moneyB='$'+r.amt+' '+left+' v '+rightB2;return ['💥 '+moneyB+' 💥',desc].filter(Boolean).join('\n')}
      if(kind==='acc')return ['💥 '+money+' — Accepted 💥',desc].filter(Boolean).join('\n');
      if(kind==='del')return ['Bet Request Deleted: '+money,desc].filter(Boolean).join('\n');
      if(kind==='close')return ['Bet Request Closed: '+money,desc,tk(r).length+' stoops in'].filter(Boolean).join('\n');
      return ['💣 '+money+' 💣',desc,'Expires '+expTxt(r,Date.now())].filter(Boolean).join('\n')}
    function noteCopy(ok){if(ok===true){S.msg='';S.bad=false;S.fb=null;if(!S.copyNoted){S.copyNoted=true;try{if(typeof betCopied==='function')betCopied()}catch(e){}}return}if(ok===false){S.msg='Could not copy.';S.bad=true;return}if(S.msg==='Sending…'||S.msg==='Accepting…')S.msg=''}
    function say(txt,base){S.copied=null;S.fb=null;S.posted=false;S.base=base;S.copyNoted=false;copy(txt)}
    function copy(t,done){S.copyNoted=false;var fin=function(ok){S.copied=ok;S.fb=ok?null:t;noteCopy(ok);if(done)done(ok);A.render()};var fb=function(){var ok=false;try{var ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();ok=!!document.execCommand('copy');ta.remove()}catch(x){}fin(ok)};
      try{if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(function(){fin(true)},fb);return}}catch(x){}fb()}
    function armExpiry(){if(S.expT)clearTimeout(S.expT);var now=Date.now(),soon=null;
      S.list.forEach(function(r){if(r&&r.status==='open'&&r.exp>now&&(soon==null||r.exp<soon))soon=r.exp});
      if(soon==null)return;var wait=Math.max(400,Math.min(soon-now+80,30000));
      S.expT=setTimeout(function(){S.expT=0;try{if(!A.watchExpiry||A.watchExpiry())A.render()}catch(e){}armExpiry()},wait)}
    function sees(r){var me=A.me();if(!me||!r)return false;if(r.by===me)return true;if(!r.to||r.to.indexOf(me)<0)return false;if((r.dec||[]).indexOf(me)>=0)return false;if(tk(r).indexOf(me)>=0)return false;return true}
    function shown(r,now){return live(r,now)&&sees(r)}
    function pinned(only,mark){if(A.me()&&!S.loading&&(!S.at||Date.now()-S.at>20000))setTimeout(load,0);dropArm();var now=Date.now(),L=S.list.filter(function(r){return shown(r,now)}).filter(function(r){return !A.reqMatch||A.reqMatch(r)}).sort(function(a,b){return a.exp-b.exp});
      if(mark){markOpenSeen();try{paint()}catch(e){}}
      armExpiry();
      function noteCard(){return S.msg?'<div class="card '+(S.bad?'b27-bad':'b27-ok')+'" role="status">'+e(S.msg)+(S.fb?'<pre class="rq-fb">'+e(S.fb)+'</pre><div class="rq-act"><button type="button" class="btn" data-rq="wa">Copy</button></div>':'')+'</div>':''}
      if(!L.length)return noteCard()+(only?'<div class="card note rq-none">No pending requests right now.</div>':'');
      return noteCard()+'<div class="rq-pin" id="rqPinned"><h2 class="rq-h">Awaiting acceptance</h2><p class="note">Nothing is agreed until someone accepts. Expired or filled requests leave this list.</p><div class="rq-grid">'+L.map(function(r){return card(r,now)}).join('')+'</div></div>'}
    /* STEP10: view('open') = the Open tab (open request cards only); view() = the Request tab (form only) */
    function seenKey(){return 'rq_open_seen:'+String(A.seenScope?A.seenScope():(A.me()||'guest'))}
    function seenIds(){try{var ls=typeof localStorage!=='undefined'?localStorage:null;if(!ls)return [];var a=JSON.parse(ls.getItem(seenKey())||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
    function markOpenSeen(){var now=Date.now(),ids=S.list.filter(function(r){return shown(r,now)}).map(function(r){return r.id});
      try{if(typeof localStorage!=='undefined')localStorage.setItem(seenKey(),JSON.stringify(ids.slice(-300)))}catch(e){}}
    function view(mode){dropArm();var now=Date.now();if(!S.at||now-S.at>20000)setTimeout(load,0);
      if(mode==='open'||mode==='all'){markOpenSeen();try{paint()}catch(e){}}
      armExpiry();
      var L=S.list.filter(function(r){return shown(r,now)}).sort(function(a,b){return a.exp-b.exp}),me=A.me();
      var h='';if(S.msg&&!S.f.gid)h+='<div class="card '+(S.bad?'b27-bad':'b27-ok')+'" role="status">'+e(S.msg)+(S.fb?'<pre class="rq-fb">'+e(S.fb)+'</pre><div class="rq-act"><button type="button" class="btn" data-rq="wa">Copy</button></div>':'')+'</div>';
      if(mode==='open')return h+(L.length?'<h2 class="rq-h">Pending requests</h2><div class="rq-grid">'+L.map(function(r){return card(r,now)}).join('')+'</div>':'<div class="card note rq-none">No pending requests right now.</div>');
      return h+(me&&A.canWrite()?form():(typeof A.lockHtml==='function'?A.lockHtml():'<div class="card note rq-none">Set who you are on Profile before you request a bet.</div>'))}
    async function act(k,v,st){var f=S.f,me=A.me(),now=Date.now();
      var actK=k==='acc'||k==='dec'||k==='cancel'||k==='close'||k==='slot-'||k==='slot+'||k==='edit';
      if(actK){if(S.busy)return;var curR=S.list.find(function(x){return x.id===v});if(!curR||reqHash(reqTerms(curR))!==st){S.arm=null;S.msg='That request changed. Review it again.';S.bad=true;A.render();return}}
      if(k==='coffer'){var rc0=S.list.find(function(x){return x.id===v});if(!rc0||rc0.by===me||(rc0.to||[]).indexOf(me)<0)return;S.coff={id:v,amt:String(rc0.amt||''),odds:(rc0.odds||[1,1]).join('-'),text:rc0.lab||''};A.render();return}
      if(k==='cx'){S.coff=null;A.render();return}
      if(k==='csend'){var rs0=S.list.find(function(x){return x.id===v});if(!rs0||rs0.by===me||rs0.status!=='open'||tk(rs0).indexOf(me)>=0)return;
        var box=typeof document!=='undefined'&&document.querySelector('.rq-coff[data-v="'+v+'"]');
        var rawA=box?box.querySelector('[data-co="amt"]').value:(S.coff&&S.coff.amt),rawO=box?box.querySelector('[data-co="odds"]').value:(S.coff&&S.coff.odds),rawT=box?box.querySelector('[data-co="text"]').value:(S.coff&&S.coff.text);
        var amt=Math.round(+rawA),mo=/^\s*(\d{1,3})\s*[-:\/]\s*(\d{1,3})\s*$/.exec(String(rawO||'')),text=String(rawT||'').trim().slice(0,A.maxText||140);
        if(!(amt>=1)||!mo||!text){S.msg='Enter a stake, odds like 1-1, and the spread.';S.bad=true;A.render();return}
        var offer={by:me,amt:amt,odds:[+mo[1],+mo[2]],lab:text,txt:text,at:Date.now()};
        if(S.coff){S.coff.amt=String(amt);S.coff.odds=mo[1]+'-'+mo[2];S.coff.text=text}
        if(!armHold(v,'csend',[String(amt),mo[1]+'-'+mo[2],text].join('\u001f')))return;
        S.busy=true;A.render();
        try{await write(function(c){return c.map(function(x){if(x.id!==v||x.status!=='open'||x.by===me||tk(x).indexOf(me)>=0)return x;var y=Object.assign({},x);y.offer=offer;return y})},function(c){var x=c.find(function(y){return y.id===v});return !!(x&&x.offer&&x.offer.by===me&&x.offer.amt===amt&&x.amt===rs0.amt&&x.lab===rs0.lab&&String((x.odds||[]))===String(rs0.odds||[]))});
          S.coff=null;S.msg='Counter sent. The original terms stay until they accept these.';S.bad=false}
        catch(x){S.msg='Could not send that counter.';S.bad=true}
        S.busy=false;A.render();return}
      if(k==='cno'){var rn=S.list.find(function(x){return x.id===v});if(!rn||rn.by!==me||!rn.offer)return;if(!armHold(v,'cno',offerKey(rn.offer)))return;S.busy=true;A.render();
        try{await write(function(c){return c.map(function(x){if(x.id!==v||x.by!==me||!x.offer)return x;var y=Object.assign({},x);delete y.offer;return y})},function(c){var x=c.find(function(y){return y.id===v});return !x||!x.offer});S.msg='Counter declined. The original terms are unchanged.';S.bad=false}
        catch(x){S.msg='Could not save that.';S.bad=true}S.busy=false;A.render();return}
      if(k==='caccept'){var ra=S.list.find(function(x){return x.id===v}),off=ra&&ra.offer;if(!ra||ra.by!==me||!off||off.ok)return;if(reqHash(offerKey(off))!==st){S.arm=null;S.msg='That counter changed. Review the exact terms.';S.bad=true;A.render();return}
        if(!armHold(v,'caccept',offerKey(off)))return;
        var preview=Object.assign({},ra,{amt:off.amt,odds:off.odds.slice(),lab:off.lab,txt:off.txt,k:'txt'});
        say(waText(preview,'acc',off.by),'Accepted');
        S.busy=true;S.didBet=S.didBet||{};S.msg='Accepting…';S.bad=false;A.render();
        try{
          if(!S.didBet[v]){await A.placeBet(preview,off.by);S.didBet[v]=1}
          await write(function(c){return c.map(function(x){if(x.id!==v||x.by!==me||!x.offer||offerKey(x.offer)!==offerKey(off))return x;var y=Object.assign({},x,{amt:off.amt,odds:off.odds.slice(),lab:off.lab,txt:off.txt,k:'txt',took:(x.took||[]).concat([{m:off.by,at:Date.now(),counter:1}])});y.offer=Object.assign({},x.offer,{ok:true});return y})},function(c){var x=c.find(function(y){return y.id===v});return !!(x&&x.offer&&x.offer.ok&&x.amt===off.amt&&x.txt===off.txt)});
          S.posted=true;noteCopy(S.copied)}
        catch(x){S.msg='Could not accept that counter. The original terms were not changed.';S.bad=true}
        S.busy=false;A.render();return}
      if(k==='cp'){var rc=S.list.find(function(x){return x.id===v});if(rc){var took=tk(rc);copy(took.length?waText(rc,'acc',took[took.length-1]):waText(rc,'new'))}return}   /* STEP14-COPY */
      if(k==='wa'){if(S.fb)copy(S.fb);return}
      if(k==='edit'){var re=S.list.find(function(x){return x.id===v});if(!re||re.by!==me||tk(re).length||re.status!=='open'){if(re&&tk(re).length){S.msg='Someone already accepted. Those terms stay as agreed.';S.bad=true;A.render()}return}var ws=winStart(re,game(re.gid)),pad=function(n){return String(n).padStart(2,'0')},dt=new Date(re.exp);
        S.f={gid:re.gid,text:re.lab,side:re.k==='txt'?'':re.k+':'+(re.si||0),cov:re.cov||'game',odds:(re.odds||[1,1]).slice(),amt:rqAmts().indexOf(+re.amt)>=0?+re.amt:null,amtTxt:rqAmts().indexOf(+re.amt)>=0?'':String(re.amt),amtC:rqAmts().indexOf(+re.amt)<0,slots:re.slots||null,oddC:!rqChipOdds().some(function(o){return +(re.odds||[1,1])[0]===o[0]&&+(re.odds||[1,1])[1]===o[1]}),to:re.to.slice(),mode:re.exp>=ws?'start':'at',expPick:true,whenPick:true,n:3,at:dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate())+'T'+pad(dt.getHours())+':'+pad(dt.getMinutes()),est:SHARED_UI.whenKind(re)==='date'?re.est:'',wk:SHARED_UI.whenKind(re),rd:copyRd(re.rd)};
        S.edit=re.id;S.msg='';S.fb=null;if(A.goRequest)A.goRequest();A.render();setTimeout(function(){try{var fo=document.getElementById('rqForm');if(fo)fo.scrollIntoView({block:'start'})}catch(x){}},30);return}
      if(k==='slot-'||k==='slot+'||k==='close'){var rs=S.list.find(function(x){return x.id===v});if(!rs||rs.by!==me||rs.status!=='open')return;var nt0=tk(rs).length,want=k==='close'?null:Math.max(nt0,Math.min(rs.to.length,slots(rs)+(k==='slot+'?1:-1)));
        if(!armHold(v,k,reqTerms(rs)))return;
        if(k==='close')say(waText(rs,'close'),'Request closed');
        S.busy=true;A.render();try{await write(function(c){return c.map(function(x){if(x.id!==v||x.by!==me||x.status!=='open')return x;var n2=tk(x).length;return k==='close'?Object.assign({},x,{status:'closed',endedAt:Date.now()}):Object.assign({},x,{slots:Math.max(n2,want)})})},function(c){var x=c.find(function(y){return y.id===v});return !x||(k==='close'?x.status!=='open':slots(x)===Math.max(tk(x).length,want))});
          if(k==='close'){S.posted=true;noteCopy(S.copied)}else{S.msg='Spots: '+want+'.';S.bad=false}}catch(x){S.msg='Could not save that. Try again.';S.bad=true}S.busy=false;A.render();return}
      if(k==='unedit'){S.edit=null;S.f=nf();A.render();return}
      if(k==='when'){f.whenPick=true;f.wk=v==='date'||v==='season'||v==='game'?v:'unknown';if(f.wk!=='date')f.est='';A.render();return}
      if(k==='tool'){var next=f.tool===v?'':v;f.tool=next;if(next==='parlay'){f.lineOn=false;pyBegin(f.gid||f.pyGid||(pySoon()[0]&&pySoon()[0].id)||'')}else f.parlay=false;f.lineOn=next==='line';if(next==='line'&&!f.lineBase)f.lineBase=f.text||'';A.render();return}
      if(k==='line'){f.lineOn=!f.lineOn;f.tool=f.lineOn?'line':'';if(f.lineOn){f.parlay=false;if(!f.lineBase)f.lineBase=f.text||''}A.render();return}
      if(k==='parlay'){if(f.parlay){f.parlay=false;f.legs=[];f.lineFair=null;f.text=f.lineBase||'';A.render();return}pyBegin(f.gid||f.pyGid||(pySoon()[0]&&pySoon()[0].id)||'');A.render();return}
      if(k==='pydel'){var ix=+v;if(f.legs&&ix>=0)f.legs.splice(ix,1);pySync(f,true);A.render();return}
      if(k==='pyadd'){if((f.legs||[]).length>=5)return;var bits=String(v||'').split(':'),leg=pyLeg(f.pyGid,bits[0]==='spread'?'spread':'ml',bits[1]==='1'?1:0);if(!leg)return;f.legs=f.legs||[];var at=f.legs.findIndex(function(L){return String(L.gid)===String(leg.gid)});if(at>=0)f.legs[at]=leg;else f.legs.push(leg);pySync(f,true);A.render();return}
      if(k==='lnone'){f.lineOn=true;f.lineKind='none';f.linePts='';applyLine(f,true);A.render();return}
      if(k==='lml'){f.lineOn=true;f.parlay=false;f.lineSide=+v===1?1:0;f.lineKind='ml';f.linePts='';applyLine(f,true);A.render();return}
      if(k==='lpost'){f.lineOn=true;f.lineKind='posted';applyLine(f);A.render();return}
      if(k==='lside'){f.lineSide=+v===1?1:0;if(f.lineKind==='none'||f.lineKind==='custom')applyLine(f,true);A.render();return}
      if(k==='to'){var i=f.to.indexOf(v);if(i>=0)f.to.splice(i,1);else f.to.push(v)}
      else if(k==='all')f.to=A.others().map(function(o){return o.id});else if(k==='clear')f.to=[];
      else if(k==='side'){f.side=v;var gg=game(f.gid),pp=gg&&pick(gg.g,{side:v,cov:'game'});if(pp)f.text=pp.txt}else if(k==='cov'){f.cov=v}else if(k==='amt'){f.amt=+v;f.amtTxt='';f.amtC=false}else if(k==='amtc'){f.amtC=true;f.amt=null}else if(k==='oddc'){f.oddC=true}else if(k==='fslotall'){f.sAll=true;f.slots=null}else if(k==='fslot-'||k==='fslot+'){var nT=f.to.length,cT=nT||A.others().length,cur=f.sAll?cT:f.slots?Math.min(f.slots,cT):(nT||1);f.sAll=false;cur+=k==='fslot+'?1:-1;f.slots=Math.max(1,Math.min(cT,cur))}else if(k==='odds'){f.odds=v.split('-').map(Number);f.oddC=false;f.oddTxt='';if(f.parlay)pySync(f,false);else if(f.lineKind==='none'||f.lineKind==='custom')applyLine(f)}
      else if(k==='send'){var pickedWhen=!!(f.whenPick&&(f.wk==='season'||f.wk==='date'||f.wk==='unknown'));var g=pickedWhen?null:tipOf(f);var hasGame=!pickedWhen&&!!(g&&Date.parse(g.start));if(!f.expPick&&hasGame)f.mode='start';freeShown(f,hasGame);if(!hasGame&&f.mode==='start'&&(f.wk==='season'||pickedWhen)){f.mode='d';if(!(+f.n>0))f.n=3}var p=pick(hasGame?g.g:null,f),amt=f.amtC?(+f.amtTxt>0?Math.round(+f.amtTxt):null):f.amt,ex=expAt(f,now,hasGame?winStart({cov:f.cov,start:g.start},g):null);
        var wk=hasGame&&!f.whenPick?'game':(f.wk==='date'||f.wk==='season'||f.wk==='game'?f.wk:(f.wk==='unknown'?'unknown':''));
        var err=f.parlay&&(!f.legs||f.legs.length<2)?'Add at least 2 legs.':f.parlay&&f.legs.length>5?'Keep it to 5 legs.':!p?'Write the bet.':!amt?'Choose an amount.':null;
        if(!err&&!hasGame&&f.mode==='start')err='Pick when it expires.';
        else if(!err&&(!ex||ex<=now))err='Choose when it expires (up to a year).';
        else if(!err&&!hasGame&&wk==='game')err='Pick when it can be settled.';
        if(!err&&!wk)err='Say when it settles: end of season, a date, or not sure yet.';
        var pack=SHARED_UI.whenPack(wk||'unknown',f.est,A.seasonId?A.seasonId():'');if(!err&&wk==='date'&&!pack)err='Use a real date, or pick End Of Season or Not Sure Yet.';
        if(!err){var r0={id:rid(),gid:g?String(g.id):'',start:g&&g.start||null};if(started(Object.assign({cov:f.cov},r0),now))err='That '+(f.cov==='2h'?'half':'game')+' has already started.'}
        if(err){S.msg=err;S.bad=true;A.render();return}
        if(S.edit)r0.id=S.edit;
        var toAll=f.to.length?f.to.slice():A.others().map(function(o){return o.id});var r=Object.assign(r0,{by:me,to:toAll,cov:f.cov,k:p.k,si:p.si,lab:p.lab,other:p.other,odds:f.odds.slice(),slots:f.sAll?null:f.slots?Math.min(f.slots,toAll.length):(f.to.length?null:1),txt:p.txt,game:hasGame?A.tname(g.g.away)+' vs '+A.tname(g.g.home):'',date:hasGame?A.dateET(g.g):'',amt:amt,exp:ex,at:now,status:'open',dec:[],wk:pack.wk,est:pack.est,sid:pack.sid});var pinnedRd=hasGame?pinReading(f,g):null;if(pinnedRd)r.rd=pinnedRd;if(!hasGame)r.free=1;if(f.parlay&&f.legs&&f.legs.length>=2)r.legs=f.legs.map(function(L){return {gid:String(L.gid),kind:L.kind,t:L.t,o:L.o,l:L.l,d:L.d,start:L.start||'',lab:L.lab,raw:+L.raw||1}})
        say(waText(r,S.edit?'upd':'new'),S.edit?'Request updated':'Request posted');   /* one tap: copy starts inside the tap (clipboard needs it), then the request is posted */
        S.busy=true;S.msg='Sending…';S.bad=false;A.render();
        var ed=S.edit;r.ver=rid();
        try{if(ed){await write(function(c){return c.map(function(x){return x.id===ed&&x.by===me&&!tk(x).length&&x.status==='open'?Object.assign({},x,r,{dec:[],at:x.at,editedAt:now}):x})},function(c){var x=c.find(function(y){return y.id===ed});return !x||x.ver===r.ver||!!tk(x).length||x.status!=='open'});
            var xe=S.list.find(function(y){return y.id===ed});if(!xe||xe.ver!==r.ver)throw new Error('late');S.edit=null}
          else await write(function(c){return c.filter(function(x){return x.status==='open'||now-(x.endedAt||x.at)<7*86400000}).concat([r])},function(c){return c.some(function(x){return x.id===r.id})});S.f=nf();S.posted=true;noteCopy(S.copied)}
        catch(x){S.msg=x&&x.message==='late'?'Too late to edit: it was accepted or removed.':'Could not send it. Try again.';S.bad=true;if(x&&x.message==='late'){S.edit=null;S.f=nf()}}S.busy=false}
      else if(k==='dec'||k==='cancel'){var gateR=S.list.find(function(x){return x.id===v});if(!gateR||(k==='dec'?(!sees(gateR)||gateR.by===me):gateR.by!==me))return;if(!armHold(v,k==='dec'?'dec':'cancel',reqTerms(gateR)))return;if(k==='cancel'){if(tk(gateR).length){S.msg='Too late to delete: someone accepted. Use Close to others instead.';S.bad=true;A.render();return}say(waText(gateR,'del'),'Request deleted')}S.busy=true;A.render();try{await write(function(c){return c.map(function(x){return x.id!==v?x:k==='dec'?Object.assign({},x,{dec:(x.dec||[]).concat([me])}):(tk(x).length?x:Object.assign({},x,{status:'deleted',endedAt:now}))})},function(c){var x=c.find(function(y){return y.id===v});return !x||(k==='dec'?(x.dec||[]).indexOf(me)>=0:(x.status==='deleted'||!!tk(x).length))});var xd=S.list.find(function(y){return y.id===v});if(k==='dec'){S.msg='Declined.';S.bad=false}else if(xd&&xd.status!=='deleted'){S.posted=false;S.fb='';S.msg='Too late to delete: someone accepted. Use Close to others instead (ignore the copied message).';S.bad=true;S.busy=false;A.render();return}else{S.posted=true;noteCopy(S.copied)}}catch(x){S.msg='Could not save that. Try again.';S.bad=true}S.busy=false}
      else if(k==='acc'){var accR=S.list.find(function(x){return x.id===v});if(!accR)return;if(!armHold(v,'acc',reqTerms(accR)))return;say(waText(accR,'acc',me),'Accepted');S.busy=true;S.msg='Accepting…';S.bad=false;A.render();
        try{var ok=function(x){return x.id===v&&live(x,Date.now())&&x.to.indexOf(me)>=0&&tk(x).indexOf(me)<0&&x.by!==me};
          var back=await write(function(c){return c.map(function(x){return ok(x)?Object.assign({},x,{took:(x.took||[]).concat([{m:me,at:Date.now()}])}):x})},function(c){var x=c.find(function(y){return y.id===v});return !x||tk(x).indexOf(me)>=0||!live(x,Date.now())});
          var x=back.find(function(y){return y.id===v}),pos=x?tk(x).indexOf(me):-1;
          if(pos<0||pos>=slots(x)){   /* full (or closed) by the time my slot landed: take my slot back, no bet */
            if(pos>=0)await write(function(c){return c.map(function(y){return y.id===v?Object.assign({},y,{took:(y.took||[]).filter(function(z){return z.m!==me})}):y})},function(c){var y=c.find(function(z){return z.id===v});return !y||tk(y).indexOf(me)<0});
            S.msg='Sorry, it is full: every slot was taken.';S.bad=true;S.fb=null}
          else{await A.placeBet(x,me);S.posted=true;noteCopy(S.copied)}}
        catch(y){S.msg='Could not accept it. Try again.';S.bad=true}S.busy=false}
      A.render()}
    function input(k,v){var f=S.f;if(k==='gid'){f.gid=v;f.side='';f.text=''}else if(k==='text'){f.text=v;f.rd=null;f.lineKind='';return}else if(k==='mode'){f.mode=v;f.expPick=true}else if(k==='amtTxt'){f.amtTxt=v;f.amt=null;return}else if(k==='linePts'){f.linePts=v;f.lineKind='custom';f.lineOn=true;applyLine(f,true);A.render();return}else if(k==='oddTxt'){f.oddTxt=v;var mo=/^\s*(\d{1,3})\s*[-:\/]\s*(\d{1,3})\s*$/.exec(v);if(mo&&+mo[1]>0&&+mo[2]>0)f.odds=[+mo[1],+mo[2]];if(f.parlay)pySync(f,false);else if(f.lineKind==='none'||f.lineKind==='custom')applyLine(f);A.render();return}else if(k==='wkMenu'){f.whenPick=true;f.wk=v==='date'||v==='season'||v==='game'?v:'unknown';if(f.wk!=='date')f.est=''}else f[k]=v;A.render()}
    /* Quick bet: preselect the managers who own a team in this game, except the person filling the form. Nobody else on the game leaves the row empty, as before. */
    function openToOwners(g){if(!g)return [];var fold=function(s){return String(s==null?'':s).replace(/\s+/g,' ').trim().toLowerCase()},same=function(a,b){var x=fold(a),y=fold(b);return !!x&&x===y},raw=[];
      [g.away,g.home].forEach(function(s){var list=s&&s.owners;if(list==null)return;(Array.isArray(list)?list:[list]).forEach(function(n){var f=fold(n);if(f&&f!=='\u2014'&&f!=='-')raw.push(String(n))})});
      var me=A.me(),others=A.others()||[],out=[],seen={};
      function mine(name){if(!me)return false;return same(name,me)||!!(A.real&&same(name,A.real(me)))}
      raw.forEach(function(name){if(mine(name))return;var hit=null;for(var i=0;i<others.length;i++){var o=others[i];if(same(o.id,name)||(A.real&&same(A.real(o.id),name))){hit=o;break}}if(!hit||seen[hit.id]||(me&&same(hit.id,me)))return;seen[hit.id]=1;out.push(hit.id)});
      return out}
    function prefill(gid,k,i){S.f=nf();S.f.gid=String(gid);if(k){S.f.side=k+':'+i;S.f.lineSideKey=k+':'+i;var gq=game(gid),pq=gq&&pick(gq.g,{side:S.f.side,cov:'game'});if(pq)S.f.text=pq.txt;if(k==='sp'&&pq&&gq&&gq.g){var team=String(pq.lab||'').replace(/\s+[+-].*$/,'').replace(/\s+pk$/i,'').trim();S.f.lineSide=A.tname(gq.g.home)===team?1:0}}else{var gb=game(gid);if(gb&&gb.g)S.f.text=SHARED_UI.qbBlankText(gb.g,{name:A.tname,date:A.dateET(gb.g)})};S.f.lineBase=S.f.text||'';/* STEP10: the full written bet line (team vs team, spread, date), not the short chip text */S.msg='';var gw=game(gid),picked=openToOwners(gw&&gw.g);if(picked.length)S.f.to=picked;}
    /* Requests badge: open requests waiting for ME (invited, not declined, not mine, still live) on the Bets tab; refreshed by a light GET every 60 s */
    function count(){var me=A.me(),now=Date.now();if(!me)return 0;return S.list.filter(function(r){return live(r,now)&&r.by!==me&&r.to.indexOf(me)>=0&&(r.dec||[]).indexOf(me)<0&&tk(r).indexOf(me)<0}).length}
    /* STEP9-BADGES: Bets tab = requests waiting for me + bets waiting on my action (A.waiting); Request a bet segment = requests only */
    function nb(el,n,lab){if(!el)return;var b=el.querySelector('.rq-nb');if(!n){if(b)b.remove();return}if(!b){b=document.createElement('b');b.className='rq-nb';el.appendChild(b)}var s=String(Math.min(99,n));if(b.textContent!==s)b.textContent=s;b.setAttribute('aria-label',lab)}
    /* Unread badge sits on the All bets sub-tab. Viewing All bets marks the current live requests seen; they can stay open. A new id counts again. Not on the main Bets tab. */
    function openN(){var seen={},now=Date.now();seenIds().forEach(function(id){seen[id]=1});return S.list.filter(function(r){return shown(r,now)&&!seen[r.id]}).length}
    function paint(){try{var on=openN();
      document.querySelectorAll('#b27Ob_open,[data-ob="open"],#b27Ob_all,[data-ob="all"]').forEach(function(el){
        if(el.getAttribute('data-ob')==='open'||el.id==='b27Ob_open'){var old=el.querySelector('.rq-nb');if(old)old.remove();return}
        nb(el,on,on+' unread open request'+(on===1?'':'s'))});
      var a=A.navEl&&A.navEl();if(a){var old=a.querySelector('.rq-nb');if(old)old.remove()}}catch(x){}}
    if(typeof window!=='undefined'&&typeof setInterval!=='undefined'){var bootT=setInterval(function(){if(!A.me())return;clearInterval(bootT);if(!S.at)load()},250);setInterval(function(){if(A.me()&&!S.busy&&!S.loading)load()},60000);setInterval(paint,2000)}
    if(typeof document!=='undefined'){var rqGo=0;document.addEventListener('pointerdown',function(ev){var t=ev.target&&ev.target.closest&&ev.target.closest('#rqForm [data-rq]');if(!t||ev.button>0)return;rqGo=Date.now();if(typeof render==='function'){render.rqHold=Date.now()+900;render.rqSelf=1}try{act(t.getAttribute('data-rq'),t.getAttribute('data-v'),t.getAttribute('data-st'))}finally{if(typeof render==='function')render.rqSelf=0}},true);document.addEventListener('click',function(ev){var t=ev.target.closest&&ev.target.closest('[data-rq]');if(!t)return;ev.preventDefault();if(Date.now()-rqGo<400)return;if(typeof render==='function')render.rqSelf=1;try{act(t.dataset.rq,t.dataset.v,t.getAttribute('data-st'))}finally{if(typeof render==='function')render.rqSelf=0}});
      document.addEventListener('change',function(ev){var t=ev.target;if(!(t&&t.dataset&&t.dataset.rqIn))return;if(typeof render==='function')render.rqSelf=1;try{input(t.dataset.rqIn,t.value)}finally{if(typeof render==='function')render.rqSelf=0}});
      document.addEventListener('blur',function(ev){var t=ev.target;if(!(t&&t.dataset&&(t.dataset.rqIn==='mode'||t.dataset.rqIn==='wkMenu')))return;if(typeof render==='function')render.rqSelf=1;try{commitRqSelect(t)}finally{if(typeof render==='function')render.rqSelf=0}},true);
      document.addEventListener('input',function(ev){var t=ev.target;if(t&&t.dataset&&t.dataset.co&&S.coff){S.coff[t.dataset.co]=t.value;return}if(!(t&&t.dataset&&(t.dataset.rqIn==='amtTxt'||t.dataset.rqIn==='n'||t.dataset.rqIn==='oddTxt'||t.dataset.rqIn==='text')))return;S.f[t.dataset.rqIn]=t.value;if(t.dataset.rqIn==='text'||t.dataset.rqIn==='amtTxt')rqPaintExplain()})}
    function straight(side){var f=S.f;f.lineOn=true;f.lineSide=side?1:0;f.lineKind='none';f.linePts='';applyLine(f,true)}
    function moneyline(side){var f=S.f;f.lineOn=true;f.parlay=false;f.lineSide=side?1:0;f.lineKind='ml';f.linePts='';applyLine(f,true)}
    return {view:view,openN:openN,pinned:pinned,prefill:prefill,straight:straight,moneyline:moneyline,parlayBegin:pyBegin,parlaySet:pySet,parlayBox:function(f){return pyBox(f,'wiu')},parlayAct:pyAct,load:load,count:count,paint:paint,observe:observe,S:S,waText:waText,copyText:copyText,parlayText:parlayText,label:'\u{1F4E8} Request a bet'}};
  /* STEP7-NAMES: Stoop label rule (both sites): roomy spots = emoji + team nickname; tight spots use the real name.
     shortName/tinyName = the bet-form chip's phone labels (same cut on both sites). */
  SHARED_UI.shortName=function(n){n=String(n);var w=n.split(/\s+/).filter(Boolean),l=w[w.length-1];if(w.length>1&&l.length>=4&&l.length<=9)return l;if(n.length<=9)return n;if(w.length>1&&w[0].length<=9)return w[0];return n.slice(0,8)+'\u2026'};
  SHARED_UI.tinyName=function(n){var t=SHARED_UI.shortName(n);return t.length<=7?t:t.slice(0,4)};
  /* Fair straight-up price from the posted ESPN line. Moneyline when both sides have one (vig removed). Otherwise the spread is an expected margin and the win chance is the normal curve, sigma 12.5, which matches these moneylines. Rounded to a simple X-1. */
  SHARED_UI.linePrice=function(g,team,opt){opt=opt||{};if(!g||!team||!g.away||!g.home)return null;
    function nm(s){return String(s&&(s.short||s.name||s.id)||'')}
    function erf(x){var s=x<0?-1:1,a=Math.abs(x),t=1/(1+0.3275911*a);return s*(1-(((((1.061405429*t-1.453152027)*t+1.421413741)*t-0.284496736)*t+0.254829592)*t)*Math.exp(-a*a))}
    function phi(z){return 0.5*(1+erf(z/Math.SQRT2))}
    function mlP(ml){ml=+ml;if(!isFinite(ml)||!ml)return null;return ml>0?100/(ml+100):(-ml)/(-ml+100)}
    var rungN=[1,2,3,4,5,6,7,8,9,10,12,15,20,25,30,40,50];
    function rung(r){if(!(r>0))return null;if(r<1){var inv=rung(1/r);return inv?[inv[1],inv[0]]:null}var best=rungN[0],bd=1e9;for(var i=0;i<rungN.length;i++){var d=Math.abs(Math.log(rungN[i])-Math.log(r));if(d<bd){bd=d;best=rungN[i]}}return [best,1]}
    var ln=g.line||{},away=nm(g.away),home=nm(g.home),fav=String(ln.fav)===String(g.away.id)?away:String(ln.fav)===String(g.home.id)?home:'',sp=+ln.sp,mu=null;
    if(fav&&isFinite(sp)&&sp>0)mu=team===fav?sp:team===(fav===away?home:away)?-sp:null;
    var p=null,kind=opt.kind||'none';
    if(kind==='none'){var mine=team===home?ln.hml:team===away?ln.aml:null,opp=team===home?ln.aml:team===away?ln.hml:null,p1=mlP(mine),p2=mlP(opp);if(p1!=null&&p2!=null&&p1+p2>0)p=p1/(p1+p2);else if(p1!=null)p=p1;else if(mu!=null)p=phi(mu/12.5)}
    else if(kind==='custom'&&mu!=null&&opt.pts!=null&&isFinite(+opt.pts))p=phi((mu+(+opt.pts))/12.5);
    if(!(p>0&&p<1))return null;var raw=(1-p)/p,pair=rung(raw);if(!pair)return null;return {a:pair[0],b:pair[1],label:pair[0]+'-'+pair[1],raw:raw}};
  /* STEP7-QUICKBET: Games "Quick bet" window. qbOptions keeps the posted spread and total at even money. No points is a separate straight-up row priced from linePrice. qbSheet draws both. Nothing is placed from here. */
  SHARED_UI.qbOptions=function(g,o){var A=g.away,H=g.home,ln=(g.line&&typeof g.line==='object')?g.line:{},nm=o.name,d=o.date?', '+o.date:'',out=[];
    var fav=String(ln.fav)===String(A.id)?A:String(ln.fav)===String(H.id)?H:null,sp=+ln.sp;
    if(fav&&isFinite(sp)&&sp>0){var dog=fav===A?H:A;out.push({k:'sp',t:'Spread',s:[fav,dog].map(function(x){var y=x===fav?dog:fav,sx=x===fav?'-':'+',sy=y===fav?'-':'+';return{lab:nm(x)+' '+sx+sp,txt:nm(x)+' '+sx+sp+' vs '+nm(y)+' '+sy+sp+d}})})}
    var ou=+ln.ou;if(isFinite(ou)&&ou>0){var m=nm(A)+' v '+nm(H);out.push({k:'ou',t:'Over/under',s:[['Over','Under'],['Under','Over']].map(function(p){return{lab:p[0]+' '+ou,txt:p[0]+' '+ou+' vs '+p[1]+' '+ou+', '+m+d}})})}
    return out};
  SHARED_UI.qbBlankText=function(g,o){return o.name(g.away)+' vs '+o.name(g.home)+(o.date?', '+o.date:'')};
  /* GAME-ROW: one team row of a game card, same markup on both sites: pill · seed · ⭐/🐶 · 1H/2H/T, owner chip on its own row under the pill. o={chip,seed,tag,owners,scores,lose,hs1} (already safe markup; seed is escaped here) */
  SHARED_UI.gameRow=function(o,e){return '<div class="gside'+(o.lose?' lose':'')+(o.hs1?' hs1':'')+'"><div class="nm">'+o.chip+(o.seed?'<span class="seed">('+e(String(o.seed))+')</span>':'')+(o.tag||'')+'</div><div class="sc2">'+(o.scores||'')+'</div></div><div class="gow"'+(o.owners?'':' aria-hidden="true"')+'>'+(o.owners||'&nbsp;')+'</div>'};
  SHARED_UI.mlBand=function(n){n=Math.abs(+n);if(!(n>0))return null;if(n<125)return [1,1];if(n<175)return [1.5,1];if(n<225)return [2,1];if(n<275)return [2.5,1];return [3,1]};
  /* One ratio for the game, from the underdog's American price (or the favorite's price when both are minus). $5 is the small side. */
  SHARED_UI.mlQuote=function(g){if(!g||!g.line||!g.away||!g.home)return null;var h=+g.line.hml,a=+g.line.aml,hOk=isFinite(h)&&h!==0,aOk=isFinite(a)&&a!==0;if(!hOk&&!aOk)return null;var fav='home',price;
    if(hOk&&aOk){if((h<0)!==(a<0)){fav=h<0?'home':'away';price=h>0?h:a}else{fav=h<=a?'home':'away';price=Math.max(Math.abs(h),Math.abs(a))}}
    else{var only=hOk?h:a;fav=only<0?(hOk?'home':'away'):(hOk?'away':'home');price=Math.abs(only)}
    var band=SHARED_UI.mlBand(price);if(!band)return null;return {favId:String(fav==='home'?g.home.id:g.away.id),a:band[0],b:band[1],label:band[0]===band[1]?'Even':band[0]+'-'+band[1],price:price}};
  SHARED_UI.mlCash=function(amt,ratio,fav){var stake=+amt>0?+amt:5;if(stake<5)stake=5;var big=Math.round(stake*(+ratio||1)*2)/2;if(!(big>=stake))big=stake;return fav?{risk:big,win:stake}:{risk:stake,win:big}};
  SHARED_UI.money=function(n){var x=Math.round(Number(n)*2)/2;if(!(x>0))return '';return '$'+(Math.abs(x-Math.round(x))<0.001?String(Math.round(x)):x.toFixed(2))};
  SHARED_UI.mlPills=function(g,o){var q=SHARED_UI.mlQuote(g);if(!q||!o||!o.name)return '';var e=o.e||function(s){return String(s==null?'':s)},stake=o.stake||5;
    return [g.away,g.home].map(function(s,i){if(!s)return '';var fav=String(s.id)===String(q.favId),cash=SHARED_UI.mlCash(stake,q.a,fav),on=o.on&&o.on(i);
      return '<button type="button" class="qbs-o'+(on?' on':'')+'" aria-pressed="'+(on?'true':'false')+'" aria-label="'+e(o.name(s)+' moneyline, risk '+SHARED_UI.money(cash.risk)+' to win '+SHARED_UI.money(cash.win)+', '+q.label)+'" '+(o.attr?o.attr(i):'')+'>'+e(o.name(s)+' '+SHARED_UI.money(cash.risk)+' to win '+SHARED_UI.money(cash.win))+'</button>'}).join('')};
  SHARED_UI.qbSheet=function(g,list,o){var e=o.e,t=e(o.name(g.away))+' vs '+e(o.name(g.home));list=(list||[]).filter(function(x){return x.k!=='win'&&x.k!=='ml'});
    var row=function(lab,btns){return '<div class="qbs-r qbs-mkt"><span class="qbs-l">'+e(lab)+'</span><span class="qbs-s">'+btns+'</span></div>'};
    var h='<div class="qbd" role="region" aria-label="Quick bet: '+t+'"><div class="qbd-h"><b>\u26A1 Quick bet</b><button type="button" class="qbd-x" aria-label="Close" '+o.close()+'>\u2715</button></div>';
    list.forEach(function(x){var lab=x.k==='sp'?'Spread':x.k==='ou'?'O/U':x.t;h+=row(lab,x.s.map(function(s,i){return '<button type="button" class="qbs-o" aria-label="'+e(s.txt)+'" '+o.pick(x.k,i)+'>'+e(s.lab)+'</button>'}).join(''))});
    if(o.ml&&SHARED_UI.mlQuote(g))h+=row('ML',SHARED_UI.mlPills(g,{e:e,name:o.name,stake:5,attr:o.ml}));
    return h+'<button type="button" class="qbs-o qbd-req" '+o.blank()+'>\u{1F4E8} Request a bet</button></div>'};
  /* STEP7-UPSETS: Rules "upset rule" card + empty state (each site passes its own wording, already safe markup) */
  SHARED_UI.upsetHead=function(note,empty){var h='<div class="card"><b>\u{1F631} The upset rule</b><div class="note">'+note+'</div></div>';return empty==null?h:h+'<div class="card">'+empty+'</div>'};
  /* STEP7-SCORING: Rules scoring table (label escaping passed in: STOOPIDS labels are trusted markup, League escapes) */
  SHARED_UI.scoringTable=function(rows,o){var e=o.e,s=o.sign;return '<div class="card sc"><table><tr><th>Scoring</th><th class="n">Pts</th></tr>'+rows.map(function(r){return '<tr><td>'+e(r[0])+'</td><td class="n">'+s(r[1])+'</td></tr>'}).join('')+'</table></div>'};
  SHARED_UI.estToday=function(d){d=d||new Date();var p=function(n){return String(n).padStart(2,'0')};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
  SHARED_UI.estOk=function(s){if(!s)return false;var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);if(!m)return false;var y=+m[1],mo=+m[2],da=+m[3],dt=new Date(y,mo-1,da);return dt.getFullYear()===y&&dt.getMonth()===mo-1&&dt.getDate()===da};
  SHARED_UI.estLabel=function(s){if(!SHARED_UI.estOk(s))return 'No date';var p=s.split('-'),mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]-1];return mo+' '+Number(p[2])+', '+p[0]};
  /* One upcoming game whose tipoff we can read from an attached game or from the bet text. A date span that matches several games is not one tipoff. */
  SHARED_UI.tipGame=function(o){o=o||{};var list=o.games||[],gid=o.gid,text=String(o.text||''),now=o.now||Date.now();
    function startOf(g){var st=Date.parse(g&&g.start);return st&&!isNaN(st)?st:0}
    if(gid){var hit=null;for(var i=0;i<list.length;i++)if(String(list[i].id)===String(gid))hit=list[i];if(hit)return startOf(hit)?hit:null}
    if(!text.trim())return null;
    var ymds=[],rest=text,df=o.dateFrom;if(df){for(var n=0;n<4;n++){var d=df(rest,o.today);if(!d||!d.d)break;ymds.push(d.d);rest=String(rest).split(d.raw).join(' ')}}
    function names(side){if(!side)return [];return [side.short,side.name,side.nickname,side.displayName,side.shortDisplayName].filter(Boolean)}
    /* St Louis = Saint Louis, Michigan St = Michigan State. "at", "vs" and "v" are just the words between the two names. */
    function light(s){return String(s||'').toLowerCase().replace(/&/g,' and ').replace(/[.]/g,'').replace(/[^a-z0-9' -]/g,' ').replace(/\s+/g,' ').trim()}
    var hay=light(text);
    function mentioned(n){var s=light(n),keys=[];if(!s||s.length<3)return false;keys.push(s);if(/^saint /.test(s))keys.push('st '+s.slice(6));if(/ state$/.test(s))keys.push(s.replace(/ state$/,' st'));if(/ st$/.test(s))keys.push(s.replace(/ st$/,' state'));return keys.some(function(key){return key.length>=3&&new RegExp('(^|[^a-z0-9-])'+key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z0-9-]|$)').test(hay)})}
    var cands=[];for(var j=0;j<list.length;j++){var g=list[j],st=startOf(g);if(!st||st<=now||g.status==='final')continue;var raw=g.g||g,day=o.day?o.day(g.start):'';if(ymds.length&&day&&ymds.indexOf(day)<0){var lo=ymds.slice().sort()[0],hi=ymds.slice().sort().pop();if(!(ymds.length>1&&day>=lo&&day<=hi))continue}if(!ymds.length&&st>=now+7*86400000)continue;var a=(names(raw.away)||[]).some(mentioned),h=(names(raw.home)||[]).some(mentioned);if(!a&&!h)continue;cands.push({g:g,both:!!(a&&h)})}
    var both=cands.filter(function(c){return c.both});if(both.length===1)return both[0].g;if(cands.length===1)return cands[0].g;return null};
  SHARED_UI.whenKind=function(b){if(!b||typeof b!=='object')return 'unknown';if(b.wk==='game')return 'game';if(b.wk==='season')return 'season';if(b.wk==='unknown')return 'unknown';if(b.wk==='date')return SHARED_UI.estOk(b.est)?'date':'unknown';return SHARED_UI.estOk(b.est)?'date':'unknown'};
  SHARED_UI.whenPack=function(kind,est,sid){var id=typeof sid==='string'&&/^[0-9]{4}-[0-9]{2}$/.test(sid)?sid:null;if(kind==='game')return {wk:'game',est:null,sid:null};if(kind==='season')return {wk:'season',est:null,sid:id};if(kind==='date'){if(!SHARED_UI.estOk(est))return null;return {wk:'date',est:est,sid:null}}return {wk:'unknown',est:null,sid:null}};
  SHARED_UI.whenApply=function(bet,pack){if(!bet||!pack||(pack.wk!=='date'&&pack.wk!=='season'&&pack.wk!=='unknown'&&pack.wk!=='game'))return null;var next={};Object.keys(bet).forEach(function(k){next[k]=bet[k]});next.wk=pack.wk;next.est=pack.wk==='date'?pack.est:null;next.sid=pack.wk==='season'?pack.sid:null;var rest=function(o){var x={};Object.keys(o).sort().forEach(function(k){if(k!=='wk'&&k!=='est'&&k!=='sid')x[k]=o[k]});return JSON.stringify(x)};if(rest(bet)!==rest(next))return null;return next};
  SHARED_UI.needsConfirm=function(b){if(!b)return false;if(b.status==='reported'||b.status==='disputed')return true;if(b.fx&&(b.status==='backer'||b.status==='other'||b.status==='push'))return true;if(b.fix&&b.fix.st==='pending')return true;return false};
  SHARED_UI.estSort=function(list,today,created){today=today||SHARED_UI.estToday();created=created||function(b){return Date.parse(b.created_at||b.ts)||0};
    var live=function(b){return b&&(b.status==='open'||b.status==='reported'||b.status==='disputed'||b.status==='pending')&&!(b.kind==='pool'&&b.back)};
    var rank=function(b){if(SHARED_UI.needsConfirm(b))return 0;if(!live(b))return 5;var k=SHARED_UI.whenKind(b);if(k==='date')return b.est<=today?1:2;if(k==='season')return 3;if(k==='game')return 3.5;return 4};
    return (list||[]).slice().sort(function(a,b){var ra=rank(a),rb=rank(b);if(ra!==rb)return ra-rb;if((ra===1||ra===2)&&a.est!==b.est)return ra===1?(a.est<b.est?1:-1):(a.est<b.est?-1:1);var ca=created(a),cb=created(b);if(ca!==cb)return cb-ca;return String(a.id).localeCompare(String(b.id))})};
  SHARED_UI.dueClass=function(est,today){today=today||SHARED_UI.estToday();if(!SHARED_UI.estOk(est))return 'none';if(est<today)return 'over';if(est===today)return 'today';return 'up'};
  SHARED_UI.dueName=function(c){return c==='over'?'Overdue':c==='today'?'Due today':c==='up'?'Upcoming':c==='season'?'End of season':'No date'};
  SHARED_UI.dueText=function(est,today){var ok=SHARED_UI.estOk(est);return 'Settle by: '+(ok?SHARED_UI.estLabel(est):'No date')+(ok?' · '+SHARED_UI.dueName(SHARED_UI.dueClass(est,today)):'')};
  SHARED_UI.whenClass=function(b,today){var k=SHARED_UI.whenKind(b);if(k==='season')return 'season';if(k==='game')return 'game';if(k==='date')return SHARED_UI.dueClass(b.est,today);return 'none'};
  SHARED_UI.whenSettled=function(b){if(!b||typeof b!=='object')return false;if(b.kind==='pool'&&b.back)return true;return b.status==='backer'||b.status==='other'||b.status==='push'};
  SHARED_UI.whenShow=function(b,today){if(SHARED_UI.whenSettled(b))return 'done';return SHARED_UI.whenClass(b,today)};
  SHARED_UI.whenText=function(b){var k=SHARED_UI.whenKind(b),open=b&&b.status==='open'&&!SHARED_UI.whenSettled(b);if(k==='date'){var line='When: '+SHARED_UI.estLabel(b.est);if(open)line+=' · '+SHARED_UI.dueName(SHARED_UI.dueClass(b.est));return line}if(k==='season')return 'When: End of season'+(b.sid?' · '+b.sid:' · no season end date on file');if(k==='game')return 'When: End game';return 'When: Not sure yet'};
  SHARED_UI.whenBox=function(o){o=o||{};var e=o.e||function(s){return String(s==null?'':s)},k=o.kind==='date'||o.kind==='season'||o.kind==='game'?o.kind:'unknown';
    var btn=function(id,lab){return '<button type="button" class="b27-chip" data-when="'+id+'" aria-pressed="'+(k===id?'true':'false')+'" '+(o.pick?o.pick(id):'')+'>'+e(lab)+'</button>'};
    var q=(o.step?String(o.step)+'. ':'')+'When can this be settled?';
    if(k==='game'&&!o.game&&!o.menu)k='unknown';
    var head='<div class="b27-when"><div class="b27-q"><button type="button" class="s27-tipk" data-tip="when" aria-expanded="false" onfocus="s27TipShow(this)" onclick="s27WhenClick(this)">'+e(q)+'</button></div>';
    var opts;
    if(o.menu){var items=[['game','End of game'],['season','End of season'],['unknown','Not sure yet'],['date','Set a date']];opts='<select class="sb-in b27-in rq-when" '+(o.menuAttr||'data-rq-in="wkMenu"')+' aria-label="When can this be settled?">'+items.map(function(it){return '<option value="'+it[0]+'"'+(k===it[0]?' selected':'')+'>'+e(it[1])+'</option>'}).join('')+'</select>'}
    else opts='<div class="b27-when-c" role="group" aria-label="When can this be settled?">'+(o.game?btn('game','End of game'):'')+btn('season','End of season')+btn('unknown','Not sure yet')+btn('date','Set a date')+'</div>';
    var h=head+opts;
    if(k==='date')h+='<input class="sb-in b27-in" type="date" id="'+(o.inputId||'whenDate')+'" aria-label="Choose a date" value="'+e(o.est||'')+'" '+(o.dateAttr||'')+'>';
    if(k==='season'){var id=o.seasonId||'';h+='<div class="note">'+(id?e('End of '+id+'. No calendar end date is set, so this only groups the bet.'):e('End of season. No season id is on file, so this only groups the bet.'))+'</div>'}
    if(k==='game')h+='<div class="note">'+e(o.gameNote||'Settles when the game ends.')+'</div>';
    return h+'</div>'};
  SHARED_UI.entryHead=function(k,extra){return k==='rq'
    ?'<div class="entry-hd entry-hd-rq"><h2><span class="entry-ico" aria-hidden="true">💣</span>Request a bet</h2><p class="entry-sub-d">Nothing agreed yet? Find a stoop who wants to feel something.</p><p class="entry-sub-m">Nothing agreed yet—find a Stoop who wants to feel something.</p></div>'
    :'<div class="entry-hd entry-hd-wiu"><div class="entry-hd-row"><h2><span class="entry-ico" aria-hidden="true">💥</span>Write it Up</h2>'+(extra||'')+'</div><p class="entry-sub-d">Bet already discussed.</p><p class="entry-sub-m">Already agreed on a bet? Record it here and add it to All bets.</p></div>'};
  SHARED_UI.weeklySection=function(items,o){var e=o.e;var L=(items||[]).filter(function(x){return x&&x.title}).slice().sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''))});
    var list=L.length?'<div class="rcl">'+L.map(function(x){return '<article class="card rci"><small>'+e(x.kind==='special'?'Special':'Weekly')+(x.date?' · '+e(o.fmtDate(String(x.date).slice(0,10))):'')+'</small><h3>'+e(x.title)+'</h3><p>'+e(x.body||'')+'</p></article>'}).join('')+'</div>':'<div class="card note rcnone"'+(o.emptyAttr||'')+'>No weekly write-ups yet. The first one comes after opening week.</div>';
    return '<section class="rcw"'+(o.secAttr||'')+'><h2>📰 Weekly write-ups</h2>'+list+'</section>'};
  /* Standings only. name is already escaped. change is the existing picker attribute (presAsk). No name: guest, and no Change control, because a fresh visit cannot pick one. */
  SHARED_UI.loginLine=function(o){o=o||{};
    if(!o.name)return '<p class="idline" role="status">You\u2019re viewing as a guest. This visit can\u2019t pick a name.</p>';
    var ch=o.change?' <button type="button" class="idline-ch" '+o.change+'>Change?</button>':'';
    return '<p class="idline">You are logged in as <b>'+o.name+'</b> \u2014'+ch+'</p>'};
})(typeof window!=='undefined'?window:globalThis);

/* NAV-MORE: under 700px (phone and half-page) show 5 main tabs across: Standings, Games, Bets, Teams + More. More opens a scrollable sheet with every other nav item
   (taps forward to the hidden original link, so each site's own click handlers run). Laptop/desktop unchanged. Works on #nav (STOOPIDS) and #ltabs (League). */
(function(root){if(typeof document==='undefined')return;var KEEP=['standings','games','bets','bets27','teams'],MQ='(max-width:700px)';
  var css='@media '+MQ+'{nav#nav.nm5,nav#ltabs.nm5{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;flex-wrap:nowrap!important;overflow:visible!important}nav#nav.nm5>.nm-x,nav#ltabs.nm5>.nm-x{display:none!important}nav#nav.nm5>.nm-b,nav#ltabs.nm5>.nm-b{display:flex}}'+
   '.nm-b{display:none;position:relative;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:0;min-height:46px;padding:4px;background:var(--card,#1b2030);color:var(--tx,#eee);border:1px solid var(--line,#333);border-radius:10px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}'+
   '.nm-b .ni{font-size:15px;line-height:1}.nm-b.on,.nm-b[aria-expanded=true]{background:var(--pill,#FFD400);color:var(--pill-ink,#111);border-color:var(--pill,#FFD400)}'+
   '.nm-bd{position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}.nm-bd[hidden]{display:none}'+
   '.nm-sh{width:100%;max-width:520px;max-height:70vh;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:var(--card,#1b2030);border:1px solid var(--line,#333);border-radius:16px 16px 0 0;padding:10px 12px calc(14px + env(safe-area-inset-bottom))}'+
   '.nm-h{display:flex;justify-content:space-between;align-items:center;font-weight:800;margin:2px 2px 8px}.nm-h button{background:none;border:0;color:var(--tx,#eee);font-size:18px;cursor:pointer;padding:4px 8px}'+
   '.nm-i{position:relative;display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:transparent;color:var(--tx,#eee);border:1px solid var(--line,#333);border-radius:10px;padding:12px;margin:0 0 6px;font:inherit;font-size:15px;font-weight:700;cursor:pointer}.nm-i.on{background:var(--pill,#FFD400);color:var(--pill-ink,#111);border-color:var(--pill,#FFD400)}'+
   '.nm-b>.s29nb,.nm-i>.s29nb{position:absolute;top:1px;right:2px;min-width:15px;background:#FFD400;color:#111;border-radius:99px;font-size:9px;font-weight:900;line-height:1;padding:2px 4px;text-align:center;pointer-events:none}.nm-b.on>.s29nb,.nm-i.on>.s29nb{background:#111;color:#FFD400}';
  var key=function(a){return a.getAttribute('data-tab')||a.getAttribute('data-v')||''};
  var lab=function(a){var f=a.querySelector('.nl.f');return (f?f.textContent:a.getAttribute('aria-label')||a.textContent).trim()};
  var bd=null,cur=null;
  function close(){if(!bd)return;bd.hidden=true;if(cur){var b=cur.querySelector('.nm-b');if(b){b.setAttribute('aria-expanded','false');try{b.focus()}catch(e){}}}}
  function open(nav){cur=nav;if(!bd){bd=document.createElement('div');bd.className='nm-bd';bd.hidden=true;bd.innerHTML='<div class="nm-sh" role="dialog" aria-modal="true" aria-label="More pages"><div class="nm-h"><span>More</span><button type="button" class="nm-c" aria-label="Close">\u2715</button></div><div class="nm-l"></div></div>';
      bd.addEventListener('click',function(e){if(e.target===bd||e.target.closest('.nm-c'))close()});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&bd&&!bd.hidden)close()});document.body.appendChild(bd)}
    var l=bd.querySelector('.nm-l');l.innerHTML='';[].slice.call(nav.querySelectorAll(':scope>.nm-x')).forEach(function(a){var b=document.createElement('button');b.type='button';b.className='nm-i'+(a.classList.contains('on')?' on':'');
      var ic=a.querySelector('.ni');b.innerHTML='<span aria-hidden="true">'+(ic?ic.textContent:'')+'</span><span></span>';b.lastChild.textContent=lab(a);b.setAttribute('data-tab',key(a));if(a.classList.contains('on'))b.setAttribute('aria-current','page');
      var nb=a.querySelector('.s29nb');if(nb)b.appendChild(nb.cloneNode(true));
      b.addEventListener('click',function(){close();a.click()});l.appendChild(b)});
    bd.hidden=false;nav.querySelector('.nm-b').setAttribute('aria-expanded','true');var f=l.querySelector('.nm-i');if(f)try{f.focus()}catch(e){}}
  function fix(nav){if(nav.classList.contains('pre'))return;var items=[].slice.call(nav.children).filter(function(a){return a.tagName==='A'});if(items.length<=5)return;
    var any=false;items.forEach(function(a){var x=KEEP.indexOf(key(a))<0;a.classList.toggle('nm-x',x);if(x&&a.classList.contains('on'))any=true});
    var b=nav.querySelector(':scope>.nm-b');if(!b){b=document.createElement('button');b.type='button';b.className='nm-b';b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','More pages');
      b.innerHTML='<span class="ni" aria-hidden="true">\u2630</span><span>More</span>';b.addEventListener('click',function(e){e.preventDefault();open(nav)})}
    if(nav.lastElementChild!==b)nav.appendChild(b);b.classList.toggle('on',any);nav.classList.add('nm5');try{if(typeof s12RcUpdate==='function')s12RcUpdate()}catch(e){}}
  function scan(){[].slice.call(document.querySelectorAll('nav#nav,nav#ltabs')).forEach(fix)}
  function init(){var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);scan();var busy=false;
    new MutationObserver(function(){if(busy)return;busy=true;setTimeout(function(){scan();busy=false},0)}).observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(typeof window!=='undefined'?window:globalThis);
