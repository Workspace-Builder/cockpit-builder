# Arquitetura — Cockpit Builder

Como o app novo está montado e por que cada escolha foi feita.
Atualizado em 2026-07-30.

---

## 1. A stack, e por que essa

Next.js 16 · React 19 · TypeScript · Tailwind 4 · **Postgres 18** (`pg` cru) ·
zustand · lucide-react.

É o padrão da casa. Auditados quatro projetos da Builder House, existem duas
variantes:

| variante | forma | quem usa |
|---|---|---|
| **A** — SaaS pesado | Next + FastAPI + Celery/Redis + Clerk + Sentry | designbuilder2.0, workspace-builder |
| **B** — app fino | Next fullstack, sem Python | área de membros (QG), easy-builder |

O Cockpit é **B**: Next fullstack, Postgres acessado com `pg` cru e SQL numerado
em `migrations/`, exatamente como a área de membros. Não tem job assíncrono nem
fila, então FastAPI + Celery seria carregar infra que ninguém usa.

Estrutura de pastas, `services/`, `stores/`, `app/(grupo)/` e os gates
`lint` + `typecheck` seguem os quatro projetos, pra quem troca de repo não
trocar de gramática.

## 2. O que a refatoração resolve

O board legado (`index.html`) **não tem modelo de dados — tem DOM**. Um nó nasce
de `makeNode(titulo, elementoDOM, x, y)` e o que persiste é `el.outerHTML`.
Três consequências, todas fatais pro que o produto precisa virar:

1. **cor e texto são marcação, não propriedade** — mudar cor exigiria parsear HTML salvo;
2. **página não é dado** — a lista de páginas está no código, em três lugares
   (bloco `<script>`, `DOCS`, `VIEWSET`); criar página é cirurgia nos três;
3. **camada não existe** — a ordem é `zIndex = ++zTop`, contador nunca persistido.

Este app inverte: **a árvore de páginas é dado**. Criar, renomear, duplicar e
excluir são operações sobre o store, e nenhum arquivo é editado.

## 3. Os dois níveis de navegação

Vindos do BLUEPRINT-PAGINAS.md §4, e são coisas diferentes de propósito:

| nível | controle | o que troca | onde vive |
|---|---|---|---|
| **Página** | árvore da barra lateral | o documento inteiro | a **rota** `/p/<id>` |
| **Vista** | barra inferior + teclas 1-9 | o enquadramento dentro da página | estado de tela |

Página é rota de verdade — é isso que faz deep-link e o ← do navegador
funcionarem. Eram dois dos três buracos que a página "O Motor" apontava no
board de hoje (o terceiro, "você está aqui", é o caminho no topo).

Vista **não** entra no histórico: se entrasse, o ← viraria "desfazer zoom" em
vez de "voltar pra página anterior".

## 4. Onde mora o quê

```
docker-compose.yml       # Postgres 18 local, porta 5436
migrations/              # SQL numerado: 001 árvore · 003 nós e arestas
dados/legado.json        # o board legado extraído (fonte do importador)
scripts/
  migrate.mjs            # aplica o que falta, registra em cockpit.migration
  serve-legacy.mjs       # sobe o index.html em :3980 pra extrair
  extrair-imagens.mjs    # base64 → arquivo, dedupe por hash
  importar-legado.mjs    # JSON → Postgres
src/
  app/
    page.tsx             # raiz: manda pra 1ª página (no servidor)
    p/[id]/page.tsx      # a página aberta é a rota
    actions.ts           # Server Actions: criar, renomear, duplicar, excluir
    layout.tsx · globals.css · not-found.tsx
  components/
    shell/               # BarraLateral · TopoPagina · PainelDetalhes · AppShell
    palco/               # Palco: canvas quando há nós, reservado quando não há
    canvas/              # BoardCanvas · NoDoBoard · animacoes/
  lib/
    db.ts                # pool do Postgres (server-only)
    queries.ts           # o único lugar com SQL
    model.ts             # os tipos — a espinha
    ids.ts               # id curto que cabe na URL
    passos.ts            # ORDEM 0: a lista única dos 36 passos (vazia)
  stores/
    useUiStore.ts        # só busca e pasta fechada — preferência, não dado
```

### O caminho do dado

```
Postgres → lib/queries.ts → RSC (page.tsx) → prop → componente cliente
                ↑                                        │
          app/actions.ts ←──── Server Action ────────────┘
                │
          revalidatePath("/", "layout")
```

Sem rota de API e sem cache no cliente. A árvore aparece na barra lateral de
**todas** as rotas, então a invalidação é do layout inteiro, não da página que
mudou.

## 5. Decisões tomadas

