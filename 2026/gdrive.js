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

  async function backup(){
    await getToken();
    const body=JSON.stringify(backupPayload()), file=await findFile();
    // Another device backed up since this one last synced: don't silently overwrite it.
    const last=store.get("cloudSync");
    if(file && (!last || Date.parse(file.modifiedTime)>last+1000) &&
       !confirm(t("drive_replace_confirm",{when:when(file.modifiedTime)}))) return;
    if(file) await drive(`${UPLOAD}/${file.id}?uploadType=media`,{method:"PATCH", headers:{"Content-Type":"application/json"}, body});
    else{
      const b="dae"+Date.now();
      await drive(`${UPLOAD}?uploadType=multipart`,{method:"POST", headers:{"Content-Type":"multipart/related; boundary="+b},
        body:`--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({name:FILE,parents:["appDataFolder"]})}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${b}--`});
    }
    store.set("cloudSeen",true); store.set("cloudSync",Date.now()); markBackedUp();
    msg(t("drive_backed_up",{time:new Date().toLocaleTimeString([], {timeStyle:"short"})}));
  }
  async function restore(){
    await getToken();
    const file=await findFile();
    if(!file) return msg(t("drive_no_backup"));
    const rooms=parseBackup(await (await drive(`${API}/${file.id}?alt=media`)).json());
    store.set("cloudSeen",true);
    if(restoreRooms(rooms, t("drive_backup_source",{when:when(file.modifiedTime)}))) store.set("cloudSync",Date.now());
  }
  // Wrap so any failure surfaces as a message and never breaks the rest of the app.
  const run = fn => async()=>{ try{ await fn(); }catch(e){ msg(t("drive_error_msg",{msg:e.message})); } };
  // Picked up by the Backup/Restore buttons in app.js, which offer Google Drive only once this is set.
  window.cloudBackup = run(backup);
  window.cloudRestore = run(restore);
})();
