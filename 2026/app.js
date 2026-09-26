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
  const vertical = h>w*1.6 && w<50;
  const label = isNum(r) ? r : r.replace(/ \(.*\)/,"").replace(/ foyer$/i," foyer");
  const fs = Math.max(8, Math.min(isNum(r)?16:13, (vertical?h:w)/(label.length*0.62), (vertical?w:h)*0.55));
  const cx=x+w/2, cy=y+h/2;
  const t = el("text",{x:cx,y:cy,class:"rlabel","font-size":fs.toFixed(1),transform:vertical?`rotate(-90 ${cx} ${cy})`:""},g);
  t.textContent=label;
  if(info){
    // Shown only for favorites: star in the corner and the headline brand under the label
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
  el("rect",{x:-28,y:-19,width:56,height:38,rx:6},g);
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

document.getElementById("zin").addEventListener("click",()=>{ const c={x:vb.x+vb.w/2,y:vb.y+vb.h/2}; zoomAt(1/1.5,c.x,c.y); });
document.getElementById("zout").addEventListener("click",()=>{ const c={x:vb.x+vb.w/2,y:vb.y+vb.h/2}; zoomAt(1.5,c.x,c.y); });
document.getElementById("zfit").addEventListener("click",fitView);
const origBtn=document.getElementById("orig");
function setOrig(on){ svg.classList.toggle("show-orig",on); origBtn.setAttribute("aria-pressed",on); store.set("orig",on); }
origBtn.addEventListener("click",()=>setOrig(!svg.classList.contains("show-orig")));

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
    <button type="button" class="x" aria-label="Close">×</button></div><div class="tb">${blocks}
    <textarea class="note" rows="2" placeholder="Your notes for this room…" aria-label="Notes">${esc(st.note||"")}</textarea></div>`;
  tip.querySelector(".favb").addEventListener("click",e=>{ const on=!roomState(r).fav; setRoom(r,{fav:on}); e.currentTarget.setAttribute("aria-pressed",on); e.currentTarget.textContent=on?"★":"☆"; });
  tip.querySelector(".note").addEventListener("input",e=>setRoom(r,{note:e.target.value}));
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

/* ---------- search & zones ---------- */
const cur = () => document.getElementById("q").value.trim().toLowerCase();
function matchRoom(r,q){
  if(!q) return false;
  if(r.toLowerCase()===q || (!isNum(q) && r.toLowerCase().includes(q))) return true;
  return ROOMS[r].exs.some(e=>e.toLowerCase().includes(q) || (EX[e]||[]).some(b=>b.toLowerCase().includes(q)));
}
let zoneSel="all";
function refresh(){
  const q=cur(); const hits=[];
  Object.entries(spots).forEach(([r,s])=>{
    const inZone = zoneSel==="all" || ROOMS[r].z.id===zoneSel;
    const hit = inZone && matchRoom(r,q);
    if(hit) hits.push(r);
    s.g.classList.toggle("hit", hit);
    s.g.classList.toggle("dim", !inZone || (!!q && !hit));
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
[{id:"all",name:"All zones"}].concat(ZONES).forEach(z=>{
  const b=document.createElement("button"); b.type="button"; b.dataset.z=z.id;
  b.innerHTML=(z.color?`<span class="dot" style="background:${z.color}"></span>`:"")+z.name;
  b.addEventListener("click",()=>{ zoneSel=z.id; zbox.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x.dataset.z===zoneSel)); refresh(); });
  zbox.appendChild(b);
});
zbox.querySelector("button").setAttribute("aria-pressed","true");

/* ---------- favorites ---------- */
function paintRoom(r){
  const s=spots[r]; if(!s) return; const st=roomState(r);
  s.g.classList.toggle("fav", !!st.fav);
  s.g.classList.toggle("noted", !!st.note);
}
const ORDER = {}; ZONES.forEach((z,zi)=>z.rooms.forEach(([r],ri)=>ORDER[r]=zi*1000+(isNum(r)?+r:500+ri)));
function renderFavs(){
  const list=document.getElementById("favs");
  const rooms=Object.keys(store.get("rooms")||{}).filter(r=>ROOMS[r] && roomState(r).fav).sort((a,b)=>ORDER[a]-ORDER[b]);
  document.getElementById("favcount").textContent = rooms.length ? `(${rooms.length})` : "";
  if(!rooms.length){ list.innerHTML=`<li class="empty">Tap ☆ in a room's popup to add it here.</li>`; return; }
  list.innerHTML = rooms.map(r=>{ const {z,exs}=ROOMS[r], st=roomState(r);
    const brands=exs.flatMap(e=>EX[e]&&EX[e].length?EX[e]:[e]);
    return `<li style="--zc:${z.color}"><button type="button" data-go="${esc(r)}"><span class="fr">${esc(rname(r))}</span>
      <span class="fb">${esc(brands.slice(0,6).join(", "))}${brands.length>6?` +${brands.length-6}`:""}</span>
      ${st.note?`<span class="fn">${esc(st.note)}</span>`:""}</button></li>`; }).join("");
  list.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>{ select(b.dataset.go,true); document.getElementById("mapbox").scrollIntoView({block:"nearest",behavior:reduceMotion()?"auto":"smooth"}); }));
}
Object.keys(spots).forEach(paintRoom);
renderFavs();

setOrig(!!store.get("orig"));
applyVB();
refresh();
