/* ===========================================================
   ONBOARDING — fluxo de configuração do novo usuário
   -----------------------------------------------------------
   Dispara quando NÃO há perfil salvo (USER_KEY vazio). 4 steps:
     1) nome + nome do projeto (com sugestões)
     2) altura, peso, idade, sexo
     3) metabolismo basal (BMR) + TDEE + objetivo → meta de kcal
     4) gera um prompt p/ colar numa IA e importa o JSON do cardápio
   Tudo persiste no localStorage. Também trata export/import geral.
   Depende de globals de app.js: user, saveUser, plan, savePlan,
   refreshAll, STORE_KEY, PLAN_KEY, USER_KEY.
   =========================================================== */
"use strict";

const ONB = {
  step: 1,
  total: 4,
  draft: {},               // respostas acumuladas
  imported: false,         // true quando o texto atual do campo já foi importado com sucesso
  pendingImport: null,     // dados aguardando confirmação no modal de conflito
  finishAfterImport: false,// veio do "Concluir": finaliza o onboarding após o import
};

// flag de "responder depois" — evita o overlay re-abrir sozinho a cada carga
const DEFER_KEY = "projeto_saude_defer_v1";

const PROJECT_SUGGESTIONS = [
  "Projeto -5kg",
  "Projeto Verão",
  "Esse ano o shape vem!",
  "Projeto Saúde",
  "Operação Definição",
  "Mais forte que ontem",
];

const GOAL_LABEL = {
  cut: "perder gordura",
  maintain: "manter o peso",
  bulk: "ganhar massa",
};

const LEVEL_LABEL = {
  iniciante: "iniciante",
  intermediario: "intermediário",
  avancado: "avançado",
};

/* ---------- helpers DOM ---------- */
function $(id){ return document.getElementById(id); }

/* ---------- cálculo metabólico (Mifflin-St Jeor) ---------- */
function calcBMR(weight, height, age, sex){
  const base = 10*weight + 6.25*height - 5*age;
  return Math.round(base + (sex === "M" ? 5 : -161));
}
function calcTDEE(bmr, activity){ return Math.round(bmr * activity); }
// meta = TDEE puro (arredondado p/ múltiplo de 50). O objetivo é só contexto pra IA.
function calcTarget(tdee){ return Math.round(tdee / 50) * 50; }

/* ===========================================================
   NAVEGAÇÃO ENTRE STEPS
   =========================================================== */
function renderProgress(){
  const wrap = $("onbProgress");
  wrap.innerHTML = "";
  for(let i=1; i<=ONB.total; i++){
    const dot = document.createElement("span");
    dot.className = "onb-dot" + (i===ONB.step ? " active" : i<ONB.step ? " done" : "");
    wrap.appendChild(dot);
  }
}

function showStep(n){
  ONB.step = n;
  document.querySelectorAll(".onb-step").forEach(s=>{
    s.hidden = parseInt(s.dataset.step) !== n;
  });
  $("onbBack").hidden = (n === 1);
  $("onbNext").textContent = (n === ONB.total) ? "Concluir ✓" : "Continuar ›";

  const titles = {
    1: ["Bora começar", "Como você quer chamar essa jornada?"],
    2: ["Suas medidas", "Pra estimar seu gasto calórico. Pode ser aproximado."],
    3: ["Seu metabolismo", "Quanto seu corpo gasta por dia."],
    4: ["Monte seu cardápio", "Gere o plano com uma IA e importe aqui."],
  };
  $("onbTitle").textContent = titles[n][0];
  $("onbSubtitle").textContent = titles[n][1];

  if(n === 3) updateMetrics();
  if(n === 4) $("onbPrompt").value = buildPrompt();
  renderProgress();
}

