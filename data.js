/* ===========================================================
   PLANO PADRÃO — Dieta e Treino (template / seed)
   -----------------------------------------------------------
   Este arquivo NÃO é mais a fonte de verdade em runtime.
   É só o TEMPLATE inicial: na 1ª carga, o app copia isto pro
   localStorage (chave projeto_saude_plan_v1) e passa a ler
   de lá. Assim cada pessoa tem o próprio plano editável no
   navegador dela. Mexer aqui só muda o padrão de quem ainda
   não tem plano salvo (ou após "Restaurar plano padrão").

   Datas são strings "YYYY-MM-DD" (JSON-safe, sem objeto Date).
   =========================================================== */

const DEFAULT_PLAN = {
  // versão do formato do plano. v2 = treino sem fases (divisão semanal + set único).
  // v3 = refeições com itens marcáveis individualmente ({id,text,kcal}).
  version: 3,

  // Refeições que viram checkbox a cada dia. Cada refeição lista seus `items`
  // ({id, text, kcal}) marcáveis individualmente. Refeição sem itens (creatina,
  // treino) = check único. `kcal` (string) é só o rótulo de referência do card.
  meals: [
    {
      key: "cafe", icon: "☕", label: "Café", kcal: "~720 kcal",
      items: [
        { id: "cafe_0", text: "4 ovos cozidos ou fritos (pouco óleo)",            kcal: 280 },
        { id: "cafe_1", text: "4 fatias de pão francês (ou 2 pães) c/ manteiga",  kcal: 320 },
        { id: "cafe_2", text: "1 banana",                                          kcal: 90 },
        { id: "cafe_3", text: "Café ou suco (sem leite in natura)",                kcal: 30 },
      ],
    },
    {
      key: "almoco", icon: "🍽️", label: "Almoço", kcal: "~1.080 kcal",
      items: [
        { id: "almoco_0", text: "180 g de carne (patinho, coxão, acém ou frango)", kcal: 330 },
        { id: "almoco_1", text: "5-6 colheres de arroz (150 g cozido)",            kcal: 210 },
        { id: "almoco_2", text: "1 concha cheia de feijão (140 g)",                kcal: 150 },
        { id: "almoco_3", text: "2 batatas médias cozidas (ou 4 col. purê)",       kcal: 200 },
        { id: "almoco_4", text: "Salada à vontade + 1 col. de azeite",             kcal: 190 },
      ],
    },
    {
      key: "lanche", icon: "🥤", label: "Lanche da tarde", kcal: "~300 kcal",
      items: [
        { id: "lanche_0", text: "1 scoop de whey batido com 250 ml de leite",  kcal: 300 },
        { id: "lanche_1", text: "OU achocolatado: leite + 2 col. (menos prot.)", kcal: 0 },
        { id: "lanche_2", text: "Bate com banana ou aveia se quiser mais carbo", kcal: 0 },
      ],
    },
    {
      key: "janta", icon: "🌙", label: "Janta", kcal: "~810 kcal",
      items: [
        { id: "janta_0", text: "150 g de frango ou carne moída",            kcal: 250 },
        { id: "janta_1", text: "4-5 colheres de arroz (120 g cozido)",      kcal: 160 },
        { id: "janta_2", text: "1 concha de feijão",                        kcal: 140 },
        { id: "janta_3", text: "Legume refogado (pouco óleo)",              kcal: 80 },
        { id: "janta_4", text: "Salada",                                    kcal: 180 },
      ],
    },
    { key: "creatina", icon: "💊", label: "Creatina 5 g", kcal: "todo dia", items: [] },
    { key: "treino",   icon: "🏋️", label: "Treino",        kcal: "",         items: [] },
  ],

  // Cardápio de referência (cards). Mesmos itens das refeições + um card de
  // regras/suplementos que NÃO vira refeição marcável.
  menu: [
    {
      title: "Café", icon: "☕", accent: "azul",
      kcal: "~720 kcal · 42 P / 92 C / 22 G",
      items: [
        { id: "cafe_0", text: "4 ovos cozidos ou fritos (pouco óleo)",            kcal: 280 },
        { id: "cafe_1", text: "4 fatias de pão francês (ou 2 pães) c/ manteiga",  kcal: 320 },
        { id: "cafe_2", text: "1 banana",                                          kcal: 90 },
        { id: "cafe_3", text: "Café ou suco (sem leite in natura)",                kcal: 30 },
      ],
    },
    {
      title: "Almoço", icon: "🍽️", accent: "verde",
      kcal: "~1.080 kcal · 65 P / 140 C / 31 G",
      items: [
        { id: "almoco_0", text: "180 g de carne (patinho, coxão, acém ou frango)", kcal: 330 },
        { id: "almoco_1", text: "5-6 colheres de arroz (150 g cozido)",            kcal: 210 },
        { id: "almoco_2", text: "1 concha cheia de feijão (140 g)",                kcal: 150 },
        { id: "almoco_3", text: "2 batatas médias cozidas (ou 4 col. purê)",       kcal: 200 },
        { id: "almoco_4", text: "Salada à vontade + 1 col. de azeite",             kcal: 190 },
      ],
    },
    {
      title: "Lanche da tarde", icon: "🥤", accent: "roxo",
      kcal: "~300 kcal · 30 P / 35 C / 5 G",
      items: [
        { id: "lanche_0", text: "1 scoop de whey batido com 250 ml de leite",  kcal: 300 },
        { id: "lanche_1", text: "OU achocolatado: leite + 2 col. (menos prot.)", kcal: 0 },
        { id: "lanche_2", text: "Bate com banana ou aveia se quiser mais carbo", kcal: 0 },
      ],
    },
    {
      title: "Janta", icon: "🌙", accent: "laranja",
      kcal: "~810 kcal · 50 P / 100 C / 22 G",
      items: [
        { id: "janta_0", text: "150 g de frango ou carne moída",            kcal: 250 },
        { id: "janta_1", text: "4-5 colheres de arroz (120 g cozido)",      kcal: 160 },
        { id: "janta_2", text: "1 concha de feijão",                        kcal: 140 },
        { id: "janta_3", text: "Legume refogado (pouco óleo)",              kcal: 80 },
        { id: "janta_4", text: "Salada",                                    kcal: 180 },
      ],
    },
    {
      title: "Suplementos & regras", icon: "💊", accent: "cinza",
      kcal: "",
      items: [
        { id: "regras_0", text: "Creatina 5 g — TODO dia, qualquer hora (até dia sem treino)", kcal: 0 },
        { id: "regras_1", text: "Whey — já está no lanche da tarde",                            kcal: 0 },
        { id: "regras_2", text: "Dia SEM treino: tira 1 batata do almoço + 1 col. arroz",       kcal: 0 },
      ],
    },
  ],

  // Divisão semanal (0 = Domingo ... 6 = Sábado, igual getDay do JS).
  // tag = id do treino (A/B/C...) ou "off". nome = foco (só usado quando não é off).
  week: [
    { dow: 1, dia: "Segunda", tag: "A",   nome: "Peito/Ombro/Tríceps" },
    { dow: 2, dia: "Terça",   tag: "off", nome: "" },
    { dow: 3, dia: "Quarta",  tag: "B",   nome: "Costas/Bíceps" },
    { dow: 4, dia: "Quinta",  tag: "off", nome: "" },
    { dow: 5, dia: "Sexta",   tag: "C",   nome: "Perna pesada" },
    { dow: 6, dia: "Sábado",  tag: "off", nome: "" },
    { dow: 0, dia: "Domingo", tag: "off", nome: "" },
  ],

  // Treinos — cada exercício: { nome, set ("séries×reps"), grupo, obs }
  workouts: [
    {
      id: "A", accent: "azul",
      titulo: "Treino A — Peito / Ombro / Tríceps",
      sub: "Empurrar: peito, ombro e tríceps.",
      ex: [
        { nome: "Supino reto (máquina ou barra)", set: "4x6-8",    grupo: "Peito",         obs: "Última série quase na falha. Controle a descida." },
        { nome: "Supino inclinado halter",        set: "4x8-10",   grupo: "Peito sup.",    obs: "Amplitude completa, controle a descida." },
        { nome: "Desenvolvimento halteres/máquina", set: "4x8-10", grupo: "Ombro",         obs: "Não trave o cotovelo, sem balançar o tronco." },
        { nome: "Elevação lateral",               set: "4x12-15",  grupo: "Ombro lateral", obs: "Carga leve, foco na contração." },
        { nome: "Tríceps corda/máquina",          set: "4x10-12",  grupo: "Tríceps",       obs: "Cotovelo fixo, alongue bem embaixo." },
        { nome: "Panturrilha em pé",              set: "5x12-15",  grupo: "Panturrilha",   obs: "Pausa 1s no topo." },
        { nome: "Prancha",                        set: "3x40-60s", grupo: "Core",          obs: "Estabilidade do tronco." },
      ],
    },
    {
      id: "B", accent: "verde",
      titulo: "Treino B — Costas / Bíceps",
      sub: "Puxar: costas e bíceps.",
      ex: [
        { nome: "Puxada alta (pulldown)",   set: "4x6-8",   grupo: "Costas (largura)",   obs: "Pegada pronada, leve até o peito." },
        { nome: "Remada máquina/curvada",   set: "4x8-10",  grupo: "Costas (espessura)", obs: "Puxe com as costas, não com o braço." },
        { nome: "Remada unilateral halter", set: "3x10-12", grupo: "Costas",             obs: "Amplitude total, segure 1s na contração." },
        { nome: "Face pull",                set: "4x15",    grupo: "Ombro post.",        obs: "Saúde do ombro." },
        { nome: "Rosca direta",             set: "4x8-10",  grupo: "Bíceps",             obs: "Sem balanço, controle a negativa." },
        { nome: "Rosca martelo",            set: "3x10-12", grupo: "Bíceps/antebraço",   obs: "Pegada neutra." },
        { nome: "Panturrilha sentado",      set: "5x15-20", grupo: "Panturrilha (sóleo)", obs: "Reps altas, pausa embaixo." },
      ],
    },
    {
      id: "C", accent: "laranja",
      titulo: "Treino C — Perna",
      sub: "Pernas: quadríceps, posterior e glúteo.",
      ex: [
        { nome: "Agachamento (livre ou guiado)",   set: "5x5",      grupo: "Quadríceps/glúteo", obs: "Profundidade e postura. Coluna neutra." },
        { nome: "Leg press 45°",                   set: "4x8-10",   grupo: "Quadríceps/glúteo", obs: "Pés médios, amplitude controlada." },
        { nome: "Levantamento terra romeno",       set: "4x6-8",    grupo: "Posterior/glúteo",  obs: "Cadeia posterior. Coluna neutra sempre." },
        { nome: "Cadeira flexora",                 set: "4x10-12",  grupo: "Posterior",         obs: "Isolador, segure a contração." },
        { nome: "Elevação pélvica (hip thrust)",   set: "4x8-10",   grupo: "Glúteo",            obs: "Aperte o glúteo no topo." },
        { nome: "Avanço / Afundo halteres",        set: "3x10 cada", grupo: "Glúteo/quadríceps", obs: "Unilateral, corrige assimetria." },
        { nome: "Panturrilha em pé (pesado)",      set: "5x10-12",  grupo: "Panturrilha",       obs: "Amplitude total, pausa no topo." },
      ],
    },
  ],
};
