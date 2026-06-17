# Projeto Enterrada — Contexto do Projeto

> Documento de handoff para que uma próxima instância do Claude (Claude Code, rodando
> localmente em `C:/Users/victor/Documents/saude/`) entenda o que foi construído e continue
> o trabalho. Escrito em jun/2026.

## O que é

App pessoal de saúde do Victor: acompanhamento diário de **dieta** e **treino**, numa única
página com duas tabs. Sem framework — **HTML, CSS e JS puros**. Roda 100% local abrindo o
`index.html` no navegador (duplo clique, protocolo `file://`). Sem build, sem servidor, sem
dependências externas além das fontes do Google Fonts via CDN.

### Objetivo de fundo (contexto do usuário)
- Victor, 1,85 m / 83 kg, iniciante em treino de musculação.
- Meta principal: **enterrar uma bola de basquete (aro 3,05 m) até dezembro/2026**.
- Treina 3x/semana. Dieta em leve superávit (~2.700 kcal).
- O app existe pra dar consistência ao dia a dia (marcar refeições, treino, creatina, cerveja)
  e visualizar o plano de treino progressivo.

## Stack e restrições (IMPORTANTES — não quebrar)

- **Sem frameworks, sem bibliotecas JS.** Nada de React/Vue/jQuery. Vanilla puro.
- **Sem localStorage? Não.** O app DEPENDE de `localStorage` pra persistir — funciona porque
  roda em `file://` local. (No sandbox da web do Claude isso era limitado, mas no PC do Victor
  funciona normal.)
- **Sem backend / sem rede** (exceto Google Fonts e Google Analytics). Todos os dados de saúde
  ficam no navegador do usuário.
- Idioma da interface e dos comentários: **português do Brasil**.
- Funciona offline depois de carregado (só as fontes precisam de rede; degrada bem sem elas).

### Google Analytics (GA4)
- Snippet `gtag.js` **inline** no `<head>` do `index.html`, Measurement ID `G-BKR1CT2JB6`.
  ID é **público por design** (site estático, sem build → não dá pra esconder). Sem CI/Secret.
- **Guard de host:** só carrega no host oficial — `projetosaude.life` (+ subdomínios com
  fronteira de ponto) ou `victorbiasibetti.github.io`. Acessos locais (`file://`/localhost) e
  **forks de terceiros** (outro `*.github.io`) NÃO contam no GA. (Fronteira de ponto evita
  casar lookalikes tipo `xprojetosaude.life`.)
- Coleta só métricas de **uso/navegação** (não os dados de saúde, que seguem só no localStorage).
  Por isso a barra de privacidade diz "dados **de saúde** não são compartilhados".
- `.env.sample` documenta `GA_MEASUREMENT_ID` pra quem forkar usar o próprio GA (o site não lê
  `.env`; é só referência — trocar o ID direto no `index.html`). `.env` está no `.gitignore`.

## Estrutura de arquivos

```
saude/
  index.html   — estrutura + as duas tabs + overlay de onboarding. Liga style.css e os 3 JS.
  style.css    — tema "performance dashboard" escuro. Todas as cores em CSS vars no :root.
  data.js      — TEMPLATE padrão do plano (DEFAULT_PLAN v2): refeições, cardápio, divisão
                 semanal, treinos (sem fases). NÃO é mais a fonte de verdade em runtime —
                 é só o seed copiado pro localStorage na 1ª carga.
  app.js       — toda a lógica (render, localStorage, seleção de dia, tabs, fases) + carga
                 do plano e do perfil (loadPlan/seedPlan/savePlan/restorePlan, loadUser/
                 saveUser/applyUser/refreshAll).
  onboarding.js— fluxo do novo usuário (4 steps), cálculo BMR/TDEE, geração de prompt p/ IA,
                 import do cardápio, export/import geral. Carregado por ÚLTIMO (usa globals
                 de app.js). Dispara sozinho no fim do arquivo se não há perfil salvo.
  CONTEXT.md   — este arquivo.
```

