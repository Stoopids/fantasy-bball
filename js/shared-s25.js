/*<S25-SHARED>*/
/* shared-s25-league.js : s25 shared core, League edition (auto-settle reading + result math + ESPN matching, settle sounds, settle pop-ups, taglines, reactions).
   Same behavior and synth as shared-s25.js, neutral wording. Pure core: no DOM, no network, no storage, except the s25c UI helpers at the end (pickPlaced, renderReactions), which touch only the element passed in.
   Exposes one global: S25. */
(function(G){
'use strict';
const S25={version:'s25.1'};

/* ===== Taglines (DRAFT, not approved yet: swap the strings freely; the rotation adapts to any length) ===== */
S25.TAGLINES=[
  "To pick, or not to pick: that is the question. (It isn't.)",
  "Friends, Romans, fans, lend me your ears.",
  "Four score and seven bad calls ago...",
  "I came, I saw, I called it.",
  "Ask not what your bracket can do for you; ask what you did to your bracket.",
  "A horse! A horse! My kingdom for a stop!",
  "Et tu, Kansas?",
  "The only thing we have to fear is the buzzer-beater.",
  "It was the best of picks, it was the worst of picks. Mostly the worst.",
  "Some are born great, some achieve greatness, and some get swept.",
  "Give me liberty, or give me overtime.",
  "One small step for man, one giant brick from the free-throw line.",
  "Veni, vidi, dunked.",
  "All the world's a bracket, and all the men and women merely busted.",
  "Float like a butterfly, sting like a 12-seed.",
  "Houston, we have a turnover."
];
S25.TAG_EPOCH='2026-11-01';S25.TAG_EPOCH_ET=S25.TAG_EPOCH;   // day 0 (viewer's local calendar date); the line changes every 2 local days
const LD=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'});
const LT=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZoneName:'short'});
S25.localDay=function(d){d=d instanceof Date?d:new Date(d);if(isNaN(d))return null;const p={};LD.formatToParts(d).forEach(x=>p[x.type]=x.value);return p.year+'-'+p.month+'-'+p.day};
S25.localTime=function(d){d=d instanceof Date?d:new Date(d);return isNaN(d)?'':LT.format(d)};
const ETD=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
S25.etDay=function(d){d=d instanceof Date?d:new Date(d);if(isNaN(d))return null;const p={};ETD.formatToParts(d).forEach(x=>p[x.type]=x.value);return p.year+'-'+p.month+'-'+p.day};   // game-day matching (ESPN dates=) uses the US Eastern day; display uses localDay/localTime
S25.etTime=S25.localTime;   // old names kept as aliases; both use the device zone now
const dayNum=s=>Math.round(Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/864e5);
S25.tagIndex=function(now,n){n=n||S25.TAGLINES.length;const s=S25.etDay(now==null?new Date():now);if(!s||!n)return 0;
  const days=dayNum(s)-dayNum(S25.TAG_EPOCH);return ((Math.floor(days/2)%n)+n)%n};
S25.tagline=function(now,list){list=list||S25.TAGLINES;return list[S25.tagIndex(now,list.length)]};

/* ===== Reactions ===== */
S25.REACTIONS=['👍','👎','🤪','🔥','😂','🍆'];

