#!/usr/bin/env python3
"""Build Ball league.html from the STOOPIDS master index.html.
Read-only source. Every swap is an exact string that must match the expected count.
Ball-only values live in js/ball-settings.js. This script does not copy STOOPIDS data,
the commissioner passcode, or archive.js.
Run: python3 tools/build_league_from_stoopids.py [/path/to/stoopids]
"""
import os, sys, re
SRC = sys.argv[1] if len(sys.argv) > 1 else '/agent/repos/stoopids'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def src(rel):
    with open(os.path.join(SRC, rel), encoding='utf-8') as f:
        return f.read()
s = src('index.html')
LOG, FAIL = [], []
def rep(old, new, n=1, why=''):
    global s
    c = s.count(old)
    if c != n:
        FAIL.append('expected %d x %r, found %d  [%s]' % (n, old[:90], c, why))
        return
    s = s.replace(old, new)
    LOG.append((why or old[:50], c))

# Ball scripts replace the STOOPIDS archive (Ball has no past-season archive).
rep('<script src="archive.js?v=1"></script>',
    '<script src="js/version.js"></script><script src="js/core.js"></script><script src="js/scoring.js"></script>'
    '<script src="js/league-d.js"></script><script src="js/league-sched.js"></script><script src="js/store.js"></script>'
    '<script src="assets/teams.js"></script><script src="js/league.js"></script>'
    '<script src="js/power-gen.js"></script><script src="js/power-render.js"></script>'
    '<script src="js/ball-settings.js"></script><script src="js/ball-bets.js"></script><script src="js/ball-stoopids.js"></script>',
    why='Ball data layer instead of archive.js')
rep('<link rel="stylesheet" href="shared/ui.css?v=1.44.0">',
    '<link rel="stylesheet" href="shared/ui.css?v=1.86.0"><link rel="stylesheet" href="css/power.css">',
    why='shared css + Ball power rankings')

rep("const s=document.createElement('script');s.src=(DEMO?'demo/':'')+'data.js?v='+Date.now();\n  s.onload=()=>{D=window.STOOPIDS_DATA;",
    "const s=document.createElement('script');s.src='js/ball-settings.js?v='+Date.now();\n  s.onload=async()=>{try{await BALL.load()}catch(e){if(!D){$('#main').innerHTML=BALL.landingHtml();if(typeof cb==='function')cb();return}}D=BALL.D;",
    why='build D from the Ball league')
rep('window.STOOPIDS_DATA', 'BALL.D', n=s.count('window.STOOPIDS_DATA'), why='no STOOPIDS data object')

rep("function s24Url(h,share){const q=new URLSearchParams();if(DEMO)q.set('demo','1');if(!share&&ADMIN)q.set('admin','1');const s=q.toString();return location.pathname+(s?'?'+s:'')+(h?'#'+h:'')}",
    "function ballLeagueId(){try{const q=new URLSearchParams(location.search).get('l');if(q&&/^[A-Za-z0-9]{2,40}$/.test(q))return q}catch(e){}return (window.BALL&&BALL.id)||''}\nfunction s24Url(h,share){const q=new URLSearchParams();const l=ballLeagueId();if(l)q.set('l',l);if(DEMO)q.set('demo','1');if(!share&&ADMIN)q.set('admin','1');const s=q.toString();return location.pathname+(s?'?'+s:'')+(h?'#'+h:'')}",
    why='keep ?l= on this league')
rep("function s12PublicUrl(){let u;try{u=new URL(location.href)}catch(e){return location.origin+location.pathname+'?view=1'}",
    "function s12PublicUrl(){let u;try{u=new URL(location.href)}catch(e){const l=ballLeagueId();return location.origin+location.pathname+'?'+(l?'l='+encodeURIComponent(l)+'&':'')+'view=1'}",
    why='public link keeps ?l=')
rep("function s29ViewUrl(h){h=String(h||'').replace(/[^A-Za-z0-9_\\/-]/g,'');return location.origin+location.pathname+'?view=1'+(h?'#'+h:'')}",
    "function s29ViewUrl(h){h=String(h||'').replace(/[^A-Za-z0-9_\\/-]/g,'');const q=new URLSearchParams();const l=ballLeagueId();if(l)q.set('l',l);q.set('view','1');return location.origin+location.pathname+'?'+q.toString()+(h?'#'+h:'')}",
    why='view link keeps ?l=')