A ordem de carga importa: `data.js` → `app.js` → `onboarding.js`. Os 3 são `<script>`
clássicos (não modules) → compartilham escopo global. `data.js` define `DEFAULT_PLAN`;
`app.js` consome e expõe `plan/user/state` + render funcs; `onboarding.js` (último) usa
esses globals e dispara o fluxo se `user` for null.

## Design (direção visual escolhida)

Tema escuro estilo painel de performance atlética. NÃO é o template cream/serif genérico.
- Paleta (em `:root` no style.css):
  - `--bg #0E1116`, `--bg-2 #141923`, `--panel #1A1F2B`, `--line #2A3242`
  - `--lime #C6FF3A` = acento principal (a meta / o salto / o "hoje")
  - `--orange #FF7A2F` = perna / treino C / modo "editando dia passado"
  - `--azul #4DA3FF` (treino A), `--verde #46D17F` (treino B)
  - texto: `--txt #ECF0F6`, `--txt-dim`, `--txt-faint`
- Tipografia (Google Fonts): **Oswald** (display, títulos), **Inter** (corpo),
  **JetBrains Mono** (números, dados, tags).
- Elemento-assinatura: o **anel de progresso do dia** (o "dunk meter") — SVG circular que
  enche conforme as 6 metas diárias são cumpridas.
- Responsivo até mobile; respeita `prefers-reduced-motion`.

## Modelo de dados (localStorage)

São TRÊS chaves separadas:

- **`projeto_enterrada_user_v1`** — o PERFIL da pessoa (preenchido no onboarding).
  `{ name, project, height, weight, age, sex, activity, goal, bmr, tdee, targetKcal, macros, onboardedAt }`.
  Se essa chave está vazia (`user == null`), `onboarding.js` abre o overlay de configuração.
  `applyUser()` personaliza o cabeçalho (projeto vira título; nome+medidas+kcal no subtítulo)
  e a tag de kcal do cardápio. BMR = Mifflin-St Jeor; TDEE = BMR × fator de atividade;
  `targetKcal = TDEE` (sem ajuste — o objetivo só orienta a IA). **"Responder depois"** fecha o
  overlay e grava a flag `projeto_enterrada_defer_v1` (não persiste perfil) pra não re-abrir
  sozinho; o usuário retoma quando quiser pelo botão **"Configurar perfil"** no rodapé (que chama
  `openOnboarding()`, com prefill dos campos já preenchidos). Concluir limpa a flag de defer.


- **`projeto_enterrada_plan_v1`** — o CONTEÚDO de dieta+treino (o "plano"). Semeado a partir
  de `DEFAULT_PLAN` (data.js) na 1ª carga via `seedPlan()`, depois lido de lá. **Formato v2**
  (sem fases): `{ version:2, meals[], menu[], week[], workouts[] }`.
  - `workouts[]` = `{ id, accent, titulo, sub, ex:[{nome, set, grupo, obs}] }` — `set` é
    "séries×reps" único (sem 3 colunas de fase).
  - `week[]` = 7 entradas `{ dow(0..6), dia, tag, nome }`; `tag` = id de um treino ou "off".
  - Espelhos em app.js: `MEALS/MENU/WEEK/WORKOUTS` (via `syncPlanRefs()`).
  - **Migração v1→v2** (`migratePlan` em app.js): plano antigo (treino em 3 fases +
    `phases`/`cicloInicio`) é convertido — **dieta preservada** (menu/meals), treino reescrito
    pro novo default, `phases`/`cicloInicio` removidos. `isValidPlan` exige `version===2`.
  - Editar = mexer em `plan` + `savePlan()` + re-render. `restorePlan()` volta ao default.
  - Dieta E treino são dinâmicos por pessoa: o onboarding importa ambos da IA num JSON só.
- **`projeto_enterrada_v1`** — os DADOS do usuário (checks diários + cerveja). Estrutura:

```js
{
  days: {
    "2026-06-17": { cafe:true, almoco:true, lanche:false, janta:true, creatina:true, treino:false },
    // ... uma entrada por dia que teve QUALQUER marcação. Datas no formato YYYY-MM-DD (local).
  },
  beer: {
    "2026-06-14": 2,   // litros de cerveja naquele dia (número, não boolean)
  }
}
```

