/* ===========================================================
   PLANO PADRÃO — Dieta e Treino (template / seed)
   -----------------------------------------------------------
   Este arquivo NÃO é mais a fonte de verdade em runtime.
   É só o TEMPLATE inicial: na 1ª carga, o app copia isto pro
   localStorage (chave projeto_enterrada_plan_v1) e passa a ler
   de lá. Assim cada pessoa tem o próprio plano editável no
   navegador dela. Mexer aqui só muda o padrão de quem ainda
   não tem plano salvo (ou após "Restaurar plano padrão").

   Datas são strings "YYYY-MM-DD" (JSON-safe, sem objeto Date).
   =========================================================== */

const DEFAULT_PLAN = {
  // versão do formato do plano (pra futuras migrações)
  version: 1,

  // Refeições que viram checkbox a cada dia
  meals: [
    { key: "cafe",     icon: "☕", label: "Café",            kcal: "~720 kcal" },
    { key: "almoco",   icon: "🍽️", label: "Almoço",          kcal: "~1.080 kcal" },
    { key: "lanche",   icon: "🥤", label: "Lanche da tarde",  kcal: "~300 kcal" },
    { key: "janta",    icon: "🌙", label: "Janta",            kcal: "~810 kcal" },
    { key: "creatina", icon: "💊", label: "Creatina 5 g",     kcal: "todo dia" },
    { key: "treino",   icon: "🏋️", label: "Treino",           kcal: "" },
  ],

  // Cardápio de referência (cards)
  menu: [
    {
      title: "Café", icon: "☕", accent: "azul",
      kcal: "~720 kcal · 42 P / 92 C / 22 G",
      items: [
        "4 ovos cozidos ou fritos (pouco óleo)",
        "4 fatias de pão francês (ou 2 pães) c/ fio de manteiga",
        "1 banana",
        "Café ou suco (sem leite in natura)",
      ],
    },
    {
      title: "Almoço", icon: "🍽️", accent: "verde",
      kcal: "~1.080 kcal · 65 P / 140 C / 31 G",
      items: [
        "180 g de carne (patinho, coxão, acém moído ou frango)",
        "5-6 colheres de arroz (150 g cozido)",
        "1 concha cheia de feijão (140 g)",
        "2 batatas médias cozidas ou 4 col. purê (ou mandioca)",
        "Salada à vontade + 1 col. de azeite",
      ],
    },
    {
      title: "Lanche da tarde", icon: "🥤", accent: "roxo",
      kcal: "~300 kcal · 30 P / 35 C / 5 G",
      items: [
        "1 scoop de whey batido com 250 ml de leite",
        "OU achocolatado: leite + 2 col. (menos proteína)",
        "Bate com banana ou aveia se quiser mais carbo",
        "Leite batido com whey costuma cair melhor que in natura",
      ],
    },
    {
      title: "Janta", icon: "🌙", accent: "laranja",
      kcal: "~810 kcal · 50 P / 100 C / 22 G",
      items: [
        "150 g de frango ou carne moída",
        "4-5 colheres de arroz (120 g cozido)",
        "1 concha de feijão",
        "Legume refogado (abobrinha, brócolis, chuchu) pouco óleo",
        "Salada",
      ],
    },
    {
      title: "Suplementos & regras", icon: "💊", accent: "cinza",
      kcal: "",
      items: [
        "Creatina 5 g — TODO dia, qualquer hora (até dia sem treino)",
        "Whey — já está no lanche da tarde",
        "Dia SEM treino: tira 1 batata do almoço + 1 col. arroz da janta",
        "Dia de cerveja: corta carbo (pão/batata/arroz da noite)",
      ],
    },
  ],

  // Divisão semanal (0 = Domingo ... 6 = Sábado, igual getDay do JS)
  week: [
    { dow: 1, dia: "Segunda", treino: "A — Peito/Ombro/Tríceps", obs: "Começo de semana. Panturrilha sempre.", tag: "A" },
    { dow: 2, dia: "Terça",   treino: "Descanso",                obs: "Recuperação.", tag: "off" },
    { dow: 3, dia: "Quarta",  treino: "B — Costas/Bíceps",       obs: "Panturrilha sempre.", tag: "B" },
    { dow: 4, dia: "Quinta",  treino: "Descanso",                obs: "Recuperação.", tag: "off" },
    { dow: 5, dia: "Sexta",   treino: "C — Perna pesada",        obs: "DIA PRINCIPAL do salto. Vem descansado.", tag: "C" },
    { dow: 6, dia: "Sábado",  treino: "Descanso",                obs: "Livre.", tag: "off" },
    { dow: 0, dia: "Domingo", treino: "Descanso ativo",          obs: "Caminhada/alongamento.", tag: "off" },
  ],

  // Treinos — cada exercício: [nome, fase1, fase2, fase3, grupo, obs]
  workouts: [
    {
      id: "A", dia: "Segunda", accent: "azul",
      titulo: "Treino A — Peito / Ombro / Tríceps",
      sub: "Box jump e supino inclinado entram na Fase 2.",
      ex: [
        ["Supino reto (máquina ou barra)", "3x10", "4x8-10", "4x6-8", "Peito", "Comece na máquina p/ aprender. Última série quase na falha só na Fase 3."],
        ["Supino inclinado halter", "—", "3x10", "4x8-10", "Peito sup.", "Entra na Fase 2. Amplitude completa, controle a descida."],
        ["Desenvolvimento halteres/máquina", "3x10", "3x10", "4x8-10", "Ombro", "Não trave o cotovelo, sem balançar o tronco."],
        ["Elevação lateral", "2x12", "3x12-15", "4x12-15", "Ombro lateral", "Carga leve, foco na contração."],
        ["Tríceps corda/máquina", "2x12", "3x10-12", "4x10-12", "Tríceps", "Cotovelo fixo, alongue bem embaixo."],
        ["Panturrilha em pé", "3x15", "4x12-15", "5x12-15", "Panturrilha", "Estímulo de perna todo treino. Pausa 1s no topo."],
        ["Box jump (caixa baixa)", "—", "4x3", "5x3", "Perna (potência)", "Entra na Fase 2. Início do treino, descansado, aterrissagem suave."],
        ["Prancha", "2x30s", "3x40s", "3x40-60s", "Core", "Estabilidade p/ transferir força no salto."],
      ],
    },
    {
      id: "B", dia: "Quarta", accent: "verde",
      titulo: "Treino B — Costas / Bíceps",
      sub: "Comece nas máquinas, evolua p/ peso livre.",
      ex: [
        ["Puxada alta (pulldown)", "3x10", "4x8-10", "4x6-8", "Costas (largura)", "Pegada pronada, leve até o peito. Base antes da barra fixa."],
        ["Remada máquina/curvada", "3x10", "4x8-10", "4x8-10", "Costas (espessura)", "Fase 1 na máquina; barra livre da Fase 2 em diante."],
        ["Remada unilateral halter", "—", "3x10-12", "3x10-12", "Costas", "Entra na Fase 2. Amplitude total, segure 1s na contração."],
        ["Face pull", "2x15", "3x15", "4x15", "Ombro post.", "Saúde do ombro, importante p/ pressão acima da cabeça."],
        ["Rosca direta", "3x10", "4x8-10", "4x8-10", "Bíceps", "Sem balanço, controle a negativa."],
        ["Rosca martelo", "—", "3x10-12", "3x10-12", "Bíceps/antebraço", "Entra na Fase 2. Pegada neutra."],
        ["Panturrilha sentado", "3x15", "4x15-20", "5x15-20", "Panturrilha (sóleo)", "Estímulo todo treino. Reps altas, pausa embaixo."],
      ],
    },
    {
      id: "C", dia: "Sexta", accent: "laranja",
      titulo: "Treino C — Perna pesada / Dia do salto",
      sub: "Fase 1 = aprender agacho. Pliometria pesada só na Fase 3.",
      ex: [
        ["Agachamento (livre ou guiado)", "3x8", "4x6-8", "5x5", "Quadríceps/glúteo", "REI do salto. Fase 1 carga leve só p/ aprender profundidade e postura."],
        ["Leg press 45°", "3x10", "4x8-10", "4x8-10", "Quadríceps/glúteo", "Pés médios, amplitude controlada. Bom p/ ganhar confiança com carga."],
        ["Levantamento terra romeno", "—", "3x8", "4x6-8", "Posterior/glúteo", "Entra na Fase 2. Cadeia posterior = explosão. Coluna neutra sempre."],
        ["Cadeira flexora", "2x12", "3x10-12", "4x10-12", "Posterior", "Isolador, segure a contração."],
        ["Elevação pélvica (hip thrust)", "3x10", "4x10", "4x8-10", "Glúteo", "Glúteo forte = mais altura no salto."],
        ["Avanço / Afundo halteres", "—", "3x10 cada", "3x10 cada", "Glúteo/quadríceps", "Entra na Fase 2. Unilateral corrige assimetria de impulsão."],
        ["Salto vertical máximo (medir)", "—", "4x3", "4x3", "Perna (potência)", "Entra na Fase 2. Meça a altura e registre o progresso."],
        ["Agachamento com salto", "—", "—", "4x5", "Pliometria", "Só na Fase 3, corpo já preparado. Explosão máxima na subida."],
        ["Panturrilha em pé (pesado)", "3x12", "4x10-12", "5x10-12", "Panturrilha", "Última flexão antes de deixar o chão = decola daqui."],
      ],
    },
  ],

  phases: [
    { nome: "Fase 1 — Adaptação", semanas: "semanas 1-4", desc: "Poucos exercícios, aprender o movimento, não destruir o corpo. Sem pliometria pesada. Saia do treino sentindo que poderia fazer mais." },
    { nome: "Fase 2 — Construção", semanas: "semanas 5-10", desc: "Adiciona 1-2 exercícios por treino, entra pliometria leve (box jump). Corpo já adaptado, dor bem menor." },
    { nome: "Fase 3 — Completo", semanas: "semana 11+", desc: "Treino cheio, todos os exercícios, pliometria reativa. Volume alto e o corpo aguenta." },
  ],

  // Data de início do ciclo (string "YYYY-MM-DD", local) p/ calcular a fase atual
  cicloInicio: "2026-06-01",
};
