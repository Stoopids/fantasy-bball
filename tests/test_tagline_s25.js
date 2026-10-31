/* s25: rotating tagline date picking (index = floor(days since 2026-11-01 / 2) mod n, by the viewer's LOCAL date since s25: Paul, all times local). TZ=Asia/Jakarta node tests/test_tagline_s25.js */
const fs=require('fs'),path=require('path');require('../js/league-d.js');   /* LTIME */
const src=fs.readFileSync(path.join(__dirname,'../js/leaguehome.js'),'utf8');
const a=src.indexOf('const TAGLINES='),b=src.indexOf('/* s25c upset line');const {tagIdx,TAGLINES}=new Function(src.slice(a,b)+';return{tagIdx,TAGLINES}')();
let n=0,bad=0;const ok=(t,c,x)=>{n++;if(c)console.log('  ok  '+t);else{bad++;console.log('FAIL  '+t+' -> '+JSON.stringify(x))}};
const ET=(y,m,d,h)=>new Date(y,m-1,d,h==null?12:Math.floor(h),h==null?0:Math.round((h%1)*60)).getTime();   // local wall-clock time on that local date
ok('2026-11-01 and 2026-11-02 -> index 0; 11-03 and 11-04 -> 1; 11-05 -> 2 (n=5)',[1,2,3,4,5].map(d=>tagIdx(ET(2026,11,d),5)).join()==='0,0,1,1,2');
ok('wraps around: day 10 (11-11) with n=5 -> 0',tagIdx(ET(2026,11,11),5)===0);
ok('same local date = same line at any hour (00:30 and 23:30 local)',tagIdx(ET(2026,3,7,0.5-12+12),7)===tagIdx(ET(2026,3,7,23.5),7));
ok('changes at LOCAL midnight: 23:59 on 11-02 vs 00:01 on 11-03',(()=>{const d0=tagIdx(new Date(2026,10,2,23,59).getTime(),5),d1=tagIdx(new Date(2026,10,3,0,1).getTime(),5);return d0===0&&d1===1})());
ok('no fixed zone in the tagline rule',!/New_York|Eastern/.test(src.slice(a,b)));
ok('before the epoch still gives a valid index',(()=>{const i=tagIdx(Date.UTC(2026,9,30,17),3);return i>=0&&i<3})());
ok('every index in range over 400 days (n=7) and each value used',(()=>{const s=new Set();for(let d=0;d<400;d++){const i=tagIdx(ET(2026,11,1)+d*864e5,7);if(i<0||i>6)return false;s.add(i)}return s.size===7})());
ok('shipped list: exactly one neutral placeholder line (the shared list is not approved yet), no money words, no partner-site name',TAGLINES.length===1&&!/\b(wager|money|cash|prize|payout|bet)\b|stoopid/i.test(TAGLINES[0]),TAGLINES);
console.log('\n'+(n-bad)+' / '+n+' checks passed');process.exit(bad?1:0);
