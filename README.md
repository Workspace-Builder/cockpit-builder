# Cockpit Builder

A cabine do guindaste: o mapa executável da Obra 10k e do Setup Agência 6D.

O aluno identifica o gargalo → vai na etapa → o mapa abre a aula, a IA e a
ferramenta daquela etapa. Não é mapa pra olhar; é mapa pra fazer.

---

## Estado do repositório

Duas coisas convivem aqui, de propósito:

| o que | onde | estado |
|---|---|---|
| board legado | `index.html` | **no ar** em `cockpit.easybuilder.com.br` |
| app novo | `src/` | esqueleto de navegação, sem conteúdo |

O app novo já entrega:

- **a estrutura** — árvore de pastas e páginas em Postgres, criar, renomear,
  duplicar, excluir, buscar, navegar (com deep-link e botão voltar);
- **os dois documentos do board legado portados pro canvas** — Onboarding
  (43 nós) e O Método 10k (56 nós), com React Flow, vindos do banco;
- página sem nó abre **canvas em branco** — folha livre pra desenhar o fluxo,
  não maquete tracejada.

Falta portar 6 das 7 animações do Método (a Timeline já está viva) e o conteúdo
dos 36 passos, que depende do gate.

## Rodar

```bash
npm install
cp .env.example .env.local
npm run db:up          # Postgres no Docker, porta 5436
npm run db:migrate     # cria as tabelas e a árvore inicial
npm run db:importar    # carrega os 99 nós do board legado
npm run dev            # http://localhost:3970
```

Node 22 (`.nvmrc`). Gates: `npm run typecheck`, `npm run lint`, `npm run build`.
Banco: `npm run db:psql` abre o psql; `npm run db:down` desliga o container.

## Onde começar a ler

1. [AGENTS.md](./AGENTS.md) — o primer, e o que está travado
2. [docs/ARQUITETURA.md](./docs/ARQUITETURA.md) — como está montado e por quê
3. [docs/CONVENCOES.md](./docs/CONVENCOES.md) — onde cada coisa mora
4. [BLUEPRINT.md](./docs/BLUEPRINT.md) — o board legado: decisões, achados, dívida
5. [BLUEPRINT-PAGINAS.md](./docs/BLUEPRINT-PAGINAS.md) — arquitetura de páginas + as 7 decisões

## Aviso

**Não há autenticação.** Quem abre o app cria, renomeia e apaga página de todo
mundo — inclusive pasta, que leva as páginas junto. É decisão consciente
enquanto o app é interno e roda local; no dia em que a URL for pro aluno, é a
primeira coisa a fechar.

O banco é local (Docker). Em produção vai ser o Postgres do Railway, junto com
o domínio `cockpit.easybuilder.com.br` — que **tem** que ir junto: é ele que faz
a sessão do Easy Builder viajar pros iframes embutidos no board.
