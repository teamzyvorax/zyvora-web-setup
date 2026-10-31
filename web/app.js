const token=document.querySelector('meta[name="zyvora-token"]').content;
const groups=[
 ["ESSENTIALS",["git","python","nodejs","curl","ruby","php","zip","nano","wget","vim","unzip"]],
 ["LANGUAGES & BUILD",["cpp","golang","build-tools","rust","java","cmake"]],
 ["WEB & DATABASE",["apache","php-server","sqlite","node-server","nginx"]],
 ["NETWORKING & SECURITY",["openssh","dns-tools","tailscale","netcat","openssl"]],
 ["TERMINAL EXPERIENCE",["figlet","fastfetch","tmux","htop","toilet","zsh"]]
];
const defaults=["git","python","nodejs","curl","ruby","php","zip","nano","wget","vim","unzip","cpp","golang","build-tools","rust","java","cmake","apache","php-server","sqlite","node-server","nginx","openssh","dns-tools","tailscale","netcat","openssl","figlet","fastfetch","tmux","htop","toilet","zsh"];
let selected=new Set(defaults),labels={},autoUpdate=false,updateRepo=false,bridgeOnline=false;
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
function setBridge(online,detail=""){
 bridgeOnline=online;
 const el=$("bridge-status");
 if(el){el.textContent=online?"● TERMUX BRIDGE ONLINE":"● TERMUX BRIDGE OFFLINE";el.className="bridge-status "+(online?"online":"offline");el.title=detail||""}
 if(!online){$("review").disabled=true;$("selection-note").textContent="Start zyvora-web in Termux to enable real setup."}else updateCount();
}
async function checkBridge(){
 try{const r=await fetch("/api/health",{cache:"no-store"});const d=await r.json();setBridge(r.ok&&d.bridge==="online"&&d.pkg_exists, d.pkg||"");return r.ok}
 catch(e){setBridge(false,e.message);return false}
}
function review(){if(!bridgeOnline){checkBridge();return}const names=[...selected].map(k=>labels[k]||k);if(autoUpdate)names.unshift("AUTO UPDATE TERMUX: pkg update + pkg upgrade -y");if(updateRepo)names.unshift("UPDATE ZYVORA REPO: git pull --ff-only");$("review-list").innerHTML=names.map(n=>`<span class="tag">${escapeHtml(n)}</span>`).join("");$("confirm").checked=false;$("setup").disabled=true;show("review-screen")}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function start(){
 if(!bridgeOnline){addLog({time:new Date().toLocaleTimeString(),message:"REAL Termux bridge is offline. Start `zyvora-web` in Termux first.",kind:"error"});return}
 $("setup").disabled=true;show("progress-screen");$("logs").innerHTML="";$("progress-title").textContent="Running real Termux commands";lastLogs=0;
 try{
  const res=await fetch("/api/setup",{method:"POST",headers:{"Content-Type":"application/json","X-Zyvora-Token":token},body:JSON.stringify({packages:[...selected],auto_update:autoUpdate,update_repo:updateRepo,confirmed:true})});
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
  $("progress-label").textContent=s.current?`Running ${s.current} · ${s.done}/${s.total}`:`${s.done}/${s.total} packages processed`;
  if(s.finished){$("status-pill").textContent=s.success?"REAL COMPLETE":"ERRORS — CHECK LOGS";$("progress-title").textContent=s.success?"Real Termux setup complete":"Termux setup finished with errors";$("new-setup").classList.remove("hidden");return}
  setTimeout(poll,700);
 }catch(e){addLog({time:new Date().toLocaleTimeString(),message:"Lost connection to local Termux bridge: "+e.message,kind:"error"});$("status-pill").textContent="BRIDGE LOST"}
}
$("search").addEventListener("input",render);
$("update-repo").addEventListener("change",e=>{updateRepo=e.target.checked});
$("auto-update").addEventListener("change",e=>{autoUpdate=e.target.checked});
$("select-all").onclick=()=>{groups.flatMap(g=>g[1]).forEach(k=>selected.add(k));render()};
$("clear").onclick=()=>{selected.clear();render()};
$("review").onclick=review;
$("back").onclick=()=>show("select-screen");
$("confirm").onchange=()=>{$("setup").disabled=!$("confirm").checked};
$("setup").onclick=start;
$("new-setup").onclick=()=>{lastLogs=0;show("select-screen");render();checkBridge()};
fetch("/api/catalog").then(r=>r.json()).then(d=>{labels=d.labels||{};render()}).catch(()=>{$("groups").textContent="Could not load local package catalog."});
checkBridge();
setInterval(checkBridge,5000);
