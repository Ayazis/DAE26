// Feature flags. zoneToggles: colour-zone filter buttons on the map (zone view logic stays, it just has no way to be triggered).
// cloudBackup: optional Google Drive backup (needs GDRIVE_CLIENT_ID). Off = nothing Google-related is loaded or shown.
const FEATURES = { zoneToggles: false, cloudBackup: false };
const GDRIVE_CLIENT_ID = "";
// All user data lives under one versioned localStorage key.
const STORE_KEY = "daem-2026-v1";
const store = (()=>{
  let d={};
  try{ d = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }catch(e){}
  try{ localStorage.removeItem("dae-zoom"); }catch(e){}
  const save=()=>{ try{ localStorage.setItem(STORE_KEY, JSON.stringify(d)); }catch(e){} };
  return { get:k=>d[k], set:(k,v)=>{ d[k]=v; save(); } };
})();
// Per-room user state: {fav, note, visited, rating}
const roomState = r => (store.get("rooms")||{})[r] || {};
function setRoom(r, patch){
  const all = {...(store.get("rooms")||{})};
  const next = {...(all[r]||{}), ...patch};
  Object.keys(next).forEach(k=>{ if(next[k]===false||next[k]===""||next[k]==null||next[k]===0) delete next[k]; });
  if(Object.keys(next).length) all[r]=next; else delete all[r];
  store.set("rooms", all);
  paintRoom(r); renderFavs();
}

const ROOMS = {}; // name -> {z, exs}
ZONES.forEach(z=>z.rooms.forEach(([r,exs])=>{ ROOMS[r] = {z, exs}; }));
const WHERE = {};
ZONES.forEach(z=>z.rooms.forEach(([r,exs])=>exs.forEach(e=>(WHERE[e] ||= []).push(r))));

const esc = s => String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hl = (t,q) => { if(!q) return esc(t); const i=t.toLowerCase().indexOf(q); return i<0?esc(t):esc(t.slice(0,i))+"<mark>"+esc(t.slice(i,i+q.length))+"</mark>"+esc(t.slice(i+q.length)); };
const isNum = r => /^\d+$/.test(r);
const rname = r => isNum(r) ? "Room "+r : r;
const reduceMotion = () => matchMedia("(prefers-reduced-motion:reduce)").matches;

/* ---------- SVG floor plan ---------- */
// Trace units: plan.jpg at 2000 x 1626.
const W=2000, H=1626;
const NS="http://www.w3.org/2000/svg";
const el = (tag, attrs={}, parent) => { const n=document.createElementNS(NS,tag); for(const k in attrs) n.setAttribute(k,attrs[k]); if(parent) parent.appendChild(n); return n; };
const rect = (x,y,w,h,cls,parent) => el("rect",{x,y,width:w,height:h,class:cls},parent);

const svg = document.getElementById("svg");
const box = document.getElementById("mapbox");
const L = {};
["orig","foot","areas","corr","rooms","icons","labels"].forEach(k=>L[k]=el("g",{class:"l-"+k},svg));

const orig = el("image",{href:"plan.jpg",x:0,y:0,width:W,height:H,preserveAspectRatio:"none"},L.orig);
PLAN.footprint.forEach(([x,y,w,h])=>rect(x,y,w,h,"foot",L.foot));
PLAN.areas.forEach(([x,y,w,h,k,label])=>{
  rect(x,y,w,h,"area a-"+k,L.areas);
  if(label) areaLabel(x+w/2,y+h/2,label,w,h);
});
{ const [cx,cy,r]=PLAN.hexagon;
  const pts=[...Array(6)].map((_,i)=>{const a=Math.PI/3*i; return (cx+r*Math.cos(a)).toFixed(1)+","+(cy+r*Math.sin(a)).toFixed(1);}).join(" ");
  el("polygon",{points:pts,class:"area a-grey"},L.areas);
  el("line",{x1:cx,y1:cy-r*.87,x2:cx,y2:1250,class:"stem"},L.areas);
  areaLabel(cx,cy,"terrace",2*r,2*r);
}
function areaLabel(cx,cy,text,w,h){
  const vertical = h>w*2.2 && w<60;
  const t=el("text",{x:cx,y:cy,class:"alabel",transform:vertical?`rotate(-90 ${cx} ${cy})`:""},L.labels);
  t.textContent=text;
}
PLAN.corridors.forEach(([z,x,y,w,h])=>rect(x,y,w,h,"corr z-"+z,L.corr));
PLAN.slants.forEach(([z,pts])=>el("polygon",{points:pts,class:"corr z-"+z},L.corr));

