# AGENTS.md — Cockpit Builder

Instruções de projeto para agentes de IA (Claude Code, Codex CLI e afins).

## ⚡ Primer (leia primeiro)

**Cockpit Builder** = o mapa executável da Obra 10k. App **Next.js 16 / React 19 /
TypeScript / Tailwind 4**, sem banco: os dados moram versionados em `dados/*.json`
no próprio repositório (decisão de 2026-08-03 — ver ARQUITETURA.md §6). Sem
backend Python, sem servidor de banco, sem login.

O repositório está **em transição**:

| o que | onde | estado |
|---|---|---|
| board legado | `index.html` (4.241 linhas, ES5, arquivo único) | **no ar** em `cockpit.easybuilder.com.br` (GitHub Pages) |
| app novo | `src/` | esqueleto de navegação, sem conteúdo |

Não edite o `index.html` para implementar coisa nova — ele é a referência do que
já funciona, e sai de cena quando o app novo assumir o domínio.

**REGRA DE OURO:** conteúdo mora em `src/lib/passos.ts` (a lista única dos 36
passos). Obra, Trilho, vista 8020, painel do item e checklist são **filtros**
sobre essa lista. Se uma página ganhar cópia própria dos passos, a segunda
edição desincroniza as duas — foi assim que o board legado apodreceu.

Antes de codar, leia nesta ordem:

1. [README.md](./README.md) — porta de entrada
2. [docs/ARQUITETURA.md](./docs/ARQUITETURA.md) — como o app está montado e por quê
3. [docs/CONVENCOES.md](./docs/CONVENCOES.md) — onde cada coisa mora
4. [BLUEPRINT.md](./docs/BLUEPRINT.md) — o board legado: decisões, achados, dívida
5. [BLUEPRINT-PAGINAS.md](./docs/BLUEPRINT-PAGINAS.md) — arquitetura de páginas + as 7 decisões no gate

**Segunda regra:** leitura e escrita de `dados/` só em `src/lib/queries.ts`,
escrita só por Server Action em `src/app/actions.ts`. `dados.ts` e `queries.ts`
são `server-only` — o build quebra se um componente cliente tentar importar.

**Terceira regra — dois alvos, um código.** O editor roda local e nunca vai pro
ar; o que o aluno abre é `npm run build:aluno` (HTML estático, escrita
impossível). Consequências que mordem quem mexe no app:

- **Criou uma Server Action nova?** Acrescente em
  `src/lib/acoes-vazias.ts` também. O `typecheck` quebra se esquecer — é de
  propósito.
- **Vai usar `searchParams` numa página?** Não dá. Na build estática não existe
  requisição pra ler query. Use `useParametroDaUrl` no cliente.
- **Adicionou UI de escrita?** Gate com `PODE_EDITAR` (`src/lib/modo.ts`),
  senão o aluno vê botão que não faz nada.
- **Publicar uma tela** = pôr o id em `dados/publicadas.json`. Nada vai pro ar
  por existir.

Detalhes e o porquê de cada uma: ARQUITETURA.md §9.

## Gates de qualidade

```
npm run typecheck     # obrigatório após qualquer refactor
npm run lint
npm run build         # o editor
npm run build:aluno   # o publicado — roda também, é outro grafo de módulos
```

Porta local: **3970**. Não há banco, não há CI ainda.

## O que está travado

Seis decisões esperam o CEO (BLUEPRINT-PAGINAS.md §8). Três travam tudo: os 4
pilares em 1 página ou em 4, Pilar 04 é cobertura ou fundação, e o Flywheel é
vista ou página. **Não preencha conteúdo antes delas** — é chutar, e chute vira
retrabalho quando a decisão chega.

A **Decisão 4** ("quais dos 36 passos levam a tag 8020") saiu da lista em
2026-07-31, e não por ter sido respondida: a pergunta caiu. O 8020 deixou de ser
do ANDAR e passou a ser do ENTREGÁVEL — dentro de um andar, qual dos três
caminhos (aula, ferramenta, IA) traz o resultado. Os 36 andares são obrigatórios;
hierarquia entre eles ensinava o contrário. Virou dado editável na própria tela
(`dados/oitenta-vinte.json`), não curadoria em código.

A oitava decisão — **onde a árvore mora** (BLUEPRINT.md §10.2) — mudou duas
vezes. Saiu do `localStorage` em 2026-07-30 (problema: é por navegador, "a
equipe vê o que foi criado" não tinha resposta) e foi pro Postgres. Voltou em
2026-08-03 — não pro `localStorage`, pro **`dados/*.json` versionado no
repositório**: resolve a mesma pergunta (git é compartilhado, navegador não) sem
precisar de servidor de banco. Escopo pequeno, um editor por vez, sem
concorrência real — Postgres não estava pagando o custo que cobrava. Ver
ARQUITETURA.md §6.

O que ficou em aberto por escolha, não por esquecimento: **não há
autenticação**. Quem tem o link cria e apaga página de todo mundo.

## Convenções de commit

Conventional Commits em português: `feat:`, `fix:`, `chore:`, `refactor:`,
`docs:`. Commits pequenos e no imperativo.
