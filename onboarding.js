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
  draft: {},        // respostas acumuladas
};

// flag de "responder depois" — evita o overlay re-abrir sozinho a cada carga
const DEFER_KEY = "projeto_enterrada_defer_v1";

const PROJECT_SUGGESTIONS = [
  "Projeto -5kg",
  "Projeto Verão",
  "Esse ano o shape vem!",
  "Projeto Enterrada",
  "Operação Definição",
  "Mais forte que ontem",
];

const GOAL_LABEL = {
  cut: "perder gordura",
  maintain: "manter o peso",
  bulk: "ganhar massa",
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
  return [
`Aja como um nutricionista esportivo. Monte um cardápio diário para a pessoa abaixo e responda APENAS com um JSON válido — sem texto antes/depois e sem blocos de código (sem crases).`,
``,
`PESSOA`,
`- Nome: ${d.name || "—"}`,
`- Projeto/objetivo: ${d.project}`,
`- Sexo: ${d.sex === "M" ? "masculino" : "feminino"} · Idade: ${d.age} · Altura: ${d.height} cm · Peso: ${d.weight} kg`,
`- Metabolismo basal (BMR): ${d.bmr} kcal · Gasto total (TDEE): ${d.tdee} kcal`,
`- Meta calórica diária: ${d.targetKcal} kcal (${GOAL_LABEL[d.goal]})`,
``,
`FORMATO EXATO DO JSON (responda só isto):`,
`{`,
`  "targetKcal": ${d.targetKcal},`,
`  "macros": "<P>g P / <C>g C / <G>g G",`,
`  "menu": [`,
`    { "title": "Café", "icon": "☕", "accent": "azul", "kcal": "~700 kcal · 40 P / 80 C / 20 G", "items": ["alimento 1 com quantidade", "alimento 2 com quantidade"] }`,
`  ]`,
`}`,
``,
`REGRAS`,
`- "accent" só pode ser: azul, verde, laranja, roxo, cinza (varie entre as refeições).`,
`- Crie de 4 a 6 refeições (café, almoço, lanche, janta e opcionalmente ceia/pré-treino).`,
`- A soma das kcal das refeições deve ficar perto de ${d.targetKcal} kcal.`,
`- Cada "items" lista alimentos com quantidades, usando comida comum no Brasil.`,
`- Inclua uma refeição final de "Suplementos & regras" se fizer sentido.`,
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
    return { key, icon: c.icon || "🍽️", label: c.title, kcal: shortKcal(c.kcal) };
  });
  // a aba Treino e o "dia 100%" dependem deste check — sempre presente
  if(!used.has("treino"))
    meals.push({ key:"treino", icon:"🏋️", label:"Treino", kcal:"" });
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
    return {
      title: String(c.title).slice(0,60),
      icon: typeof c.icon === "string" && c.icon ? c.icon : "🍽️",
      accent: ACCENTS.includes(c.accent) ? c.accent : ACCENTS[i % ACCENTS.length],
      kcal: typeof c.kcal === "string" ? c.kcal : "",
      items: c.items.map(x=> String(x)).filter(Boolean).slice(0,12),
    };
  });
  return {
    menu,
    targetKcal: Number(obj.targetKcal) || null,
    macros: typeof obj.macros === "string" ? obj.macros : null,
  };
}

function doImportMenu(){
  const msg = $("onbImportMsg");
  try{
    let raw;
    try{ raw = parseLooseJSON($("onbImport").value); }
    catch(_){ throw new Error("Não entendi a resposta. Cole o texto completo que o Chat-GPT gerou."); }
    const parsed = sanitizeImport(raw);
    plan.menu = parsed.menu;
    plan.meals = deriveMeals(parsed.menu); // checks diários = refeições da IA (+ Treino)
    savePlan();
    if(parsed.targetKcal) ONB.draft.targetKcal = parsed.targetKcal;
    if(parsed.macros) ONB.draft.macros = parsed.macros;
    msg.textContent = `✓ ${parsed.menu.length} refeições importadas`;
    msg.className = "onb-import-msg ok";
  }catch(e){
    msg.textContent = "✗ " + e.message;
    msg.className = "onb-import-msg err";
  }
}

/* ===========================================================
   FINALIZAR / PULAR
   =========================================================== */
function finishOnboarding(){
  const d = ONB.draft;
  user = {
    name: d.name || "",
    project: d.project || "Projeto Enterrada",
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
}

function openOnboarding(){
  ONB.step = 1; ONB.draft = {};
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
    app: "projeto-enterrada",
    version: 1,
    exportedAt: new Date().toISOString(),
    user: user,
    plan: plan,
    state: state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = (user && user.project ? user.project : "projeto-enterrada")
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
      if(data.app && data.app !== "projeto-enterrada")
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
  $("onbCopyPrompt").addEventListener("click", ()=> copyText($("onbPrompt").value, $("onbCopyPrompt")));
  $("onbPasteBtn").addEventListener("click", pasteResponse);
  $("onbImportBtn").addEventListener("click", doImportMenu);

  // export / import geral (footer)
  $("exportBtn").addEventListener("click", exportAll);
  $("importBtn").addEventListener("click", ()=> $("importFile").click());
  $("importFile").addEventListener("change", e=>{
    if(e.target.files && e.target.files[0]) importAll(e.target.files[0]);
    e.target.value = "";
  });
}

// cola o conteúdo da área de transferência no campo de resposta
function pasteResponse(){
  const ta = $("onbImport");
  if(navigator.clipboard && navigator.clipboard.readText){
    navigator.clipboard.readText().then(
      t=>{ ta.value = t; ta.focus(); },
      ()=>{ ta.focus(); alert("Não consegui ler a área de transferência. Cole manualmente com Ctrl+V."); }
    );
  } else {
    ta.focus();
    alert("Cole manualmente com Ctrl+V (Cmd+V no Mac).");
  }
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

(function initOnboarding(){
  wireOnboarding();
  // auto-abre só pra quem nunca configurou E não escolheu "Responder depois"
  let deferred = false;
  try{ deferred = !!localStorage.getItem(DEFER_KEY); }catch(e){}
  if(!user && !deferred) openOnboarding();
})();