// Rooms
const spots = {};
// First brand of the room's first exhibitor, trimmed to fit
function headline(r,maxChars){
  const e=ROOMS[r].exs[0], b=(EX[e]&&EX[e][0])||e;
  const more = ROOMS[r].exs.reduce((n,x)=>n+((EX[x]||[]).length||1),0)-1;
  let s = b + (more>0?" +"+more:"");
  return s.length>maxChars ? s.slice(0,Math.max(3,maxChars-1))+"…" : s;
}
const big = r => !isNum(r);
Object.entries(BOX).forEach(([r,[px,py,pw,ph]])=>{
  const x=px*W/100, y=py*H/100, w=pw*W/100, h=ph*H/100;
  const info = ROOMS[r];
  const g = el("g",{class:"room"+(info?" z-"+info.z.id:" empty")+(big(r)?" hall":""),"data-r":r},L.rooms);
  rect(x,y,w,h,"rbox",g);
  const vertical = !isNum(r) && h>w*1.6 && w<50; // room numbers always stay horizontal
  const label = isNum(r) ? r : r.replace(/ \(.*\)/,"").replace(/ foyer$/i," foyer");
  const fs = Math.max(isNum(r)?5:8, Math.min(isNum(r)?16:13, (vertical?h:w)/(label.length*0.62), (vertical?w:h)*0.55));
  const cx=x+w/2, cy=y+h/2;
  const t = el("text",{x:cx,y:cy,class:"rlabel","font-size":fs.toFixed(1),transform:vertical?`rotate(-90 ${cx} ${cy})`:""},g);
  t.textContent=label;
  if(info){
    // Headline brand under the label is always shown; star and check in the corner only for favorites and visited rooms
    el("text",{x:x+3,y:y+2,class:"check","font-size":Math.max(9,Math.min(15,w*.24,h*.4)).toFixed(1)},g).textContent="✓";
    const st=el("text",{x:x+w-2,y:y+2,class:"star","font-size":Math.max(9,Math.min(15,w*.24,h*.4)).toFixed(1)},g); st.textContent="★";
    if(!vertical && h>=fs*2.1){
      el("text",{x:cx,y:cy+fs*0.62,class:"rbrand","font-size":Math.max(6,Math.min(fs*.55,w/9)).toFixed(1)},g).textContent=headline(r,w/(Math.max(6,Math.min(fs*.55,w/9))*0.55));
    }
    g.setAttribute("tabindex","0"); g.setAttribute("role","button");
    g.setAttribute("aria-label", rname(r)+", "+info.exs.join(", "));
    spots[r]={g,x,y,w,h};
    if(g.querySelector(".rbrand")) g.classList.add("has-brand");
  }
});

// Facility icons
const ICON = {
  wc:  '<path d="M-4.5-4.5a1.3 1.3 0 1 0 0 .01zM4.5-4.5a1.3 1.3 0 1 0 0 .01zM-6.3-2h3.6l.5 4h-1.1v4h-2.4v-4h-1.1zM3-2h3l1.8 4H6.3v4H2.7v-4H1.2z"/>',
  info:'<circle cx="0" cy="-4.6" r="1.4"/><path d="M-2.2-1.8h3.4v6.3h1.3v1.6h-4.8v-1.6h1.3V-.2h-1.2z"/>',
  food:'<path d="M-5-6v5a2 2 0 0 0 1.3 1.9V7h1.4V.9A2 2 0 0 0-1-1v-5h-.9v4.4h-.8V-6h-.8v4.4h-.8V-6zM3.6-6c-1.8 1-2.4 3.2-2.4 5.3v2h1.4V7H4V-6z"/>',
  coat:'<path d="M0-5.5a1.8 1.8 0 0 1 1 3.3L.6-1.5 6.5 3.4c.5.4.2 1.3-.5 1.3h-12c-.7 0-1-.9-.5-1.3L-.6-1.5v-.9a.6.6 0 0 1 .6-.6.8.8 0 1 0-.8-.8H-2A2 2 0 0 1 0-5.5zm0 5.4L-4.6 3.5h9.2z"/>',
  aid: '<path d="M-2-6.5h4v4.5h4.5v4H2v4.5h-4V2h-4.5v-4H-2z"/>'
};
const ICON_NAME = {wc:"Toilets", info:"Info point", food:"Catering", coat:"Wardrobe", aid:"First aid / AED"};
PLAN.icons.forEach(([k,x,y])=>{
  const g=el("g",{class:"icon i-"+k,transform:`translate(${x} ${y})`},L.icons);
  el("rect",{x:-9,y:-9,width:18,height:18,rx:4},g);
  g.insertAdjacentHTML("beforeend", ICON[k]);
  el("title",{},g).textContent=ICON_NAME[k];
});
PLAN.entrances.forEach(([x,y,dir,label])=>{
  const g=el("g",{class:"entrance",transform:`translate(${x} ${y})`},L.icons);
  el("rect",{x:-20,y:-20,width:40,height:40,rx:7},g);
  el("path",{d:"M0 11L-10 0h6v-10h8V0h6z",transform:dir==="left"?"rotate(90)":""},g);
  const t=el("text",{x:dir==="left"?28:0,y:dir==="left"?5:-30,class:"elabel","text-anchor":dir==="left"?"start":"middle"},g);
  t.textContent=label;
});
const ZNL={yellow:"gele zone",green:"groene zone",blue:"blauwe zone",red:"rode zone"};
PLAN.badges.forEach(([z,x,y])=>{
  const g=el("g",{class:"badge z-"+z,transform:`translate(${x} ${y})`},L.icons);
  el("rect",{x:-40,y:-19,width:80,height:38,rx:6},g);
  const t=el("text",{x:0,y:1},g); t.textContent=ZNL[z];
});

