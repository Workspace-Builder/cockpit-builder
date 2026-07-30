# AGENTS.md — Cockpit Builder

Instruções de projeto para agentes de IA (Claude Code, Codex CLI e afins).

## ⚡ Primer (leia primeiro)

**Cockpit Builder** = o mapa executável da Obra 10k. App **Next.js 16 / React 19 /
TypeScript / Tailwind 4 / Postgres 18**, no padrão "app fino" da casa (mesma
forma da área de membros: Next fullstack, `pg` cru, SQL numerado em
`migrations/`, sem backend Python).

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

**Segunda regra:** SQL só em `src/lib/queries.ts`, escrita só por Server Action
em `src/app/actions.ts`. `db.ts` e `queries.ts` são `server-only` — o build
quebra se um componente cliente tentar importar.

## Gates de qualidade

```
npm run db:up && npm run db:migrate   # banco precisa estar de pé
npm run typecheck                     # obrigatório após qualquer refactor
npm run lint
npm run build
```

Porta local: **3970**. Postgres: **5436**. Não há CI ainda.

## O que está travado

Sete decisões esperam o CEO (BLUEPRINT-PAGINAS.md §8). Três travam tudo: os 4
pilares em 1 página ou em 4, Pilar 04 é cobertura ou fundação, e o Flywheel é
vista ou página. **Não preencha conteúdo antes delas** — é chutar, e chute vira
retrabalho quando a decisão chega.

A oitava decisão — **onde a árvore mora** (BLUEPRINT.md §10.2) — já foi tomada:
**Postgres**. Saiu do `localStorage` em 2026-07-30. A consequência que veio
junto: GitHub Pages não serve app com banco, então o deploy vai pro Railway
levando o domínio `cockpit.easybuilder.com.br`.

O que ficou em aberto por escolha, não por esquecimento: **não há
autenticação**. Quem tem o link cria e apaga página de todo mundo.

## Convenções de commit

Conventional Commits em português: `feat:`, `fix:`, `chore:`, `refactor:`,
`docs:`. Commits pequenos e no imperativo.