function validateStep(n){
  if(n === 1){
    const name = $("onbName").value.trim();
    const proj = $("onbProject").value.trim();
    if(!proj){ flash($("onbProject"), "Dê um nome ao projeto"); return false; }
    ONB.draft.name = name;
    ONB.draft.project = proj;
    return true;
  }
  if(n === 2){
    const h = parseFloat($("onbHeight").value);
    const w = parseFloat($("onbWeight").value);
    const a = parseInt($("onbAge").value);
    if(!(h>=100 && h<=250)){ flash($("onbHeight"), "Altura inválida"); return false; }
    if(!(w>=30 && w<=300)){ flash($("onbWeight"), "Peso inválido"); return false; }
    if(!(a>=12 && a<=100)){ flash($("onbAge"), "Idade inválida"); return false; }
    ONB.draft.height = h;
    ONB.draft.weight = w;
    ONB.draft.age = a;
    ONB.draft.sex = $("onbSex").value;
    return true;
  }
  if(n === 3){
    updateMetrics(); // garante draft.bmr/tdee/target atualizados
    ONB.draft.days = parseInt($("onbDays").value) || 3;
    ONB.draft.level = $("onbLevel").value;
    ONB.draft.limits = $("onbLimits").value.trim();
    return true;
  }
  return true;
}

function flash(input, msg){
  input.classList.add("onb-invalid");
  input.focus();
  if(msg && input.title !== undefined) input.placeholder = msg;
  setTimeout(()=> input.classList.remove("onb-invalid"), 1200);
}

/* ---------- step 3: recalcula e mostra ---------- */
function updateMetrics(){
  const d = ONB.draft;
  const activity = parseFloat($("onbActivity").value);
  const goal = $("onbGoal").value;
  d.activity = activity;
  d.goal = goal;
  d.bmr = calcBMR(d.weight, d.height, d.age, d.sex);
  d.tdee = calcTDEE(d.bmr, activity);
  d.targetKcal = calcTarget(d.tdee);

  $("onbBmrVal").textContent = d.bmr.toLocaleString("pt-BR");
  $("onbTdeeVal").textContent = d.tdee.toLocaleString("pt-BR");
  $("onbTargetVal").textContent = d.targetKcal.toLocaleString("pt-BR");
}

/* ===========================================================
   STEP 4 — prompt pra IA
   =========================================================== */