rep("function s29eMgrUrl(){return location.origin+location.pathname.replace(/index\\.html$/,'')}",
    "function s29eMgrUrl(){const base=location.origin+location.pathname.replace(/league\\.html$/,'');const l=ballLeagueId();return l?base+'?l='+encodeURIComponent(l):base}",
    why='manager link keeps ?l=')

# textdb: Ball virtual keys. The fetch wrapper in ball-stoopids.js reads the real fbn1 logs.
rep("url:'https://textdb.dev/api/data/stoopids-presence-23658198955328729a557ddb'", "url:BALL.url('page-presence')", why='presence key')
rep("url:PRES.url.replace('stoopids-presence-','stoopids-chat-')", "url:BALL.url('page-chat')", why='chat key')
rep("url:'https://textdb.dev/api/data/stoopids-bets-2627-9eaa4f66'", "url:BALL.url('bets-view')", why='bets key')
rep("const REQ_URL='https://textdb.dev/api/data/stoopids-requests-2627-9eaa4f66'", "const REQ_URL=BALL.url('page-requests')", why='requests key')
rep("const CM_URL='https://textdb.dev/api/data/stoopids-commish-2627-9eaa4f66'", "const CM_URL=BALL.url('commish')", why='commish key')

# Drop the STOOPIDS commissioner hash before the localStorage rename.
rep("const PROF_ALERT='stoopids_prof_alerts',PROF_CM_SALT='263256bf61928c71',PROF_CM_HASH='e66a42e9a43f14938ec07992f73a26193c7a0cfe9af88d1e409bce63f454f74e',PROF_CM_TOK='stoopids_cm_tok';",
    "const PROF_ALERT=HK+'prof_alerts',PROF_CM_SALT='',PROF_CM_HASH='',PROF_CM_TOK=HK+'cm_tok';",
    why='no STOOPIDS commissioner passcode')
rep("function profCmUnlocked(){return lsGet(PROF_CM_TOK)===PROF_CM_HASH}",
    "function profCmUnlocked(){return !!BALL.cmOk}", why='commish unlock is this league')
rep("if(hash===PROF_CM_HASH){PROFCM.tries=0;PROFCM.msg='';lsSet(PROF_CM_TOK,PROF_CM_HASH);render();return}",
    "if(await BALL.cmUnlock(pass)){PROFCM.tries=0;PROFCM.msg='';render();return}", why='commish passcode is the league passcode')
rep("function profCmLock(){try{localStorage.removeItem(PROF_CM_TOK)}catch(e){}PROFCM.msg='';render()}",
    "function profCmLock(){try{localStorage.removeItem(PROF_CM_TOK)}catch(e){}BALL.cmLock();PROFCM.msg='';render()}", why='commish lock')
rep('<p class="prof-note">Commissioner: Paul</p>',
    '<p class="prof-note">Commissioner: ${esc(BALL.cmName)}</p>', why='commissioner name from the league')

# Device keys: never share stoopids_* with the master site on the same origin.
n_ls = s.count("'stoopids_") + s.count("'stoopids.")
s2, c = re.subn(r"'stoopids([_.])([A-Za-z0-9_.]*)'", r"(HK+'\2')", s)
if c != n_ls:
    FAIL.append('localStorage rename expected %d, found %d' % (n_ls, c))
else:
    s = s2
    LOG.append(("localStorage stoopids_* -> HK", c))
rep("'stoopids-bets-backup-", "HK+'bets-backup-", n=s.count("'stoopids-bets-backup-"), why='bets backup key')

# Crew literals -> the Ball league.
def swap_literal(decl, expr, why):
    global s
    i = s.find(decl)
    if i < 0 or s.count(decl) != 1:
        FAIL.append('missing ' + decl); return
    k = i + len(decl) - 1
    while s[k] not in '{[': k += 1
    d = 0; q = None; p = k
    while True:
        ch = s[p]
        if q:
            if ch == '\\': p += 2; continue
            if ch == q: q = None
        elif ch in '"\'`': q = ch
        elif ch in '{[': d += 1
        elif ch in '}]':
            d -= 1
            if d == 0:
                s = s[:k] + expr + s[p+1:]
                LOG.append((why, 1)); return
        p += 1