/* ---------- pan & zoom (viewBox) ---------- */
const FIT = {x:40, y:150, w:1680, h:1390};
let vb = {...FIT};
const MINW=160, MAXW=2600;
function applyVB(){
  svg.setAttribute("viewBox",`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  svg.classList.toggle("near", pxPerUnit()>1.1);
  placeTip();
}
// px per svg unit, taking preserveAspectRatio=meet into account
function pxPerUnit(){ return Math.min(box.clientWidth/vb.w, box.clientHeight/vb.h); }
function toSvg(clientX,clientY){
  const r=box.getBoundingClientRect(), s=pxPerUnit();
  const ox=(box.clientWidth - vb.w*s)/2, oy=(box.clientHeight - vb.h*s)/2;
  return { x: vb.x + (clientX-r.left-ox)/s, y: vb.y + (clientY-r.top-oy)/s };
}
function zoomAt(factor, cx, cy){
  const nw = Math.min(MAXW, Math.max(MINW, vb.w*factor)); const f = nw/vb.w;
  vb = { x: cx-(cx-vb.x)*f, y: cy-(cy-vb.y)*f, w: nw, h: vb.h*f };
  applyVB();
}
let anim=null;
function animateTo(target){
  cancelAnimationFrame(anim);
  if(reduceMotion()){ vb=target; applyVB(); return; }
  const from={...vb}, t0=performance.now(), D=280;
  const step=t=>{ const k=Math.min(1,(t-t0)/D), e=1-Math.pow(1-k,3);
    vb={x:from.x+(target.x-from.x)*e, y:from.y+(target.y-from.y)*e, w:from.w+(target.w-from.w)*e, h:from.h+(target.h-from.h)*e};
    applyVB(); if(k<1) anim=requestAnimationFrame(step); };
  anim=requestAnimationFrame(step);
}
function fitView(){ animateTo({...FIT}); }
function focusRoom(r){
  const s=spots[r]; if(!s) return;
  const aspect = box.clientWidth/box.clientHeight;
  let w = Math.min(vb.w, Math.max(420, s.w*6)); let h = w/aspect;
  if(h < s.h*3){ h=s.h*3; w=h*aspect; }
  // On phones the tooltip is a sheet over the bottom half: keep the room in the top quarter.
  const cy = box.clientWidth<520 ? s.y+s.h/2-h*0.25 : s.y+s.h/2-h/2;
  animateTo({x:s.x+s.w/2-w/2, y:cy, w, h});
}

const ptrs = new Map(); let gesture=null;
svg.addEventListener("pointerdown", e=>{
  svg.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  cancelAnimationFrame(anim);
  gesture = { start:{...vb}, pts:[...ptrs.values()].map(p=>({...p})), moved:false,
              room: ptrs.size===1 ? e.target.closest(".room[tabindex]") : null };
});
svg.addEventListener("pointermove", e=>{
  if(!ptrs.has(e.pointerId) || !gesture) return;
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const cur=[...ptrs.values()], s=pxPerUnit();
  if(cur.length===1 && gesture.pts.length===1){
    const dx=cur[0].x-gesture.pts[0].x, dy=cur[0].y-gesture.pts[0].y;
    if(Math.hypot(dx,dy)>6) gesture.moved=true;
    if(gesture.moved){ vb={...gesture.start, x:gesture.start.x-dx/s, y:gesture.start.y-dy/s}; applyVB(); }
  } else if(cur.length>=2 && gesture.pts.length>=2){
    gesture.moved=true;
    const d0=Math.hypot(gesture.pts[0].x-gesture.pts[1].x, gesture.pts[0].y-gesture.pts[1].y);
    const d1=Math.hypot(cur[0].x-cur[1].x, cur[0].y-cur[1].y);
    const m0={x:(gesture.pts[0].x+gesture.pts[1].x)/2, y:(gesture.pts[0].y+gesture.pts[1].y)/2};
    const m1={x:(cur[0].x+cur[1].x)/2, y:(cur[0].y+cur[1].y)/2};
    vb={...gesture.start}; const c=toSvg(m0.x,m0.y);
    zoomAt(d0/Math.max(d1,1), c.x, c.y);
    const s2=pxPerUnit(); vb.x-=(m1.x-m0.x)/s2; vb.y-=(m1.y-m0.y)/s2; applyVB();
  }
});
const endPtr = e=>{
  if(!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if(gesture && !gesture.moved && e.type==="pointerup"){
    if(gesture.room) select(gesture.room.dataset.r,false);
    else if(!e.target.closest(".tip")) closeTip();
  }
  gesture = ptrs.size ? { start:{...vb}, pts:[...ptrs.values()].map(p=>({...p})), moved:true } : null;
};
svg.addEventListener("pointerup", endPtr);
svg.addEventListener("pointercancel", endPtr);
svg.addEventListener("wheel", e=>{
  e.preventDefault();
  const c=toSvg(e.clientX,e.clientY);
  zoomAt(Math.exp(e.deltaY*(e.ctrlKey?0.01:0.0015)), c.x, c.y);
},{passive:false});
svg.addEventListener("keydown", e=>{
  const g=e.target.closest(".room[tabindex]");
  if(g && (e.key==="Enter"||e.key===" ")){ e.preventDefault(); select(g.dataset.r,true); }
});
addEventListener("keydown", e=>{ if(e.key==="Escape") closeTip(); });
new ResizeObserver(()=>applyVB()).observe(box);

/* Fullscreen: real Fullscreen API where available, otherwise (iPhone) a fixed full-window overlay. */
const fullBtn=document.getElementById("full");
function setFull(on){
  box.classList.toggle("full",on); fullBtn.setAttribute("aria-pressed",on);
  document.body.style.overflow=on?"hidden":"";
  if(on && box.requestFullscreen) box.requestFullscreen().catch(()=>{});
  else if(!on && document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  requestAnimationFrame(()=>applyZones(true));
}
fullBtn.addEventListener("click",()=>setFull(!box.classList.contains("full")));
document.addEventListener("fullscreenchange",()=>{ if(!document.fullscreenElement && box.classList.contains("full")) setFull(false); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape" && box.classList.contains("full")) setFull(false); });
/* High res = the redrawn map (default). Off = the original plan JPG, rooms stay tappable on top of it. */
const hiBtn=document.getElementById("hires");
function setHi(on){ svg.classList.toggle("show-orig",!on); svg.classList.toggle("no-vec",!on); hiBtn.setAttribute("aria-checked",on); store.set("hd",on); }
hiBtn.addEventListener("click",()=>setHi(svg.classList.contains("show-orig")));


/* ---------- tooltip ---------- */
const tip = document.getElementById("tip");
let sel=null;
function select(r, move){
  if(!ROOMS[r]) return;
  sel=r;
  Object.entries(spots).forEach(([k,s])=>s.g.classList.toggle("sel", k===r));
  const {z,exs} = ROOMS[r]; const q=cur();
  const blocks = exs.map(e=>{
    const list=EX[e]||[];
    const others=(WHERE[e]||[]).filter(x=>x!==r);
    const also = others.length ? `<div class="also">Also in ${others.map(o=>`<button type="button" data-go="${esc(o)}">${esc(rname(o))}</button>`).join(", ")}</div>` : "";
    const link = URL_EX[e] ? `<a class="ext" href="${esc(URL_EX[e])}" target="_blank" rel="noopener">View page ↗</a>` : "";
    const b = list.length ? list.map(x=>hl(x,q)).join(", ") : `<span class="none">No brands listed on the site</span>`;
    return `<div class="ex"><div class="exn"><span>${hl(e,q)}</span>${link}</div><div class="brands">${b}</div>${also}</div>`;
  }).join("");
  tip.style.setProperty("--zc", z.color);
  const st=roomState(r);
  tip.innerHTML = `<div class="ph"><h2>${esc(rname(r))}</h2><span class="ztag">${z.name}</span>
    <button type="button" class="favb" aria-pressed="${!!st.fav}" aria-label="Favorite" title="Favorite">${st.fav?"★":"☆"}</button>
    <button type="button" class="x" aria-label="Close">×</button></div><div class="tb">
    <div class="acts"><button type="button" class="vis" aria-pressed="${!!st.visited}">${st.visited?"✓ Visited":"Mark visited"}</button>
      <span class="rate" role="group" aria-label="Your rating">${[1,2,3,4,5].map(n=>`<button type="button" data-n="${n}" aria-label="${n} of 5" aria-pressed="${(st.rating||0)>=n}">★</button>`).join("")}</span></div>
    <textarea class="note" rows="2" placeholder="Your notes for this room…" aria-label="Notes">${esc(st.note||"")}</textarea>${blocks}</div>`;
  tip.querySelector(".favb").addEventListener("click",e=>{ const on=!roomState(r).fav; setRoom(r,{fav:on}); e.currentTarget.setAttribute("aria-pressed",on); e.currentTarget.textContent=on?"★":"☆"; refresh(); });
  tip.querySelector(".note").addEventListener("input",e=>setRoom(r,{note:e.target.value}));
  tip.querySelector(".vis").addEventListener("click",e=>{ const on=!roomState(r).visited; setRoom(r,{visited:on}); e.currentTarget.setAttribute("aria-pressed",on); e.currentTarget.textContent=on?"✓ Visited":"Mark visited"; refresh(); });
  tip.querySelectorAll(".rate button").forEach(b=>b.addEventListener("click",()=>{
    const n=+b.dataset.n, v = roomState(r).rating===n ? 0 : n; setRoom(r,{rating:v});
    tip.querySelectorAll(".rate button").forEach(x=>x.setAttribute("aria-pressed", v>=+x.dataset.n)); }));
  tip.querySelector(".x").addEventListener("click",closeTip);
  tip.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>select(b.dataset.go,true)));
  tip.hidden=false;
  if(move) focusRoom(r);
  placeTip();
}
function closeTip(){
  sel=null; tip.hidden=true;
  Object.values(spots).forEach(s=>s.g.classList.remove("sel"));
}
function placeTip(){
  if(!sel || tip.hidden) return;
  const s=spots[sel], k=pxPerUnit();
  const ox=(box.clientWidth-vb.w*k)/2, oy=(box.clientHeight-vb.h*k)/2;
  const rx=ox+(s.x-vb.x)*k, ry=oy+(s.y-vb.y)*k, rw=s.w*k, rh=s.h*k;
  const bw=box.clientWidth, bh=box.clientHeight, gap=10, pad=8;
  const narrow = bw<520;
  tip.classList.toggle("sheet", narrow);
  if(narrow){ tip.style.left=""; tip.style.top=""; return; }
  const tw=tip.offsetWidth, th=tip.offsetHeight;
  let x, y;
  if(rx+rw+gap+tw <= bw-pad) x=rx+rw+gap;
  else if(rx-gap-tw >= pad) x=rx-gap-tw;
  else x=Math.min(Math.max(pad, rx+rw/2-tw/2), bw-tw-pad);
  y = ry+rh/2-th/2;
  if(x>rx-tw && x<rx+rw){ // horizontally overlapping: place below or above
    y = ry+rh+gap+th <= bh-pad ? ry+rh+gap : ry-gap-th;
  }
  y = Math.min(Math.max(pad, y), Math.max(pad, bh-th-pad));
  tip.style.left=x+"px"; tip.style.top=y+"px";
}

/* ---------- search & filters ---------- */
const cur = () => document.getElementById("q").value.trim().toLowerCase();
function matchRoom(r,q){
  if(!q) return false;
  if(r.toLowerCase()===q || (!isNum(q) && r.toLowerCase().includes(q))) return true;
  if((roomState(r).note||"").toLowerCase().includes(q)) return true;
  return ROOMS[r].exs.some(e=>e.toLowerCase().includes(q) || (EX[e]||[]).some(b=>b.toLowerCase().includes(q)));
}
let zones=new Set(), favOnly=false, hideVisited=false; // empty set = all zones
const zoneOk = r => !zones.size || zones.has(ROOMS[r].z.id);
function refresh(){
  const q=cur(); const hits=[];
  Object.entries(spots).forEach(([r,s])=>{
    const st=roomState(r);
    const shown = (!favOnly || st.fav) && (!hideVisited || !st.visited);
    if(!zoneOk(r)) { s.g.classList.remove("hit"); s.g.classList.add("dim"); return; }
    const hit = shown && matchRoom(r,q);
    if(hit) hits.push(r);
    s.g.classList.toggle("hit", hit);
    s.g.classList.toggle("dim", !shown || (!!q && !hit));
  });
  const h=document.getElementById("hits");
  if(!q){ h.innerHTML=""; }
  else if(!hits.length){ h.innerHTML=`<span class="none">No room matches “${esc(q)}”.</span>`; }
  else{
    h.innerHTML = `<span class="count">${hits.length} room${hits.length>1?"s":""}:</span>` + hits.map(r=>`<button type="button" data-go="${esc(r)}">${esc(rname(r))}</button>`).join("");
    h.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>select(b.dataset.go,true)));
  }
  if(sel && !tip.contains(document.activeElement)) select(sel,false);
  return hits;
}
let t;
document.getElementById("q").addEventListener("input",()=>{ clearTimeout(t); t=setTimeout(()=>{ const hits=refresh(); if(hits.length===1) select(hits[0],true); },120); });

const zbox=document.getElementById("zones");
if(FEATURES.zoneToggles) ZONES.forEach(z=>{
  const b=document.createElement("button"); b.type="button"; b.dataset.z=z.id;
  b.innerHTML=(z.color?`<span class="dot" style="background:${z.color}"></span>`:"")+z.name;
  b.addEventListener("click",()=>{
    if(!zones.size) ZONES.forEach(o=>zones.add(o.id)); // empty = all shown, so start from all four
    zones.has(z.id) ? zones.delete(z.id) : zones.add(z.id);
    if(zones.size===ZONES.length) zones.clear();
    applyZones(true); refresh(); });
  zbox.appendChild(b);
});
/* Zone view: everything outside the selected zones is hidden and the view zooms to them. */
const ZBOX = {}; // zone -> bbox of its rooms and corridors
function grow(b,x,y,w,h){ b.x1=Math.min(b.x1,x); b.y1=Math.min(b.y1,y); b.x2=Math.max(b.x2,x+w); b.y2=Math.max(b.y2,y+h); }
ZONES.forEach(z=>{ const b={x1:1e9,y1:1e9,x2:-1e9,y2:-1e9};
  z.rooms.forEach(([r])=>{ const s=spots[r]; if(s) grow(b,s.x,s.y,s.w,s.h); });
  PLAN.corridors.filter(c=>c[0]===z.id).forEach(([,x,y,w,h])=>grow(b,x,y,w,h));
  ZBOX[z.id]=b; });
const clip = el("clipPath",{id:"zclip"}, el("defs",{},svg));
let loose=null; // elements without a zone, with their centre point
function applyZones(move){
  zbox.querySelectorAll("[data-z]").forEach(x=>x.setAttribute("aria-pressed", !zones.size || zones.has(x.dataset.z)));
  svg.classList.toggle("zoned", zones.size>0);
  if(!loose){
    loose=[...svg.querySelectorAll(".l-areas>*, .l-labels>*, .l-icons>.icon, .l-icons>.entrance, .room.empty")].map(n=>{ const b=n.getBBox(), m=n.transform.baseVal.consolidate()?.matrix; // getBBox ignores the element's own transform
    const px=b.x+b.width/2, py=b.y+b.height/2; return {n, cx:m?m.a*px+m.c*py+m.e:px, cy:m?m.b*px+m.d*py+m.f:py}; });
  }
  const inZone = (x,y) => [...zones].some(z=>{ const b=ZBOX[z]; return x>=b.x1-25 && x<=b.x2+25 && y>=b.y1-25 && y<=b.y2+25; });
  loose.forEach(({n,cx,cy})=>n.classList.toggle("zhide", zones.size>0 && !inZone(cx,cy)));
  svg.querySelectorAll(".l-corr>*, .badge, .room[tabindex]").forEach(n=>{
    const z=[...n.classList].find(c=>c.startsWith("z-")); n.classList.toggle("zhide", zones.size>0 && !zones.has(z&&z.slice(2)));
  });
  // The original image can't hide parts of itself, so crop it to the active zones.
  clip.innerHTML = [...zones].map(z=>{ const b=ZBOX[z]; return `<rect x="${b.x1-25}" y="${b.y1-25}" width="${b.x2-b.x1+50}" height="${b.y2-b.y1+50}"/>`; }).join("");
  if(zones.size) orig.setAttribute("clip-path","url(#zclip)"); else orig.removeAttribute("clip-path");
  if(sel && zones.size && !zoneOk(sel)) closeTip();
  if(!move) return;
  if(!zones.size) return fitView();
  const b={x1:1e9,y1:1e9,x2:-1e9,y2:-1e9}; zones.forEach(z=>{ const o=ZBOX[z]; grow(b,o.x1,o.y1,o.x2-o.x1,o.y2-o.y1); });
  const pad=40; animateTo({x:b.x1-pad, y:b.y1-pad, w:b.x2-b.x1+2*pad, h:b.y2-b.y1+2*pad});
}
applyZones(false);

/* ---------- favorites & progress ---------- */
function paintRoom(r){
  const s=spots[r]; if(!s) return; const st=roomState(r);
  s.g.classList.toggle("fav", !!st.fav);
  s.g.classList.toggle("noted", !!st.note);
  s.g.classList.toggle("visited", !!st.visited);
}
const ORDER = {}; ZONES.forEach((z,zi)=>z.rooms.forEach(([r],ri)=>ORDER[r]=zi*1000+(isNum(r)?+r:500+ri)));
const byOrder = (a,b)=>ORDER[a]-ORDER[b];
const favList = () => Object.keys(store.get("rooms")||{}).filter(r=>ROOMS[r] && roomState(r).fav).sort(byOrder);
const brandsOf = exs => exs.flatMap(e=>EX[e]&&EX[e].length?EX[e]:[e]);
function renderFavs(){
  const list=document.getElementById("favs"), rooms=favList();
  document.getElementById("favcount").textContent = rooms.length ? `(${rooms.length})` : "";
  const all=Object.keys(spots), seen=all.filter(r=>roomState(r).visited).length, favSeen=rooms.filter(r=>roomState(r).visited).length;
  document.getElementById("progress").innerHTML = rooms.length||seen
    ? `<span class="pbar" style="--p:${rooms.length?favSeen/rooms.length*100:seen/all.length*100}%"></span>`+
      (rooms.length?`${favSeen} of ${rooms.length} favorites visited · `:"")+`${seen} of ${all.length} rooms visited` : "";
  if(!rooms.length){ list.innerHTML=`<li class="empty">Tap ☆ in a room's popup to add it here.</li>`; return; }
  list.innerHTML = rooms.map(r=>{ const {z,exs}=ROOMS[r], st=roomState(r), brands=brandsOf(exs);
    const extra = (st.visited?" ✓":"")+(st.rating?" "+"★".repeat(st.rating):"");
    return `<li style="--zc:${z.color}" class="${st.visited?"visited":""}"><button type="button" data-go="${esc(r)}"><span class="fr">${esc(rname(r))}${extra?`<span class="fx">${extra}</span>`:""}</span>
      ${st.note?`<span class="fn">${esc(st.note)}</span>`:""}
      <span class="fb">${esc(brands.slice(0,6).join(", "))}${brands.length>6?` +${brands.length-6}`:""}</span></button></li>`; }).join("");
  list.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>{ select(b.dataset.go,true); box.scrollIntoView({block:"nearest",behavior:reduceMotion()?"auto":"smooth"}); }));
}

