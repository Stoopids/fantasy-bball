/* Static safety scan of the shipped code (node tests/test_xss_static.js).
   1. every ${...} placed inside an HTML attribute value is either esc(...) or one of a short list of reviewed expressions (numbers, constants, class names)
   2. no inline event handlers, no javascript: URLs, no document.write/eval, no console.*, no test hooks
   3. every page carries the Content-Security-Policy meta with no inline script allowance
   A new unescaped attribute interpolation fails this test until it is escaped or reviewed and added to SAFE_EXPR. */
const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
let n=0,bad=0;function ok(name,c,x){n++;if(c)console.log('  ok  '+name);else{bad++;console.log('FAIL  '+name+(x?'\n      '+x:''))}}
const files=fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js')&&f!=='qr.min.js').map(f=>'js/'+f).concat(['sw.js']);
/* reviewed expressions: they can only produce digits, fixed words, or CSS class names built from code */
const SAFE_EXPR=new Set(fs.existsSync(path.join(__dirname,'xss_safe_exprs.json'))?JSON.parse(fs.readFileSync(path.join(__dirname,'xss_safe_exprs.json'),'utf8')):[]);
const found={};
/* js/shared-s25.js (partner file, copied unchanged) builds its meme SVGs from numeric literals only; the page never puts that string in the DOM as markup,
   it is shown only as an <img> data URL (encodeURIComponent), checked below. So that file is skipped for the attribute check. */
for(const f of files){if(f==='js/shared-s25.js')continue;const src=fs.readFileSync(path.join(root,f),'utf8');
  /* find  attr="...${expr}..."  inside template literals (double or single quoted attribute values) */
  const re=/\b([a-zA-Z-]+)=(["'])((?:(?!\2)[^\\\n`]|\\.|\$\{(?:[^{}]|\{[^{}]*\})*\})*?)\2/g;let m;
  while((m=re.exec(src))){const val=m[3];if(val.indexOf('${')<0)continue;
    const ex=/\$\{((?:[^{}]|\{[^{}]*\})*)\}/g;let e;while((e=ex.exec(val))){const x=e[1].trim();if(/^esc\(/.test(x)&&matchParen(x))continue;(found[x]=found[x]||[]).push(f+' ['+m[1]+']')}}}
function matchParen(x){let d=0;for(let i=0;i<x.length;i++){if(x[i]==='(')d++;else if(x[i]===')'){d--;if(d===0&&i<x.length-1)return false}}return d===0}
const unreviewed=Object.keys(found).filter(x=>!SAFE_EXPR.has(x));
if(process.argv.includes('--list'))console.log(JSON.stringify(Object.keys(found).sort(),null,1));
{const lb=fs.readFileSync(path.join(root,'js/league-bets.js'),'utf8');ok('shared meme SVGs are used only as an <img> data URL (encodeURIComponent), never as markup',/'data:image\/svg\+xml;charset=utf-8,'\+encodeURIComponent\(SM\.svg\)/.test(lb)&&!/innerHTML[^;]*SM\.svg|\$\{SM\.svg\}/.test(lb))}
ok('every attribute interpolation is escaped or on the reviewed list',unreviewed.length===0,unreviewed.map(x=>x+'   in '+found[x].slice(0,3).join(', ')).join('\n      '));
for(const f of files){const src=fs.readFileSync(path.join(root,f),'utf8');
  ok(f+': no inline handlers / javascript: / eval / document.write',!/[\s"'`]on[a-z]+\s*=\s*["'`$]/i.test(src)&&!/javascript:/i.test(src.replace(/\/\^javascript:[^\n]*/g,''))&&!/\beval\(|document\.write|new Function\(/.test(src));
  ok(f+': no console.* calls',!/\bconsole\.(log|warn|error|info|debug)/.test(src))}
ok('store.js: the test hook only works on localhost as a same-origin path',(()=>{const s=fs.readFileSync(path.join(root,'js/store.js'),'utf8');return /localhost|127\.0\.0\.1/.test(s)&&/startsWith\('\/'\)|\[0\]==='\/'|indexOf\('\/'\)===0|\^\\\//.test(s)})());
for(const h of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){const s=fs.readFileSync(path.join(root,h),'utf8');
  const csp=/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(s);ok(h+': Content-Security-Policy meta present, script-src is self only',!!csp&&/script-src 'self'(;|$)/.test(csp[1])&&!/unsafe-inline[^;]*script|script-src[^;]*unsafe/.test(csp[1]),csp&&csp[1]);
  ok(h+': no inline script or handler attributes',!/<script(?![^>]*\bsrc=)[^>]*>[^<]/.test(s)&&!/\son[a-z]+=/i.test(s))}
console.log('\n'+(n-bad)+' / '+n+' checks passed'+(bad?' — FAILED':''));process.exit(bad?1:0)
