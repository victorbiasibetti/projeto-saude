/* ===========================================================
   PROJETO ENTERRADA — lógica do app
   =========================================================== */
"use strict";

const STORE_KEY = "projeto_saude_v1";       // dados do usuário (checks dos dias)
const PLAN_KEY  = "projeto_saude_plan_v1";  // conteúdo dieta+treino (editável por pessoa)
const USER_KEY  = "projeto_saude_user_v1";  // perfil (nome, projeto, medidas, BMR/TDEE)

// migração das chaves antigas (projeto_enterrada_*) → projeto_saude_*. Copia o valor
// pra chave nova quando ela ainda não existe e remove a antiga. Idempotente.
(function migrateStorageKeys(){
  const pairs = [
    ["projeto_enterrada_v1",       STORE_KEY],
    ["projeto_enterrada_plan_v1",  PLAN_KEY],
    ["projeto_enterrada_user_v1",  USER_KEY],
    ["projeto_enterrada_defer_v1", "projeto_saude_defer_v1"],
  ];
  try{
    pairs.forEach(([oldK,newK])=>{
      const v = localStorage.getItem(oldK);
      if(v === null) return;
      if(localStorage.getItem(newK) === null) localStorage.setItem(newK, v);
      localStorage.removeItem(oldK);
    });
  }catch(e){}
})();
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
  return p && p.version === 3
           && Array.isArray(p.meals) && Array.isArray(p.menu)
           && Array.isArray(p.week) && Array.isArray(p.workouts);
}
// migra plano antigo pro formato atual (v3). Idempotente. Preserva o que dá.
//   v1 (treino em 3 fases) → v2: reescreve só o treino, mantém a dieta.
//   v2 → v3: itens de refeição viram {id,text,kcal} e cada meal ganha seus items.
function migratePlan(p){
  if(!p) return p;
  let changed = false;
  if(p.version !== 2 && p.version !== 3){
    p.version = 2;
    p.workouts = JSON.parse(JSON.stringify(DEFAULT_PLAN.workouts));
    p.week = JSON.parse(JSON.stringify(DEFAULT_PLAN.week));
    delete p.phases;
    delete p.cicloInicio;
    changed = true;
  }
  if(p.version === 2){
    p.version = 3;
    migrateItemsV3(p);
    changed = true;
  }
  if(changed){ try{ localStorage.setItem(PLAN_KEY, JSON.stringify(p)); }catch(e){} }
  return p;
}
// v2→v3: itens string → {id,text,kcal:0}; meals herdam os itens do card de mesmo título.
function migrateItemsV3(p){
  (p.menu||[]).forEach(card=>{
    const base = planSlug(card.title) || "ref";
    card.items = (card.items||[]).map((it,i)=> normItem(it, base, i));
  });
  const byTitle = {};
  (p.menu||[]).forEach(c=> byTitle[planSlug(c.title)] = c.items);
  (p.meals||[]).forEach(m=>{
    if(Array.isArray(m.items)) return;           // já migrado (idempotente)
    const match = byTitle[planSlug(m.label)];
    m.items = match ? JSON.parse(JSON.stringify(match)) : [];
  });
}
// chave segura a partir de um texto (sem acento/espaço). Usada na migração e nos ids.
function planSlug(s){
  return String(s||"").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
}
// normaliza um item de refeição (string legada OU objeto) → {id,text,kcal}
function normItem(it, base, i){
  if(it && typeof it === "object")
    return { id: it.id || (base+"_"+i), text: String(it.text||""), kcal: Number(it.kcal)||0 };
  return { id: base+"_"+i, text: String(it), kcal: 0 };
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
  renderDay(); renderMonth(); renderLegend();
  renderWeek(); renderWorkouts();
}

/* ---------- estado do usuário (checks dos dias) ---------- */
let state = load();
let viewYear, viewMonth;       // mês exibido na tabela
let selectedKey = todayKey();  // dia sendo editado no painel do topo (padrão: hoje)