swap_literal('const OWNER_DISP=', 'window.BALL_OWNER_DISP', 'names from the league')
swap_literal('const OLD_PN=', 'window.BALL_OLD_PN', 'no STOOPIDS renames')
swap_literal('const LEGACY_OWNER=', 'window.BALL_LEGACY_OWNER', 'no STOOPIDS legacy names')
swap_literal('const DRAFT27=', 'window.BALL_DRAFT27', 'draft from this league')
swap_literal('const DRAFT27_RESULTS=', 'window.BALL_DRAFT27_RESULTS', 'Nov 1 draft results from this league')
swap_literal('const RECAPS=', '[]', 'weekly write-ups are not on Ball; draft grades stay')

rep("const b27Who=()=>{const w=whoKey(PS.who)||whoKey(lsGet((HK+'who')));",
    "const b27Who=()=>{const w=BALL.me;", why='bets act only as the private-link manager')
rep("function chatWho(){const w=whoKey(PS.who)||whoKey(lsGet((HK+'who')));",
    "function chatWho(){const w=BALL.me;", why='chat acts only as the private-link manager')
rep("const DRAFT_URL='https://stoopids.github.io/stoopids/draft2/';",
    "const DRAFT_URL=BALL.draftUrl;", why='draft room is this league')
rep("if(!PS.who)presAsk(true);else{presBeat();presTick()}",
    "if(window.BALL&&BALL.me){PS.who=BALL.me;presBeat();presTick()}else if(PS.who){presBeat();presTick()}",
    why='do not pop a name picker for a spectator')

# No name picker. The private link is the sign-in.
rep("""function b27LockHtml(kind){if(typeof VIEW_ONLY!=='undefined'&&VIEW_ONLY){if(kind==='request')return '<div class="card note rq-none">Set who you are on Profile before you request a bet.</div>';return '<div class="card note">Set who you are on <a href="'+esc(s24Href('profile'))+'" onclick="return s24NavClick(event,\\'profile\\')">Profile</a> before you write a bet.</div>'}const names=typeof b27OwnerNames==='function'?b27OwnerNames():((D&&D.owners)||[]).map(o=>o.name);const picks=names.map(n=>'<button type="button" class="who-pick" data-who="'+esc(n)+'" onclick="presPick(this.getAttribute(\\'data-who\\'))">'+esc(PN(n))+'</button>').join('');return '<div class="card who-lock"><p>Pick who you are to request or write a bet.</p><div class="who-picks" role="group" aria-label="Who are you?">'+picks+'</div>'+whoWarn()+'<p class="note">Or set it on <a href="'+esc(s24Href('profile'))+'" onclick="return s24NavClick(event,\\'profile\\')">Profile</a>.</p></div>'}""",
    """function b27LockHtml(kind){return '<div class="card note">Open your private manager link to '+esc(kind==='request'?'request':'write')+' a bet. Ball has no name picker.</div>'}""",
    why='no name picker on bets')
old_ask = s[s.find('function presAsk(first){'):s.find('function presPick(w){')]
if not old_ask.startswith('function presAsk'):
    FAIL.append('presAsk missing')
else:
    s = s.replace(old_ask, """function presAsk(first){
  const old=document.getElementById('pwho');if(old)old.remove();
  if(window.BALL&&BALL.me){PS.who=BALL.me;return}
  const d=document.createElement('div');d.id='pwho';d.className='pwho';d.setAttribute('role','dialog');d.setAttribute('aria-label','Private link');
  d.innerHTML='<div class="box"><h2>'+esc(BALL.product)+'</h2><p>You are signed in from your private manager link. There is no name picker. Open the link the commissioner sent you.</p>'+(first?'':'<button type="button" class="skip" data-w="">Close</button>')+'</div>';
  d.addEventListener('click',e=>{const b=e.target.closest('button');if(b)d.remove()});
  document.body.appendChild(d);
}
""", 1)
    LOG.append(('no name picker dialog', 1))

