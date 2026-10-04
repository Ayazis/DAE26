// Optional Google Drive backup. Loaded by app.js only when FEATURES.cloudBackup is on and GDRIVE_CLIENT_ID is set.
// The backup is one JSON file in the app's hidden Drive folder (scope drive.appdata); the app can't see any other Drive file.
// Google's sign-in script is fetched on the first click, so users who never use this send nothing to Google.
(()=>{
  const SCOPE="https://www.googleapis.com/auth/drive.appdata", FILE=PREVIEW ? `dae2026-backup-${PREVIEW}.json` : "dae2026-backup.json";
  const API="https://www.googleapis.com/drive/v3/files", UPLOAD="https://www.googleapis.com/upload/drive/v3/files";
  let token=null, expires=0, tokenClient=null, gisLoading=null;

  const loadGis = () => gisLoading ||= new Promise((ok,fail)=>{
    const s=document.createElement("script"); s.src="https://accounts.google.com/gsi/client";
    s.onload=ok; s.onerror=()=>{ gisLoading=null; fail(new Error(t("drive_signin_unavailable"))); };
    document.head.appendChild(s);
  });
  // Must be called straight from a click so the browser allows the sign-in popup.
  async function getToken(){
    if(token && Date.now()<expires) return token;
    await loadGis();
    return new Promise((ok,fail)=>{
      tokenClient ||= google.accounts.oauth2.initTokenClient({client_id:GDRIVE_CLIENT_ID, scope:SCOPE, callback:()=>{}});
      tokenClient.callback = r=>{
        if(r.error) return fail(new Error(r.error==="access_denied"?t("drive_signin_cancelled"):r.error));
        token=r.access_token; expires=Date.now()+(r.expires_in-60)*1000; ok(token);
      };
      tokenClient.error_callback = e=>fail(new Error(e.type==="popup_closed"?t("drive_signin_cancelled"):t("drive_signin_failed")));
      tokenClient.requestAccessToken({prompt:token===null && !store.get("cloudSeen") ? "consent" : ""});
    });
  }
  async function drive(url, opts={}){
    const res=await fetch(url,{...opts, headers:{Authorization:"Bearer "+token, ...opts.headers}});
    if(res.status===401){ token=null; throw new Error(t("drive_session_expired")); }
    if(!res.ok) throw new Error(t("drive_error",{status:res.status}));
    return res;
  }
  async function findFile(){
    const q=encodeURIComponent(`name='${FILE}'`);
    const {files}=await (await drive(`${API}?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)`)).json();
    return files[0]||null;
  }
  const when = iso => new Date(iso).toLocaleString([], {dateStyle:"medium", timeStyle:"short"});

  // Another device backed up since this one last synced? Compares Drive's own timestamps, so a skewed device clock can't fake it.
  const remoteChanged = file => !!file && (()=>{ const known=store.get("cloudRemote") ?? store.get("cloudSync"); return !known || Date.parse(file.modifiedTime)>known+1000; })();
  async function upload(file, body){
    const f="&fields=id,modifiedTime";
    const res = file
      ? await drive(`${UPLOAD}/${file.id}?uploadType=media${f}`,{method:"PATCH", headers:{"Content-Type":"application/json"}, body})
      : await (async()=>{ const b="dae"+Date.now();
          return drive(`${UPLOAD}?uploadType=multipart${f}`,{method:"POST", headers:{"Content-Type":"multipart/related; boundary="+b},
            body:`--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({name:FILE,parents:["appDataFolder"]})}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${b}--`}); })();
    const {id,modifiedTime}=await res.json();
    store.set("cloudSeen",true); store.set("cloudSync",Date.now()); store.set("cloudRemote",Date.parse(modifiedTime)); store.set("cloudFileId",id);
  }
  async function backup(){
    await getToken();
    const body=JSON.stringify(backupPayload()), sig=roomsSig(), file=await findFile();
    // Another device backed up since this one last synced: don't silently overwrite it.
    if(remoteChanged(file) && !confirm(t("drive_replace_confirm",{when:when(file.modifiedTime)}))) return;
    await upload(file, body); markBackedUp(sig); goLive();
    msg(t("drive_backed_up",{time:new Date().toLocaleTimeString([], {timeStyle:"short"})}));
  }
  // While the sign-in token is valid, later changes are pushed to Drive on their own (no popup needed). Browser-only tokens
  // last about an hour and can't refresh silently, so this stops at expiry, on any error, or if another device wrote in between.
  let live=false, timer=0, expiryTimer=0, busy=false, again=false;
  const liveUntil = () => live && token && Date.now()<expires ? expires : 0;
  function goLive(){
    live=true; clearTimeout(expiryTimer);
    expiryTimer=setTimeout(()=>{ live=false; renderBackupStatus(); }, Math.max(0,expires-Date.now())+50);
    renderBackupStatus();
  }
  function stopLive(){ live=false; clearTimeout(timer); clearTimeout(expiryTimer); renderBackupStatus(); }
  async function push(){
    if(!liveUntil()) return stopLive();
    if(busy){ again=true; return; }
    busy=true;
    try{
      const body=JSON.stringify(backupPayload()), sig=roomsSig();
      if(sig===store.get("backupSig")) return;
      const file=await findFile();
      if(remoteChanged(file)){ stopLive(); return msg(t("drive_sync_conflict")); }
      await upload(file, body); markBackedUp(sig);
    }catch(e){ stopLive(); msg(t("drive_error_msg",{msg:e.message})); }
    finally{ busy=false; if(again){ again=false; schedule(); } }
  }
  // Every change restarts the timer, so nothing is sent mid-burst. While a note is being typed the wait is longer, so
  // sync only happens once the typing has paused or the box loses focus.
  const typing = () => document.activeElement && document.activeElement.classList.contains("note");
  const QUIET=3000, QUIET_TYPING=10000;
  function schedule(){ if(!liveUntil()) return; clearTimeout(timer); timer=setTimeout(push, typing() ? QUIET_TYPING : QUIET); }
  // Clicking out of a note (or leaving the tab) counts as finished typing: sync right away instead of waiting out the pause.
  const flush = () => { if(!liveUntil()) return; clearTimeout(timer); timer=setTimeout(push, 300); };
  document.addEventListener("focusout", e=>{ if(e.target.classList && e.target.classList.contains("note")) flush(); });
  // Closing the page or switching away mid-wait: send the pending change now. The usual find-then-upload takes two requests and
  // a closing page may not get to the second, so this is a single keepalive PATCH to the file id remembered from the last sync
  // (the browser finishes it after the page is gone). If the page does not survive to see the answer, the next visit simply shows
  // "changed since your last backup" and a manual backup fixes that; nothing is lost, the data is always saved locally first.
  function flushOnExit(){
    if(!liveUntil() || busy) return;
    clearTimeout(timer);
    const sig=roomsSig(), id=store.get("cloudFileId"), body=JSON.stringify(backupPayload());
    if(sig===store.get("backupSig")) return;
    if(!id || body.length>60000) return flush(); // keepalive bodies are capped at 64 KB
    fetch(`${UPLOAD}/${id}?uploadType=media&fields=modifiedTime`,{method:"PATCH", keepalive:true, body,
      headers:{Authorization:"Bearer "+token, "Content-Type":"application/json"}})
      .then(r=>r.ok ? r.json() : Promise.reject())
      .then(({modifiedTime})=>{ store.set("cloudSync",Date.now()); store.set("cloudRemote",Date.parse(modifiedTime)); markBackedUp(sig); })
      .catch(()=>{});
  }
  document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="hidden") flushOnExit(); });
  addEventListener("pagehide", flushOnExit);
  async function restore(){
    await getToken();
    const file=await findFile();
    if(!file) return msg(t("drive_no_backup"));
    const rooms=parseBackup(await (await drive(`${API}/${file.id}?alt=media`)).json());
    store.set("cloudSeen",true);
    if(restoreRooms(rooms, t("drive_backup_source",{when:when(file.modifiedTime)}))){
      store.set("cloudSync",Date.now()); store.set("cloudRemote",Date.parse(file.modifiedTime)); store.set("cloudFileId",file.id); goLive();
    }
  }
  // Wrap so any failure surfaces as a message and never breaks the rest of the app.
  const run = fn => async()=>{ try{ await fn(); }catch(e){ msg(t("drive_error_msg",{msg:e.message})); } };
  // Picked up by the Backup/Restore buttons in app.js, which offer Google Drive only once this is set.
  window.cloudBackup = run(backup);
  window.cloudRestore = run(restore);
  window.cloudSyncSoon = schedule;   // app.js calls this after every change to the saved rooms
  window.cloudLiveUntil = liveUntil; // ms timestamp while auto-sync is on, else 0
})();
