/* shared/ui.js v1.18.0: ONE table of input limits and shared wording, loaded by BOTH sites.
   Edit here only, copy to the other repo by hand, and run scripts/check_shared.sh.
   Each site keeps its old values as fallbacks, so the pages still work if this file fails to load. */
(function(g){var LIMITS={team:15,stoopName:12,leagueName:24,chat:200,betText:140,paste:300,payouts:120,stake:20,item:40,odds:9};
var STRINGS={maxLen:'Keep it to {n} characters or fewer.',nameTooLong:'Keep the name to {n} characters or fewer.',teamTooLong:'Keep the team name to {n} characters or fewer.',checkedNow:'checked just now',online:'Who\u2019s online'};
function t(k,n){var s=STRINGS[k];return s==null?'':String(s).replace('{n}',n)}
g.SHARED_UI={version:'1.18.0',LIMITS:LIMITS,STRINGS:STRINGS,t:t};})(typeof window!=='undefined'?window:globalThis);

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
U.onlineStrip=function(on,off,ago){return '<span class="onl-h">Who\u2019s online</span>'+on.map(function(n){return '<span class="onl-p on" title="Online now"><i class="pd"></i>'+n+'</span>'}).join('')+off.map(function(x){return '<span class="onl-p"><i class="pd off"></i>'+x[0]+' <small>'+(x[1]===Infinity?'not seen yet':ago(x[1]))+'</small></span>'}).join('')};
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
      '<div class="who"><b class="nm">'+e(r.emoji)+' '+e(r.team)+'</b><small>'+e(r.person)+(r.gold||'')+'</small></div>'+
      '<div class="pts score"><span class="pv">'+r.total+'</span><small>Points</small></div></div>'+
      '<div class="bar"><i style="width:'+(Math.max(0,r.total)/mx*100)+'%"></i></div>'+
      '<div class="chips school-grid">'+r.chips+'</div></div>'}).join('')+'</div>'};

  /* STEP5-GAMES: collapsed FINAL game card (summary button + hidden body), both sites. o: {cls,attr,open,away:{name,score,win},home,upset,btnAttr,bodyCls,bodyAttr,body} */
  SHARED_UI.finalCard=function(o){var e=o.esc||function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
    var sc=function(s){return e(s.name)+' '+(s.score!=null?e(String(s.score)):'')};var op=!!o.open;
    return '<div class="'+o.cls+' gfin'+(op?' open':'')+(o.cls2||'')+'"'+(o.attr||'')+'><button type="button" class="gsum" '+o.btnAttr+' aria-expanded="'+op+'"'+(o.btnAttr2||'')+'><span class="gst">FINAL</span><span class="'+(o.away.win?'w':'')+'">'+sc(o.away)+'</span><span class="mut">·</span><span class="'+(o.home.win?'w':'')+'">'+sc(o.home)+'</span>'+(o.upset?'<span>😱</span>':'')+'<span class="gch" aria-hidden="true">'+(op?'▾':'▸')+'</span></button><div class="'+(o.bodyCls||'gbody')+'"'+(o.bodyAttr||'')+(op?'':' hidden')+'>'+o.body+'</div></div>'};

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
    return '<div class="tapf" role="group" aria-label="Filter by owner">'+o.filters+'</div><div class="card tap s27-rk"><table><tr>'+o.heads.map(th).join('')+'</tr>'+
      o.rows.map(function(r){return '<tr'+(r.attr||'')+'>'+r.cells.map(function(c){return '<td'+(c[0]?' class="'+c[0]+'"':'')+(c[1]||'')+'>'+c[2]+'</td>'}).join('')+'</tr>'}).join('')+'</table></div>'};

  /* STEP6-BETS: New bet question tips (STOOPIDS wording), both sites */
  SHARED_UI.TIPS={who:'Tap one or more managers. Several = one bet, one result.',text:'Write it as you say it: "Kansas -4 beats Duke".',amt:function(min){return 'Minimum '+min},odds:'If you’re right, they owe amount × first ÷ second. Even = 1-1.'};

  /* STEP7-TALLY: Bets > Tally header card, empty note and per-person table, both sites */
  SHARED_UI.tallyTop=function(attr,emptyAttr,empty){return '<div class="card"'+(attr||'')+'><b>🧮 Tally · 2026-27</b><div class="note">From the 2026-27 shared ledger only. Rows owe columns.</div></div>'+(empty?'<div class="card note"'+emptyAttr+'>No 2026-27 bets with amounts yet.</div>':'')};
  SHARED_UI.tallyPeople=function(rows,o){var f=o.fmt;
    return '<div class="card sc"><table'+o.tblAttr+'><tr><th>Person</th><th class="n">Lost</th><th class="n">Won</th><th class="n">Net +/-</th><th class="n">Bets</th><th class="n">Fines</th></tr>'+rows.map(function(r){var n=r.net;
      return '<tr '+o.rowKey+'="'+o.e(r.id)+'"><td'+(r.tdAttr||'')+'>'+r.nameHtml+'</td><td class="n">'+f(r.lost)+'</td><td class="n">'+f(r.won)+'</td><td class="n"><b class="'+(n>0?'good':n<0?'bad':'')+'">'+(n>0?'+':n<0?'-':'')+f(Math.abs(n))+'</b></td><td class="n">'+r.bets+'</td><td class="n">'+(r.fines?f(r.fines):o.zero)+'</td></tr>'}).join('')+'</table></div>'};

  /* STEP7-RECAP: Recap "Weekly write-ups" section (newest first; empty note), both sites. items: [{kind,date,title,body}] */
  /* STEP7-SCORING: Rules scoring table (label escaping passed in: STOOPIDS labels are trusted markup, League escapes) */
  SHARED_UI.scoringTable=function(rows,o){var e=o.e,s=o.sign;return '<div class="card sc"><table><tr><th>Scoring</th><th class="n">Pts</th></tr>'+rows.map(function(r){return '<tr><td>'+e(r[0])+'</td><td class="n">'+s(r[1])+'</td></tr>'}).join('')+'</table></div>'};
  SHARED_UI.weeklySection=function(items,o){var e=o.e;var L=(items||[]).filter(function(x){return x&&x.title}).slice().sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''))});
    var list=L.length?'<div class="rcl">'+L.map(function(x){return '<article class="card rci"><small>'+e(x.kind==='special'?'Special':'Weekly')+(x.date?' · '+e(o.fmtDate(String(x.date).slice(0,10))):'')+'</small><h3>'+e(x.title)+'</h3><p>'+e(x.body||'')+'</p></article>'}).join('')+'</div>':'<div class="card note rcnone"'+(o.emptyAttr||'')+'>No weekly write-ups yet. The first one comes after opening week.</div>';
    return '<section class="rcw"'+(o.secAttr||'')+'><h2>📰 Weekly write-ups</h2>'+list+'</section>'};
})(typeof window!=='undefined'?window:globalThis);