/* ---------- theme ---------- */
const themeBtn=document.getElementById("theme");
function setTheme(t){
  document.documentElement.setAttribute("data-theme",t);
  themeBtn.setAttribute("aria-checked",t==="dark"); themeBtn.dataset.t=t; store.set("theme",t);
}
themeBtn.addEventListener("click",()=>setTheme(themeBtn.dataset.t==="dark"?"light":"dark"));

/* ---------- share & export ---------- */
const msg = text => { const m=document.getElementById("msg"); m.textContent=text; clearTimeout(msg.t); msg.t=setTimeout(()=>m.textContent="",6000); };
function download(name, text, type){
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
document.getElementById("share").addEventListener("click", async ()=>{
  const favs=favList(); if(!favs.length) return msg("Add some favorites first.");
  const url = location.href.split("#")[0] + "#fav=" + favs.map(encodeURIComponent).join(",");
  try{
    if(navigator.share) await navigator.share({title:"My DAE 2026 favorites", url});
    else { await navigator.clipboard.writeText(url); msg("Link copied. Anyone who opens it can add your favorites."); }
  }catch(e){ if(e.name!=="AbortError") prompt("Copy this link:", url); }
});
function importSharedFavs(){
  const m=location.hash.match(/^#fav=(.+)$/); if(!m) return;
  history.replaceState(null,"",location.pathname+location.search);
  const dec = s => { try{ return decodeURIComponent(s); }catch(e){ return null; } };
  const add=[...new Set(m[1].split(",").map(dec))].filter(r=>r && ROOMS[r] && !roomState(r).fav);
  if(add.length && confirm(`Add ${add.length} shared favorite${add.length>1?"s":""} (${add.map(rname).join(", ")})?`)){
    add.forEach(r=>setRoom(r,{fav:true})); refresh(); msg(`Added ${add.length} favorite${add.length>1?"s":""}.`);
  }
}
const withData = () => Object.keys(spots).sort(byOrder).map(r=>({r, st:roomState(r), ...ROOMS[r]})).filter(x=>Object.keys(x.st).length);
document.getElementById("expmd").addEventListener("click",()=>{
  const rs=withData(); if(!rs.length) return msg("Nothing to export yet.");
  const md = "# Dutch Audio Event 2026: my notes\n\n" + rs.map(({r,st,z,exs})=>
    `## ${rname(r)} (${z.name})${st.fav?" ★":""}\n\n`+
    exs.map(e=>`- **${e}**: ${(EX[e]||[]).join(", ")||"no brands listed"}${URL_EX[e]?` ([page](${URL_EX[e]}))`:""}`).join("\n")+"\n\n"+
    (st.visited?"Visited. ":"")+(st.rating?"Rating: "+"★".repeat(st.rating)+"☆".repeat(5-st.rating):"")+(st.visited||st.rating?"\n\n":"")+
    (st.note?st.note+"\n\n":"")).join("");
  download("dae2026-notes.md", md, "text/markdown");
});
document.getElementById("expcsv").addEventListener("click",()=>{
  const rs=withData(); if(!rs.length) return msg("Nothing to export yet.");
  // Prefix cells that spreadsheets would evaluate as formulas.
  const q=v=>{ let s=String(v??""); if(/^[=+\-@\t\r]/.test(s)) s="'"+s; return `"${s.replace(/"/g,'""')}"`; };
  const csv=["room,zone,favorite,visited,rating,exhibitors,brands,note"].concat(rs.map(({r,st,z,exs})=>
    [r,z.name,st.fav?1:0,st.visited?1:0,st.rating||"",exs.join("; "),brandsOf(exs).join("; "),st.note].map(q).join(","))).join("\r\n");
  download("dae2026-notes.csv", "﻿"+csv, "text/csv");
});
const BACKUP_VERSION = 1;
// Keeps only well-formed per-room fields; rooms left with nothing are dropped.
function cleanRooms(src){
  const out={};
  Object.entries(src).forEach(([r,st])=>{
    if(!st || typeof st!=="object") return;
    const c={};
    if(st.fav===true) c.fav=true;
    if(st.visited===true) c.visited=true;
    if(typeof st.note==="string" && st.note) c.note=st.note;
    if(Number.isInteger(st.rating) && st.rating>=1 && st.rating<=5) c.rating=st.rating;
    if(Object.keys(c).length) out[r]=c;
  });
  return out;
}
const backupPayload = () => ({app:"daem-2026", version:BACKUP_VERSION, rooms:store.get("rooms")||{}});
// Validates a parsed backup and returns its cleaned rooms; throws with a user-readable reason.
function parseBackup(data){
  if(!data || data.app!=="daem-2026" || !data.rooms || typeof data.rooms!=="object" || Array.isArray(data.rooms)) throw new Error("not a DAE 2026 backup");
  if(data.version>BACKUP_VERSION) throw new Error("this backup is from a newer version of the app");
  return cleanRooms(data.rooms);
}
// Asks first, then replaces current favorites, notes and ratings. Returns true if applied.
function restoreRooms(rooms, source){
  const n=Object.keys(rooms).length;
  if(!confirm(`Restore ${n} room${n!==1?"s":""} from ${source}? This replaces your current favorites, notes and ratings.`)) return false;
  store.set("rooms", rooms);
  Object.keys(spots).forEach(paintRoom); renderFavs(); refresh(); msg("Backup restored.");
  return true;
}
document.getElementById("expjson").addEventListener("click",()=>{
  download("dae2026-backup.json", JSON.stringify(backupPayload(),null,2), "application/json");
});
document.getElementById("impjson").addEventListener("change", async e=>{
  const f=e.target.files[0]; e.target.value=""; if(!f) return;
  try{ restoreRooms(parseBackup(JSON.parse(await f.text())), "this backup"); }
  catch(err){ msg("Could not read that file: "+err.message); }
});

// First visit follows the system setting; after that the user's choice sticks.
{ const t=store.get("theme"); setTheme(t==="light"||t==="dark" ? t : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }
setHi(store.get("hd")!==false);
Object.keys(spots).forEach(paintRoom);
renderFavs();
applyVB();
refresh();
importSharedFavs();
addEventListener("hashchange", importSharedFavs); // a shared link opened while the app is already open

// Optional cloud backup: loaded only when the flag is on and a client ID is set. Everything above works without it.
if(FEATURES.cloudBackup && GDRIVE_CLIENT_ID){
  const sc=document.createElement("script"); sc.src="gdrive.js"; document.head.appendChild(sc);
}
