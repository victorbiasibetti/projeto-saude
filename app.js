/* ===========================================================
   PROJETO ENTERRADA — lógica do app
   =========================================================== */
"use strict";

const STORE_KEY = "projeto_enterrada_v1";       // dados do usuário (checks/cerveja)
const PLAN_KEY  = "projeto_enterrada_plan_v1";  // conteúdo dieta+treino (editável por pessoa)
const USER_KEY  = "projeto_enterrada_user_v1";  // perfil (nome, projeto, medidas, BMR/TDEE)
const WD = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MES_NOME = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho",
                  "Agosto","Setembro","Outubro","Novembro","Dezembro"];

/* ---------- PLANO (dieta + treino) — vem do localStorage ----------
   Na 1ª carga copia o DEFAULT_PLAN (data.js) pro localStorage e passa
   a ler de lá. Cada navegador tem o próprio plano, editável. Próximo
   passo: UI de edição — basta mexer em `plan` e chamar savePlan(). */
let plan = loadPlan();

// Espelhos das seções do plano (mantêm os nomes que o resto do código já usa).
// São derivados de `plan`; se o plano mudar, chame syncPlanRefs() + re-render.
let MEALS, MENU, WEEK, WORKOUTS;
syncPlanRefs();

function loadPlan(){
  try{
    const raw = localStorage.getItem(PLAN_KEY);
    if(raw){
      let p = JSON.parse(raw);
      p = migratePlan(p);          // v1 (treino com fases) → v2 (divisão semanal)
      if(isValidPlan(p)) return p;
    }
  }catch(e){ /* cai no seed abaixo */ }
  return seedPlan();
}
// valida o mínimo pra não quebrar o render se o JSON salvo estiver corrompido/antigo
function isValidPlan(p){
  return p && p.version === 2
           && Array.isArray(p.meals) && Array.isArray(p.menu)
           && Array.isArray(p.week) && Array.isArray(p.workouts);
}
// migra plano antigo (v1: treino em 3 fases) pro v2 (sem fases). Preserva a DIETA
// (menu/meals); só o treino é reescrito pro novo default. Idempotente.
function migratePlan(p){
  if(!p || p.version === 2) return p;
  p.version = 2;
  p.workouts = JSON.parse(JSON.stringify(DEFAULT_PLAN.workouts));
  p.week = JSON.parse(JSON.stringify(DEFAULT_PLAN.week));
  delete p.phases;
  delete p.cicloInicio;
  try{ localStorage.setItem(PLAN_KEY, JSON.stringify(p)); }catch(e){}
  return p;
}
// copia (deep clone) o template pro localStorage e devolve
function seedPlan(){
  const p = JSON.parse(JSON.stringify(DEFAULT_PLAN));
  try{ localStorage.setItem(PLAN_KEY, JSON.stringify(p)); }catch(e){}
  return p;
}
function savePlan(){
  try{ localStorage.setItem(PLAN_KEY, JSON.stringify(plan)); }
  catch(e){ /* modo restrito: segue em memória */ }
}
// re-aponta os espelhos pro plano atual (chamar após editar/restaurar o plano)
function syncPlanRefs(){
  MEALS = plan.meals;
  MENU = plan.menu;
  WEEK = plan.week;
  WORKOUTS = plan.workouts;
}
// restaura o plano padrão (descarta edições do plano; NÃO mexe nos checks)
function restorePlan(){
  plan = seedPlan();
  syncPlanRefs();
}

/* ---------- PERFIL do usuário (nome, projeto, medidas) ----------
   null = ninguém configurou ainda → onboarding.js dispara o fluxo. */
let user = loadUser();

