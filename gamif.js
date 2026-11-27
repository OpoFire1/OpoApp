/* Gamificación Fase 1: XP, rangos, racha diaria, objetivo diario y resumen de sesión.
   Se engancha a check(), fCheck(), xfinish(), send(), enter() y view() sin reescribirlas. */
(()=>{
const RANKS=[["Opositor Novato",0],["Opositor Medio",1800],["Opositor Avanzado",4500],["Bombero",9000],["Bombero Conductor",13500],["Bombero Zapador",19000],["Cabo",25000],["Sargento",32000],["Suboficial",40000],["Inspector",50000]];
const G={xp:0,streak:0,best:0,freezes:0,goal:20,q:0,ok:0,txp:0,done:false,ready:false};
const SS={xp:0,q:0,ok:0};
const gDay=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const rank=x=>{let i=0;RANKS.forEach((r,k)=>{if(x>=r[1])i=k});const n=RANKS[i+1];return{i,name:RANKS[i][0],lo:RANKS[i][1],hi:n?n[1]:null,next:n?n[0]:null}};

const st=document.createElement("style");
st.textContent=`
#gbar{display:flex;align-items:center;gap:10px;margin:0 0 12px;padding:8px 12px;border-radius:13px;background:var(--card);border:1px solid var(--line);font-size:13px;font-weight:700;box-shadow:var(--shadow)}
#gbar .gx{flex:1;height:8px;border-radius:4px;background:var(--line);overflow:hidden}
#gbar .gx i{display:block;height:100%;background:var(--acc);transition:width .4s}
#gbar .gr{white-space:nowrap}
#gcard{display:flex;gap:16px;align-items:center;margin-bottom:12px}
#gcard .ring{flex:none;position:relative;width:84px;height:84px}
#gcard .ring b{position:absolute;inset:0;display:grid;place-items:center;font-size:17px}
#gcard .gi{flex:1;min-width:0;font-size:14px}
#gcard .gi .t{font-size:18px;font-weight:800}
#gcard .gs{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#gtoast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);opacity:0;pointer-events:none;z-index:3000;padding:10px 16px;border-radius:999px;background:var(--ink);color:var(--bg);font-weight:800;transition:.25s;max-width:92vw;text-align:center}
#gtoast.on{opacity:1;transform:translate(-50%,0)}
#gsum{position:fixed;inset:0;z-index:3500;background:rgba(0,0,0,.55);display:grid;place-items:center;padding:16px}
#gsum .card{max-width:360px;width:100%;text-align:center;margin:0}
#gsum .big{font-size:42px;font-weight:800;color:var(--acc)}
`;
document.head.appendChild(st);

const bar=document.createElement("div");bar.id="gbar";
$("backrow").before(bar);
const card=document.createElement("div");card.className="card";card.id="gcard";
$("menu").prepend(card);
const tt=document.createElement("div");tt.id="gtoast";document.body.appendChild(tt);

let tmr=null;
function toast(m,long){tt.textContent=m;tt.classList.add("on");clearTimeout(tmr);tmr=setTimeout(()=>tt.classList.remove("on"),long?3200:1100)}

function render(){
 const r=rank(G.xp),pct=r.hi?Math.min(100,Math.round((G.xp-r.lo)/(r.hi-r.lo)*100)):100;
 bar.innerHTML='<span title="Racha diaria">🔥 '+G.streak+'</span><span class="gr">'+esc(r.name)+'</span><div class="gx"><i style="width:'+pct+'%"></i></div><span title="Objetivo diario">'+Math.min(G.q,G.goal)+'/'+G.goal+'</span>';
 const gp=Math.min(1,G.q/G.goal),C=2*Math.PI*34,acc=G.q?Math.round(100*G.ok/G.q):0;
 card.innerHTML='<div class="ring"><svg width="84" height="84" viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" fill="none" stroke="var(--line)" stroke-width="8"/><circle cx="42" cy="42" r="34" fill="none" stroke="'+(G.done?"var(--ok)":"var(--acc)")+'" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+(C*(1-gp)).toFixed(1)+'" transform="rotate(-90 42 42)"/></svg><b>'+(G.done?"✓":Math.min(G.q,G.goal)+"/"+G.goal)+'</b></div>'+
 '<div class="gi"><div class="kicker">'+(G.done?"Objetivo cumplido":"Objetivo de hoy")+'</div><div class="t">🔥 '+G.streak+(G.streak===1?" día":" días")+' de racha</div>'+
 '<div class="mut">'+esc(r.name)+' · '+G.xp+' XP'+(r.next?' · faltan '+(r.hi-G.xp)+' para '+esc(r.next):' · rango máximo')+'</div>'+
 '<div class="gs"><span class="chip">🧊 '+G.freezes+'</span><span class="chip">🏆 mejor '+G.best+'</span><span class="chip">Hoy '+acc+'% · +'+G.txp+' XP</span>'+
 '<select id="ggoal" aria-label="Objetivo diario">'+[10,20,30,50,100].map(n=>'<option value="'+n+'"'+(n===G.goal?" selected":"")+'>'+n+' preguntas/día</option>').join("")+'</select></div></div>';
 $("ggoal").onchange=async e=>{const n=+e.target.value;G.goal=n;G.done=G.q>=n;render();try{await sb.rpc("gamif_set_goal",{p_goal:n})}catch(_){}};
}
function apply(s){Object.assign(G,s,{ready:true});render()}

async function gLoad(){
 const {data,error}=await sb.rpc("gamif_get",{p_day:gDay()});
 if(!error&&data&&!queue.some(j=>j.t==="gam"))apply(data);
 else if(error)bar.title="Gamificación: ejecuta gamificacion.sql en Supabase ("+error.message+")";
}

function award(q,ok,xp){
 const r0=rank(G.xp).i;
 G.xp+=xp;G.q+=q;G.ok+=ok;G.txp+=xp;SS.xp+=xp;SS.q+=q;SS.ok+=ok;
 enqueue({t:"gam",day:gDay(),q,ok,xp});
 let msg="+"+xp+" XP",long=false;
 if(!G.done&&G.q>=G.goal){G.done=true;G.xp+=50;G.txp+=50;SS.xp+=50;msg="🎯 ¡Objetivo diario cumplido! +50 XP";long=true}
 const r1=rank(G.xp);if(r1.i>r0){msg="🎖️ ¡Ascenso a "+r1.name+"!";long=true}
 toast(msg,long);render();
}

function summary(){
 const o=document.createElement("div");o.id="gsum";
 const acc=SS.q?Math.round(100*SS.ok/SS.q):0,r=rank(G.xp);
 o.innerHTML='<div class="card"><div class="kicker">Resumen de la sesión</div><div class="big">+'+SS.xp+' XP</div><p>'+SS.q+' preguntas · '+acc+'% de acierto</p><p class="mut">'+esc(r.name)+' · '+G.xp+' XP'+(r.next?' · faltan '+(r.hi-G.xp)+' para '+esc(r.next):'')+'<br>'+(G.done?"🎯 Objetivo de hoy cumplido · 🔥 "+G.streak:"Te faltan "+Math.max(0,G.goal-G.q)+" preguntas para tu objetivo de hoy")+'</p><button class="btn" type="button">Seguir</button></div>';
 o.querySelector("button").onclick=()=>o.remove();
 document.body.appendChild(o);SS.xp=SS.q=SS.ok=0;
}

/* Ganchos */
const _check=check;
check=function(skip){const r=cur&&S[cur[3]],was=!!(r&&r[1]>0),o0=sess.ok;_check(skip);const ok=sess.ok>o0;award(1,ok?1:0,ok?10+(was?5:0)+Math.min(sess.st,10):2)};
const _f=fCheck;
fCheck=function(skip){const a=FANSWERS,p=FPOINTS;_f(skip);if(FANSWERS>a){const s=FPOINTS-p;award(1,s>=10?1:0,Math.round(s*2)+(s>=10?5:0)+2)}};
const _x=xfinish;
xfinish=function(){const was=X&&X.done;_x();if(X&&X.done&&!was){const n=X.q.length,ok=X.q.filter(q=>q.r==="ok").length,ko=X.q.filter(q=>q.r==="ko").length;award(n,ok,ok*10+Math.round(xscore(ok,ko,n)*5)+20)}};
const _send=send;
send=async function(j){
 if(j.t!=="gam")return _send(j);
 const r=await sb.rpc("gamif_record",{p_day:j.day,p_q:j.q,p_ok:j.ok,p_xp:j.xp});
 if(r.error)throw r.error;
 if(queue.filter(x=>x.t==="gam").length<=1)apply(r.data);
};
const _v=view;
view=function(v){_v(v);if(v==="menu"&&SS.q>0)summary()};
const _e=enter;
enter=async function(s){await _e(s);if(s)gLoad()};

render();
if(typeof SESSION!=="undefined"&&SESSION)gLoad();
})();