/* ===== Reading (parser) ===== */
S25.ESPN='https://site.api.espn.com/apis/site/v2/sports/';
S25.SPORTS={
  mcbb:{path:'basketball/mens-college-basketball',q:'&groups=50&limit=400',lbl:'College hoops (M)'},
  wcbb:{path:'basketball/womens-college-basketball',q:'&groups=50&limit=400',lbl:'College hoops (W)'},
  cfb:{path:'football/college-football',q:'&groups=80&limit=400',lbl:'College football'},
  nfl:{path:'football/nfl',q:'',lbl:'NFL'},
  nba:{path:'basketball/nba',q:'',lbl:'NBA'},
  wnba:{path:'basketball/wnba',q:'',lbl:'WNBA'},
  mlb:{path:'baseball/mlb',q:'',lbl:'MLB'},
  nhl:{path:'hockey/nhl',q:'',lbl:'NHL'}
};
S25.scoreboardUrl=(sp,ymd)=>S25.ESPN+S25.SPORTS[sp].path+'/scoreboard?dates='+String(ymd).replace(/-/g,'')+S25.SPORTS[sp].q;
const SPORT_WORDS=[
  ['wcbb',/\b(women'?s|wbb|ncaaw)\b/i],
  ['nfl',/\b(nfl|tnf|mnf|snf|super bowl|bears|vikings|vikes|packers|green bay|eagles|cowboys|cownboys|49ers|49s|niners|bills|dolphins|jets|chiefs|lions|ravens|steelers|patriots|broncos|raiders|chargers|rams|seahawks|saints|falcons|buccaneers|bucs|commanders|browns|bengals|texans|colts|jaguars|titans)\b/i],
  ['cfb',/\b(cfp|bowl|college football|fcs|fbs)\b/i],
  ['wnba',/\b(wnba|lynx|sparks|liberty|aces|fever|storm|mercury|valkyries)\b/i],
  ['nba',/\b(nba|bucks|timberwolves|t-wolves|wolves|sixers|76ers|warriors|dubs|lakers|celtics|knicks|nets|heat|bulls|cavs|cavaliers|pistons|pacers|hornets|wizards|raptors|nuggets|jazz|suns|clippers|blazers|thunder|spurs|mavs|mavericks|rockets|grizzlies|pelicans)\b/i],
  ['mlb',/\b(mlb|yankees|mets|red sox|blue jays|orioles|guardians|twins|royals|white sox|astros|angels|athletics|mariners|dodgers|padres|phillies|braves|marlins|nationals|cubs|brewers|pirates|rockies|diamondbacks)\b/i],
  ['nhl',/\b(nhl|bruins|canadiens|maple leafs|penguins|blackhawks|red wings|oilers|canucks|avalanche)\b/i],
  ['cfb',/\bfootball\b/i]
];
S25.sportOf=t=>{for(const [k,re] of SPORT_WORDS)if(re.test(t))return k;return 'mcbb'};
const MON={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
const MON_LBL=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DATE_RE=/\b(?:(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*\.?,?\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s?(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s(20\d\d)\b)?/i;
const ymd=(y,m,d)=>y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
/* pick the year: written year, else the one that puts the game closest to (and preferably after) the day the pick was made */
S25.dateFrom=function(text,createdDay){
  const m=DATE_RE.exec(text);if(!m)return null;const mo=MON[m[1].slice(0,3).toLowerCase()],d=+m[2];if(d<1||d>31)return null;
  if(m[3])return {d:ymd(+m[3],mo,d),raw:m[0]};
  const c=createdDay||S25.etDay(new Date()),cy=+c.slice(0,4),cn=dayNum(c);let best=null;
  for(const y of [cy-1,cy,cy+1]){const diff=dayNum(ymd(y,mo,d))-cn;const s=diff>=-45?Math.abs(diff):1000+Math.abs(diff);if(!best||s<best.s)best={s,y}}
  return {d:ymd(best.y,mo,d),raw:m[0]};
};
const STOP_L=/^(the|that|will|would|he|she|they|i|says?|picks?|thinks?|a|an|on|and|if)$/i;
const STOP_R=/^(on|in|at|by|for|tonight|today|straight|with|when|this|next|to|game|is|and|-|—|\(.*|in\b.*)$/i;
const NOT_GAME=/\b(pool|standings|fantasy|draft|record|season|minutes|hrs?|home runs?|tds?|touchdowns?|pitcher|squares|series|per game|derby|all star|yards|int'?s|score more points head|lifetime|title|ff|first half|second half|1st half|2nd half|halftime|quarter|player)\b/i;
const NUM=String.raw`(\d{1,3}(?:\.\d)?|\.5)`;
const ws=s=>s.trim().split(/\s+/).filter(Boolean);
const cap=s=>s.replace(/\b([a-z])/g,(m,c,i,all)=>i>0&&all[i-1]==="'"?m:c.toUpperCase());
function teamL(s){let w=ws(s.replace(/^[,;:!?\s]+/,'').replace(/[,;:!?]+$/,''));while(w.length&&STOP_L.test(w[0]))w.shift();while(w.length&&/^(will|would|cover|covers|their|the|to)$/i.test(w[w.length-1]))w.pop();if(!w.length||w.length>3||w.some(x=>/\d|[+]/.test(x)&&!/^49(er)?s$/i.test(x)))return null;return cap(w.join(' '))}
function teamR(s){let w=ws(s.replace(/[(),;:!?].*$/,''));while(w.length&&/^(the)$/i.test(w[0]))w.shift();const out=[];for(const x of w){if(STOP_R.test(x)||/^[+-]?\d/.test(x)&&!/^49(er)?s$/i.test(x))break;out.push(x.replace(/[.,]+$/,''));if(/[.,]$/.test(x))break}
  if(!out.length||out.length>3)return null;return cap(out.join(' '))}
const OPP=String.raw`(?:vs\.?|v\.?|versus|against|at|@)`;
/* text -> reading {k:'spread'|'ml'|'total', t, o, l, ou?, sp, d}  or {k:'manual'} */
S25.parse=function(text,createdISO){
  const manual={k:'manual'};
  let t=String(text||'').replace(/[\u2018\u2019]/g,"'").replace(/[\u2013\u2014]/g,'-').replace(/\s+/g,' ').trim();if(!t)return manual;
  if(/\n/.test(String(text))||NOT_GAME.test(t))return manual;
  const cDay=createdISO?S25.etDay(createdISO):S25.etDay(new Date());
  const dt=S25.dateFrom(t,cDay);if(dt)t=t.replace(dt.raw,' ');
  const sp=S25.sportOf(t);
  t=t.replace(/^[^:]{0,40}:\s*/,'');                                       // "Christmas card pick 🎄:" / leftover "Nov. 16:"
  const th=t.split(/\bthat\b/i);if(th.length>1)t=th[th.length-1];
  t=t.replace(/\b\d+\s?k\b(\s+each)?/ig,' ').replace(/\b\d+\s?-\s?\d\b\s+(?:for\b)?/g,' ').replace(/\b(straight up|tonight|on the road)\b/ig,' ').replace(/\s+/g,' ').replace(/[ ,.]+$/,'').trim();
  const d=dt?dt.d:cDay;const R=o=>Object.assign(o,{sp,d});const n=x=>Math.round(parseFloat(x)*2)/2;
  let m;
  // 1) spread on the team: "Kansas +4 vs Duke", "Miami +6.5 vs Florida -6.5", "Kansas +3 beats duke", "kansas +4 v Duke"
  if((m=new RegExp(String.raw`^(.*?)\s([+-]`+NUM+String.raw`|pk|pick'?em)\s+(?:`+OPP+String.raw`|beats?|over|covers?\s(?:vs\.?|against))\s+(.*)$`,'i').exec(t))){
    const a=teamL(m[1]),b=teamR(m[4]);if(!a||!b)return manual;const l=/^p/i.test(m[2])?0:n(m[2]);
    const tail=/([+-]\d{1,3}(?:\.\d)?)\s*$/.exec(m[4]);if(tail&&n(tail[1])!==-l)return manual;   // "Miami +6.5 vs Florida -5" disagrees: let a human read it
    return R({k:'spread',t:a,o:b,l})}
  // 2) "A covers -9.5 against B", "A will cover +1.5 against B", "A covers their +2 vs B"
  if((m=new RegExp(String.raw`^(.*?)\s(?:will\s|would\s)?(?:beats?\sthe\s|covers?\s)(?:their\s|the\s)?([+-]?)`+NUM+String.raw`(?:\s(?:point\s)?spread|\spoints?|\spts)?\s`+OPP+String.raw`\s(.*)$`,'i').exec(t))){
    const a=teamL(m[1]),b=teamR(m[4]);if(!a||!b||!m[2])return manual;   // no + or - : could be the favourite or the dog, so a human picks
    return R({k:'spread',t:a,o:b,l:n(m[2]+m[3])})}
  // 3) "A wins by more than 3.5 at B" / "A beats B by 10 or more"
  const gt=x=>{x=n(x);return Number.isInteger(x)?-(x+0.5):-x};   // "by more than 5" = 6+ (exactly 5 loses); "more than 3.5" = 4+
  if((m=new RegExp(String.raw`^(.*?)\swins?\sby\smore\sthan\s`+NUM+String.raw`(?:\spoints?)?\s(?:`+OPP+String.raw`|over)\s(.*)$`,'i').exec(t))){const a=teamL(m[1]),b=teamR(m[3]);if(!a||!b)return manual;return R({k:'spread',t:a,o:b,l:gt(m[2])})}
  if((m=new RegExp(String.raw`^(.*?)\swins?\sby\s(\d{1,3})\s(?:points?\s)?or\smore\s(?:`+OPP+String.raw`|over)\s(.*)$`,'i').exec(t))){const a=teamL(m[1]),b=teamR(m[3]);if(!a||!b)return manual;return R({k:'spread',t:a,o:b,l:-(+m[2]-0.5)})}
  if((m=new RegExp(String.raw`^(.*?)\sbeats?\s(.*?)\sby\s(\d{1,3})\s(?:points?\s)?or\smore`,'i').exec(t))){const a=teamL(m[1]),b=teamR(m[2]);if(!a||!b)return manual;return R({k:'spread',t:a,o:b,l:-(+m[3]-0.5)})}
  if((m=new RegExp(String.raw`^(.*?)\sbeats?\s(.*?)\sby\smore\sthan\s`+NUM,'i').exec(t))){const a=teamL(m[1]),b=teamR(m[2]);if(!a||!b)return manual;return R({k:'spread',t:a,o:b,l:gt(m[3])})}
  if(/\b(beats?|tops?|defeats?|over|wins?)\b.*\bby\s\d/i.test(t))return manual;              // "Kansas beats Duke by 5": exactly 5? at least 5? a human reads it
  // 4) totals: "Duke vs Kansas over 145.5", "over 145.5 in Duke vs Kansas"
  if((m=new RegExp(String.raw`\b(over|under|o|u)\s?`+NUM+String.raw`\b`,'i').exec(t))){
    const ou=/^o/i.test(m[1])?'o':'u',l=n(m[2]),rest=(t.slice(0,m.index)+' '+t.slice(m.index+m[0].length)).replace(/\b(in|points?|pts|total|combined)\b/ig,' ').replace(/\s+/g,' ').trim();
    const mm=new RegExp(String.raw`^(.*?)\s(?:`+OPP+String.raw`|and|-)\s(.*)$`,'i').exec(rest);if(!mm)return manual;const a=teamL(mm[1]),b=teamR(mm[2]);if(!a||!b)return manual;
    return R({k:'total',t:a,o:b,l,ou})}
  if((m=/^(.*?)\s(?:will\s|would\s)?loses?\sto\s(.*)$/i.exec(t))){const a=teamR(m[2]),b=teamL(m[1]);if(!a||!b)return manual;return R({k:'ml',t:a,o:b,l:null})}   // "Duke loses to Kansas" = Kansas beats Duke
  // 5) straight win: "Duke beats Kansas", "UVA tops L'ville", "Phillies will win the game versus the Orioles"
  if((m=/^(.*?)\s(?:will\s|would\s)?(?:beats?|tops?|defeats?|outscores?|over|wins?\s(?:the\sgame\s)?(?:vs\.?|versus|against|over|at)|win\s(?:the\sgame\s)?(?:vs\.?|versus|against|over|at))\s(.*)$/i.exec(t))){
    if(/^(the\s)?(spread|by)\b/i.test(m[2]))return manual;const a=teamL(m[1]),b=teamR(m[2]);if(!a||!b)return manual;return R({k:'ml',t:a,o:b,l:null})}
  return manual;
};
const fl=l=>l===0?'PK':(l>0?'+':'')+l;
S25.dayLbl=d=>d?MON_LBL[+d.slice(5,7)-1]+' '+(+d.slice(8,10)):'';
S25.label=function(r){if(!r||r.k==='manual')return 'Manual';const dd=r.d?', '+S25.dayLbl(r.d):'';
  return r.k==='spread'?r.t+' '+fl(r.l)+' vs '+r.o+dd:r.k==='total'?r.t+' vs '+r.o+' '+(r.ou==='o'?'over':'under')+' '+r.l+dd:r.t+' beats '+r.o+dd};

/* ===== Result math. ts = score of r.t, os = score of r.o. r: 'backer' (the pick text came true) | 'other' | 'push' ===== */
S25.result=function(r,ts,os){
  ts=+ts;os=+os;if(!r||r.k==='manual'||!isFinite(ts)||!isFinite(os))return null;
  if(r.k==='spread'){const m=ts+r.l-os;return {r:m>0?'backer':m<0?'other':'push',why:m>0?r.t+' covers '+fl(r.l):m<0?r.t+' does not cover '+fl(r.l):'Push: '+r.t+' '+fl(r.l)+' lands exactly'}}
  if(r.k==='total'){const s=ts+os,d=r.ou==='o'?s-r.l:r.l-s;return {r:d>0?'backer':d<0?'other':'push',why:'Total '+s+(d===0?': push on '+r.l:(s>r.l?': over ':': under ')+r.l)+(d>0?' hits':d<0?' misses':'')}}
  return {r:ts>os?'backer':ts<os?'other':'push',why:ts>os?r.t+' wins':ts<os?r.o+' wins':'Tie'};
};

/* ===== ESPN matching ===== */
const ALIAS={uva:'virginia',unc:'north carolina',iu:'indiana',ou:'oklahoma',bama:'alabama',vt:'virginia tech','mich st':'michigan state','miss st':'mississippi state',msu:'michigan state',"l'ville":'louisville',lville:'louisville',boilers:'purdue',hoosiers:'indiana',badgers:'wisconsin',wiscy:'wisconsin',vandy:'vanderbilt',vikes:'vikings','t-wolves':'timberwolves',wolves:'timberwolves',dubs:'warriors','49s':'49ers',niners:'49ers',sixers:'76ers',cownboys:'cowboys',kansa:'kansas',zags:'gonzaga',cuse:'syracuse',nova:'villanova',pitt:'pittsburgh',ucsb:'uc santa barbara','uc-irvine':'uc irvine'};
const norm=s=>{s=String(s||'').toLowerCase().replace(/&/g,' and ').replace(/[.]/g,'').replace(/\bst$/,'state').replace(/[^a-z0-9' -]/g,' ').replace(/\s+/g,' ').trim();return ALIAS[s]||s};
function teamScore(q,tm){if(!tm)return 0;const qn=norm(q);if(!qn)return 0;
  const ex=[tm.location,tm.shortDisplayName,tm.nickname,tm.abbreviation,tm.displayName].map(norm);if(ex.includes(qn))return 3;
  if(norm(tm.name)===qn)return 2;const dn=norm(tm.displayName);return dn.startsWith(qn+' ')||dn.endsWith(' '+qn)?1:0}
S25.match=function(sb,r){
  let best=null;for(const ev of (sb&&sb.events)||[]){const c=ev.competitions&&ev.competitions[0];const cs=(c&&c.competitors)||[];if(cs.length!==2)continue;
    for(const [i,j] of [[0,1],[1,0]]){const a=teamScore(r.t,cs[i].team),b=teamScore(r.o,cs[j].team);if(a&&b&&(!best||a+b>best.s)){
      const st=(ev.status||c.status||{}).type||{};best={s:a+b,id:String(ev.id||''),final:st.name==='STATUS_FINAL'||(!!st.completed&&st.state==='post'),state:st.state||'',detail:st.shortDetail||'',start:ev.date||c.date||'',
        tn:cs[i].team.shortDisplayName||cs[i].team.displayName,on:cs[j].team.shortDisplayName||cs[j].team.displayName,ts:parseInt(cs[i].score,10),os:parseInt(cs[j].score,10)}}}}
  return best};
/* proposal text: "Duke 78, Kansas 75: Kansas covers +4" (winner's score first) */
S25.proposal=function(r,g){if(!g||!g.final)return null;const res=S25.result(r,g.ts,g.os);if(!res)return null;
  const sc=g.ts>=g.os?g.tn+' '+g.ts+', '+g.on+' '+g.os:g.on+' '+g.os+', '+g.tn+' '+g.ts;return Object.assign({text:sc+': '+res.why,sc},res)};

/* ===== Whose side: 'win' | 'loss' | 'wash' for the viewer; null = not in the pick (no sound, no pop-up) ===== */
S25.side=function(b,me){if(!b||!me)return null;const opps=Array.isArray(b.opponents)&&b.opponents.length?b.opponents:[b.other];
  const inB=me===b.backer,inO=opps.includes(me);if(!inB&&!inO)return null;
  if(b.status==='push')return 'wash';if(b.status==='backer')return inB?'win':'loss';if(b.status==='other')return inB?'loss':'win';return null};

/* ===== Settle sounds (WebAudio synth params; no files) ===== */
S25.SOUND={master:0.55,
  win:{voices:[{type:'square',f:1318.5,t:0,d:0.09,g:0.22},{type:'square',f:1760,t:0.085,d:0.55,g:0.2},{type:'triangle',f:2637,t:0.085,d:0.5,g:0.12},{type:'sine',f:3520,t:0.09,d:0.35,g:0.06}],
       noise:{t:0.05,d:0.22,g:0.16,hp:6000}},                                                      // cha-ching: register "cha" + bright bell "ching"
  loss:{lp:1100,voices:[{type:'sawtooth',f:233.1,f1:220,t:0,d:0.3,g:0.2},{type:'sawtooth',f:207.7,f1:196,t:0.34,d:0.3,g:0.2},{type:'sawtooth',f:185,f1:174.6,t:0.68,d:0.3,g:0.2},{type:'sawtooth',f:164.8,f1:130.8,t:1.02,d:0.9,g:0.22,vib:{rate:7,depth:5}}]},  // womp womp womp wommmp
  wash:{voices:[{type:'sine',f:1150,t:0,d:0.045,g:0.22},{type:'sine',f:1150,t:0.15,d:0.045,g:0.18}]}   // soft double tick
};
S25.soundLen=k=>{const s=S25.SOUND[k];let e=0;s.voices.forEach(v=>{e=Math.max(e,v.t+v.d)});if(s.noise)e=Math.max(e,s.noise.t+s.noise.d);return e+0.05};
/* works with AudioContext and OfflineAudioContext */
S25.synth=function(ctx,kind,dest,t0){const s=S25.SOUND[kind];if(!s||!ctx)return 0;t0=t0==null?ctx.currentTime:t0;dest=dest||ctx.destination;
  const out=ctx.createGain();out.gain.value=S25.SOUND.master;let bus=out;
  if(s.lp){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=s.lp;f.connect(out);bus=f}out.connect(dest);
  s.voices.forEach(v=>{const o=ctx.createOscillator(),g=ctx.createGain(),a=t0+v.t,e=a+v.d;o.type=v.type;o.frequency.setValueAtTime(v.f,a);if(v.f1)o.frequency.linearRampToValueAtTime(v.f1,e);
    if(v.vib){const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=v.vib.rate;lg.gain.value=v.vib.depth;l.connect(lg);lg.connect(o.frequency);l.start(a);l.stop(e)}
    g.gain.setValueAtTime(0.0001,a);g.gain.exponentialRampToValueAtTime(v.g,a+0.008);g.gain.exponentialRampToValueAtTime(0.0001,e);o.connect(g);g.connect(bus);o.start(a);o.stop(e+0.02)});
  if(s.noise){const n=s.noise,len=Math.ceil(ctx.sampleRate*n.d),buf=ctx.createBuffer(1,len,ctx.sampleRate),ch=buf.getChannelData(0);let x=12345;for(let i=0;i<len;i++){x=(x*1103515245+12345)&0x7fffffff;ch[i]=x/0x3fffffff-1}
    const src=ctx.createBufferSource(),hp=ctx.createBiquadFilter(),g=ctx.createGain(),a=t0+n.t;src.buffer=buf;hp.type='highpass';hp.frequency.value=n.hp;g.gain.setValueAtTime(0.0001,a);g.gain.exponentialRampToValueAtTime(n.g,a+0.005);g.gain.exponentialRampToValueAtTime(0.0001,a+n.d);src.connect(hp);hp.connect(g);g.connect(bus);src.start(a)}
  return S25.soundLen(kind)};

/* ===== Settle memes (original inline SVG, yellow theme, no real people) ===== */
const BALL=(cx,cy,r)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#E8742A" stroke="#2b1d0e" stroke-width="4"/><g stroke="#2b1d0e" stroke-width="3.5" fill="none"><path d="M${cx-r} ${cy}H${cx+r}"/><path d="M${cx} ${cy-r}V${cy+r}"/><path d="M${cx-r*.7} ${cy-r*.72}Q${cx-r*.25} ${cy} ${cx-r*.7} ${cy+r*.72}"/><path d="M${cx+r*.7} ${cy-r*.72}Q${cx+r*.25} ${cy} ${cx+r*.7} ${cy+r*.72}"/></g>`;
const FRAME=inner=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" aria-hidden="true" focusable="false"><rect width="240" height="240" rx="28" fill="#FFD23F"/>${inner}</svg>`;
S25.MEMES={
  win:{cap:'Called it.',svg:FRAME(`<g stroke="#2b1d0e" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M66 146L36 128L44 86"/><path d="M174 146L204 128L196 86"/></g><circle cx="44" cy="78" r="15" fill="#2b1d0e"/><circle cx="196" cy="78" r="15" fill="#2b1d0e"/><path d="M36 112q8-10 18-4" stroke="#FFD23F" stroke-width="3" fill="none"/><path d="M204 112q-8-10-18-4" stroke="#FFD23F" stroke-width="3" fill="none"/>${BALL(120,150,62)}<path d="M76 128H164V138Q162 156 143 156Q126 156 124 140H116Q114 156 97 156Q78 156 76 138Z" fill="#111"/><path d="M84 134l10-4M132 134l10-4" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M98 176Q120 196 142 176" stroke="#111" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="M200 40l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#fff"/><path d="M30 46l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff"/>`)},
  loss:{cap:'Oof.',svg:FRAME(`<ellipse cx="120" cy="186" rx="86" ry="34" fill="#E8742A" stroke="#2b1d0e" stroke-width="4"/><g stroke="#2b1d0e" stroke-width="3.5" fill="none"><path d="M36 184Q120 172 204 186"/><path d="M118 152Q112 186 122 220"/><path d="M70 160Q90 186 72 212"/><path d="M170 160Q150 186 168 212"/></g><path d="M92 170l12 8M104 170l-12 8M136 170l12 8M148 170l-12 8" stroke="#111" stroke-width="4.5" stroke-linecap="round"/><path d="M104 200Q120 190 136 200" stroke="#111" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M176 132q8 14 0 20q-8-6 0-20z" fill="#7cc7ff" stroke="#2b1d0e" stroke-width="2"/><g stroke="#2b1d0e" stroke-width="4" stroke-linecap="round" opacity=".6"><path d="M60 128l-12-12M76 116l-4-16M44 146l-16-4"/></g><text x="186" y="104" font-family="system-ui,sans-serif" font-weight="900" font-size="20" fill="#2b1d0e" transform="rotate(12 186 104)">pfff</text>`)},
  wash:{cap:'Nobody wins. Nobody learns.',svg:FRAME(`<g stroke="#2b1d0e" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M64 150L34 140L22 110"/><path d="M176 150L206 140L218 110"/></g><g fill="#2b1d0e"><circle cx="20" cy="104" r="11"/><circle cx="220" cy="104" r="11"/></g>${BALL(120,152,60)}<path d="M90 128q10-8 20 0M130 128q10-8 20 0" stroke="#111" stroke-width="4.5" fill="none" stroke-linecap="round"/><circle cx="100" cy="142" r="5.5" fill="#111"/><circle cx="140" cy="142" r="5.5" fill="#111"/><path d="M102 178H138" stroke="#111" stroke-width="5" stroke-linecap="round"/><text x="120" y="76" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="26" fill="#2b1d0e">¯\\_(ツ)_/¯</text>`)}
};
S25.MEME_MS=2000;
S25.MEMES_ENABLED=false;   // settle pop-ups are shelved: the page glue must not show any pop-up while this is false (sounds are unaffected). Set true to bring them back.

/* ===== s25c UI helpers (the only DOM code in this file; everything above stays pure). Storage-agnostic: the caller persists. ===== */
S25.MUTE_KEY='league_s25_mute';   // localStorage key read only when a caller omits opts.muted
S25.ctx=null;                  // the page sets its gesture-unlocked AudioContext here; no context or not running = silent
S25.isMuted=function(){try{return G.localStorage&&G.localStorage.getItem(S25.MUTE_KEY)==='1'}catch(e){return false}};
S25.reducedMotion=function(){try{return !!(G.matchMedia&&G.matchMedia('(prefers-reduced-motion: reduce)').matches)}catch(e){return false}};
/* display times: always the viewer's device time zone with a short label (Intl). Day boundaries use the device zone too. */
const ZFIX={'Asia/Jakarta':'WIB','Asia/Pontianak':'WIB','Asia/Makassar':'WITA','Asia/Jayapura':'WIT'};
S25.zoneLabel=function(d){try{const z=Intl.DateTimeFormat().resolvedOptions().timeZone;if(ZFIX[z])return ZFIX[z];const p=new Intl.DateTimeFormat('en-US',{timeZoneName:'short'}).formatToParts(d||new Date()).find(x=>x.type==='timeZoneName');return p?p.value:''}catch(e){return ''}};
S25.localTime=function(d){d=d instanceof Date?d:new Date(d);if(isNaN(d))return '';return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(d).replace(/\u202f/g,' ')+' '+S25.zoneLabel(d)};
/* original swish: white noise through a band-pass that sweeps up then settles, ~0.45 s. Works with AudioContext and OfflineAudioContext. */
S25.SWISH_LEN=0.5;
S25.swish=function(ctx,dest,t0){if(!ctx)return 0;t0=t0==null?ctx.currentTime:t0;dest=dest||ctx.destination;const sr=ctx.sampleRate,n=Math.floor(sr*0.48),buf=ctx.createBuffer(1,n,sr),d=buf.getChannelData(0);
  let s=0x2545F491;for(let i=0;i<n;i++){s^=s<<13;s^=s>>>17;s^=s<<5;d[i]=((s>>>0)/4294967296)*2-1}   // seeded noise: same swish every time
  const src=ctx.createBufferSource();src.buffer=buf;const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=1.4;bp.frequency.setValueAtTime(450,t0);bp.frequency.exponentialRampToValueAtTime(5200,t0+0.30);bp.frequency.exponentialRampToValueAtTime(2600,t0+0.45);
  const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(1.5*S25.SOUND.master,t0+0.06);g.gain.exponentialRampToValueAtTime(0.7*S25.SOUND.master,t0+0.25);g.gain.exponentialRampToValueAtTime(0.0001,t0+0.46);
  src.connect(bp);bp.connect(g);g.connect(dest);src.start(t0);src.stop(t0+0.48);return 0.48};
const UICSS=`.s25-confetti{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:5;border-radius:inherit}
.s25-confetti i{position:absolute;display:block;border-radius:1px;opacity:0;animation:s25cf 1s cubic-bezier(.2,.7,.4,1) forwards}
@keyframes s25cf{0%{opacity:1;transform:translate(0,0) rotate(0)}70%{opacity:1}100%{opacity:0;transform:translate(var(--dx),calc(var(--dy) + 140px)) rotate(var(--r))}}
.s25-badge{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:6;pointer-events:none;background:#ffd23f;color:#1b1400;font-weight:900;font-size:15px;padding:6px 14px;border-radius:99px;box-shadow:0 4px 18px rgba(0,0,0,.45);white-space:nowrap;animation:s25bdg 1.5s ease-out forwards}
.s25-badge.static{animation:none}
@keyframes s25bdg{0%{opacity:0;transform:translateX(-50%) scale(.6)}12%{opacity:1;transform:translateX(-50%) scale(1.12)}22%{transform:translateX(-50%) scale(1)}80%{opacity:1}100%{opacity:0}}
.s25rxr{position:relative;display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;align-items:center}
.s25rx{font:inherit;font-size:15px;line-height:1;display:inline-flex;align-items:center;gap:3px;min-width:40px;min-height:36px;padding:0 8px;justify-content:center;border-radius:99px;border:1px solid #2d3548;background:transparent;color:inherit;cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.s25rx .n{font-size:11.5px;font-weight:800}.s25rx.on{border-color:#ffd23f;background:rgba(255,210,63,.18)}.s25rx:disabled{cursor:default;opacity:.85}
.s25add{font:inherit;font-size:14px;min-height:36px;min-width:44px;padding:0 8px;border-radius:99px;border:1px dashed #2d3548;background:transparent;color:inherit;cursor:pointer;opacity:.8}
.s25add[aria-expanded="true"]{border-style:solid;border-color:#ffd23f;opacity:1}
.s25pk{position:absolute;bottom:calc(100% + 6px);left:0;z-index:20;display:flex;gap:2px;padding:4px;border-radius:99px;background:#222939;border:1px solid #2d3548;box-shadow:0 6px 22px rgba(0,0,0,.5);white-space:nowrap}
.s25pk button{font-size:19px;line-height:1;width:36px;height:36px;border:0;border-radius:50%;background:transparent;cursor:pointer;padding:0}
.s25pk button.on{background:rgba(255,210,63,.25)}.s25pk button:hover,.s25pk button:focus-visible{background:rgba(255,255,255,.12)}
.s25wl{flex-basis:100%;font-size:12px;opacity:.8;margin-top:2px}`;
function ensureCss(doc){if(!doc||doc.getElementById('s25-ui-css'))return;const s=doc.createElement('style');s.id='s25-ui-css';s.textContent=UICSS;(doc.head||doc.documentElement).appendChild(s)}
S25.ensureCss=ensureCss;
/* pickPlaced(cardEl,{muted,reducedMotion}): call ONLY after a confirmed save, on the device that made it. Swish unless muted, confetti unless reduced motion, badge always (static under reduced motion). */
S25.pickPlaced=function(card,opts){opts=opts||{};const muted=opts.muted==null?S25.isMuted():!!opts.muted,rm=opts.reducedMotion==null?S25.reducedMotion():!!opts.reducedMotion,out={sound:false,confetti:false,badge:false};
  if(!muted){const c=S25.ctx;if(c&&c.state==='running'){try{S25.swish(c);out.sound=true}catch(e){}}}
  if(!card||!card.ownerDocument)return out;const doc=card.ownerDocument,W=doc.defaultView||G;ensureCss(doc);
  /* the effect lives in an overlay on <body> placed over the card, so a page re-render of the card does not cut it short */
  const key=card.id||'';doc.querySelectorAll('.s25-fxlayer').forEach(x=>{if(x.getAttribute('data-for')===key)x.remove()});
  const R=card.getBoundingClientRect(),L=doc.createElement('div');L.className='s25-fxlayer';L.setAttribute('data-for',key);L.style.cssText='position:absolute;left:'+(R.left+(W.scrollX||0))+'px;top:'+(R.top+(W.scrollY||0))+'px;width:'+R.width+'px;height:'+R.height+'px;pointer-events:none;z-index:50;border-radius:14px';(doc.body||doc.documentElement).appendChild(L);setTimeout(()=>L.remove(),1600);
  const b=doc.createElement('div');b.className='s25-badge'+(rm?' static':'');b.setAttribute('role','status');b.textContent='Pick’s in! 🏀';L.appendChild(b);out.badge=true;setTimeout(()=>b.remove(),1500);
  if(!rm){const cf=doc.createElement('div');cf.className='s25-confetti';cf.setAttribute('aria-hidden','true');   // CSS confetti (no canvas): ~1 s, brand yellow + accents
    const COL=['#ffd23f','#ffe680','#f5b700','#4ade80','#ffffff'];for(let i=0;i<44;i++){const p=doc.createElement('i'),a=Math.random()*Math.PI*2,v=50+Math.random()*110;
      p.style.cssText='left:'+(38+Math.random()*24)+'%;top:34%;background:'+COL[i%COL.length]+';--dx:'+Math.round(Math.cos(a)*v*1.4)+'px;--dy:'+Math.round(Math.sin(a)*v-60)+'px;--r:'+Math.round(Math.random()*720-360)+'deg;animation-delay:'+Math.round(Math.random()*120)+'ms;width:'+(5+Math.round(Math.random()*5))+'px;height:'+(3+Math.round(Math.random()*4))+'px';cf.appendChild(p)}
    L.appendChild(cf);out.confetti=true;setTimeout(()=>cf.remove(),1100)}
  return out};
/* renderReactions(el, counts, mine, onToggle, opts): storage-agnostic reaction chips + 😀+ picker.
   counts {emoji:[names]} or {emoji:n}; mine Set/array of emojis I used; onToggle(emoji,on) persists (caller's job); opts {readOnly, emojis}.
   Only used emojis get a chip. readOnly: chips shown, disabled, no 😀+ button. */
let OPEN=null;   // the open picker {el, close}
function closeOpen(){if(OPEN){const o=OPEN;OPEN=null;o.close()}}
let wired=false;function wire(doc){if(wired)return;wired=true;
  doc.addEventListener('pointerdown',ev=>{if(OPEN&&!OPEN.el.contains(ev.target))closeOpen()},true);
  doc.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&OPEN){const a=OPEN.el.querySelector('.s25add');closeOpen();if(a)a.focus({preventScroll:true})}},true)}
S25.closePicker=closeOpen;
S25.renderReactions=function(el,counts,mine,onToggle,opts){if(!el||!el.ownerDocument)return;opts=opts||{};const doc=el.ownerDocument,EM=opts.emojis||S25.REACTIONS,ro=!!opts.readOnly;ensureCss(doc);wire(doc);
  if(OPEN&&OPEN.el===el)OPEN=null;
  const my=new Set(mine instanceof Set?[...mine]:(mine||[])),who=e=>{const v=counts&&counts[e];return Array.isArray(v)?v:[]},cnt=e=>{const v=counts&&counts[e];return Array.isArray(v)?v.length:(Number(v)||0)};
  el.textContent='';el.classList.add('s25rxr');el.setAttribute('role','group');el.setAttribute('aria-label','Reactions');
  const fine=!!(G.matchMedia&&G.matchMedia('(hover: hover) and (pointer: fine)').matches);
  let wl=null;const showWho=e=>{const w=who(e);if(!w.length)return;if(!wl){wl=doc.createElement('div');wl.className='s25wl';wl.setAttribute('data-s25-wl','');el.appendChild(wl)}wl.textContent=e+' '+w.join(', ')},hideWho=()=>{if(wl){wl.remove();wl=null}};
  const fire=(e,on)=>{closeOpen();if(typeof onToggle==='function')onToggle(e,on)};
  EM.filter(e=>cnt(e)>0).forEach(e=>{const n=cnt(e),on=my.has(e),w=who(e),b=doc.createElement('button');b.type='button';b.className='s25rx'+(on?' on':'');b.setAttribute('data-s25-rx',e);b.setAttribute('aria-pressed',String(on));
    b.setAttribute('aria-label',e+' '+n+(w.length?': '+w.join(', '):''));if(w.length)b.title=w.join(', ');b.innerHTML='';b.appendChild(doc.createTextNode(e));const s=doc.createElement('span');s.className='n';s.textContent=String(n);b.appendChild(s);
    if(ro)b.disabled=true;let lp=false,tm=null;
    b.addEventListener('pointerdown',()=>{lp=false;clearTimeout(tm);tm=setTimeout(()=>{lp=true;showWho(e)},500)});['pointerup','pointercancel','pointerleave'].forEach(t=>b.addEventListener(t,()=>clearTimeout(tm)));
    b.addEventListener('contextmenu',ev=>ev.preventDefault());
    if(fine){b.addEventListener('mouseenter',()=>showWho(e));b.addEventListener('mouseleave',()=>{if(!lp)hideWho()})}
    b.addEventListener('click',ev=>{if(lp){lp=false;ev.preventDefault();return}if(!ro)fire(e,!on)});el.appendChild(b)});
  if(ro)return;
  const add=doc.createElement('button');add.type='button';add.className='s25add';add.setAttribute('data-s25-add','');add.setAttribute('aria-haspopup','true');add.setAttribute('aria-expanded','false');add.setAttribute('aria-label','Add a reaction');add.title='Add a reaction';add.textContent='😀+';el.appendChild(add);
  let pk=null;const close=()=>{if(pk){pk.remove();pk=null}add.setAttribute('aria-expanded','false')};
  const open=()=>{if(pk)return;closeOpen();pk=doc.createElement('div');pk.className='s25pk';pk.setAttribute('role','menu');pk.setAttribute('data-s25-pk','');
    EM.forEach(e=>{const on=my.has(e),b=doc.createElement('button');b.type='button';b.setAttribute('role','menuitemcheckbox');b.setAttribute('aria-checked',String(on));b.setAttribute('data-s25-pick',e);b.setAttribute('aria-label',e);if(on)b.className='on';b.textContent=e;b.addEventListener('click',()=>fire(e,!on));pk.appendChild(b)});
    el.appendChild(pk);add.setAttribute('aria-expanded','true');OPEN={el,close};
    try{const vw=(doc.documentElement&&doc.documentElement.clientWidth)||G.innerWidth||0,r=pk.getBoundingClientRect(),ar=add.getBoundingClientRect(),er=el.getBoundingClientRect();if(vw&&r.width){let left=ar.left-er.left;const abs=er.left+left;
      if(abs+r.width>vw-6)left=vw-6-r.width-er.left;if(er.left+left<6)left=6-er.left;pk.style.left=left+'px'}}catch(e){}   // keep the picker inside the viewport (320px safe)
    const f=pk.querySelector('button');if(f&&!fine)f.focus({preventScroll:true})};
  add.addEventListener('click',()=>{if(pk){closeOpen();close()}else open()});
  if(fine){let ht=null;const hold=()=>clearTimeout(ht),later=()=>{clearTimeout(ht);ht=setTimeout(()=>{if(OPEN&&OPEN.el===el)closeOpen()},350)};
    add.addEventListener('mouseenter',()=>{hold();open()});add.addEventListener('mouseleave',later);el.addEventListener('mouseenter',hold);el.addEventListener('mouseleave',later)}};
G.pickPlaced=S25.pickPlaced;G.renderReactions=S25.renderReactions;
/* ===== s25c upset tagline: mixed into the 2-day rotation (every 4th slot) when ESPN shows a recent men's college hoops upset ===== */
S25.UPSET_TEMPLATES=["{Winner} over {Loser}. Chaos is an art form.","Houston, {Loser} has a problem.","{Loser}, you had one job.","Upset alert: {Winner} 1, the experts 0.","Et tu, {Winner}? {Loser} never saw it coming.","Ask not what {Loser} can do for you; ask what {Winner} just did.","To be ranked, or not to be ranked: {Loser} chose not.","One small step for {Winner}, one giant faceplant for {Loser}.","{Winner} {WS}, {Loser} {LS}. The experts are crying.","Upset is as upset does. Today, {Winner} does.","Frankly, my dear {Loser}, {Winner} didn't give a damn.","{Winner} came to play. {Loser} came to watch.","Believe in upsets yet? {Winner} does.","Somebody stop this! {Winner} over {Loser}.","Ice in the veins! {Winner} with the upset.","Absolutely wild! {Winner} took down {Loser}.","Boom goes the dynamite. {Loser} goes home.","Oh my! {Winner} 1, the pundits 0.","Bang! {Winner} drops {Loser}.","Get that outta here! {Loser}, take a seat.","Not over till the buzzer. For {Loser}, it's over.","You miss 100% of the shots you don't take. {Loser} missed the rest too.","Déjà vu all over again: {Loser} loses to {Winner}.","Everyone's got a plan until {Winner} shows up.","When you come to a fork in the road, take {Winner}.","It's not whether you get knocked down. {Loser} stayed down.","Nobody goes to {Loser} games anymore. They're too crowded.","Winning isn't everything, it's the only thing. Ask {Winner}.","Half this game is 90% mental. {Loser} brought the other half."];
S25.UPSET_EVERY=4;   // slot k (2-day slots since TAG_EPOCH_ET) is an upset slot when k % 4 === 3
S25.UPSET_URL=ymd=>S25.ESPN+'basketball/mens-college-basketball/scoreboard?dates='+ymd+'&groups=50&limit=400';
S25.tagSlot=function(now){const s=S25.etDay(now==null?new Date():now);if(!s)return 0;return Math.floor((dayNum(s)-dayNum(S25.TAG_EPOCH))/2)};
const rk=c=>{const r=c&&c.curatedRank&&Number(c.curatedRank.current);return r>=1&&r<=25?r:26};   // 99 / missing = unranked = 26
const sd=c=>{const v=c&&(c.seed!=null?c.seed:c.tournamentSeed);const n=Number(v);return Number.isInteger(n)&&n>=1&&n<=16?n:null};
const nm=c=>{const t=c&&c.team||{};return String(t.location||t.shortDisplayName||t.displayName||'').replace(/[<>"]/g,'').trim().slice(0,40)};
/* one scoreboard JSON -> upsets [{winner,loser,ws,ls,wr,lr,gap,date,seeded}] (finals only) */
S25.upsetsFrom=function(sb){const out=[];((sb&&sb.events)||[]).forEach(ev=>{try{const cp=ev.competitions&&ev.competitions[0];if(!cp)return;const st=(cp.status||ev.status||{}).type||{};if(!(st.completed||st.state==='post'))return;
    const cs=cp.competitors||[];if(cs.length!==2)return;const W=cs.find(c=>c.winner===true),L=cs.find(c=>c!==W);if(!W||!L)return;
    const ws=Number(W.score&&W.score.value!=null?W.score.value:W.score),ls=Number(L.score&&L.score.value!=null?L.score.value:L.score);if(!isFinite(ws)||!isFinite(ls)||ws<=ls)return;
    const nt=JSON.stringify(cp.notes||[]),tourn=/Men's Basketball Championship/i.test(nt);   // NCAA tournament: ESPN puts the seed in curatedRank
    const a=sd(W)!=null?sd(W):(tourn&&rk(W)<=16?rk(W):null),b=sd(L)!=null?sd(L):(tourn&&rk(L)<=16?rk(L):null),seeded=a!=null&&b!=null;let wr,lr;if(seeded){wr=a;lr=b}else{wr=rk(W);lr=rk(L)}   // March: seeds (a worse seed beating a higher seed counts; same seed never counts)
    if(!(wr>lr)||(!seeded&&lr>25))return;const w=nm(W),l=nm(L);if(!w||!l)return;
    out.push({winner:w,loser:l,ws,ls,wr,lr,gap:wr-lr,date:String(ev.date||cp.date||''),seeded})}catch(e){}});return out};
/* biggest: largest gap, then the higher-ranked (smaller number) loser, then most recent */
S25.pickUpset=function(list){let best=null;(list||[]).forEach(u=>{if(!best||u.gap>best.gap||(u.gap===best.gap&&(u.lr<best.lr||(u.lr===best.lr&&Date.parse(u.date)>Date.parse(best.date)))))best=u});return best};
/* template for upset slot j: j mod N, skipping ahead if it would repeat the previous slot's line */
const clash=(a,b)=>a===b;
S25.upsetTemplateAt=function(j){const N=S25.UPSET_TEMPLATES.length,base=i=>((i%N)+N)%N;if(N<2)return 0;let p=base(j-1);if(clash(p,base(j-2)))p=base(p+1);let t=base(j);while(clash(t,p))t=base(t+1);return t};
S25.upsetTemplate=function(now){return S25.upsetTemplateAt(Math.floor(S25.tagSlot(now)/S25.UPSET_EVERY))};
S25.upsetLine=function(u,now){const t=S25.UPSET_TEMPLATES[S25.upsetTemplate(now)];return t.replace(/\{Winner\}/g,u.winner).replace(/\{Loser\}/g,u.loser).replace(/\{WS\}/g,String(u.ws)).replace(/\{LS\}/g,String(u.ls))};
S25.isUpsetSlot=now=>{const k=S25.tagSlot(now);return ((k%S25.UPSET_EVERY)+S25.UPSET_EVERY)%S25.UPSET_EVERY===S25.UPSET_EVERY-1};
S25.taglineWith=function(now,upset,list){if(upset&&S25.isUpsetSlot(now))return S25.upsetLine(upset,now);return S25.tagline(now,list)};
/* loadUpset({fetch, now, cache, days}): GET the last 7 local days (read-only), cache ~1 h in the given storage (e.g. sessionStorage). Any error / no data -> null (normal list, silently). */
S25.UPSET_CACHE_KEY='s25_upset_v1';S25.UPSET_TTL=36e5;
S25.loadUpset=async function(o){o=o||{};const f=o.fetch||G.fetch,now=o.now||new Date(),cache=o.cache||null,days=o.days||7;
  try{if(cache){const c=JSON.parse(cache.getItem(S25.UPSET_CACHE_KEY)||'null');if(c&&Date.now()-c.at<S25.UPSET_TTL&&c.day===S25.etDay(now))return c.u||null}}catch(e){}
  if(typeof f!=='function')return null;let all=[],got=0;
  for(let i=0;i<days;i++){const ymd=S25.etDay(new Date(+new Date(now)-i*864e5)).replace(/-/g,'');
    try{const r=await f(S25.UPSET_URL(ymd));if(!r||!r.ok)continue;all=all.concat(S25.upsetsFrom(await r.json()));got++}catch(e){}}
  const u=got?S25.pickUpset(all):null;
  try{if(cache&&got)cache.setItem(S25.UPSET_CACHE_KEY,JSON.stringify({at:Date.now(),day:S25.etDay(now),u}))}catch(e){}
  return u};
G.S25=S25;
if(typeof module!=='undefined'&&module.exports)module.exports=S25;
})(typeof window!=='undefined'?window:globalThis);
/*</S25-SHARED>*/