function loadUser(){
  try{
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function saveUser(){
  try{ localStorage.setItem(USER_KEY, JSON.stringify(user)); }
  catch(e){ /* modo restrito: segue em memória */ }
}
// personaliza o cabeçalho (e a meta de kcal) com os dados do perfil
function applyUser(){
  if(!user) return;
  const h1 = document.querySelector(".brand-text h1");
  const p  = document.querySelector(".brand-text p");
  if(h1 && user.project) h1.textContent = user.project;
  if(p){
    const bits = [];
    if(user.name) bits.push(user.name);
    if(user.height) bits.push(user.height + " cm");
    if(user.weight) bits.push(user.weight + " kg");
    if(user.tdee) bits.push("~" + user.tdee + " kcal/dia");
    p.textContent = bits.join(" · ");
  }
  const tag = document.getElementById("dietKcalTag");
  if(tag && user.targetKcal){
    tag.textContent = "meta ~" + user.targetKcal + " kcal/dia"
                    + (user.macros ? " · " + user.macros : "");
  }
}
// re-render de tudo que depende de plano/estado (após import/onboarding)
function refreshAll(){
  syncPlanRefs();
  applyUser();
  renderDay(); renderMenu(); renderMonth(); renderLegend();
  renderWeek(); renderWorkouts();
}

/* ---------- estado do usuário (checks/cerveja) ---------- */
let state = load();
let viewYear, viewMonth;       // mês exibido na tabela
let selectedKey = todayKey();  // dia sendo editado no painel do topo (padrão: hoje)

function load(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    return normalizeState(raw ? JSON.parse(raw) : null);
  }catch(e){
    return { days:{}, beer:{} };
  }
}
// garante a forma { days:{}, beer:{} } mesmo se vier JSON válido com shape errado
// (ex.: arquivo importado/editado à mão) — senão o render quebra em state.days[...]
function normalizeState(s){
  if(!s || typeof s !== "object") return { days:{}, beer:{} };
  if(!s.days || typeof s.days !== "object") s.days = {};
  if(!s.beer || typeof s.beer !== "object") s.beer = {};
  return s;
}
function save(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch(e){ /* modo restrito: segue em memória */ }
}

/* ---------- helpers de data ---------- */
function ymd(d){
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function todayKey(){ return ymd(new Date()); }
function keyToDate(key){
  const [y,m,d] = key.split("-").map(Number);
  return new Date(y, m-1, d);
}
function dayRec(key){
  if(!state.days[key]) state.days[key] = {};
  return state.days[key];
}

/* ===========================================================
   TABS
   =========================================================== */
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-"+btn.dataset.tab).classList.add("active");
  });
});

/* ===========================================================
   HERO + CHECKS DO DIA SELECIONADO
   =========================================================== */
function renderDay(){
  const date = keyToDate(selectedKey);
  const key = selectedKey;
  const rec = dayRec(key);
  const isToday = (key === todayKey());

  // pill do topo (sempre mostra o dia de HOJE, pra referência)
  const now = new Date();
  document.getElementById("todayPill").textContent =
    "Hoje · " + WD[now.getDay()] + " " + now.getDate() + " " + MES_NOME[now.getMonth()].slice(0,3);

  // eyebrow + título do painel = dia SELECIONADO
  const eb = document.getElementById("heroEyebrow");
  eb.textContent = isToday ? "Hoje" : "Editando";
  eb.style.color = isToday ? "var(--lime)" : "var(--orange)";
  document.getElementById("heroDate").textContent =
    WD[date.getDay()] + ", " + date.getDate() + " de " + MES_NOME[date.getMonth()];

  // botão voltar pra hoje (só aparece quando NÃO é hoje)
  document.getElementById("backToToday").style.display = isToday ? "none" : "inline-flex";

  // treino do dia
  const wk = WEEK.find(w=>w.dow===date.getDay());
  const quando = isToday ? "hoje" : "neste dia";
  document.getElementById("heroSub").textContent =
    wk && wk.tag!=="off"
      ? "Treino " + wk.tag + (wk.nome ? " · " + wk.nome : "") + ". Marque as refeições cumpridas " + quando + "."
      : "Dia de descanso. Marque as refeições cumpridas " + quando + ".";

  // checks
  const wrap = document.getElementById("todayChecks");
  wrap.innerHTML = "";
  MEALS.forEach(m=>{
    const done = !!rec[m.key];
    const el = document.createElement("div");
    el.className = "check" + (done?" done":"");
    el.innerHTML =
      `<span class="box"></span>
       <span class="ic">${m.icon}</span>
       <span class="meta"><b>${m.label}</b>${m.kcal?`<small>${m.kcal}</small>`:""}</span>`;
    el.addEventListener("click", ()=>{
      rec[m.key] = !rec[m.key];
      save(); renderDay(); renderMonth(); // reflete na tabela
    });
    wrap.appendChild(el);
  });

  // cerveja do dia selecionado
  document.getElementById("beerInput").value = state.beer[key] || "";

  // anel de progresso
  const total = MEALS.length;
  const got = MEALS.filter(m=>rec[m.key]).length;
  const pct = Math.round(got/total*100);
  const circ = 2*Math.PI*52;
  document.getElementById("ringFg").style.strokeDashoffset = circ*(1-got/total);
  document.getElementById("dayPct").textContent = pct+"%";

  // anel de kcal ingeridas = soma das kcal das refeições marcadas
  const kcalGot = MEALS.filter(m=>rec[m.key]).reduce((s,m)=> s + mealKcal(m.kcal), 0);
  // denominador do anel: meta do perfil, senão o total de kcal do cardápio do dia
  const kcalTotal = MEALS.reduce((s,m)=> s + mealKcal(m.kcal), 0);
  const denom = (user && user.targetKcal) ? user.targetKcal : (kcalTotal || 1);
  const frac = Math.min(1, kcalGot/denom);
  document.getElementById("kcalRingFg").style.strokeDashoffset = circ*(1-frac);
  document.getElementById("dayKcal").textContent = kcalGot.toLocaleString("pt-BR");
  // total de referência logo abaixo (meta ou total do cardápio do dia)
  document.getElementById("dayKcalSub").textContent = "/ " + denom.toLocaleString("pt-BR");
}

