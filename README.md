# Projeto Saúde — Dieta & Treino

App pessoal de saúde: acompanhamento diário de **dieta** e **treino** numa única página
com duas abas. Sem framework, sem build, sem backend — **HTML, CSS e JS puros**.

Meta original: enterrar uma bola de basquete (aro 3,05 m) até dezembro/2026. Mas o app é
**multiusuário** — qualquer pessoa abre, configura o próprio plano e usa local no navegador.

## Usar

- **Online:** https://victorbiasibetti.github.io/projeto-saude/
- **Local:** baixe o repositório e abra `index.html` no navegador (duplo clique).

Na primeira visita aparece um **onboarding** que monta seu plano. Tudo fica salvo **só no seu
navegador** — nada é compartilhado, nada vai pra servidor. Cada pessoa tem o próprio plano,
editável localmente.

## Onboarding (configuração inicial)

Abre sozinho quando ainda não há perfil. 4 passos:

1. **Identidade** — seu nome + nome do projeto (com sugestões prontas).
2. **Medidas** — altura, peso, idade e sexo.
3. **Metabolismo** — calcula seu **BMR** (Mifflin-St Jeor) e **TDEE** (gasto total), define a
   meta calórica e o objetivo (perder/manter/ganhar).
4. **Cardápio** — gera um prompt pronto pra colar no Chat-GPT (ou outra IA); você cola a
   resposta de volta e o app importa as refeições.

Dá pra clicar em **"Responder depois"** e configurar mais tarde pelo botão **"Configurar
perfil"** no rodapé.

## Funcionalidades

- **Aba Dieta:** painel do dia com dois anéis (**% de metas cumpridas** e **kcal ingeridas**
  com a meta de referência), checks de refeição, registro de cerveja e tabela do mês.
- **Aba Treino:** fase atual do ciclo, divisão semanal (ABC) e os treinos por fase.
- **Backup:** **Exportar / Importar JSON** no rodapé pra mover seus dados entre navegadores.
- **Privacidade:** dados ficam 100% no seu navegador.
- Layout responsivo (do celular a telas acima de 1920px).

## Estrutura

| Arquivo         | Papel |
|-----------------|-------|
| `index.html`    | Estrutura, as duas abas e o overlay de onboarding |
| `style.css`     | Tema escuro "performance dashboard" (cores em CSS vars) |
| `data.js`       | Plano padrão (template) copiado pro navegador na 1ª carga |
| `app.js`        | Lógica: render, persistência, seleção de dia, abas, fases, perfil |
| `onboarding.js` | Fluxo do novo usuário, cálculo BMR/TDEE, prompt pra IA, export/import |
| `context.md`    | Documento de contexto / handoff do projeto |
