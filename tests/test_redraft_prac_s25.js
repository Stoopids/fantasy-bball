/* Practice the Redraft button: exact URL (l + mode only, never k=), label, Jan 6-20 2027 local-day window, hidden once the real Redraft is live.
   TZ=Asia/Jakarta node tests/test_redraft_prac_s25.js ; TZ=America/Los_Angeles node tests/test_redraft_prac_s25.js */
const fs=require('fs'),path=require('path');globalThis.window=globalThis;globalThis.navigator={languages:['en-US']};
require('../js/league-d.js');const W=globalThis.LTABS;let n=0,f=0;const ok=(m,c)=>{n++;if(!c){f++;console.log('FAIL',m)}else console.log('  ok',m)};
const src=fs.readFileSync(path.join(__dirname,'../js/leaguehome.js'),'utf8');
const m=/const REDRAFT_MOCK_URL=lid=>U\.pageUrl\('mock\.html',\{([^}]*)\}\)/.exec(src);
ok('REDRAFT_MOCK_URL builds mock.html with exactly {l, mode:redraft}',m&&m[1].replace(/\s/g,'')==="l:lid,mode:'redraft'");
const ui=fs.readFileSync(path.join(__dirname,'../js/ui.js'),'utf8');const ctx={location:{href:'https://x.test/league.html?l=abc&k=SECRET'}};
const U={};new Function('U','location','URL',ui.slice(ui.indexOf('U.pageUrl='),ui.indexOf('\nU.',ui.indexOf('U.pageUrl=')+5))+';return U')(U,ctx.location,URL);
const u=new URL(U.pageUrl('mock.html',{l:'abc',mode:'redraft'}));
ok('URL is mock.html?l=<id>&mode=redraft, no k= even when the page has one',/\/mock\.html$/.test(u.pathname)&&u.search==='?l=abc&mode=redraft');
ok('the link markup has no k= or identity param',!/redraftmock[^\n]*k=/.test(src));
ok("label is exactly 'Practice the Redraft'",/id="redraftmock"[^>]*>Practice the Redraft<\/a>/.test(src));
ok('the button is gated by LTABS.pracOpen',/tabOn\('redraft'\)&&LTABS\.pracOpen\(nowMs\(\)/.test(src));
const at=s=>new Date(s).getTime();   // local wall-clock
[['2027-01-05T23:59',false],['2027-01-06T00:01',true],['2027-01-13T12:00',true],['2027-01-20T23:59',true],['2027-01-21T00:01',false],['2026-11-15T12:00',false]]
 .forEach(([t,e])=>ok(`local ${t}: button ${e?'shows':'hidden'}`,W.pracOpen(at(t),{})===e));
ok('hidden once the real Redraft is live',W.pracOpen(at('2027-01-10T12:00'),{redraft:{phase:'live'}})===false);
ok('shows while the redraft is set up but not live',W.pracOpen(at('2027-01-10T12:00'),{redraft:{phase:'drops'}})===true);
ok('the Redraft tab still shows after the button window while the redraft is open',W.visible('redraft',at('2027-01-25T12:00'),{redraft:'open'})===true&&W.pracOpen(at('2027-01-25T12:00'),{redraft:{phase:'live'}})===false);
console.log(`\n${n-f} / ${n} checks passed`);process.exit(f?1:0);