// extrai o número de kcal de uma string tipo "~1.080 kcal" ou "1,080 kcal" → 1080.
// Aceita ponto OU vírgula como separador de milhar (a IA pode usar qualquer um). 0 se não houver.
function mealKcal(k){
  if(!k) return 0;
  const m = String(k).match(/[\d.,]+/);
  return m ? (parseInt(m[0].replace(/[.,]/g,""), 10) || 0) : 0;
}

// selecionar um dia (clicando na tabela) e trazer pro topo
function selectDay(key){
  selectedKey = key;
  renderDay();
  renderMonth(); // re-render pra marcar a linha selecionada
  // rola suave até o painel do topo
  const hero = document.querySelector(".day-hero");
  if(hero && hero.scrollIntoView) hero.scrollIntoView({ behavior:"smooth", block:"start" });
}

document.getElementById("beerInput").addEventListener("input", e=>{
  const key = selectedKey;
  const v = parseFloat(e.target.value);
  if(isNaN(v) || v<=0) delete state.beer[key];
  else state.beer[key] = v;
  save(); renderMonth();
});

document.getElementById("backToToday").addEventListener("click", ()=>{
  // se hoje está em outro mês da tabela, ajusta a visão também
  const now = new Date();
  viewYear = now.getFullYear(); viewMonth = now.getMonth();
  selectDay(todayKey());
});

/* ===========================================================
   CARDÁPIO
   =========================================================== */
function renderMenu(){
  const grid = document.getElementById("menuGrid");
  grid.innerHTML = "";
  MENU.forEach(c=>{
    const card = document.createElement("div");
    card.className = "menu-card acc-"+c.accent;
    card.innerHTML =
      `<h4>${c.icon} ${c.title}</h4>
       ${c.kcal?`<span class="kc">${c.kcal}</span>`:""}
       <ul>${c.items.map(i=>`<li>${i}</li>`).join("")}</ul>`;
    grid.appendChild(card);
  });
}

/* ===========================================================
   TABELA DO MÊS
   =========================================================== */
