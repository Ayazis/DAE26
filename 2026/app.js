const ROOMS = {}; // name -> {z, exs}
ZONES.forEach(z=>z.rooms.forEach(([r,exs])=>{ ROOMS[r] = {z, exs}; }));
const WHERE = {};
ZONES.forEach(z=>z.rooms.forEach(([r,exs])=>exs.forEach(e=>(WHERE[e] ||= []).push(r))));

const esc = s => s.replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hl = (t,q) => { if(!q) return esc(t); const i=t.toLowerCase().indexOf(q); return i<0?esc(t):esc(t.slice(0,i))+"<mark>"+esc(t.slice(i,i+q.length))+"</mark>"+esc(t.slice(i+q.length)); };
const isNum = r => /^\d+$/.test(r);
const rname = r => isNum(r) ? "Room "+r : r;

const map = document.getElementById("map"), box = document.getElementById("mapbox");
const spots = {};
Object.entries(BOX).forEach(([r,[x,y,w,h]])=>{
  if(!ROOMS[r]) return;
  const b = document.createElement("button");
  b.type="button"; b.className="spot"; b.dataset.r=r;
  b.style.cssText = `left:${x}%;top:${y}%;width:${w}%;height:${h}%`;
  b.setAttribute("aria-label", rname(r));
  b.addEventListener("click", ()=>select(r,false));
  map.appendChild(b); spots[r]=b;
});

let sel=null, zoneSel="all", zoom=1;
try{ zoom = +localStorage.getItem("dae-zoom") || (innerWidth<700?2:1); }catch(e){ zoom = innerWidth<700?2:1; }

function setZoom(z){
  const cx = (box.scrollLeft + box.clientWidth/2)/map.offsetWidth, cy=(box.scrollTop + box.clientHeight/2)/map.offsetHeight;
  zoom=z; map.style.width = (z*100)+"%";
  document.querySelectorAll(".zoom button").forEach(b=>b.setAttribute("aria-pressed", +b.dataset.z===z));
  box.scrollLeft = cx*map.offsetWidth - box.clientWidth/2;
  box.scrollTop = cy*map.offsetHeight - box.clientHeight/2;
  try{localStorage.setItem("dae-zoom",z)}catch(e){}
}
document.querySelectorAll(".zoom button").forEach(b=>b.addEventListener("click",()=>setZoom(+b.dataset.z)));

// drag to pan with mouse
let drag=null;
box.addEventListener("pointerdown",e=>{ if(e.pointerType!=="mouse") return; drag={x:e.clientX,y:e.clientY,l:box.scrollLeft,t:box.scrollTop,moved:false}; });
addEventListener("pointermove",e=>{ if(!drag) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y; if(Math.abs(dx)+Math.abs(dy)>4) drag.moved=true; box.scrollLeft=drag.l-dx; box.scrollTop=drag.t-dy; });
addEventListener("pointerup",()=>{ if(drag&&drag.moved){ const stop=ev=>{ev.stopPropagation();ev.preventDefault();}; box.addEventListener("click",stop,{capture:true,once:true}); setTimeout(()=>box.removeEventListener("click",stop,{capture:true}),0);} drag=null; });

function scrollTo(r){
  const s=spots[r]; if(!s) return;
  const x = s.offsetLeft + s.offsetWidth/2 - box.clientWidth/2;
  const y = s.offsetTop + s.offsetHeight/2 - box.clientHeight/2;
  box.scrollTo({left:x, top:y, behavior: matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth"});
}

function select(r, move){
  sel=r;
  Object.values(spots).forEach(s=>s.classList.toggle("sel", s.dataset.r===r));
  if(move){ if(zoom===1 && innerWidth<700) setZoom(2); scrollTo(r); }
  const {z,exs} = ROOMS[r]; const q=cur();
  const blocks = exs.map(e=>{
    const list=EX[e]||[];
    const others=(WHERE[e]||[]).filter(x=>x!==r);
    const also = others.length ? ` <span class="also">· also in ${others.map(o=>`<button type="button" data-go="${esc(o)}">${esc(rname(o))}</button>`).join(", ")}</span>` : "";
    const b = list.length ? list.map(x=>hl(x,q)).join(", ") : `<span class="none">No brands listed on the site</span>`;
    return `<div class="ex"><div class="exn">${hl(e,q)}${also}</div><div class="brands">${b}</div></div>`;
  }).join("");
  const p=document.getElementById("panel");
  p.style.setProperty("--zc", z.color);
  p.innerHTML = `<div class="ph"><h2>${esc(rname(r))}</h2><span class="ztag">${z.name} · ${z.nl}</span></div>${blocks}`;
  p.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>select(b.dataset.go,true)));
  if(move && innerWidth<700) {} // panel stays below; map scroll is enough
}

const cur = () => document.getElementById("q").value.trim().toLowerCase();

function matchRoom(r,q){
  if(!q) return false;
  if(r.toLowerCase()===q || (!isNum(q) && r.toLowerCase().includes(q))) return true;
  return ROOMS[r].exs.some(e=>e.toLowerCase().includes(q) || (EX[e]||[]).some(b=>b.toLowerCase().includes(q)));
}

function refresh(){
  const q=cur();
  const hits=[];
  Object.entries(spots).forEach(([r,s])=>{
    const inZone = zoneSel==="all" || ROOMS[r].z.id===zoneSel;
    const hit = inZone && matchRoom(r,q);
    if(hit) hits.push(r);
    s.classList.toggle("hit", hit);
    s.classList.toggle("dim", !inZone || (q && !hit));
  });
  const h=document.getElementById("hits");
  if(!q){ h.innerHTML=""; }
  else if(!hits.length){ h.innerHTML=`<span class="none">No room matches “${esc(q)}”.</span>`; }
  else{
    h.innerHTML = hits.map(r=>`<button type="button" data-go="${esc(r)}">${esc(rname(r))}</button>`).join("");
    h.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>select(b.dataset.go,true)));
  }
  if(sel) select(sel,false);
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

setZoom(zoom);
refresh();
