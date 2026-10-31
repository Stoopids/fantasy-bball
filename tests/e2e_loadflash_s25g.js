/* s25-full load flash (Paul): while a mock draft (and the real draft room) loads, only the loader or the one settled active view may be visible:
   no lobby flash before a solo mock starts, no pane / pop-up / overlay that comes and goes. Frames sampled every ~50 ms at 390 and 1280.
   node tests/e2e_loadflash_s25g.js (APP/API env, mock store) */
const {run}=require('./flash_frames_s25g.js');
let n=0,bad=0;const fails=[];const ok=(m,c,x)=>{n++;if(c)console.log('  ok  '+m);else{bad++;fails.push(m);console.log('FAIL  '+m+(x!==undefined?'  -> '+JSON.stringify(x).slice(0,400):''))}};
(async()=>{try{const o=await run(process.env.FLASH_DIR||require('os').tmpdir()+'/fbn-flash',false);
 for(const k of Object.keys(o)){const fr=o[k].filter(f=>f.url==='/room.html');const shown=fr.filter(f=>!f.loading);
  ok(k+': the room starts behind the loader',fr.length>0&&(fr[0].loading||k.startsWith('room')),fr[0]);
  ok(k+': while loading, nothing but the loader is visible',fr.filter(f=>f.loading).every(f=>f.loader&&!f.overlay&&!f.sheet&&!f.pickov),fr.filter(f=>f.loading&&(!f.loader||f.overlay||f.sheet||f.pickov)).slice(0,2));
  ok(k+': exactly one view once revealed, with one selected tab, and it never switches during load',shown.length>0&&shown.every(f=>f.view===shown[0].view&&f.sel===shown[0].sel&&f.sel),[...new Set(shown.map(f=>f.view+'/'+f.sel))]);
  ok(k+': no overlay, sheet or pop-up appears or disappears after the reveal (an identity prompt, if any, is there from the first revealed frame)',shown.every(f=>f.overlay===shown[0].overlay&&!f.sheet&&!f.pickov),[...new Set(shown.map(f=>String(f.overlay)+'/'+f.sheet+'/'+f.pickov))]);
  if(k.startsWith('mock'))ok(k+': the solo mock never flashes its lobby',!fr.some(f=>!f.loading&&f.view==='lobbycard'))}
}catch(e){bad++;fails.push('exception');console.log('exception: '+(e.stack||e))}
console.log(`${n-bad} / ${n} checks passed`+(bad?' — FAILED: '+fails.join('; '):''));process.exit(bad?1:0)})();
