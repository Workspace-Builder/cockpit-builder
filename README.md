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
| app novo | `src/` | navegação + 3 telas próprias, ainda sem o conteúdo dos 36 passos |

O app novo já entrega:

- **a estrutura** — árvore de pastas e páginas em `dados/*.json`, criar,
  renomear, duplicar, excluir, buscar, navegar (com deep-link e botão voltar);
- **os dois documentos do board legado portados pro canvas** — Onboarding
  (43 nós) e O Método 10k (56 nós), com React Flow, gaveta do nó, colar imagem,
  guias de alinhamento e Ctrl+Z;
- **as 8 animações do Método vivas** — Timeline, Flywheel, Furadeira, Balde
  Furado, Dois Balcões, 80/20, Doze Meses e Serviço→Solução
  (`src/components/canvas/animacoes/`);
- **a Obra** (`src/components/obra/`) — a torre desenhada em SVG: 4 pilares,
  36 andares, e dentro do andar os três entregáveis (aula, ferramenta, IA) com
  a marca do 80/20 editável na própria tela;
- **o Motor de Tijolos** (`src/components/motor/`) — a roda do funil
  antiprospecção em página inteira, com o arsenal por setor. Mesma geometria do
  legado, outro enquadramento que o nó do canvas;
- página sem nó abre **canvas em branco** — folha livre pra desenhar o fluxo,
  não maquete tracejada.

Falta portar 3 widgets menores do Método (abas da busca SEO, carrossel do
Instagram, conta do 10k) e o conteúdo dos 36 passos, que depende do gate.

## Rodar

```bash
npm install
npm run dev            # http://localhost:3970
```

Sem banco, sem Docker, sem `.env`: os dados moram versionados em `dados/` — ver
[docs/ARQUITETURA.md](./docs/ARQUITETURA.md) §6. Editou, commitou, é isso.

Node 22 (`.nvmrc`). Gates: `npm run typecheck`, `npm run lint`, `npm run build`.

## Publicar pro aluno

```bash
npm run publicadas             # lista o que está ligado (mostra o id de cada página)
npm run publicadas obra        # liga uma tela  (--tirar obra desliga)
npm run build:aluno            # HTML estático em out/
```

O editor **nunca vai pro ar** — roda local. O que o aluno abre é esta build:
HTML puro, sem servidor, com a escrita removida do bundle (não escondida:
removida). Quais telas entram sai de `dados/publicadas.json` — hoje O Método
10k, a Obra, o Motor de Tijolos, o Onboarding e mais duas páginas.

Despublicar tira a página da build, **não** do host: se o deploy for
incremental, o HTML antigo continua respondendo na mesma URL. Só vale quando a
pasta publicada é substituída inteira.

Onde essa build vai ficar hospedada ainda não foi decidido; ver
[docs/ARQUITETURA.md](./docs/ARQUITETURA.md) §9.

### Passo a passo

Nada aqui é em tempo real: publicar um id não faz nada aparecer sozinho, tem
que regerar a build. São sempre estes passos, nesta ordem:

1. **Achar o id da página** — `npm run publicadas` lista id + nome + status
   (`●` publicada, `○` rascunho). O id também é o final da URL no editor:
   `localhost:3970/p/<id>`.
2. **Editar o conteúdo**, se for o caso — `npm run dev`, edita a página normal.
3. **Publicar ou despublicar o id** — `npm run publicadas <id>` /
   `npm run publicadas --tirar <id>`.
4. **Gerar o HTML de novo** — `npm run build:aluno`. Sempre depois de publicar
   ou despublicar; o passo 3 só edita um JSON, não gera nada sozinho.
5. **Ver o resultado — nunca abrindo o arquivo direto.** `npx serve out` e abre
   o link que aparecer no terminal. Duplo clique no `index.html` (`file://`)
   quebra o CSS: os assets usam caminho absoluto (`/_next/...`), que só resolve
   servido por HTTP. Um host estático de verdade (passo 6) não tem esse
   problema — é só o teste local com arquivo aberto direto que quebra.
6. **Publicar de verdade** — subir a pasta `out/` pro host escolhido. Ainda
   manual, ver §9 do ARQUITETURA.md.

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

Os dados moram em `dados/*.json`, versionados no próprio repositório — não em
banco. Quem edita roda `npm run dev` local e commita o resultado; "a equipe vê
o que foi criado" é `git pull`, não um servidor compartilhado. Ver
[docs/ARQUITETURA.md](./docs/ARQUITETURA.md) §6 e §9 para o porquê.
