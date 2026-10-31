/* TEST-ONLY: which League tabs are visible at the test clock (env LNOW, set into the page as localStorage fbn.now by lib.js), for tests written before the s25 date windows. */
require('../js/league-d.js');const ORDER=['standings','games','bets','rosters','teams','postseason','redraft','rules','archive'];
const LAB={standings:'Standings',games:'Games',bets:'Bets',rosters:'Rosters',teams:'All teams',postseason:'Postseason',redraft:'Redraft',rules:'Rules',archive:'Archive'};
const now=process.env.LNOW?Date.parse(process.env.LNOW):Date.now();const vis=globalThis.LTABS.list(ORDER,now,{});
module.exports={ORDER,vis,labels:vis.map(t=>LAB[t]),has:t=>vis.includes(t),now};
