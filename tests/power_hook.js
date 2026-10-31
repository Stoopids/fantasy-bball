/* In-memory copy of recap.html / js/recap.js for the League-site power tests (nothing in the tree is written).
   Draft Room's recap.js loads css/power.css + js/power-render.js and calls its own wirePower(d,st,MG,myMid) (a grade card for the viewer). These tests need the module's 8-card list on the real
   recap page, so the ONE wirePower call is replaced by FBNPower.mount(app,{done,managers,state,teams}). If a tree still has the older recap.js (no wirePower), the 3 documented hook lines are added instead. */
const fs=require('fs'),path=require('path');
module.exports=function(root){let html=fs.readFileSync(path.join(root,'recap.html'),'utf8'),rjs=fs.readFileSync(path.join(root,'js/recap.js'),'utf8');
  const CALL='if(done)wirePower(d,st,MG,myMid);',MOUNT='if(window.FBNPower)FBNPower.mount(app,{done,managers:MG,state:st,teams:T.TEAMS});';let mode;
  if(rjs.includes(CALL)){rjs=rjs.replace(CALL,MOUNT);mode='wirePower replaced'}
  else{html=html.replace('<link rel="stylesheet" href="css/app.css">','<link rel="stylesheet" href="css/app.css">\n<link rel="stylesheet" href="css/power.css">').replace('<script src="js/recap.js"></script>','<script src="js/power-render.js"></script>\n<script src="js/recap.js"></script>');
    rjs=rjs.replace("\n if(done){let st2=","\n if(window.FBNPower)FBNPower.mount(app,{done,managers:MG,state:st,teams:T.TEAMS});\n if(done){let st2=");mode='3 hook lines added'}
  const ok=html.includes('css/power.css')&&html.includes('js/power-render.js')&&rjs.includes('FBNPower.mount(app');
  return{html,rjs,mode,ok}};