**5.1 A rota é a fonte da verdade da página aberta.** Não existe `ativaId` no
store. Estado duplicado exigiria um effect pra sincronizar os dois na troca de
página — e effect que chama `setState` gera render em cascata (o lint da casa
barra isso). O `key={id}` na rota remonta a casca e zera vista e item
selecionado sem effect nenhum.

**5.2 O banco cresce por necessidade, não por previsão.** Começou com a árvore
(`pasta`, `pagina`, `vista`) e ganhou `no` e `aresta` quando houve conteúdo real
pra guardar. Os 36 passos ainda não têm tabela porque ainda não têm forma
definida — isso é a Ordem 0, travada nas Decisões 1-4. Modelar tabela pra dado
que ainda não existe é chute que vira `ALTER TABLE`.

**5.3 Pasta fechada não vai pro banco.** É preferência de quem está olhando: se
fosse dado compartilhado, fechar uma pasta fecharia pra todo mundo. Mora no
`useUiStore`, em memória. O mesmo vale pro filtro da busca.

**5.4 Server Actions, não rotas de API.** Uma camada a menos pra manter, e o
SQL nunca chega perto do bundle. `lib/db.ts` e `lib/queries.ts` são
`server-only`: importar de um componente cliente vira erro de build, não
credencial vazada.

**5.5 Excluir é em dois toques, não `confirm()`.** O diálogo nativo trava a
aba, não dá pra estilizar e some do fluxo de teste automatizado. Excluir pasta
avisa que leva as páginas junto — agora some do banco, pra todo mundo.

**5.6 Derivação não é seletor de hook.** Função que monta array novo a cada
chamada, passada direto pra `useAlgumStore(...)`, faz o React ver snapshot
diferente em todo render e entrar em loop infinito — foi um bug real deste app.
Use dentro de `useMemo`.

**5.7 React Flow como motor do canvas.** Nó dele é `div`, então **iframe vivo e
`<canvas>` animado continuam funcionando dentro do nó** — o requisito que
eliminou Excalidraw e canvas 2D na avaliação (BLUEPRINT.md §8). Precedente na
casa: designbuilder2.0 usa `@xyflow/react` no `pipeline-viewer` do admin.

**5.8 Posição veio medida, não adivinhada.** Os 99 nós foram extraídos do board
legado **rodando no navegador** — o motor antigo já tinha calculado x, y,
largura e altura. Ler isso do DOM é mais confiável que interpretar o código que
gera (que passa por `px()/py()`, escala do Figma e `requestAnimationFrame`).
As arestas não guardavam origem/destino em lugar nenhum: foram derivadas por
geometria, casando as pontas de cada `path` com a âncora mais próxima. Margem
mínima de 21px sobre o segundo colocado — nenhuma ambígua.

**5.9 O CSS do legado mora em CINCO blocos `<style>`, não em um.** Três ficam no
topo do arquivo e dois estão soltos no meio, colados ao código que monta cada
seção (os 4 pilares e o funil parte 2). Portar só os primeiros deixou **56 de 56
nós do Método sem estilo** — 133 classes sem regra. É o mesmo defeito que esta
refatoração existe pra matar: coisa que deveria ser declarada num lugar só,
espalhada por onde deu.

Como conferir depois de mexer em `globals.css` — cruza as classes usadas no
`html` dos nós com as regras existentes:

```bash
node -e "const d=require('./dados/legado.json'),fs=require('fs');
const t=new Set([...fs.readFileSync('src/app/globals.css','utf8')
  .matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m=>m[1]));
const u=new Set(); for(const n of d.nos)
  for(const m of (n.html||'').matchAll(/class=\"([^\"]+)\"/g))
    m[1].split(/\s+/).forEach(c=>c&&!t.has(c)&&u.add(c));
console.log([...u])"
```

Sobram só `.brand` e `.cb`, que **também não têm regra no legado** — são classes
de marcação, sem estilo.

**5.10 Base64 virou arquivo.** O legado carrega ~0,73 MB de imagem embutida como
`data:URL` (BLUEPRINT.md §11). Arrastar isso pro Postgres seria trocar de lugar
sem resolver. `scripts/extrair-imagens.mjs` grava cada uma em
`public/assets/metodo/`, nomeada pelo hash do conteúdo — o que também deduplica
(o print do Behance aparece nas duas partes do funil e virou um arquivo só).
O dump caiu de 1,80 MB pra 0,16 MB.

## 6. O banco

Postgres 18 em `docker-compose.yml`, porta **5436** no host (5432 é o padrão e
5434 é do workspace-builder, que roda na mesma máquina).

```bash
npm run db:up        # sobe o container
npm run db:migrate   # aplica o que falta
npm run db:psql      # abre o psql dentro do container
```

Cinco tabelas no schema `cockpit`:

```
pasta ─< pagina ─< vista
            └────< no ─< aresta
```