- As 6 metas diárias (colunas de check) vêm de `MEALS` em data.js:
  `cafe, almoco, lanche, janta, creatina, treino`.
- "Dia 100%" = todas as 6 marcadas.
- Cerveja é registrada em LITROS (número), separada em `state.beer`, somada no rodapé do mês.

## Funcionalidades implementadas

### Onboarding & Backup (onboarding.js)
1. **Fluxo de 4 steps** (overlay modal) que abre na 1ª visita (sem perfil): (1) nome + projeto
   com chips de sugestão; (2) altura/peso/idade/sexo; (3) nível de atividade + objetivo →
   BMR/TDEE/meta de kcal, **+ inputs de treino** (dias/semana, nível, limitações); (4) gera UM
   prompt combinado (dieta+treino) p/ colar numa IA e importa o JSON que ela devolve.
2. **Import do plano (`doImportPlan`):** o JSON `{ targetKcal, macros, menu[], workouts[], week[] }`
   vira `plan.menu` + (se válido) `plan.workouts`/`plan.week`. Os checks diários (`plan.meals`)
   são DERIVADOS do menu (`deriveMeals`): cada refeição vira um check (key = slug do título) +
   check fixo "Treino" no fim. **Treino é opcional**: se vier ausente/ruim, mantém o treino atual
   e a dieta entra mesmo assim. `sanitizeWorkouts`/`sanitizeWeek` validam (accent, tag, 7 dias,
   tamanhos). Parser tolerante (tira cercas ```json```, recorta de `{` a `}`).
3. **Export/Import geral** (botões no rodapé): exporta `{user, plan, state}` num `.json` p/
   migrar entre navegadores; importar grava as 3 chaves e recarrega a página.

### Tab Dieta
1. **Painel do dia (topo):** mostra o dia SELECIONADO (padrão = hoje). Tem o anel de progresso,
   os 6 checks grandes clicáveis, e o input de cerveja.
2. **Seleção de qualquer dia:** na tabela do mês, clicar em "editar ›" na coluna Dia traz aquele
   dia pro painel do topo pra editar como se fosse hoje. Estado em `selectedKey` (app.js).
   - Quando NÃO é hoje: eyebrow vira "Editando" (laranja), aparece botão "‹ Voltar pra hoje",
     a linha da tabela fica realçada em laranja.
   - Hoje sempre destacado em verde (lime) na tabela.
3. **Cardápio de referência:** 5 cards (Café, Almoço, Lanche da tarde, Janta, Suplementos),
   vindos de `MENU` em data.js.
4. **Tabela do mês:** todos os dias do mês, com ✓ clicáveis por refeição (marca direto também),
   coluna de cerveja (input em litros), coluna de % do dia, linha de TOTAL no rodapé.
   Navegação entre meses pelos botões ‹ ›.
5. **Reset:** botão no rodapé zera tudo (com confirm).

### Tab Treino (sem fases — v2)
1. **Divisão semanal:** grid Seg→Dom a partir de `WEEK`. Cada dia = tag (id de treino) ou
   descanso. Hoje destacado. Cores tag-A..F.
2. **Seus treinos:** cards de `WORKOUTS` (`renderWorkouts`), cada um com exercícios
   `{nome, set, grupo, obs}`. `set` = séries×reps único. Sem seletor de fase/banner.
3. **Dinâmico:** o onboarding gera os treinos pela IA (N = dias/semana) e importa junto com a
   dieta. Sem onboarding, usa o template padrão (ABC do Victor, achatado pra set único).

## Conteúdo do plano (resumo — detalhes completos em data.js)

### Dieta (~2.700 kcal/dia, leve superávit)
- Macros alvo: ~165 P / 340 C / 75 G.
- Café (~720 kcal): 4 ovos + 4 fatias pão francês c/ manteiga + 1 banana + café/suco.
  **SEM leite in natura** (usuário não tolera).
