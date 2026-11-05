/* shared/ui.js v1.22.0: ONE table of input limits and shared wording, loaded by BOTH sites.
   Edit here only, copy to the other repo by hand, and run scripts/check_shared.sh.
   Each site keeps its old values as fallbacks, so the pages still work if this file fails to load. */
(function(g){var LIMITS={team:15,stoopName:12,leagueName:24,chat:200,betText:140,paste:300,payouts:120,stake:20,item:40,odds:9};
var STRINGS={maxLen:'Keep it to {n} characters or fewer.',nameTooLong:'Keep the name to {n} characters or fewer.',teamTooLong:'Keep the team name to {n} characters or fewer.',checkedNow:'checked just now',online:'Who\u2019s online'};
function t(k,n){var s=STRINGS[k];return s==null?'':String(s).replace('{n}',n)}
g.SHARED_UI={version:'1.22.0',LIMITS:LIMITS,STRINGS:STRINGS,t:t};})(typeof window!=='undefined'?window:globalThis);

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
  /* STEP8-REQUEST: "Request a bet" (core). One shared module, each site passes an adapter A:
     A.e(esc) A.me() A.others()->[{id,emoji,nick}] A.nick(id) A.canWrite() A.games()->[{id,g,label,start,status,period}]
     A.tname(side) A.dateET(g) A.get()->Promise<text> A.set(text)->Promise A.placeBet(req,meId)->Promise A.render() A.amounts
     Storage (option A): its OWN record per site {v:1,reqs:[...]}; each invited Stoop can accept once; every acceptance is its own bet; closes when all N slots are taken (write, re-read, check the slot).
     A request auto-cancels when its own window starts (full game: tip-off; 2nd half: halftime) or at the poster's expiry, whichever first. */
  SHARED_UI.Requests=function(A){
    var e=A.e,S={f:null,list:[],at:0,busy:false,msg:'',bad:false,loading:false};
    var nf=function(){return{gid:'',side:'',cov:'game',odds:[1,1],amt:null,amtTxt:'',to:[],mode:'h',n:3,at:''}};S.f=nf();
    var HALF_MS=70*60000;
    function parse(t){try{var o=JSON.parse(t||'{}');if(typeof o==='string')o=JSON.parse(o);return Array.isArray(o.reqs)?o.reqs.filter(function(r){return r&&r.id}):[]}catch(x){return[]}}
    function rid(){return 'rq'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
    var GC=null,GT=0;function games(){var n=Date.now();if(!GC||n-GT>2000){GC=A.games()||[];GT=n}return GC}
    function game(id){return games().find(function(x){return String(x.id)===String(id)})}
    function winStart(r,g){var st=Date.parse(r.start||(g&&g.start))||0;return r.cov==='2h'?st+HALF_MS:st}
    function started(r,now){var g=game(r.gid);if(r.cov==='2h'){if(g&&(g.status==='final'||(g.period&&+g.period>=2)))return true;return now>=winStart(r,g)}
      if(g&&g.status&&g.status!=='scheduled')return true;return now>=winStart(r,g)}
    function tk(r){return (r.took||[]).map(function(x){return x.m})}
    function slots(r){return Math.min(r.to.length,+r.slots||r.to.length)}
    function live(r,now){return r.status==='open'&&tk(r).length<slots(r)&&now<r.exp&&!started(r,now)}
    function left(ms){var m=Math.max(1,Math.round(ms/60000)),d=Math.round(m/1440);return m<60?m+'m':m<48*60?Math.round(m/60)+'h':d<60?d+' days':d<330?Math.round(d/30)+' months':Math.round(d/365)<=1?'1 year':Math.round(d/365)+' years'}
    var YEAR=366*86400000;
    function expAt(f,now,ws){if(f.mode==='start')return ws||null;var x;if(f.mode==='at'){x=Date.parse(f.at);if(isNaN(x))return null}else{var n=+f.n;if(!(n>0))return null;x=now+n*({m:60000,h:3600000,d:86400000,w:604800000,mo:2592000000}[f.mode]||3600000)}return x>now+YEAR?null:x}
    function sides(g){var o=SHARED_UI.qbOptions(g,{name:A.tname,date:A.dateET(g)});if(o.length)return o;
      var d=A.dateET(g);return [{k:'win',t:'Winner (no odds posted)',s:[[g.away,g.home],[g.home,g.away]].map(function(p){return{lab:A.tname(p[0])+' to win',txt:A.tname(p[0])+' beats '+A.tname(p[1])+(d?', '+d:'')}})}]}
    function pick(g,f){if(!g||!f.side)return null;var p=f.side.split(':'),o=sides(g).find(function(x){return x.k===p[0]}),s=o&&o.s[+p[1]];var ot=o.s[1-(+p[1])];return s?{k:p[0],si:+p[1],lab:s.lab,other:ot?ot.lab:'',txt:(f.cov==='2h'?'2nd half: ':'')+s.txt}:null}
    async function write(mut,ok){for(var k=0;k<3;k++){var cur=parse(await A.get());if(!ok(cur)){await A.set(JSON.stringify({v:1,reqs:mut(cur)}))}
        await new Promise(function(r){setTimeout(r,350+Math.random()*400)});var back=parse(await A.get());if(ok(back)){S.list=back;S.at=Date.now();return back}}throw new Error('conflict')}
    async function load(){if(S.loading)return;S.loading=true;S.at=Date.now();try{S.list=parse(await A.get());S.at=Date.now();paint();
        var now=Date.now(),dead=S.list.filter(function(r){return r.status==='open'&&!live(r,now)}).map(function(r){return r.id});
        if(dead.length&&A.canWrite())await write(function(c){return c.map(function(r){return dead.indexOf(r.id)>=0&&r.status==='open'&&!live(r,now)?Object.assign({},r,{status:tk(r).length>=slots(r)?'full':'closed',endedAt:now}):r})},function(c){return c.every(function(r){return dead.indexOf(r.id)<0||r.status!=='open'})})}
      catch(x){}S.loading=false;A.render()}
    function chips(f){return '<div class="b27-chips rq-to">'+A.others().map(function(o){var on=f.to.indexOf(o.id)>=0;return '<button type="button" class="b27-chip op" data-rq="to" data-v="'+e(o.id)+'" aria-pressed="'+on+'" aria-label="'+e(o.nick)+'"><span class="ck" aria-hidden="true">✓</span><span class="em" aria-hidden="true">'+e(o.emoji||'')+'</span><span class="nm" aria-hidden="true"><span class="f">'+e(o.nick)+'</span><span class="sh">'+e(SHARED_UI.shortName(o.nick))+'</span><span class="xs">'+e(SHARED_UI.tinyName(o.nick))+'</span></span></button>'}).join('')+'</div>'}
    function card(r,now){var me=A.me(),inv=r.to.indexOf(me)>=0,dec=(r.dec||[]).indexOf(me)>=0,n=r.to.length,w=Math.min(r.exp,winStart(r,game(r.gid)));
      var nt=tk(r).length,mine=tk(r).indexOf(me)>=0;var who=n===1?'Open to '+e(A.nick(r.to[0])):n>=A.others().length?'Open to all '+n+' stoops':'Open to '+n+' stoops';
      var h='<div class="card rq-card" data-rq-id="'+e(r.id)+'"><div class="rq-top"><b>📨 '+e(A.nick(r.by))+'</b> <span class="note">'+who+(nt?' · '+nt+' of '+slots(r)+' taken':'')+' · expires '+expTxt(r,now)+'</span></div>'
        +'<div class="rq-body"><span class="rq-amt">'+e(r.amt)+'</span> <span class="rq-side">'+e(r.lab)+'</span>'+' <span class="note">at '+oddsTxt(r.odds)+' odds</span>'+(r.cov==='2h'?' <span class="pill">2nd half</span>':'')+'<div class="note">'+e(r.game)+' · '+e(r.date||'')+'</div></div>'+explain(r);
      if(mine)h+='<div class="note good">You accepted: it is your bet now.</div>';
      else if(me&&inv&&!dec&&r.by!==me&&A.canWrite())h+='<div class="rq-act"><button type="button" class="btn rq-yes" data-rq="acc" data-v="'+e(r.id)+'"'+(S.busy?' disabled':'')+'>Accept</button><button type="button" class="btn sec rq-no" data-rq="dec" data-v="'+e(r.id)+'"'+(S.busy?' disabled':'')+'>Decline</button></div>';
      else if(dec)h+='<div class="note">You declined.</div>';
      else if(me&&r.by===me&&A.canWrite()&&nt)h+='<div class="rq-act rq-spots"><span class="note">Spots</span><button type="button" class="btn sec" data-rq="slot-" data-v="'+e(r.id)+'"'+(S.busy||slots(r)<=nt+0?' disabled':'')+' aria-label="One spot less">\u2212</button><b>'+slots(r)+'</b><button type="button" class="btn sec" data-rq="slot+" data-v="'+e(r.id)+'"'+(S.busy||slots(r)>=r.to.length?' disabled':'')+' aria-label="One spot more">+</button><button type="button" class="btn sec rq-no" data-rq="close" data-v="'+e(r.id)+'"'+(S.busy?' disabled':'')+'>Close to others</button></div>';
      else if(me&&r.by===me&&A.canWrite()&&!nt)h+='<div class="rq-act"><button type="button" class="btn sec" data-rq="edit" data-v="'+e(r.id)+'"'+(S.busy?' disabled':'')+'>Edit</button><button type="button" class="btn sec rq-no" data-rq="cancel" data-v="'+e(r.id)+'"'+(S.busy?' disabled':'')+'>Delete</button></div>';
      return h+'</div>'}
    function form(){var f=S.f,now0=Date.now(),G=games().filter(function(x){var st=Date.parse(x.start)||0,ws=f.cov==='2h'?st+HALF_MS:st;if(String(x.id)===String(f.gid))return true;if(x.status==='final'||st>=now0+7*86400000)return false;if(f.cov==='2h')return !(x.period&&+x.period>=2)&&now0<ws;return x.status==='scheduled'&&now0<ws}),g=game(f.gid);
      var h='<div class="card b27-form rq-form" id="rqForm"><b>📨 '+(S.edit?'Edit your request':'Request a bet')+'</b><div class="note">Ask one, some or all Stoops. Each one you pick can accept once, and every acceptance is its own bet.</div>';
      h+='<div class="b27-q">1. Game</div><select class="rq-in" data-rq-in="gid" aria-label="Game"><option value="">Choose a game…</option>'+G.map(function(x){return '<option value="'+e(x.id)+'"'+(String(x.id)===String(f.gid)?' selected':'')+'>'+e(x.label)+'</option>'}).join('')+'</select>';
      h+='<div class="rq-seg tabs" role="group" aria-label="Covers">'+[['game','Full game'],['2h','2nd half']].map(function(c){return '<button type="button" data-rq="cov" data-v="'+c[0]+'" class="'+(f.cov===c[0]?'on':'')+'" aria-pressed="'+(f.cov===c[0])+'">'+c[1]+'</button>'}).join('')+'</div>';
      if(g){h+='<div class="b27-q">2. Side</div>';sides(g.g).forEach(function(o){h+='<div class="qbs-r"><span class="qbs-l">'+e(o.t)+'</span><span class="qbs-s">'+o.s.map(function(s,i){var k=o.k+':'+i;return '<button type="button" class="qbs-o" data-rq="side" data-v="'+k+'" aria-pressed="'+(f.side===k)+'">'+e(s.lab)+'</button>'}).join('')+'</span></div>'})}
      h+='<div class="b27-q">3. Amount</div><div class="b27-chips">'+A.amounts.map(function(a){return '<button type="button" class="b27-chip" data-rq="amt" data-v="'+a+'" aria-pressed="'+(f.amt===a)+'">'+a+'</button>'}).join('')+'<input class="rq-in rq-num" data-rq-in="amtTxt" inputmode="numeric" placeholder="Other" value="'+e(f.amtTxt)+'" aria-label="Other amount"></div>';
      h+='<div class="b27-q">Odds</div><div class="b27-chips">'+[[1,1],[2,1],[3,1],[4,1],[5,1]].map(function(o){var on=+f.odds[0]===o[0]&&+f.odds[1]===o[1];return '<button type="button" class="b27-chip'+(on?' on':'')+'" data-rq="odds" data-v="'+o[0]+'-'+o[1]+'" aria-pressed="'+on+'">'+(o[0]===1?'Even':o[0]+'-'+o[1])+'</button>'}).join('')+'</div>';
      h+='<div class="b27-q rq-q4">4. Open to <span class="rq-all"><button type="button" class="btn sec" data-rq="all">All</button><button type="button" class="btn sec" data-rq="clear">Clear</button></span></div>'+chips(f);
      h+='<div class="b27-q">5. Expires</div><div class="rq-exp">'+(f.mode==='start'?'':f.mode==='at'?'<input class="rq-in" type="datetime-local" data-rq-in="at" value="'+e(f.at)+'" aria-label="Expires at">':'<input class="rq-in rq-num" data-rq-in="n" inputmode="numeric" value="'+e(f.n)+'" aria-label="Expires in">')+'<select class="rq-in" data-rq-in="mode" aria-label="Unit">'+[['m','minutes'],['h','hours'],['d','days'],['w','weeks'],['mo','months'],['start',f.cov==='2h'?'when the 2nd half starts':'at tipoff'],['at','exact date/time']].map(function(m){return '<option value="'+m[0]+'"'+(f.mode===m[0]?' selected':'')+'>'+m[1]+'</option>'}).join('')+'</select></div><div class="note">It also cancels by itself when the '+(f.cov==='2h'?'2nd half':'game')+' starts.</div>';
      var p=pick(g&&g.g,f),amt=f.amt||(+f.amtTxt>0?+f.amtTxt:null);
      h+='<div class="b27-sum">'+(p?e(p.txt):'Pick a game and a side')+' · '+(amt?e(amt):'?')+' · '+oddsTxt(f.odds)+' odds · '+(f.to.length?f.to.length===1?e(A.nick(f.to[0])):f.to.length+' stoops':'nobody yet')+'</div>';
      if(S.msg)h+='<div class="'+(S.bad?'bad':'good')+' rq-msg" role="status">'+e(S.msg)+'</div>';
      return h+'<button type="button" class="btn endbig rq-send" data-rq="send"'+(S.busy||!A.canWrite()?' disabled':'')+''+'>'+(S.edit?'Save changes':'\u{1F4E8} Request')+'</button>'+(S.edit?'<button type="button" class="btn sec rq-send" data-rq="unedit">Stop editing</button>':'')+'</div>'}
    function oddsTxt(o){o=o||[1,1];return +o[0]===+o[1]?'even':o[0]+'-'+o[1]}
    function expTxt(r,now){var ws=winStart(r,game(r.gid));return r.exp>=ws?(r.cov==='2h'?'when the 2nd half starts':'at tipoff'):'in '+left(r.exp-now)}
    function ifTxt(r,side){var s=String(side||''),k=r.k;if(k==='ou')return 'If it goes '+s;s=s.replace(/\s[+-]\d+(\.\d+)?$/,k==='sp'?'$&':'');return 'If '+s+(k==='sp'?' covers':' wins')}
    function explain(r){var o=r.odds||[1,1],rn=(A.real||A.nick)(r.by),win2=Math.round(r.amt*o[0]/o[1]*100)/100,ot=r.k==='ou'?r.other:String(r.other||'').replace(/\s[+-]?\d+(\.\d+)?$/,'');
      return '<div class="rq-ex note">'+e(ifTxt(r,r.lab))+', '+e(rn)+' wins '+e(r.amt)+'$ from whoever accepts.<br>'+e(ifTxt(r,ot))+', the Stoop who accepts wins '+e(win2)+'$'+(+o[0]===+o[1]?'':' ('+e(oddsTxt(o))+')')+' from '+e(rn)+'.</div>'}
    function whoTxt(r){var n=r.to.length;return n>=A.others().length?'all stoops':n<=2?r.to.map(A.nick).join(' & '):n+' stoops'}
    function waText(r,kind){var w=Math.min(r.exp,winStart(r,game(r.gid))),rn=(A.real||A.nick)(r.by),wt=whoTxt(r);   /* Paul's exact format, nothing else */
      var ot=String(r.other||'the other side').replace(/\s[+-]?\d+(\.\d+)?$/,'');
      var l2=(r.cov==='2h'?'2nd half: ':'')+r.lab+' ('+rn+') v '+ot+' ('+wt+') at '+oddsTxt(r.odds);
      if(kind==='del')return ['Bet Request Deleted: '+r.amt+'$',l2].join('\n');
      if(kind==='close')return ['Bet Request Closed: '+r.amt+'$',l2,tk(r).length+' stoops in'].join('\n');
      return [(kind===true||kind==='upd'?'Bet Updated: ':'Bet Requested: ')+r.amt+'$',l2,'Expires '+expTxt(r,Date.now())].join('\n')}
    function toast(ok){return (S.base||'Request posted')+(ok===true?' \u00b7 message copied, paste in WhatsApp, Stoopid':ok===false?'. Copy the message below for WhatsApp.':'.')}
    function say(txt,base){S.copied=null;S.fb=null;S.posted=false;S.base=base;copy(txt)}
    function copy(t,done){var fin=function(ok){S.copied=ok;S.fb=ok?null:t;if(S.posted)S.msg=toast(ok);if(done)done(ok);A.render()};var fb=function(){var ok=false;try{var ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();ok=!!document.execCommand('copy');ta.remove()}catch(x){}fin(ok)};
      try{if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(function(){fin(true)},fb);return}}catch(x){}fb()}
    function pinned(only){var now=Date.now(),L=S.list.filter(function(r){return live(r,now)}).sort(function(a,b){return a.exp-b.exp});
      if(!L.length)return only?'<div class="card note rq-none">No open requests right now.</div>':'';return '<div class="rq-pin" id="rqPinned"><h2 class="rq-h">\u{1F4CC} Open requests</h2>'+L.map(function(r){return card(r,now)}).join('')+'</div>'}
    function view(){var now=Date.now();if(!S.at||now-S.at>20000)setTimeout(load,0);
      var L=S.list.filter(function(r){return live(r,now)}).sort(function(a,b){return a.exp-b.exp}),me=A.me();
      var h='';if(S.msg&&!S.f.gid)h+='<div class="card '+(S.bad?'b27-bad':'b27-ok')+'" role="status">'+e(S.msg)+(S.fb?'<pre class="rq-fb">'+e(S.fb)+'</pre><div class="rq-act"><button type="button" class="btn" data-rq="wa">Copy</button></div>':'')+'</div>';
      h+=L.length?'<h2 class="rq-h">Open requests</h2>'+L.map(function(r){return card(r,now)}).join(''):'<div class="card note rq-none">No open requests right now.</div>';
      return h+(me&&A.canWrite()?form():'')}
    async function act(k,v){var f=S.f,me=A.me(),now=Date.now();
      if(k==='wa'){if(S.fb)copy(S.fb,function(ok){if(ok){S.msg='Message copied, paste in WhatsApp.';S.bad=false}});return}
      if(k==='edit'){var re=S.list.find(function(x){return x.id===v});if(!re||re.by!==me||tk(re).length||re.status!=='open')return;var ws=winStart(re,game(re.gid)),pad=function(n){return String(n).padStart(2,'0')},dt=new Date(re.exp);
        S.f={gid:re.gid,side:re.k+':'+(re.si||0),cov:re.cov||'game',odds:(re.odds||[1,1]).slice(),amt:A.amounts.indexOf(+re.amt)>=0?+re.amt:null,amtTxt:A.amounts.indexOf(+re.amt)>=0?'':String(re.amt),to:re.to.slice(),mode:re.exp>=ws?'start':'at',n:3,at:dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate())+'T'+pad(dt.getHours())+':'+pad(dt.getMinutes())};
        S.edit=re.id;S.msg='';S.fb=null;if(A.goRequest)A.goRequest();A.render();setTimeout(function(){try{var fo=document.getElementById('rqForm');if(fo)fo.scrollIntoView({block:'start'})}catch(x){}},30);return}
      if(k==='slot-'||k==='slot+'||k==='close'){var rs=S.list.find(function(x){return x.id===v});if(!rs||rs.by!==me||rs.status!=='open')return;var nt0=tk(rs).length,want=k==='close'?null:Math.max(nt0,Math.min(rs.to.length,slots(rs)+(k==='slot+'?1:-1)));
        if(k==='close')say(waText(rs,'close'),'Request closed');
        S.busy=true;A.render();try{await write(function(c){return c.map(function(x){if(x.id!==v||x.by!==me||x.status!=='open')return x;var n2=tk(x).length;return k==='close'?Object.assign({},x,{status:'closed',endedAt:Date.now()}):Object.assign({},x,{slots:Math.max(n2,want)})})},function(c){var x=c.find(function(y){return y.id===v});return !x||(k==='close'?x.status!=='open':slots(x)===Math.max(tk(x).length,want))});
          if(k==='close'){S.posted=true;S.msg=toast(S.copied)}else S.msg='Spots: '+want+'.';S.bad=false}catch(x){S.msg='Could not save that. Try again.';S.bad=true}S.busy=false;A.render();return}
      if(k==='unedit'){S.edit=null;S.f=nf();A.render();return}
      if(k==='to'){var i=f.to.indexOf(v);if(i>=0)f.to.splice(i,1);else f.to.push(v)}
      else if(k==='all')f.to=A.others().map(function(o){return o.id});else if(k==='clear')f.to=[];
      else if(k==='side')f.side=v;else if(k==='cov'){f.cov=v}else if(k==='amt'){f.amt=+v;f.amtTxt=''}else if(k==='odds'){f.odds=v.split('-').map(Number)}
      else if(k==='send'){var g=game(f.gid),p=pick(g&&g.g,f),amt=f.amt||(+f.amtTxt>0?Math.round(+f.amtTxt):null),ex=expAt(f,now,g?winStart({cov:f.cov,start:g.start},g):null);
        var err=!g?'Choose a game.':!p?'Choose a side.':!amt?'Choose an amount.':!f.to.length?'Choose who it is open to.':!ex||ex<=now?'Choose when it expires (up to a year).':null;
        if(!err){var r0={id:rid(),gid:String(g.id),start:g.start||null};if(started(Object.assign({cov:f.cov},r0),now))err='That '+(f.cov==='2h'?'half':'game')+' has already started.'}
        if(err){S.msg=err;S.bad=true;A.render();return}
        if(S.edit)r0.id=S.edit;
        var r=Object.assign(r0,{by:me,to:f.to.slice(),cov:f.cov,k:p.k,si:p.si,lab:p.lab,other:p.other,odds:f.odds.slice(),txt:p.txt,game:A.tname(g.g.away)+' vs '+A.tname(g.g.home),date:A.dateET(g.g),amt:amt,exp:ex,at:now,status:'open',dec:[]});
        say(waText(r,S.edit?'upd':'new'),S.edit?'Request updated':'Request posted');   /* one tap: copy starts inside the tap (clipboard needs it), then the request is posted */
        S.busy=true;S.msg='Sending…';S.bad=false;A.render();
        var ed=S.edit;r.ver=rid();
        try{if(ed){await write(function(c){return c.map(function(x){return x.id===ed&&x.by===me&&!tk(x).length&&x.status==='open'?Object.assign({},x,r,{dec:[],at:x.at,editedAt:now}):x})},function(c){var x=c.find(function(y){return y.id===ed});return !x||x.ver===r.ver||!!tk(x).length||x.status!=='open'});
            var xe=S.list.find(function(y){return y.id===ed});if(!xe||xe.ver!==r.ver)throw new Error('late');S.edit=null}
          else await write(function(c){return c.filter(function(x){return x.status==='open'||now-(x.endedAt||x.at)<7*86400000}).concat([r])},function(c){return c.some(function(x){return x.id===r.id})});S.f=nf();S.posted=true;S.msg=toast(S.copied);S.bad=false}
        catch(x){S.msg=x&&x.message==='late'?'Too late to edit: it was accepted or removed.':'Could not send it. Try again.';S.bad=true;if(x&&x.message==='late'){S.edit=null;S.f=nf()}}S.busy=false}
      else if(k==='dec'||k==='cancel'){if(k==='cancel'){var rd=S.list.find(function(x){return x.id===v});if(rd)say(waText(rd,'del'),'Request deleted')}S.busy=true;A.render();try{await write(function(c){return c.map(function(x){return x.id!==v?x:k==='dec'?Object.assign({},x,{dec:(x.dec||[]).concat([me])}):(tk(x).length?x:Object.assign({},x,{status:'deleted',endedAt:now}))})},function(c){var x=c.find(function(y){return y.id===v});return !x||(k==='dec'?(x.dec||[]).indexOf(me)>=0:x.status!=='open'||!!tk(x).length)});if(k==='dec'){S.msg='Declined.'}else{S.posted=true;S.msg=toast(S.copied)}S.bad=false}catch(x){S.msg='Could not save that. Try again.';S.bad=true}S.busy=false}
      else if(k==='acc'){S.busy=true;S.msg='Accepting…';S.bad=false;A.render();
        try{var ok=function(x){return x.id===v&&live(x,Date.now())&&x.to.indexOf(me)>=0&&tk(x).indexOf(me)<0&&x.by!==me};
          var back=await write(function(c){return c.map(function(x){return ok(x)?Object.assign({},x,{took:(x.took||[]).concat([{m:me,at:Date.now()}])}):x})},function(c){var x=c.find(function(y){return y.id===v});return !x||tk(x).indexOf(me)>=0||!live(x,Date.now())});
          var x=back.find(function(y){return y.id===v}),pos=x?tk(x).indexOf(me):-1;
          if(pos<0||pos>=slots(x)){   /* full (or closed) by the time my slot landed: take my slot back, no bet */
            if(pos>=0)await write(function(c){return c.map(function(y){return y.id===v?Object.assign({},y,{took:(y.took||[]).filter(function(z){return z.m!==me})}):y})},function(c){var y=c.find(function(z){return z.id===v});return !y||tk(y).indexOf(me)<0});
            S.msg='Sorry, it is full: every slot was taken.';S.bad=true}
          else{await A.placeBet(x,me);S.msg='Accepted! It is now a bet between '+A.nick(x.by)+' and '+A.nick(me)+'.';S.bad=false}}
        catch(y){S.msg='Could not accept it. Try again.';S.bad=true}S.busy=false}
      A.render()}
    function input(k,v){var f=S.f;if(k==='gid'){f.gid=v;f.side=''}else if(k==='mode'){f.mode=v}else if(k==='amtTxt'){f.amtTxt=v;f.amt=null;return}else f[k]=v;A.render()}
    function prefill(gid,k,i){S.f=nf();S.f.gid=String(gid);if(k)S.f.side=k+':'+i;S.msg='';var g=game(gid);if(g&&g.status&&g.status!=='scheduled')S.f.cov='2h'}
    /* Requests badge: open requests waiting for ME (invited, not declined, not mine, still live) on the Bets tab; refreshed by a light GET every 60 s */
    function count(){var me=A.me(),now=Date.now();if(!me)return 0;return S.list.filter(function(r){return live(r,now)&&r.by!==me&&r.to.indexOf(me)>=0&&(r.dec||[]).indexOf(me)<0&&tk(r).indexOf(me)<0}).length}
    function paint(){try{var a=A.navEl&&A.navEl();if(!a)return;var n=count(),b=a.querySelector('.rq-nb');if(!n){if(b)b.remove();return}
      if(!b){b=document.createElement('b');b.className='rq-nb';a.appendChild(b)}var s=String(Math.min(99,n));if(b.textContent!==s)b.textContent=s;b.setAttribute('aria-label',n+' bet request'+(n===1?'':'s')+' waiting')}catch(x){}}
    if(typeof window!=='undefined'&&typeof setInterval!=='undefined'){setTimeout(function(){if(A.me())load()},3000);setInterval(function(){if(A.me()&&!S.busy)load()},60000);setInterval(paint,2000)}
    if(typeof document!=='undefined'){document.addEventListener('click',function(ev){var t=ev.target.closest&&ev.target.closest('[data-rq]');if(!t)return;ev.preventDefault();act(t.dataset.rq,t.dataset.v)});
      document.addEventListener('change',function(ev){var t=ev.target;if(t&&t.dataset&&t.dataset.rqIn)input(t.dataset.rqIn,t.value)});
      document.addEventListener('input',function(ev){var t=ev.target;if(t&&t.dataset&&(t.dataset.rqIn==='amtTxt'||t.dataset.rqIn==='n'))S.f[t.dataset.rqIn]=t.value})}
    return {view:view,pinned:pinned,prefill:prefill,load:load,count:count,paint:paint,S:S,waText:waText,label:'\u{1F4E8} Request a bet'}};
  /* STEP7-NAMES: Stoop label rule (both sites): roomy spots = emoji + team nickname; tight spots use the real name.
     shortName/tinyName = the bet-form chip's phone labels (same cut on both sites). */
  SHARED_UI.shortName=function(n){n=String(n);var w=n.split(/\s+/).filter(Boolean),l=w[w.length-1];if(w.length>1&&l.length>=4&&l.length<=9)return l;if(n.length<=9)return n;if(w.length>1&&w[0].length<=9)return w[0];return n.slice(0,8)+'\u2026'};
  SHARED_UI.tinyName=function(n){var t=SHARED_UI.shortName(n);return t.length<=7?t:t.slice(0,4)};
  /* STEP7-QUICKBET: Games "Quick bet" window. qbOptions(g,{name,date}) -> [{k,t,s:[{lab,txt}]}] from the posted odds only
     (spread each side, moneyline each side, over/under); [] when no odds are posted. qbSheet(g,list,o) -> the window markup;
     each site wires the taps through o.pick(k,i) / o.blank() / o.close() attribute strings. Nothing is placed from here. */
  SHARED_UI.qbOptions=function(g,o){var A=g.away,H=g.home,ln=(g.line&&typeof g.line==='object')?g.line:{},nm=o.name,d=o.date?', '+o.date:'',out=[];
    var num=function(v){return v!=null&&v!==''&&isFinite(+v)};var sg=function(v){return (+v>0?'+':'')+(+v)};
    var fav=String(ln.fav)===String(A.id)?A:String(ln.fav)===String(H.id)?H:null,sp=+ln.sp;
    if(fav&&isFinite(sp)&&sp>0){var dog=fav===A?H:A;out.push({k:'sp',t:'Spread',s:[fav,dog].map(function(x){var y=x===fav?dog:fav,sx=x===fav?'-':'+',sy=y===fav?'-':'+';return{lab:nm(x)+' '+sx+sp,txt:nm(x)+' '+sx+sp+' vs '+nm(y)+' '+sy+sp+d}})})}
    var ma=num(ln.aml)?ln.aml:num(ln.mlA)?ln.mlA:ln.ml&&num(ln.ml.away)?ln.ml.away:null,mh=num(ln.hml)?ln.hml:num(ln.mlH)?ln.mlH:ln.ml&&num(ln.ml.home)?ln.ml.home:null;
    if(ma!=null&&mh!=null)out.push({k:'ml',t:'Moneyline',s:[[A,H,ma],[H,A,mh]].map(function(r){return{lab:nm(r[0])+' '+sg(r[2]),txt:nm(r[0])+' '+sg(r[2])+' to beat '+nm(r[1])+d}})});
    var ou=+ln.ou;if(isFinite(ou)&&ou>0){var m=nm(A)+' v '+nm(H);out.push({k:'ou',t:'Over/under',s:[['Over','Under'],['Under','Over']].map(function(p){return{lab:p[0]+' '+ou,txt:p[0]+' '+ou+' vs '+p[1]+' '+ou+', '+m+d}})})}
    return out};
  SHARED_UI.qbBlankText=function(g,o){return o.name(g.away)+' vs '+o.name(g.home)+(o.date?', '+o.date:'')};
  SHARED_UI.qbSheet=function(g,list,o){var e=o.e,t=e(o.name(g.away))+' vs '+e(o.name(g.home));
    var h='<div class="qbs-bg" '+o.close()+'></div><div class="qbs" role="dialog" aria-modal="true" aria-label="Quick bet: '+t+'"><div class="qbs-h"><b>⚡ Quick bet</b><button type="button" class="qbs-x" aria-label="Close" '+o.close()+'>✕</button></div><div class="qbs-g note">'+t+(o.date?' · '+e(o.date):'')+'</div>';
    if(!list.length)h+='<p class="qbs-none">No odds posted yet.</p><button type="button" class="qbs-w" '+o.blank()+'>Write it up</button>';
    else list.forEach(function(x){h+='<div class="qbs-r"><span class="qbs-l">'+e(x.t)+'</span><span class="qbs-s">'+x.s.map(function(s,i){return '<button type="button" class="qbs-o" title="'+e(s.txt)+'" '+o.pick(x.k,i)+'>'+e(s.lab)+'</button>'}).join('')+'</span></div>'});
    return h+(list.length?'<p class="qbs-n note">Tap a line: Write it up opens filled in. You pick the Stoop and the amount there.</p>':'')+'</div>'};
  /* STEP7-UPSETS: Rules "upset rule" card + empty state (each site passes its own wording, already safe markup) */
  SHARED_UI.upsetHead=function(note,empty){var h='<div class="card"><b>\u{1F631} The upset rule</b><div class="note">'+note+'</div></div>';return empty==null?h:h+'<div class="card">'+empty+'</div>'};
  /* STEP7-SCORING: Rules scoring table (label escaping passed in: STOOPIDS labels are trusted markup, League escapes) */
  SHARED_UI.scoringTable=function(rows,o){var e=o.e,s=o.sign;return '<div class="card sc"><table><tr><th>Scoring</th><th class="n">Pts</th></tr>'+rows.map(function(r){return '<tr><td>'+e(r[0])+'</td><td class="n">'+s(r[1])+'</td></tr>'}).join('')+'</table></div>'};
  SHARED_UI.weeklySection=function(items,o){var e=o.e;var L=(items||[]).filter(function(x){return x&&x.title}).slice().sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''))});
    var list=L.length?'<div class="rcl">'+L.map(function(x){return '<article class="card rci"><small>'+e(x.kind==='special'?'Special':'Weekly')+(x.date?' · '+e(o.fmtDate(String(x.date).slice(0,10))):'')+'</small><h3>'+e(x.title)+'</h3><p>'+e(x.body||'')+'</p></article>'}).join('')+'</div>':'<div class="card note rcnone"'+(o.emptyAttr||'')+'>No weekly write-ups yet. The first one comes after opening week.</div>';
    return '<section class="rcw"'+(o.secAttr||'')+'><h2>📰 Weekly write-ups</h2>'+list+'</section>'};
})(typeof window!=='undefined'?window:globalThis);
