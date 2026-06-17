/* ===========================================================
   PROJETO ENTERRADA — lógica do app
   =========================================================== */
"use strict";

const STORE_KEY = "projeto_enterrada_v1";       // dados do usuário (checks/cerveja)
const PLAN_KEY  = "projeto_enterrada_plan_v1";  // conteúdo dieta+treino (editável por pessoa)
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
let MEALS, MENU, WEEK, WORKOUTS, PHASES, CICLO_INICIO;
syncPlanRefs();

function loadPlan(){
  try{
    const raw = localStorage.getItem(PLAN_KEY);
    if(raw){
      const p = JSON.parse(raw);
      if(isValidPlan(p)) return p;
    }
  }catch(e){ /* cai no seed abaixo */ }
  return seedPlan();
}
// valida o mínimo pra não quebrar o render se o JSON salvo estiver corrompido/antigo
function isValidPlan(p){
  return p && Array.isArray(p.meals) && Array.isArray(p.menu)
           && Array.isArray(p.week) && Array.isArray(p.workouts)
           && Array.isArray(p.phases) && typeof p.cicloInicio === "string";
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
  PHASES = plan.phases;
  CICLO_INICIO = keyToDate(plan.cicloInicio);
}
// restaura o plano padrão (descarta edições do plano; NÃO mexe nos checks)
function restorePlan(){
  plan = seedPlan();
  syncPlanRefs();
}

/* ---------- estado do usuário (checks/cerveja) ---------- */
let state = load();
let viewYear, viewMonth;       // mês exibido na tabela
let activePhase = 0;           // fase exibida nos treinos
let selectedKey = todayKey();  // dia sendo editado no painel do topo (padrão: hoje)

function load(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : { days:{}, beer:{} };
  }catch(e){
    return { days:{}, beer:{} };
  }
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

/* ---------- fase atual pelo nº de semanas desde o início ---------- */
function currentWeek(){
  const now = new Date();
  const diffDays = Math.floor((now - CICLO_INICIO) / 86400000);
  return Math.max(1, Math.floor(diffDays/7) + 1);
}
function phaseOfWeek(w){ if(w<=4) return 0; if(w<=10) return 1; return 2; }

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
      ? "Treino: " + wk.treino + ". Marque as refeições cumpridas " + quando + "."
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
      row += `<td><span class="cell-check ${on?'on':''}" data-key="${key}" data-meal="${m.key}">${on?'✓':'·'}</span></td>`;
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
function renderPhaseBanner(){
  const w = currentWeek();
  const p = phaseOfWeek(w);
  const ph = PHASES[p];
  document.getElementById("phaseBanner").innerHTML =
    `<div class="pb-top"><h3>${ph.nome}</h3><span class="pb-week">semana ${w} do ciclo · ${ph.semanas}</span></div>
     <p>${ph.desc}</p>`;
}

function renderWeek(){
  const grid = document.getElementById("weekGrid");
  const todayDow = new Date().getDay();
  // ordem seg→dom
  const order = [1,2,3,4,5,6,0];
  grid.innerHTML = "";
  order.forEach(dow=>{
    const w = WEEK.find(x=>x.dow===dow);
    const isToday = dow===todayDow;
    const el = document.createElement("div");
    el.className = `wd tag-${w.tag} ${isToday?'today':''}`;
    const tagTxt = w.tag==="off" ? "Descanso" : w.tag;
    el.innerHTML =
      `<span class="wd-day">${w.dia.slice(0,3)}</span>
       <span class="wd-tag">${tagTxt}</span>
       <span class="wd-name">${w.tag==="off" ? "" : w.treino.split("—")[1].trim()}</span>`;
    grid.appendChild(el);
  });
}

function renderWorkouts(){
  const wrap = document.getElementById("workouts");
  wrap.innerHTML = "";
  WORKOUTS.forEach(wo=>{
    const rows = wo.ex.map(e=>{
      const set = e[1+activePhase];
      const skip = set==="—";
      return `<tr>
        <td><span class="ex-name">${e[0]}</span></td>
        <td><span class="ex-set ${skip?'skip':''}">${set}</span></td>
        <td class="ex-grp">${e[4]}</td>
        <td class="ex-obs obs-cell">${e[5]}</td>
      </tr>`;
    }).join("");
    const card = document.createElement("div");
    card.className = "workout acc-"+wo.accent;
    card.innerHTML =
      `<div class="workout-head">
         <span class="wid">${wo.dia} · Treino ${wo.id}</span>
         <h4>${wo.titulo}</h4>
         <p>${wo.sub}</p>
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

function setupPhaseButtons(){
  const btns = document.querySelectorAll(".phase-btn");
  btns.forEach(b=>{
    b.addEventListener("click", ()=>{
      activePhase = parseInt(b.dataset.phase);
      btns.forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      renderWorkouts();
    });
  });
  // começa na fase atual do ciclo
  activePhase = phaseOfWeek(currentWeek());
  btns[activePhase].classList.add("active");
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
    renderPhaseBanner(); renderWeek(); renderWorkouts();
  }
});

/* ===========================================================
   INIT
   =========================================================== */
(function init(){
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();

  renderDay();
  renderMenu();
  renderMonth();
  renderLegend();

  renderPhaseBanner();
  renderWeek();
  setupPhaseButtons();
  renderWorkouts();
})();
