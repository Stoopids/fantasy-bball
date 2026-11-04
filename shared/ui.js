/* shared/ui.js v1.1.0: ONE table of input limits and shared wording, loaded by BOTH sites.
   Edit here only, copy to the other repo by hand, and run scripts/check_shared.sh.
   Each site keeps its old values as fallbacks, so the pages still work if this file fails to load. */
(function(g){var LIMITS={team:15,stoopName:12,leagueName:24,chat:200,betText:140,paste:300,payouts:120,stake:20,item:40,odds:9};
var STRINGS={maxLen:'Keep it to {n} characters or fewer.',nameTooLong:'Keep the name to {n} characters or fewer.',teamTooLong:'Keep the team name to {n} characters or fewer.',checkedNow:'checked just now',online:'Who\u2019s online'};
function t(k,n){var s=STRINGS[k];return s==null?'':String(s).replace('{n}',n)}
g.SHARED_UI={version:'1.1.0',LIMITS:LIMITS,STRINGS:STRINGS,t:t};})(typeof window!=='undefined'?window:globalThis);