# Branding. Archive tab left out (no Ball past seasons). Postseason stays date-gated; Ball's checklist fills it in March.
rep('<title>STOOPIDS · NCAA Fantasy</title>', "<title>Ball Don't Lie</title>", why='title')
rep("live:['Where college basketball knowledge goes to be humbled.','Confidence is high. The scoreboard disagrees.','Every win is skill. Every loss is the refs.','Somebody\\u2019s mid-major is carrying them. Somebody\\u2019s blue blood is not.','Bragging rights are checked every 10 minutes.']",
    'live:["Eight managers. One season. Let\'s play."]', why='header tagline')
rep('<h1>STOOP<span>IDS</span></h1>', '<h1 id="ballLg">BALL <span>DON\'T LIE</span></h1>', why='heading')
rep('aria-label="Share STOOPIDS (view-only link to the whole site)"', 'aria-label="Share Ball Don\'t Lie"', why='share label')
rep('aria-label="The STOOPIDS crew. Tap to enlarge the photo."', 'aria-label="Ball Don\'t Lie banner. Tap to enlarge the photo."', why='hero label')
rep('assets/hero-wide.jpg?v=4', 'assets/hero-banner.jpg?v=1', n=s.count('assets/hero-wide.jpg?v=4'), why='Ball banner')
rep('assets/hero-mobile.jpg?v=4', 'assets/hero-banner.jpg?v=1', n=s.count('assets/hero-mobile.jpg?v=4'), why='Ball banner mobile')
rep("One small step for man, one giant brick for Murf.", "One small step for man, one giant brick for the bench.", why='tagline')
rep("const SITE_TITLE='STOOPIDS · NCAA Fantasy';", "const SITE_TITLE=BALL.siteTitle;", why='browser title')
rep(",['archive','🗂️ Archive']", "", why='no Archive tab (Ball has no past seasons)')
rep('.pwho', '#pwho', n=s.count('.pwho'), why='name-picker overlay must not cover power-ranking names')
rep("You haven't picked who you are yet.", "Open your private manager link to sign in.", why='profile sign-in is the private link')
rep("Pick who you are to see your season, bets, and head-to-head.", "Open your private manager link to see your season, bets, and head-to-head.", why='profile note')
rep("Pick who you are to see head-to-head.", "Open your private manager link to see head-to-head.", n=s.count("Pick who you are to see head-to-head."), why='head-to-head note')
rep("Pick who you are to see your bets.", "Open your private manager link to see your bets.", why='tally note')

forbidden = [
    'stoopids-bets-2627-9eaa4f66',
    'stoopids-requests-2627-9eaa4f66',
    'stoopids-presence-23658198955328729a557ddb',
    'stoopids-commish-2627-9eaa4f66',
    'e66a42e9a43f14938ec07992f73a26193c7a0cfe9af88d1e409bce63f454f74e',
    'https://stoopids.github.io/stoopids/',
    'STOOPIDS_DATA',
    '<script src="archive.js',
]
for w in forbidden:
    if w in s:
        FAIL.append('forbidden still in league.html: ' + w)

if FAIL:
    print('\n'.join(FAIL))
    raise SystemExit('FAILED %d' % len(FAIL))
open(os.path.join(ROOT, 'league.html'), 'w', encoding='utf-8').write(s)
ui = src('shared/ui.js')
css = src('shared/ui.css')
for w in forbidden:
    if w in ui or w in css:
        raise SystemExit('forbidden in shared ui: ' + w)
os.makedirs(os.path.join(ROOT, 'shared'), exist_ok=True)
open(os.path.join(ROOT, 'shared', 'ui.js'), 'w', encoding='utf-8').write(ui)
open(os.path.join(ROOT, 'shared', 'ui.css'), 'w', encoding='utf-8').write(css)
if os.path.exists(os.path.join(SRC, 'stoopid-bet.js')):
    b = src('stoopid-bet.js')
    for w in forbidden:
        if w in b: raise SystemExit('forbidden in stoopid-bet.js: ' + w)
    open(os.path.join(ROOT, 'stoopid-bet.js'), 'w', encoding='utf-8').write(b)
    LOG.append(('stoopid-bet.js verbatim', 1))
LOG.append(('shared/ui.js verbatim', 1))
LOG.append(('shared/ui.css verbatim', 1))
print('league.html built with', len(LOG), 'swaps')
for w, c in LOG:
    print(' -', w, c)