- Almoço (~1.080 kcal): 180 g carne + arroz + feijão + 2 batatas + salada + azeite.
- **Lanche da tarde (~300 kcal, 30 P):** 1 scoop whey batido com 250 ml leite (ou achocolatado).
  Foi criado pra compensar a proteína do leite removido do café. Leite BATIDO cai melhor que in natura.
- Janta (~810 kcal): 150 g frango/carne moída + arroz + feijão + legume + salada.
- Creatina 5 g TODO dia. Dia sem treino: tira 1 batata do almoço + 1 col. arroz da janta.
- Cerveja (sem glúten): meta máx ~2 L, 1 dia só no fim de semana; cortar carbo no dia que beber.

### Treino — divisão semanal (template padrão, v2, SEM fases)
O modelo de 3 fases progressivas (v1) foi removido. Agora o treino é uma divisão simples:
exercícios com `set` único (séries×reps), distribuídos numa semana.
- Template padrão (DEFAULT_PLAN): **A** peito/ombro/tríceps (Seg), **B** costas/bíceps (Qua),
  **C** perna (Sex); resto descanso. Valores achatados da antiga "fase 3" (mais completa).
- Pra novos usuários, o **onboarding gera o treino pela IA** (N treinos = dias/semana escolhidos),
  importado junto com a dieta no mesmo JSON. Ver seção Onboarding.

## Decisões e armadilhas (pra não repetir erros)

- **CSS por caminho relativo** (`href="style.css"`): os 4 arquivos PRECISAM estar na mesma pasta.
  Já houve confusão quando o usuário extraiu o zip e o css ficou separado. Se reclamarem que
  "o CSS não aplicou", checar 1º se os arquivos estão juntos e os nomes batem (cuidado com
  `style.css.txt` em Windows com extensão oculta).
- **Não usar `<form>`** nem submits — só onClick/onChange.
- A função `selectDay()` usa `scrollIntoView` com guard (`if(hero && hero.scrollIntoView)`) porque
  jsdom (ambiente de teste) não implementa. Manter o guard.
- Datas: sempre construir/parsear como LOCAL (`new Date(y, m-1, d)` e `ymd()`), nunca UTC, senão
  o dia "pula" dependendo do fuso (Victor está em GMT-3, Santa Cruz do Sul/RS).
- IDs no HTML que o JS depende: `heroEyebrow, heroDate, heroSub, backToToday, todayChecks,
  beerInput, ringFg, dayPct, kcalRingFg, dayKcal, dayKcalSub, todayPill, menuGrid, monthTable,
  monthLabel, prevMonth, nextMonth, dietLegend, weekGrid, workouts, resetBtn, restorePlanBtn`.
  Onboarding: `onbDays, onbLevel, onbLimits` (inputs de treino no step 3).

## Ideias / próximos passos sugeridos (NÃO feitos ainda)

- **Aba/seção de Progressão:** registrar peso corporal e altura do salto vertical por semana
  (existia na planilha Excel original, ainda não foi portada pro app). Bom candidato pro próximo passo.
- UI pra editar treino/cardápio direto no app (hoje só via re-onboarding/IA).
- Marcar visualmente no calendário os dias de treino (A/B/C) esperados vs. cumpridos.
- PWA / instalável, pra abrir como app no celular.

## Histórico (planilhas Excel originais)

Antes do app web, o mesmo conteúdo existia em 2 planilhas .xlsx (geradas em conversa anterior):
`Treino_ABC_Hipertrofia_Perna.xlsx` e `Check_Refeicoes_Jun_Jul.xlsx`. O app web é a evolução
delas. Se precisar, a lógica de dados do app espelha fielmente essas planilhas.

## Como continuar (para o Claude Code)

1. Os arquivos editáveis são os 4 na raiz. Edite-os in loco.
2. Pra testar: abra `index.html` no navegador. Não há build.
3. Mantenha o português, o tema escuro/vars CSS, e a regra "sem framework".
4. Conteúdo (refeições/exercícios/textos) → editar `data.js`. Lógica/UI → `app.js` / `style.css`.
5. Ao mexer em datas ou fases, revalidar com o relógio do sistema (hoje, dia selecionado, fase).