function load(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    return normalizeState(raw ? JSON.parse(raw) : null);
  }catch(e){
    return { days:{} };
  }
}
// garante a forma { days:{} } mesmo se vier JSON válido com shape errado
// (ex.: arquivo importado/editado à mão) — senão o render quebra em state.days[...]
function normalizeState(s){
  if(!s || typeof s !== "object") return { days:{} };
  if(!s.days || typeof s.days !== "object") s.days = {};
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

// escapa texto pra interpolar em innerHTML (itens vêm da IA / do usuário).
function escapeHtml(s){
  return String(s==null?"":s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

/* ---------- estado de uma refeição num dia (tolerante ao formato legado) ----------
   v3: state.days[data][mealKey] = { items:{id:true}, extra:[{id,text,kcal}], done:bool }.
   Legado: o valor era booleano. true → todos os itens marcados (ou, sem itens, feita).
   Sempre devolve o objeto normalizado (e o grava de volta em `rec`). */
function mealEntry(rec, meal){
  let e = rec[meal.key];
  const hasItems = meal.items && meal.items.length > 0;
  if(e === true){
    e = hasItems
      ? { items: Object.fromEntries(meal.items.map(it=>[it.id, true])), extra: [], done: true }
      : { items: {}, extra: [], done: true };
  } else if(!e || typeof e !== "object"){
    e = { items: {}, extra: [], done: false };
  } else {
    if(!e.items || typeof e.items !== "object") e.items = {};
    if(!Array.isArray(e.extra)) e.extra = [];
    if(typeof e.done !== "boolean") e.done = false;
  }
  rec[meal.key] = e;
  return e;
}

/* ---------- fonte ÚNICA de cálculo do dia (usada pelo painel e pela tabela) ----------
   % do dia = itens marcados / itens planejados (refeição sem itens = 1 unidade).
   Itens avulsos (extra) somam kcal mas NÃO entram no %  — são bônus, não aderência. */
function dayProgress(key){
  const rec = state.days[key] || {};
  let totalUnits = 0, gotUnits = 0, kcalGot = 0, kcalPlan = 0;
  const perMeal = {};
  MEALS.forEach(m=>{
    const e = mealEntry(rec, m);
    const items = m.items || [];
    if(items.length){
      const got = items.filter(it=> e.items[it.id]).length;
      totalUnits += items.length;
      gotUnits   += got;
      kcalGot    += items.reduce((s,it)=> s + (e.items[it.id] ? (Number(it.kcal)||0) : 0), 0);
      kcalPlan   += items.reduce((s,it)=> s + (Number(it.kcal)||0), 0);
      perMeal[m.key] = { got, total: items.length };
    } else {
      totalUnits += 1;
      gotUnits   += e.done ? 1 : 0;
      kcalGot    += e.done ? mealKcal(m.kcal) : 0;
      kcalPlan   += mealKcal(m.kcal);
      perMeal[m.key] = { got: e.done ? 1 : 0, total: 1 };
    }
    kcalGot += (e.extra||[]).reduce((s,x)=> s + (Number(x.kcal)||0), 0); // avulsos: só kcal
  });
  const pct = totalUnits ? Math.round(gotUnits/totalUnits*100) : 0;
  const kcalDenom = (user && user.targetKcal) ? user.targetKcal : (kcalPlan || 1);
  return { totalUnits, gotUnits, pct, kcalGot, kcalDenom, perMeal };
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

  // checks — refeições COM itens viram os cards do "Cardápio de referência";
  // refeições SEM itens (creatina, treino) ficam na seção de extras logo após o resumo.
  const wrap = document.getElementById("todayChecks");
  const extras = document.getElementById("dayExtras");
  wrap.innerHTML = ""; extras.innerHTML = "";
  MEALS.forEach(m=>{
    const target = (m.items && m.items.length) ? wrap : extras;
    target.appendChild(renderMealBlock(rec, m));
  });

  // anéis de progresso (% dos itens + kcal ingeridas), via fonte única
  const prog = dayProgress(key);
  const circ = 2*Math.PI*52;
  document.getElementById("ringFg").style.strokeDashoffset =
    circ * (1 - (prog.totalUnits ? prog.gotUnits/prog.totalUnits : 0));
  document.getElementById("dayPct").textContent = prog.pct + "%";

  const frac = Math.min(1, prog.kcalGot / prog.kcalDenom);
  document.getElementById("kcalRingFg").style.strokeDashoffset = circ*(1-frac);
  document.getElementById("dayKcal").textContent = prog.kcalGot.toLocaleString("pt-BR");
  document.getElementById("dayKcalSub").textContent = "/ " + prog.kcalDenom.toLocaleString("pt-BR");
}

// monta o bloco de uma refeição: cabeçalho + itens marcáveis + avulsos + "comi mais".
// Refeição sem itens (creatina, treino) = check único, como antes.
function renderMealBlock(rec, m){
  const e = mealEntry(rec, m);
  const items = m.items || [];
  const block = document.createElement("div");
  block.className = "meal-block";

  if(!items.length){
    const row = document.createElement("div");
    row.className = "check" + (e.done ? " done" : "");
    row.innerHTML =
      `<span class="box"></span>
       <span class="ic">${m.icon}</span>
       <span class="meta"><b>${escapeHtml(m.label)}</b>${m.kcal?`<small>${escapeHtml(m.kcal)}</small>`:""}</span>`;
    row.addEventListener("click", ()=>{ e.done = !e.done; save(); renderDay(); renderMonth(); });
    block.appendChild(row);
    return block;
  }

  const got = items.filter(it=> e.items[it.id]).length;
  const kc  = items.reduce((s,it)=> s + (e.items[it.id]?(Number(it.kcal)||0):0), 0);
  const allOn = got === items.length;

  const head = document.createElement("div");
  head.className = "meal-head" + (allOn ? " done" : got>0 ? " partial" : "");
  head.innerHTML =
    `<span class="ic">${m.icon}</span>
     <span class="meta"><b>${escapeHtml(m.label)}</b><small>${got}/${items.length} itens · ${kc} kcal</small></span>
     <span class="meal-toggle">${allOn ? "limpar" : "marcar tudo"}</span>`;
  head.querySelector(".meal-toggle").addEventListener("click", ()=>{
    items.forEach(it=> e.items[it.id] = !allOn);
    save(); renderDay(); renderMonth();
  });
  block.appendChild(head);

  items.forEach(it=>{
    const on = !!e.items[it.id];
    const row = document.createElement("div");
    row.className = "item-row" + (on ? " done" : "");
    row.innerHTML =
      `<span class="box"></span>
       <span class="item-text">${escapeHtml(it.text)}</span>
       <span class="item-kcal" title="Clique p/ editar a kcal">${Number(it.kcal)||0} kcal</span>`;
    row.addEventListener("click", ()=>{ e.items[it.id] = !e.items[it.id]; save(); renderDay(); renderMonth(); });
    row.querySelector(".item-kcal").addEventListener("click", ev=>{
      ev.stopPropagation();
      const v = prompt("kcal de “" + it.text + "”:", String(Number(it.kcal)||0));
      if(v === null) return;
      const n = parseInt(v, 10);
      if(!isNaN(n) && n >= 0){ it.kcal = n; savePlan(); renderDay(); renderMonth(); }
    });
    block.appendChild(row);
  });

  (e.extra||[]).forEach((x, xi)=>{
    const row = document.createElement("div");
    row.className = "item-row extra done";
    row.innerHTML =
      `<span class="box"></span>
       <span class="item-text">${escapeHtml(x.text)}</span>
       <span class="item-kcal">${Number(x.kcal)||0} kcal</span>
       <button class="item-del" title="Remover">×</button>`;
    row.querySelector(".item-del").addEventListener("click", ev=>{
      ev.stopPropagation();
      e.extra.splice(xi, 1); save(); renderDay(); renderMonth();
    });
    block.appendChild(row);
  });

  const add = document.createElement("button");
  add.className = "item-add";
  add.type = "button";
  add.textContent = "➕ comi mais alguma coisa";
  add.addEventListener("click", ()=> openAddFood(rec, m));
  block.appendChild(add);

  return block;
}

/* ---------- modal "adicionar alimento" (item avulso numa refeição) ---------- */
let addFoodTarget = null; // {rec, meal} pendente do modal

function openAddFood(rec, meal){
  addFoodTarget = { rec, meal };
  document.getElementById("addFoodSub").textContent = "Item avulso em: " + meal.label;
  const desc = document.getElementById("addFoodDesc");
  const kcal = document.getElementById("addFoodKcal");
  desc.value = ""; kcal.value = "";
  desc.classList.remove("onb-invalid");
  document.getElementById("addFoodDialog").showModal();
  desc.focus();
}

function confirmAddFood(){
  if(!addFoodTarget) return;
  const descEl = document.getElementById("addFoodDesc");
  const text = descEl.value.trim();
  if(!text){ // só a descrição é obrigatória
    descEl.classList.add("onb-invalid"); descEl.focus();
    setTimeout(()=> descEl.classList.remove("onb-invalid"), 1200);
    return;
  }
  const kcal = Math.max(0, parseInt(document.getElementById("addFoodKcal").value, 10) || 0);
  const e = mealEntry(addFoodTarget.rec, addFoodTarget.meal);
  e.extra.push({ id: "x" + Date.now(), text: text.slice(0,80), kcal });
  closeAddFood();
  save(); renderDay(); renderMonth();
}

function closeAddFood(){
  addFoodTarget = null;
  document.getElementById("addFoodDialog").close();
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

document.getElementById("backToToday").addEventListener("click", ()=>{
  // se hoje está em outro mês da tabela, ajusta a visão também
  const now = new Date();
  viewYear = now.getFullYear(); viewMonth = now.getMonth();
  selectDay(todayKey());
});

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
  head += `</tr></thead>`;

  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  let body = "<tbody>";
  const totals = {}; cols.forEach(m=>totals[m.key]=0);

  for(let d=1; d<=daysInMonth; d++){
    const date = new Date(viewYear, viewMonth, d);
    const key = ymd(date);
    const rec = state.days[key] || {};
    const dow = date.getDay();
    const isWeekend = (dow===0||dow===6);
    const isToday = (key===tkey);
    const isSel = (key===selectedKey);

    let row = `<tr class="${isWeekend?'weekend':''} ${isToday?'today':''} ${isSel?'selected':''}">`;
    row += `<td class="daycol" data-selkey="${key}" title="Clique para editar este dia no topo">`
         + `<span class="dnum">${d}</span><span class="dwd">${WD[dow]}</span></td>`;

    cols.forEach(m=>{
      const e = mealEntry(rec, m);
      const items = m.items || [];
      let cls = "", glyph = "○";
      if(items.length){
        const got = items.filter(it=> e.items[it.id]).length;
        if(got > 0) totals[m.key]++;   // conta o dia se comeu ao menos 1 item da refeição
        if(got === items.length){ cls="on"; glyph="✓"; }
        else if(got > 0){ cls="partial"; glyph="•"; }
      } else if(e.done){ cls="on"; glyph="✓"; totals[m.key]++; }
      row += `<td><span class="cell-check ${cls}" data-key="${key}" data-meal="${m.key}">${glyph}</span></td>`;
    });

    row += `</tr>`;
    body += row;
  }

  // totais
  let tot = `<tr class="totals"><td class="daycol">TOTAL</td>`;
  cols.forEach(m=> tot += `<td>${totals[m.key]}</td>`);
  tot += `</tr>`;
  body += tot + "</tbody>";

  table.innerHTML = head + body;

  // clicar na coluna "Dia" => seleciona o dia e leva pro topo
  table.querySelectorAll("[data-selkey]").forEach(td=>{
    td.addEventListener("click", ()=> selectDay(td.dataset.selkey));
  });

  // listeners das células de check — atalho: liga/desliga a refeição INTEIRA do dia
  table.querySelectorAll(".cell-check").forEach(c=>{
    c.addEventListener("click", ()=>{
      const rec = dayRec(c.dataset.key);
      const meal = MEALS.find(m=> m.key === c.dataset.meal);
      if(!meal) return;
      const e = mealEntry(rec, meal);
      const items = meal.items || [];
      if(items.length){
        const allOn = items.every(it=> e.items[it.id]);
        items.forEach(it=> e.items[it.id] = !allOn);
      } else {
        e.done = !e.done;
      }
      save(); renderMonth();
      if(c.dataset.key===selectedKey) renderDay();
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
    `<b>Como usar:</b> no painel do topo, marque <b>item por item</b> o que você comeu em cada refeição —
     a kcal de cada item é somada individualmente. Comeu algo fora do plano? Use <b>“➕ comi mais alguma coisa”</b>
     (soma na kcal do dia, mas não conta no anel de %). Clique na kcal de um item pra ajustá-la.
     O anel <b>%</b> do topo é <b>proporcional aos itens</b> marcados (não mais por refeição inteira).
     Na tabela: <b>✓</b> = refeição completa, <b>•</b> = parcial, <b>○</b> = nenhum item; clicar liga/desliga a
     refeição toda naquele dia. Clique no <b>dia</b> (1ª coluna) pra trazê-lo pro topo e editar.`;
}

/* ===========================================================
   TREINO
   =========================================================== */
let weekSelDow = null;   // dia selecionado no modo toque (pra remanejar treino)
let weekLastDrop = 0;    // timestamp do último drop (ignora o "click fantasma" pós-drag)

function renderWeek(){
  const grid = document.getElementById("weekGrid");
  const todayDow = new Date().getDay();
  // ordem dom→sáb (semana começa no domingo)
  const order = [0,1,2,3,4,5,6];
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
        weekSelDow = null;   // some com qualquer seleção de toque ao começar a arrastar
        e.dataTransfer.setData("text/plain", String(dow));
        e.dataTransfer.effectAllowed = "move";
      });
    }
    el.addEventListener("dragover", e=>{ e.preventDefault(); el.classList.add("drop-hover"); });
    el.addEventListener("dragleave", e=>{
      if(!el.contains(e.relatedTarget)) el.classList.remove("drop-hover"); // ignora entrar nos filhos
    });
    el.addEventListener("drop", e=>{
      e.preventDefault(); el.classList.remove("drop-hover");
      weekLastDrop = (typeof performance!=="undefined" ? performance.now() : Date.now());
      const src = parseInt(e.dataTransfer.getData("text/plain"));
      if(!isNaN(src)) weekReassign(src, dow);
    });
    // toque/clique (funciona em mobile e desktop) — ignora o click fantasma logo após um drop
    el.addEventListener("click", ()=>{
      const now = (typeof performance!=="undefined" ? performance.now() : Date.now());
      if(now - weekLastDrop < 350) return;
      weekTap(dow);
    });

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
  if(confirm("Apagar todos os checks dos dias? Isso não dá pra desfazer.")){
    state = { days:{} };
    selectedKey = todayKey();
    save(); renderDay(); renderMonth();
  }
});

// restaura o conteúdo de dieta/treino pro template padrão (não toca nos checks)
document.getElementById("restorePlanBtn").addEventListener("click", ()=>{
  if(confirm("Restaurar dieta e treino para o plano padrão? Suas edições do plano serão perdidas (seus checks continuam).")){
    restorePlan();
    // re-render de tudo que depende do plano
    renderDay(); renderMonth();
    renderWeek(); renderWorkouts();
  }
});

/* ---------- listeners do modal "adicionar alimento" ---------- */
document.getElementById("addFoodOk").addEventListener("click", confirmAddFood);
document.getElementById("addFoodCancel").addEventListener("click", closeAddFood);
document.getElementById("addFoodDialog").addEventListener("cancel", ()=>{ addFoodTarget = null; }); // ESC
["addFoodDesc","addFoodKcal"].forEach(id=>{
  document.getElementById(id).addEventListener("keydown", e=>{
    if(e.key === "Enter"){ e.preventDefault(); confirmAddFood(); }
  });
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
  renderMonth();
  renderLegend();

  renderWeek();
  renderWorkouts();
})();