function buildPrompt(){
  const d = ONB.draft;
  const dias = d.days || 3;
  return [
`Aja como nutricionista esportivo E personal trainer. Monte um CARDÁPIO diário e um PLANO DE TREINO para a pessoa abaixo, e responda APENAS com um JSON válido — sem texto antes/depois e sem blocos de código (sem crases).`,
``,
`PESSOA`,
`- Nome: ${d.name || "—"}`,
`- Projeto/objetivo: ${d.project}`,
`- Sexo: ${d.sex === "M" ? "masculino" : "feminino"} · Idade: ${d.age} · Altura: ${d.height} cm · Peso: ${d.weight} kg`,
`- Metabolismo basal (BMR): ${d.bmr} kcal · Gasto total (TDEE): ${d.tdee} kcal`,
`- Meta calórica diária: ${d.targetKcal} kcal (${GOAL_LABEL[d.goal]})`,
`- Treino: ${dias} dias por semana · nível ${LEVEL_LABEL[d.level] || d.level}`,
`- Limitações/lesões: ${d.limits ? d.limits : "nenhuma informada"}`,
``,
`FORMATO EXATO DO JSON (responda só isto):`,
`{`,
`  "targetKcal": ${d.targetKcal},`,
`  "macros": "<P>g P / <C>g C / <G>g G",`,
`  "menu": [`,
`    { "title": "Café", "icon": "☕", "accent": "azul", "kcal": "~700 kcal · 40 P / 80 C / 20 G",`,
`      "items": [ { "text": "alimento 1 com quantidade", "kcal": 280 }, { "text": "alimento 2 com quantidade", "kcal": 90 } ] }`,
`  ],`,
`  "workouts": [`,
`    { "id": "A", "accent": "azul", "titulo": "Treino A — Peito/Ombro/Tríceps", "sub": "frase curta",`,
`      "ex": [ { "nome": "Supino reto", "set": "4x8-10", "grupo": "Peito", "obs": "dica curta" } ] }`,
`  ],`,
`  "week": [`,
`    { "dow": 1, "dia": "Segunda", "tag": "A", "nome": "Peito/Ombro/Tríceps" },`,
`    { "dow": 0, "dia": "Domingo", "tag": "off", "nome": "" }`,
`  ]`,
`}`,
``,
`REGRAS DIETA`,
`- "accent" só pode ser: azul, verde, laranja, roxo, cinza (varie entre as refeições).`,
`- Crie de 4 a 6 refeições (café, almoço, lanche, janta e opcionalmente ceia/pré-treino).`,
`- A soma das kcal das refeições deve ficar perto de ${d.targetKcal} kcal.`,
`- Cada "items" lista alimentos com quantidades (comida comum no Brasil) e a "kcal" (número inteiro) de CADA item.`,
`- A soma das kcal dos itens de uma refeição deve bater com a kcal total daquela refeição.`,
``,
`REGRAS TREINO`,
`- Crie exatamente ${dias} treinos em "workouts" (um por dia de treino), id A, B, C... em ordem.`,
`- Calibre volume e exercícios pro nível ${LEVEL_LABEL[d.level] || d.level} e respeite as limitações.`,
`- Cada exercício tem "set" no formato "séries x reps" (ex.: "4x8-10", "3x12"). "accent" do treino ∈ {azul, verde, laranja, roxo, cinza}.`,
`- "week" tem EXATAMENTE 7 entradas, dow 0=Domingo até 6=Sábado. "tag" = id de um treino ou "off". Distribua os ${dias} treinos na semana com descanso entre eles.`,
``,
`- Responda somente o JSON, começando com { e terminando com }.`,
  ].join("\n");
}

/* ---------- import do JSON gerado pela IA ---------- */
const ACCENTS = ["azul","verde","laranja","roxo","cinza"];

// gera chave segura (sem acento/espaço) a partir do título da refeição
function slugify(s){
  return String(s).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g,"")   // tira acentos
    .replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"") || "ref";
}
// 1ª parte da string de kcal (antes do "·"), ex: "~700 kcal · 40 P..." → "~700 kcal"
function shortKcal(k){ return (typeof k === "string" ? k.split("·")[0].trim() : ""); }

// deriva os checks diários a partir do cardápio importado + check fixo "Treino"
function deriveMeals(menu){
  const used = new Set();
  const meals = menu.map(c=>{
    let key = slugify(c.title);
    while(used.has(key)) key += "_"; // garante unicidade
    used.add(key);
    // itens marcáveis da refeição, com id estável prefixado pela key da refeição
    const items = (c.items||[]).map((it,i)=>({ id: key+"_"+i, text: it.text, kcal: Number(it.kcal)||0 }));
    return { key, icon: c.icon || "🍽️", label: c.title, kcal: shortKcal(c.kcal), items };
  });
  // a aba Treino e o "dia 100%" dependem deste check — sempre presente, sem itens
  if(!used.has("treino"))
    meals.push({ key:"treino", icon:"🏋️", label:"Treino", kcal:"", items:[] });
  return meals;
}

function parseLooseJSON(text){
  let t = (text || "").trim();
  // remove cercas de código ```json ... ```
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/,"").trim();
  // recorta do primeiro { até o último }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if(a !== -1 && b !== -1 && b > a) t = t.slice(a, b+1);
  return JSON.parse(t);
}