function renderMonth(){
  const table = document.getElementById("monthTable");
  const tkey = todayKey();
  document.getElementById("monthLabel").textContent = MES_NOME[viewMonth]+" "+viewYear;

  const cols = MEALS; // mesmas colunas dos checks
  let head = `<thead><tr><th class="daycol">Dia</th>`;
  cols.forEach(m=> head += `<th>${m.icon}</th>`);
  head += `<th>🍺 L</th><th>%</th></tr></thead>`;

  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  let body = "<tbody>";
  const totals = {}; cols.forEach(m=>totals[m.key]=0);
  let beerTotal = 0;

  for(let d=1; d<=daysInMonth; d++){
    const date = new Date(viewYear, viewMonth, d);
    const key = ymd(date);
    const rec = state.days[key] || {};
    const dow = date.getDay();
    const isWeekend = (dow===0||dow===6);
    const isToday = (key===tkey);
    const isSel = (key===selectedKey);

    let row = `<tr class="${isWeekend?'weekend':''} ${isToday?'today':''} ${isSel?'selected':''}">`;
    row += `<td class="daycol" data-selkey="${key}" title="Editar este dia no topo">`
         + `<span class="dnum">${d}</span><span class="dwd">${WD[dow]}</span>`
         + `<span class="edit-cue">editar ›</span></td>`;

    cols.forEach(m=>{
      const on = !!rec[m.key];
      if(on) totals[m.key]++;
      row += `<td><span class="cell-check ${on?'on':''}" data-key="${key}" data-meal="${m.key}">${on?'✓':'○'}</span></td>`;
    });

    const beer = state.beer[key] || "";
    if(beer) beerTotal += parseFloat(beer);
    row += `<td class="beer-cell"><input type="number" min="0" step="0.5" value="${beer}" data-beerkey="${key}"></td>`;

    const got = cols.filter(m=>rec[m.key]).length;
    const pct = Math.round(got/cols.length*100);
    const col = pct===100 ? "var(--lime)" : pct>=50 ? "var(--txt)" : "var(--txt-faint)";
    row += `<td class="pct-cell" style="color:${col}">${pct}%</td>`;
    row += `</tr>`;
    body += row;
  }

  // totais
  let tot = `<tr class="totals"><td class="daycol">TOTAL</td>`;
  cols.forEach(m=> tot += `<td>${totals[m.key]}</td>`);
  tot += `<td>${beerTotal||0}</td><td>—</td></tr>`;
  body += tot + "</tbody>";

  table.innerHTML = head + body;

  // clicar na coluna "Dia" => seleciona o dia e leva pro topo
  table.querySelectorAll("[data-selkey]").forEach(td=>{
    td.addEventListener("click", ()=> selectDay(td.dataset.selkey));
  });

  // listeners das células de check (marca direto na tabela)
  table.querySelectorAll(".cell-check").forEach(c=>{
    c.addEventListener("click", ()=>{
      const rec = dayRec(c.dataset.key);
      rec[c.dataset.meal] = !rec[c.dataset.meal];
      save(); renderMonth();
      if(c.dataset.key===selectedKey) renderDay();
    });
  });
  // listeners da cerveja na tabela
  table.querySelectorAll("[data-beerkey]").forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const k = inp.dataset.beerkey;
      const v = parseFloat(inp.value);
      if(isNaN(v)||v<=0) delete state.beer[k]; else state.beer[k]=v;
      save();
      if(k===selectedKey){ document.getElementById("beerInput").value = state.beer[k]||""; }
    });
  });
}

document.getElementById("prevMonth").addEventListener("click", ()=>{
  viewMonth--; if(viewMonth<0){viewMonth=11; viewYear--;} renderMonth();
});
document.getElementById("nextMonth").addEventListener("click", ()=>{
  viewMonth++; if(viewMonth>11){viewMonth=0; viewYear++;} renderMonth();
});

function renderLegend(){
  document.getElementById("dietLegend").innerHTML =
    `<b>Como usar:</b> clique em <b>“editar ›”</b> na coluna Dia pra trazer aquele dia pro topo
     e marcar tudo como se fosse hoje — ou clique direto no ✓ de cada refeição aqui na tabela.
     A coluna 🍺 é em litros (escreva o número no dia que beber — meta: máx ~2 L, 1 dia só no fim de semana).
     A coluna % mostra quanto do dia você fechou. Hoje fica em verde; o dia em edição fica realçado.
     <b>Dia 100%</b> = café + almoço + lanche + janta + creatina + treino.`;
}

/* ===========================================================
   TREINO
   =========================================================== */
let weekSelDow = null; // dia selecionado no modo toque (pra remanejar treino)

function renderWeek(){
  const grid = document.getElementById("weekGrid");
  const todayDow = new Date().getDay();
  // ordem seg→dom
  const order = [1,2,3,4,5,6,0];
  grid.innerHTML = "";
  order.forEach(dow=>{
    const w = WEEK.find(x=>x.dow===dow);
    if(!w) return;
    const isToday = dow===todayDow;
    const isTreino = w.tag!=="off";
    const el = document.createElement("div");
    el.className = `wd tag-${w.tag} ${isToday?'today':''} ${weekSelDow===dow?'sel':''}`;
    el.dataset.dow = dow;
    if(isTreino) el.setAttribute("draggable", "true");
    const tagTxt = w.tag==="off" ? "Descanso" : w.tag;
    el.innerHTML =
      `<span class="wd-day">${w.dia.slice(0,3)}</span>
       <span class="wd-tag">${tagTxt}</span>
       <span class="wd-name">${w.tag==="off" ? "" : (w.nome || "")}</span>`;

    // drag-and-drop (desktop)
    if(isTreino){
      el.addEventListener("dragstart", e=>{
        e.dataTransfer.setData("text/plain", String(dow));
        e.dataTransfer.effectAllowed = "move";
      });
    }
    el.addEventListener("dragover", e=>{ e.preventDefault(); el.classList.add("drop-hover"); });
    el.addEventListener("dragleave", ()=> el.classList.remove("drop-hover"));
    el.addEventListener("drop", e=>{
      e.preventDefault(); el.classList.remove("drop-hover");
      const src = parseInt(e.dataTransfer.getData("text/plain"));
      if(!isNaN(src)) weekReassign(src, dow);
    });
    // toque/clique (funciona em mobile e desktop)
    el.addEventListener("click", ()=> weekTap(dow));

    grid.appendChild(el);
  });
}