`ON DELETE CASCADE` em toda a cadeia: apagar uma pasta leva páginas, vistas, nós
e conectores. Migration é arquivo numerado em `migrations/`, aplicado por
`scripts/migrate.mjs`, que registra o que já rodou em `cockpit.migration`.
**Não edite migration já aplicada** — crie a próxima.

## 7. O board legado, portado

Os dois documentos do `index.html` vivem no banco e renderizam no canvas novo:

| página | nós | arestas | composição |
|---|---|---|---|
| Onboarding | 43 | 22 | 19 formas de fluxograma + 1 swimlane + 12 prints + 10 textos + 1 iframe |
| O Método 10k | 56 | 41 | 40 textos/cards + 5 prints + 3 vídeos + 1 iframe + **7 animações** |

O caminho é reproduzível, não foi trabalho manual:

```bash
node scripts/serve-legacy.mjs      # sobe o index.html em :3980
# extrai no navegador → dados/legado.json
node scripts/extrair-imagens.mjs   # base64 → arquivo, dedupe por hash
npm run db:importar                # JSON → Postgres
```

### As 7 animações

Não são forma de fluxograma: cada uma é um mini-app com `<canvas>` 2D, `draw(t)`
em `requestAnimationFrame` e controles próprios (sliders, cenários, leitura ao
vivo). O nó do React Flow é `div`, então elas moram dentro dele sem adaptação.

Entram por `src/components/canvas/animacoes.tsx`, com `no.comp` como chave.
Enquanto uma não estiver lá, o nó aparece tracejado dizendo o que falta.

| componente | estado | tamanho no legado |
|---|---|---|
| Timeline | **portada** | 87 linhas |
| Flywheel (a roda) | **portada** | 327 linhas |
| BaldeFurado | a portar | 265 linhas |
| DoisBalcoes | a portar | 188 linhas |
| OitentaVinte | a portar | 204 linhas |
| ServicoSolucao | a portar | 191 linhas |
| DozeMeses | a portar | 179 linhas |
| Furadeira | a portar | 97 linhas |
| abas da busca SEO · carrossel do IG · conta do 10k · olho ◎ | a portar | — |

**Marcação e CSS não bastam.** São 12 nós com comportamento; portar só a
aparência deixa todos com a cara certa e mortos por dentro — erro que não
aparece em screenshot. Confira pelo `no.comp`: nó mapeado e ausente de
`animacoes.tsx` renderiza tracejado dizendo o que falta.

**Widget de página ≠ widget de nó.** A roda era a página inteira no legado: o
CSS mede em `vw/vh` e não tem teto de largura. Dentro de um nó (1000×721 fixos)
essas unidades passam a apontar pra viewport — a roda estourou o nó e
atravessou a tela. A correção é escopo (`.fw-no`), não reescrita do desenho.
E o Alicerce **é outro nó** (`nBase`): renderizar dentro da roda duplicava a
seção.

**A receita, fixada pela Timeline:** a matemática vai verbatim — reescrever
fórmula à mão é como o defeito entra sem ninguém ver. O que muda de forma é o
markup (vira JSX) e o ciclo de vida (vira effect com `cancelAnimationFrame` no
cleanup). Mostrador que muda a 60fps é escrito por `ref`, nunca por `setState`:
a simulação roda no relógio dela, não no do React.

## 8. O que ainda não existe

- **conteúdo dos 36 passos** — a Ordem 0, travada nas Decisões 1-4
- **6 das 7 animações** — ver tabela acima
- **vistas com alvo** — o dock troca a vista, mas todas enquadram a página
  inteira; filtrar por conjunto de nós depende da Decisão 3
- **autenticação** — decisão consciente: quem tem o link cria, renomeia e apaga
  página de todo mundo. Enquanto o app for interno, o custo é baixo; no dia em
  que o aluno receber a URL, é a primeira coisa a fechar
- **banco em produção** — hoje só local; em prod é Postgres do Railway

## 9. Deploy

Hoje: `index.html` no GitHub Pages, domínio `cockpit.easybuilder.com.br`.

**O banco já decidiu o futuro disto:** GitHub Pages serve arquivo estático e não
tem como falar com Postgres. Quando o app novo assumir, o domínio vai junto pro
Railway — e *tem* que ir, veja a restrição abaixo.

**Restrição que não pode ser quebrada:** `cockpit.easybuilder.com.br` e
`app.easybuilder.com.br` compartilham o mesmo site registrável, e é por isso que
a sessão do Easy Builder viaja pro iframe embutido no board. Em `github.io` ou
`localhost` seria cross-site e quebraria. Qualquer host serve — desde que o
domínio custom continue.

Quando o app novo assumir: Railway com `output: "standalone"`, igual à área de
membros (o `next.config.ts` já está assim), + Postgres do Railway com a mesma
`DATABASE_URL` e as mesmas migrations.