// devolve {menu, targetKcal, macros} sanitizado ou lança erro
function sanitizeImport(obj){
  if(!obj || !Array.isArray(obj.menu) || obj.menu.length === 0)
    throw new Error("Resposta sem refeições. Confira se copiou tudo.");
  const menu = obj.menu.map((c, i)=>{
    if(!c || typeof c.title !== "string" || !Array.isArray(c.items))
      throw new Error("Uma refeição veio incompleta (faltou nome ou itens).");
    const base = slugify(c.title);
    const items = c.items.map((x, j)=>{
      // aceita item objeto {text,kcal} OU string legada (kcal 0)
      const text = (x && typeof x === "object") ? String(x.text||"") : String(x);
      const kcal = (x && typeof x === "object") ? (Math.max(0, parseInt(x.kcal,10)) || 0) : 0;
      return text.trim() ? { id: base+"_"+j, text: text.slice(0,80), kcal } : null;
    }).filter(Boolean).slice(0,12);
    return {
      title: String(c.title).slice(0,60),
      icon: typeof c.icon === "string" && c.icon ? c.icon : "🍽️",
      accent: ACCENTS.includes(c.accent) ? c.accent : ACCENTS[i % ACCENTS.length],
      kcal: typeof c.kcal === "string" ? c.kcal : "",
      items,
    };
  });
  return {
    menu,
    targetKcal: Number(obj.targetKcal) || null,
    macros: typeof obj.macros === "string" ? obj.macros : null,
    workouts: sanitizeWorkouts(obj.workouts),   // null se ausente/inválido (treino é opcional)
    week: null, // preenchido abaixo (depende dos workouts válidos)
    _weekRaw: obj.week,
  };
}

// sanitiza os treinos da IA → array de {id, accent, titulo, sub, ex[]} ou null
function sanitizeWorkouts(arr){
  if(!Array.isArray(arr) || arr.length === 0) return null;
  const out = [];
  arr.slice(0,8).forEach((w, i)=>{
    if(!w || !Array.isArray(w.ex)) return;
    const ex = w.ex.map(e=>{
      if(!e || typeof e.nome !== "string" || typeof e.set !== "string") return null;
      return {
        nome: e.nome.slice(0,80),
        set: e.set.slice(0,20),
        grupo: typeof e.grupo === "string" ? e.grupo.slice(0,40) : "",
        obs: typeof e.obs === "string" ? e.obs.slice(0,160) : "",
      };
    }).filter(Boolean).slice(0,14);
    if(ex.length === 0) return;
    const id = (typeof w.id === "string" && w.id.trim()) ? w.id.trim().slice(0,3)
             : String.fromCharCode(65 + i); // A, B, C...
    out.push({
      id,
      accent: ACCENTS.includes(w.accent) ? w.accent : ACCENTS[i % ACCENTS.length],
      titulo: typeof w.titulo === "string" && w.titulo ? w.titulo.slice(0,60) : ("Treino " + id),
      sub: typeof w.sub === "string" ? w.sub.slice(0,80) : "",
      ex,
    });
  });
  return out.length ? out : null;
}

const DIA_PT = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
// monta SEMPRE 7 dias (dow 0..6). tag só vale se casar um treino existente, senão "off".
function sanitizeWeek(rawWeek, workouts){
  const validTags = new Set((workouts||[]).map(w=>w.id));
  const byDow = {};
  if(Array.isArray(rawWeek)){
    rawWeek.forEach(e=>{
      if(e && typeof e.dow === "number" && e.dow>=0 && e.dow<=6) byDow[e.dow] = e;
    });
  }
  const week = [];
  for(let dow=0; dow<=6; dow++){
    const e = byDow[dow] || {};
    const tag = (typeof e.tag === "string" && validTags.has(e.tag)) ? e.tag : "off";
    week.push({
      dow,
      dia: DIA_PT[dow],
      tag,
      nome: (tag !== "off" && typeof e.nome === "string") ? e.nome.slice(0,40) : "",
    });
  }
  return week;
}

