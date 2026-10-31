/* Word scan over EVERY shipped file (what tools/make_bundle.sh copies: html, js, css, json, md, txt, webmanifest, svg).
   Forbidden everywhere, Bets files included: lottery, jackpot, cash, money, prize, payout, gamble/gambling, wager(s), pot, dollar(s), $ followed by a digit, USD / IDR / "Rp <digits>".
   Allowed: bet / bets / betting / owes / odds ... (the Bets tab is pushup challenges).  Also: the Bets tab says pushups and the framing text "paid in pushups" is there.
   node tests/e2e_wordscan.js   (no browser, no server) */
const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,600):''))}}
const files=[];(function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f),r=path.relative(root,p);if(/^(tests|tools|shots|logs|node_modules|\.git)/.test(r)||/^logs-/.test(f))continue;const st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(html|js|css|json|md|txt|webmanifest|svg)$/i.test(f)&&!/qr\.min\.js$|MD5SUMS|^data\/demo\//.test(r)&&!/^(PROGRESS|HANDOFF|DEVICE-TEST|FINAL-TEST|CHANGED-FILES)\.md$/.test(f))files.push(r)}})(root);
const WORDS=/\b(lotter\w*|jackpot|cash|money|prize|payout|gambl\w*|wager\w*|pot|dollars?|USD|IDR)\b|\bRp\s?\d/;
/* Paul-approved exceptions (s25-full): the 💵 and 💰 ICONS only (e.g. the '💵 Bets' nav label) are allowed; the no-money WORDS rule above still applies to all text */
const ICONS_OK=/[💵💰]/gu;
const hits=[];
for(const f of files){let s=fs.readFileSync(path.join(root,f),'utf8').replace(/https?:\/\/[^\s"')]+/g,'');
  /* a $ followed by a digit: in js/css/json the regex-replacement tokens '$1' are not amounts; anywhere else (html, md, txt, svg, json text) every one counts */
  const dol=/\.js$/.test(f)?/(?<=[\s"'(])\$\d+(?=[\s.,;!?)"]|$)/:/\$\s?\d/;
  s.split("\n").forEach((l,i)=>{l=l.replace(ICONS_OK,"");let m=WORDS.exec(l)||dol.exec(l);if(m)hits.push(f+':'+(i+1)+' "'+m[0]+'" '+l.trim().slice(0,90))})}
ok('scanned '+files.length+' shipped files (html, js, css, json, md, txt, webmanifest, svg)',files.length>30,files.length);
ok('no money / currency / prize / payout / jackpot / lottery / gamble / wager wording and no $ amounts anywhere in the shipped files',hits.length===0,hits.slice(0,12));
const bets=fs.readFileSync(path.join(root,'js/league-bets.js'),'utf8');
ok('Bets tab: pushups is the unit everywhere (pu() helper) and the framing text "paid in pushups" is present',/pu=n=>n\+' pushup'/.test(bets)&&/always paid in <b>pushups<\/b>/.test(bets));
ok('Bets tab: no currency formatting (toLocaleString is only used for whole numbers, no style:currency, no currency symbols)',!/style\s*:\s*['"]currency/i.test(bets)&&!/[€£¥₹]/.test(bets));
ok('help.html and README describe Bets as pushup challenges',/pushup/i.test(fs.readFileSync(path.join(root,'help.html'),'utf8'))&&/pushup/i.test(fs.readFileSync(path.join(root,'README.md'),'utf8')));
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));process.exit(bad?1:0);