// modo toque: 1º toque seleciona o treino, 2º toque no destino move/troca
function weekTap(dow){
  const w = WEEK.find(x=>x.dow===dow);
  if(!w) return;
  if(weekSelDow === null){
    if(w.tag === "off") return;   // nada pra mover num dia de descanso
    weekSelDow = dow;
    renderWeek();
  } else if(weekSelDow === dow){
    weekSelDow = null;            // toca de novo = desmarca
    renderWeek();
  } else {
    weekReassign(weekSelDow, dow); // weekReassign limpa a seleção e re-renderiza
  }
}

// remaneja: destino vazio = move; destino ocupado = troca. Persiste.
function weekReassign(src, dst){
  weekSelDow = null;
  if(src === dst){ renderWeek(); return; }
  const a = WEEK.find(x=>x.dow===src), b = WEEK.find(x=>x.dow===dst);
  if(!a || !b || a.tag === "off"){ renderWeek(); return; }
  if(b.tag === "off"){
    b.tag = a.tag; b.nome = a.nome;
    a.tag = "off"; a.nome = "";
  } else {
    const t = a.tag, n = a.nome;
    a.tag = b.tag; a.nome = b.nome;
    b.tag = t;     b.nome = n;
  }
  savePlan();
  renderWeek();
  renderDay();   // o treino de HOJE pode ter mudado → atualiza o subtítulo
}

function renderWorkouts(){
  const wrap = document.getElementById("workouts");
  wrap.innerHTML = "";
  WORKOUTS.forEach(wo=>{
    const rows = wo.ex.map(e=>{
      return `<tr>
        <td><span class="ex-name">${e.nome}</span></td>
        <td><span class="ex-set">${e.set}</span></td>
        <td class="ex-grp">${e.grupo || ""}</td>
        <td class="ex-obs obs-cell">${e.obs || ""}</td>
      </tr>`;
    }).join("");
    const card = document.createElement("div");
    card.className = "workout acc-"+wo.accent;
    card.innerHTML =
      `<div class="workout-head">
         <span class="wid">Treino ${wo.id}</span>
         <h4>${wo.titulo}</h4>
         ${wo.sub ? `<p>${wo.sub}</p>` : ""}
       </div>
       <table class="ex-table">
         <thead><tr>
           <th>Exercício</th><th>Séries × Reps</th><th>Grupo</th><th class="col-obs">Obs / Técnica</th>
         </tr></thead>
         <tbody>${rows}</tbody>
       </table>`;
    wrap.appendChild(card);
  });
}

/* ===========================================================
   RESET
   =========================================================== */
document.getElementById("resetBtn").addEventListener("click", ()=>{
  if(confirm("Apagar todos os checks e registros de cerveja? Isso não dá pra desfazer.")){
    state = { days:{}, beer:{} };
    selectedKey = todayKey();
    save(); renderDay(); renderMonth();
  }
});

// restaura o conteúdo de dieta/treino pro template padrão (não toca nos checks)
document.getElementById("restorePlanBtn").addEventListener("click", ()=>{
  if(confirm("Restaurar dieta e treino para o plano padrão? Suas edições do plano serão perdidas (seus checks e cervejas continuam).")){
    restorePlan();
    // re-render de tudo que depende do plano
    renderDay(); renderMenu(); renderMonth();
    renderWeek(); renderWorkouts();
  }
});

/* ===========================================================
   INIT
   =========================================================== */
(function init(){
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();

  applyUser();
  renderDay();
  renderMenu();
  renderMonth();
  renderLegend();

  renderWeek();
  renderWorkouts();
})();