// importa o que está no campo de resposta (botão "Importar Plano do Chat-GPT").
function importFromField(){
  const msg = $("onbImportMsg");
  const text = $("onbImport").value;
  if(!text || !text.trim()){
    msg.textContent = "Cole a resposta do Chat-GPT no campo acima primeiro.";
    msg.className = "onb-import-msg";
    return false;
  }
  return applyImport(text);
}

// aplica o texto importado. Retorna true (gravou), false (erro) ou "pending"
// (abriu o modal de conflito de histórico — a decisão grava depois).
function applyImport(text){
  const msg = $("onbImportMsg");
  let parsed, newMeals;
  try{
    let raw;
    try{ raw = parseLooseJSON(text); }
    catch(_){ throw new Error("A resposta veio incompleta."); }
    parsed = sanitizeImport(raw);
    newMeals = deriveMeals(parsed.menu); // checks diários = refeições da IA (+ Treino)
  }catch(e){
    msg.textContent = "✗ " + e.message + " Copie a resposta do Chat-GPT de novo e clique em importar.";
    msg.className = "onb-import-msg err";
    return false;
  }

  // se já existe histórico e as refeições (keys) mudam, os dias antigos passam a
  // aparecer como não cumpridos (dado não some, fica sob as keys antigas). Confirma antes.
  const hadHistory = state && state.days && Object.keys(state.days).length > 0;
  const keysChange = (plan.meals||[]).map(m=>m.key).join(",") !== newMeals.map(m=>m.key).join(",");
  if(hadHistory && keysChange){
    ONB.pendingImport = { parsed, newMeals };
    $("onbConfirmDialog").showModal();
    return "pending";
  }

  commitImport(parsed, newMeals);
  return true;
}

// grava de fato o plano importado (dieta + treino opcional) e re-renderiza.
function commitImport(parsed, newMeals){
  plan.menu = parsed.menu;
  plan.meals = newMeals;

  let treinoMsg = "";
  if(parsed.workouts){   // treino é OPCIONAL: só troca se vier válido
    plan.workouts = parsed.workouts;
    plan.week = sanitizeWeek(parsed._weekRaw, parsed.workouts);
    treinoMsg = ` e ${parsed.workouts.length} treinos`;
  }

  savePlan();
  if(parsed.targetKcal) ONB.draft.targetKcal = parsed.targetKcal;
  if(parsed.macros) ONB.draft.macros = parsed.macros;
  refreshAll();
  ONB.imported = true;

  const msg = $("onbImportMsg");
  msg.textContent = `✓ ${parsed.menu.length} refeições${treinoMsg} importados!`;
  msg.className = "onb-import-msg ok";
}

// aborta o import pendente do modal de conflito (botão Cancelar ou ESC)
function cancelPendingImport(){
  ONB.pendingImport = null;
  ONB.finishAfterImport = false;
  const msg = $("onbImportMsg");
  msg.textContent = "Importação cancelada.";
  msg.className = "onb-import-msg";
}

/* ===========================================================
   FINALIZAR / PULAR
   =========================================================== */
function finishOnboarding(){
  // se há resposta colada e ainda não foi importada, importa antes de concluir
  const field = $("onbImport");
  const hasPending = field && field.value && field.value.trim() && !ONB.imported;
  if(hasPending){
    ONB.finishAfterImport = true;
    const r = applyImport(field.value);
    if(r === "pending") return;            // modal de conflito decide e finaliza depois
    ONB.finishAfterImport = false;
    if(r === false){ $("onbDialog").showModal(); return; }  // erro de import → modal
    // r === true → import ok, segue pro finalize
  }
  finalizeOnboarding();
}

