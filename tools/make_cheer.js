/* s25-full (Paul via NCAA): self-made soft crowd cheer for the draft-complete moment. No downloaded audio: filtered noise swells (a crowd "roar")
   plus a soft random clap texture, 2.6 s, mono 22.05 kHz, written as WAV and encoded with ffmpeg to assets/cheer.mp3 (48 kbps mono, < 50 KB).
   Deterministic (seeded RNG). Run:  node tools/make_cheer.js   (needs ffmpeg on PATH) */
const fs=require('fs'),path=require('path'),cp=require('child_process');
const SR=22050,DUR=2.6,N=Math.round(SR*DUR);let seed=20261030;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const out=new Float32Array(N);
/* crowd: several band-passed noise voices, each with its own slow swell */
function voice(f0,q,gain,start,peak,end){let y1=0,y2=0,x1=0,x2=0;const w=2*Math.PI*f0/SR,al=Math.sin(w)/(2*q),b0=al,b2=-al,a0=1+al,a1=-2*Math.cos(w),a2=1-al;
 for(let i=0;i<N;i++){const t=i/SR;let env=t<start?0:t<peak?(t-start)/(peak-start):t<end?1-(t-peak)/(end-peak):0;env=env*env*(3-2*env);
  const wob=1+0.25*Math.sin(2*Math.PI*(3+f0/400)*t+f0);const x=(rnd()*2-1);const y=(b0*x+b2*x2-a1*y1-a2*y2)/a0;x2=x1;x1=x;y2=y1;y1=y;out[i]+=y*env*gain*wob}}
[[420,1.2,.9,0,.7,2.5],[700,1.5,.8,.05,.8,2.45],[1100,1.8,.6,.1,.9,2.4],[1600,2,.45,.1,1,2.35],[2400,2.5,.3,.15,1.1,2.3]].forEach(v=>voice(...v));
/* claps: short decaying noise bursts, denser in the middle */
for(let k=0;k<70;k++){const t=0.15+rnd()*2.1;const dens=Math.sin(Math.PI*Math.min(1,t/2.3));if(rnd()>dens)continue;const st=Math.round(t*SR),len=Math.round(SR*0.025),g=0.25+rnd()*0.25;let hp=0,prev=0;
 for(let i=0;i<len&&st+i<N;i++){const x=rnd()*2-1;hp=0.6*(hp+x-prev);prev=x;out[st+i]+=hp*g*Math.exp(-i/(SR*0.006))}}
/* normalise to -6 dBFS with a gentle fade in/out */
let mx=0;for(let i=0;i<N;i++)mx=Math.max(mx,Math.abs(out[i]));const pcm=Buffer.alloc(44+N*2);
for(let i=0;i<N;i++){const f=Math.min(1,i/(SR*0.05),(N-i)/(SR*0.25));pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,out[i]/mx*0.5*f))*32767),44+i*2)}
pcm.write('RIFF',0);pcm.writeUInt32LE(36+N*2,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(SR,24);pcm.writeUInt32LE(SR*2,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(N*2,40);
const wav=path.join(require('os').tmpdir(),'cheer-'+process.pid+'.wav');fs.writeFileSync(wav,pcm);const dst=path.join(__dirname,'..','assets','cheer.mp3');/* MP3 plays everywhere, iPhone Safari included */
cp.execFileSync('ffmpeg',['-y','-loglevel','error','-i',wav,'-c:a','libmp3lame','-b:a','48k','-ac','1','-map_metadata','-1','-id3v2_version','0','-write_xing','0',dst]);fs.unlinkSync(wav);
console.log(dst,fs.statSync(dst).size,'bytes');
