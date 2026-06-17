# Projeto Enterrada — Dieta & Treino

App pessoal de saúde: acompanhamento diário de **dieta** e **treino** numa única página
com duas abas. Sem framework, sem build, sem backend — **HTML, CSS e JS puros**.

Meta: enterrar uma bola de basquete (aro 3,05 m) até dezembro/2026. Treino ABC com volume
progressivo (3 fases) + dieta em leve superávit (~2.700 kcal).

## Usar

- **Online:** https://victorbiasibetti.github.io/projeto-saude/
- **Local:** baixe o repositório e abra `index.html` no navegador (duplo clique).

Os dados (checks de refeição/treino, cerveja) e o plano de dieta/treino ficam **só no seu
navegador** (`localStorage`). Nada sai do seu PC, nada vai pra servidor. Cada pessoa tem o
próprio plano editável localmente.

## Estrutura

| Arquivo      | Papel |
|--------------|-------|
| `index.html` | Estrutura + as duas abas (Dieta / Treino) |
| `style.css`  | Tema escuro "performance dashboard" (cores em CSS vars) |
| `data.js`    | Plano padrão (template) copiado pro `localStorage` na 1ª carga |
| `app.js`     | Lógica: render, `localStorage`, seleção de dia, abas, fases |
| `context.md` | Documento de contexto / handoff do projeto |