// grava o perfil e fecha o onboarding (parte final, independente do import)
function finalizeOnboarding(){
  const d = ONB.draft;
  user = {
    name: d.name || "",
    project: d.project || "Projeto Saúde",
    height: d.height || null,
    weight: d.weight || null,
    age: d.age || null,
    sex: d.sex || "M",
    activity: d.activity || null,
    goal: d.goal || null,
    bmr: d.bmr || null,
    tdee: d.tdee || null,
    targetKcal: d.targetKcal || null,
    macros: d.macros || null,
    days: d.days || null,
    level: d.level || null,
    limits: d.limits || "",
    onboardedAt: new Date().toISOString().slice(0,10),
  };
  try{ localStorage.removeItem(DEFER_KEY); }catch(e){} // já configurou
  saveUser();
  closeOnboarding();
  refreshAll(); // re-render + applyUser (atualiza header e tag de kcal/macros)
}

// "Responder depois": fecha o overlay, vai pra tela principal e marca pra não
// re-abrir sozinho. O usuário retoma quando quiser pelo botão "Configurar perfil".
function deferOnboarding(){
  try{ localStorage.setItem(DEFER_KEY, "1"); }catch(e){}
  closeOnboarding();
}

// preenche os campos com o que já existe no perfil (ao reabrir/editar)
function prefillFromUser(){
  if(!user) return;
  if(user.name) $("onbName").value = user.name;
  if(user.project) $("onbProject").value = user.project;
  if(user.height) $("onbHeight").value = user.height;
  if(user.weight) $("onbWeight").value = user.weight;
  if(user.age) $("onbAge").value = user.age;
  if(user.sex) $("onbSex").value = user.sex;
  if(user.activity) $("onbActivity").value = user.activity;
  if(user.goal) $("onbGoal").value = user.goal;
  if(user.days) $("onbDays").value = user.days;
  if(user.level) $("onbLevel").value = user.level;
  if(user.limits) $("onbLimits").value = user.limits;
}

function openOnboarding(){
  ONB.step = 1; ONB.draft = {}; ONB.imported = false;
  const imp = $("onbImport"); if(imp) imp.value = "";   // limpa resposta anterior
  // popula sugestões de projeto
  const chips = $("onbProjectChips");
  chips.innerHTML = "";
  PROJECT_SUGGESTIONS.forEach(s=>{
    const c = document.createElement("button");
    c.type = "button"; c.className = "onb-chip"; c.textContent = s;
    c.addEventListener("click", ()=>{ $("onbProject").value = s; });
    chips.appendChild(c);
  });
  prefillFromUser();
  $("onboarding").hidden = false;
  document.body.classList.add("onb-open");
  showStep(1);
}
function closeOnboarding(){
  $("onboarding").hidden = true;
  document.body.classList.remove("onb-open");
}

/* ===========================================================
   EXPORT / IMPORT GERAL (backup entre navegadores)
   =========================================================== */
