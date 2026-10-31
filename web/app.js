const token=document.querySelector('meta[name="zyvora-token"]').content;
const groups=[
 ["ESSENTIALS",["git","python","nodejs","curl","ruby","php","zip","nano","wget","vim","unzip"]],
 ["LANGUAGES & BUILD",["cpp","golang","build-tools","rust","java","cmake"]],
 ["WEB & DATABASE",["apache","php-server","sqlite","node-server","nginx"]],
 ["NETWORKING & SECURITY",["openssh","dns-tools","tailscale","netcat","openssl"]],
 ["TERMINAL EXPERIENCE",["figlet","fastfetch","tmux","htop","toilet","zsh"]]
];
const defaults=["git","python","nodejs","curl","ruby","php","zip","nano","wget","vim","unzip","cpp","golang","build-tools","rust","java","cmake","apache","php-server","sqlite","node-server","nginx","openssh","dns-tools","tailscale","netcat","openssl","figlet","fastfetch","tmux","htop","toilet","zsh"];
let selected=new Set(defaults),labels={};
const $=id=>document.getElementById(id);
function render(){
 const q=$("search").value.toLowerCase();
 $("groups").innerHTML=groups.map(([title,keys])=>{
  const visible=keys.filter(k=>(labels[k]||k).toLowerCase().includes(q));
  if(!visible.length)return "";
  return `<div class="group"><h3>${title}</h3><div class="items">${visible.map(k=>`<label class="item"><input type="checkbox" data-key="${k}" ${selected.has(k)?"checked":""}><span>${labels[k]||k}</span></label>`).join("")}</div></div>`;
 }).join("");
 $("groups").querySelectorAll("input").forEach(el=>el.addEventListener("change",()=>{el.checked?selected.add(el.dataset.key):selected.delete(el.dataset.key);updateCount()}));
 updateCount();
}
function updateCount(){$("count").textContent=selected.size;$("review").disabled=!selected.size;$("selection-note").textContent=selected.size?`${selected.size} items selected.`:"Choose one or more tools to continue."}
function show(id){["select-screen","review-screen","progress-screen"].forEach(x=>$(x).classList.toggle("hidden",x!==id))}
function review(){const names=[...selected].map(k=>labels[k]||k);$("review-list").innerHTML=names.map(n=>`<span class="tag">${escapeHtml(n)}</span>`).join("");$("confirm").checked=false;$("setup").disabled=true;show("review-screen")}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function start(){
 $("setup").disabled=true;show("progress-screen");$("logs").innerHTML="";$("progress-title").textContent="Installing packages";
 try{
  const res=await fetch("/api/setup",{method:"POST",headers:{"Content-Type":"application/json","X-Zyvora-Token":token},body:JSON.stringify({packages:[...selected],confirmed:true})});
  const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not start setup");
  poll();
 }catch(e){addLog({time:new Date().toLocaleTimeString(),message:e.message,kind:"error"});$("status-pill").textContent="ERROR"}
}
let lastLogs=0;
function addLog(item){const div=document.createElement("div");div.className="log "+(item.kind||"");const time=document.createElement("span");time.className="time";time.textContent=`[${item.time}] `;div.append(time,document.createTextNode(item.message));$("logs").append(div);$("logs").scrollTop=$("logs").scrollHeight}
async function poll(){
 try{
  const r=await fetch("/api/status",{cache:"no-store"}),s=await r.json();
  (s.logs||[]).slice(lastLogs).forEach(addLog);lastLogs=(s.logs||[]).length;
  const pct=s.total?Math.round(s.done/s.total*100):(s.finished?100:0);
  $("progress-fill").style.width=pct+"%";$("progress-percent").textContent=pct+"%";
  $("progress-label").textContent=s.current?`Installing ${s.current} · ${s.done}/${s.total}`:`${s.done}/${s.total} packages processed`;
  if(s.finished){$("status-pill").textContent=s.success?"COMPLETE":"COMPLETED WITH ERRORS";$("progress-title").textContent=s.success?"Setup complete":"Setup finished with errors";$("new-setup").classList.remove("hidden");return}
  setTimeout(poll,1000);
 }catch(e){addLog({time:new Date().toLocaleTimeString(),message:"Lost connection to local Termux bridge: "+e.message,kind:"error"});$("status-pill").textContent="DISCONNECTED"}
}
$("search").addEventListener("input",render);
$("select-all").onclick=()=>{groups.flatMap(g=>g[1]).forEach(k=>selected.add(k));render()};
$("clear").onclick=()=>{selected.clear();render()};
$("review").onclick=review;
$("back").onclick=()=>show("select-screen");
$("confirm").onchange=()=>{$("setup").disabled=!$("confirm").checked};
$("setup").onclick=start;
$("new-setup").onclick=()=>{lastLogs=0;show("select-screen");render()};
fetch("/api/catalog").then(r=>r.json()).then(d=>{labels=d.labels||{};render()}).catch(()=>{$("groups").textContent="Could not load local package catalog."});
