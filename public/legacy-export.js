// Run on the ORIGINAL ClassInsights site's browser console. Review before use.
// Exports a gradebook without the old password hash, device lock, or demo license.
(() => {
 const raw=localStorage.getItem('classtrack_v1');
 if(!raw)throw new Error('No legacy ClassInsights data found on this origin.');
 const {standards,evals,settings,elementLibrary}=JSON.parse(raw);
 if(!Array.isArray(standards)||!Array.isArray(evals))throw new Error('Unrecognised legacy format. Keep the original data for manual recovery.');
 const url=URL.createObjectURL(new Blob([JSON.stringify({standards,evals,settings,elementLibrary},null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='ClassInsights-legacy-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
})();