function exportAll(){
  const payload = {
    app: "projeto-saude",
    version: 1,
    exportedAt: new Date().toISOString(),
    user: user,
    plan: plan,
    state: state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = (user && user.project ? user.project : "projeto-saude")
    .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  a.href = url;
  a.download = slug + "-backup.json";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function importAll(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      if(data.app && data.app !== "projeto-saude" && data.app !== "projeto-enterrada")
        throw new Error("Arquivo de outro app.");
      if(data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      if(data.plan) localStorage.setItem(PLAN_KEY, JSON.stringify(data.plan));
      if(data.state) localStorage.setItem(STORE_KEY, JSON.stringify(data.state));
      alert("Backup importado. A página vai recarregar.");
      location.reload();
    }catch(e){
      alert("Não consegui importar: " + e.message);
    }
  };
  reader.readAsText(file);
}

/* ===========================================================
   LISTENERS + INIT
   =========================================================== */
function wireOnboarding(){
  $("onbNext").addEventListener("click", ()=>{
    if(!validateStep(ONB.step)) return;
    if(ONB.step === ONB.total){ finishOnboarding(); return; }
    showStep(ONB.step + 1);
  });
  $("onbBack").addEventListener("click", ()=>{
    if(ONB.step > 1) showStep(ONB.step - 1);
  });
  $("onbSkip").addEventListener("click", deferOnboarding);
  $("profileBtn").addEventListener("click", openOnboarding);

  // recalcula métricas ao vivo no step 3
  $("onbActivity").addEventListener("change", updateMetrics);
  $("onbGoal").addEventListener("change", updateMetrics);

  // step 4
  $("onbOpenGpt").addEventListener("click", openInChatGPT);
  $("onbCopyPrompt").addEventListener("click", ()=> copyText($("onbPrompt").value, $("onbCopyPrompt")));
  $("onbImportBtn").addEventListener("click", importFromField);
  // editar o campo invalida o import anterior (Concluir vai re-importar)
  $("onbImport").addEventListener("input", ()=>{ ONB.imported = false; });

  // modal de erro de import no Concluir
  $("onbDlgRetry").addEventListener("click", ()=>{ $("onbDialog").close(); $("onbImport").focus(); });
  $("onbDlgFinish").addEventListener("click", ()=>{ $("onbDialog").close(); finalizeOnboarding(); });
  // ESC no modal de erro = "colar de novo" (não finaliza)
  $("onbDialog").addEventListener("cancel", ()=>{ ONB.finishAfterImport = false; });

  // modal de conflito (trocar cardápio com histórico)
  $("onbCfmContinue").addEventListener("click", ()=>{
    $("onbConfirmDialog").close();
    const p = ONB.pendingImport; ONB.pendingImport = null;
    if(p) commitImport(p.parsed, p.newMeals);
    if(ONB.finishAfterImport){ ONB.finishAfterImport = false; finalizeOnboarding(); }
  });
  $("onbCfmCancel").addEventListener("click", ()=>{
    $("onbConfirmDialog").close();
    cancelPendingImport();
  });
  // ESC no modal de conflito = Cancelar (só dispara em dismiss, não no close() dos botões)
  $("onbConfirmDialog").addEventListener("cancel", cancelPendingImport);

  // export / import geral (footer)
  $("exportBtn").addEventListener("click", exportAll);
  $("importBtn").addEventListener("click", ()=> $("importFile").click());
  $("importFile").addEventListener("change", e=>{
    if(e.target.files && e.target.files[0]) importAll(e.target.files[0]);
    e.target.value = "";
  });
}

function copyText(txt, btn){
  const done = ()=>{ const o = btn.textContent; btn.textContent = "✓ Copiado"; setTimeout(()=>btn.textContent=o, 1500); };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(done, ()=>fallbackCopy(txt, done));
  } else { fallbackCopy(txt, done); }
}
function fallbackCopy(txt, done){
  const ta = document.createElement("textarea");
  ta.value = txt; ta.style.position="fixed"; ta.style.opacity="0";
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); done(); }catch(e){}
  ta.remove();
}

// copia o prompt PRIMEIRO, mostra confirmação e SÓ ENTÃO abre o ChatGPT.
// window.open no mesmo gesto do clique → não cai no bloqueador de pop-up.
function openInChatGPT(){
  const txt = $("onbPrompt").value;
  // 1) copia (dispara já; fallback síncrono cobre file:// / sem clipboard API)
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).catch(()=>fallbackCopy(txt, ()=>{}));
  } else {
    fallbackCopy(txt, ()=>{});
  }
  // 2) mostra a confirmação
  const msg = $("onbGptMsg");
  msg.textContent = "✓ Prompt copiado com sucesso! Cole no ChatGPT com Ctrl+V.";
  msg.className = "onb-import-msg ok";
  // 3) abre o ChatGPT em nova aba
  window.open("https://chatgpt.com/", "_blank", "noopener");
}

(function initOnboarding(){
  wireOnboarding();
  // auto-abre só pra quem nunca configurou E não escolheu "Responder depois"
  let deferred = false;
  try{ deferred = !!localStorage.getItem(DEFER_KEY); }catch(e){}
  if(!user && !deferred) openOnboarding();
})();
