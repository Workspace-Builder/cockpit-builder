# Arquitetura — Cockpit Builder

Como o app novo está montado e por que cada escolha foi feita.
Atualizado em 2026-08-03.

---

## 1. A stack, e por que essa

Next.js 16 · React 19 · TypeScript · Tailwind 4 · zustand · lucide-react. Sem
banco: os dados moram em `dados/*.json`, versionados no repositório (§6).

É o padrão da casa, mais fino ainda. Auditados quatro projetos da Builder House,
existem duas variantes:

| variante | forma | quem usa |
|---|---|---|
| **A** — SaaS pesado | Next + FastAPI + Celery/Redis + Clerk + Sentry | designbuilder2.0, workspace-builder |
| **B** — app fino | Next fullstack, sem Python | área de membros (QG), easy-builder |

O Cockpit começou como **B** com Postgres (`pg` cru, SQL numerado em
`migrations/`, igual à área de membros) e emagreceu ainda mais em 2026-08-03: o
escopo é pequeno, um editor por vez, sem concorrência real — um banco de
verdade não estava pagando o custo que cobrava (container, migration,
`DATABASE_URL`). Não tem job assíncrono nem fila, então FastAPI + Celery seria
carregar infra que ninguém usa.

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
dados/
  arvore.json            # pastas + páginas + checkpoints — A verdade
  paginas/<id>.json       # nós, arestas e gavetas de cada página
  oitenta-vinte.json     # marcações 80/20 do entregável
  passo-entregaveis.json # edições sobre a lista dos 36 passos
  legado.json · esteira.json  # scrape bruto, histórico — não lido pelo app
scripts/
  serve-legacy.mjs       # sobe o index.html em :3980 pra extrair
  extrair-imagens.mjs    # base64 → arquivo, dedupe por hash
  figjam-para-esteira.mjs # Figma → dados/esteira.json (transform puro)
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
    dados.ts             # ler/gravar/remover em `dados/` (server-only)
    queries.ts           # o único lugar que toca `dados/`
    model.ts             # os tipos — a espinha
    ids.ts               # id curto que cabe na URL
    passos.ts            # ORDEM 0: a lista única dos 36 passos (vazia)
  stores/
    useUiStore.ts        # só busca e pasta fechada — preferência, não dado
```

### O caminho do dado

```
dados/*.json → lib/queries.ts → RSC (page.tsx) → prop → componente cliente
                ↑                                        │
          app/actions.ts ←──── Server Action ────────────┘
                │
          revalidatePath("/", "layout")
```

Sem rota de API e sem cache no cliente — mudou só a caixinha da esquerda
(era Postgres). A árvore aparece na barra lateral de **todas** as rotas, então
a invalidação é do layout inteiro, não da página que mudou.

## 5. Decisões tomadas

**5.1 A rota é a fonte da verdade da página aberta.** Não existe `ativaId` no
store. Estado duplicado exigiria um effect pra sincronizar os dois na troca de
página — e effect que chama `setState` gera render em cascata (o lint da casa
barra isso). O `key={id}` na rota remonta a casca e zera vista e item
selecionado sem effect nenhum.

**5.2 O formato dos dados cresce por necessidade, não por previsão.** Começou
com a árvore (`arvore.json`) e ganhou `paginas/<id>.json` quando houve conteúdo
real pra guardar. Os 36 passos ainda moram em código (`passos.ts`), não em
`dados/`, porque ainda não têm forma definida — isso é a Ordem 0, travada nas
Decisões 1-4. Formalizar um arquivo pra dado que ainda não existe é chute que
vira migração de formato.

**5.3 Pasta fechada não vai pra `dados/`.** É preferência de quem está olhando:
se fosse dado compartilhado, fechar uma pasta fecharia pra todo mundo. Mora no
`useUiStore`, em memória. O mesmo vale pro filtro da busca.

**5.4 Server Actions, não rotas de API.** Uma camada a menos pra manter, e o
acesso a `dados/` nunca chega perto do bundle do cliente. `lib/dados.ts` e
`lib/queries.ts` são `server-only`: importar de um componente cliente vira
erro de build, não credencial vazada.

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

## 6. `dados/` — o banco é o repositório

**Mudou em 2026-08-03.** Até então a árvore morava em Postgres (decisão de
2026-07-30, revertendo o `localStorage` de antes — ver AGENTS.md). O motivo do
Postgres era legítimo (`localStorage` é por navegador; "a equipe vê o que foi
criado" não tinha resposta), mas o preço era alto pro que o escopo pedia: um
container só pra rodar local, migration numerada, `DATABASE_URL`, tudo isso
pra um editor por vez, sem concorrência de verdade e sem login.

A resposta que sobrou pra "a equipe vê o que foi criado" não foi voltar pro
navegador — foi **git**. `dados/*.json` é a fonte da verdade, versionada no
próprio repositório:

```
dados/
  arvore.json             # pastas + páginas + checkpoints
  paginas/<id>.json        # nós, arestas e gavetas de cada página
  oitenta-vinte.json      # marcações 80/20 do entregável
  passo-entregaveis.json  # edições sobre a lista dos 36 passos
```

Editar é rodar `npm run dev` local — as Server Actions gravam direto nesses
arquivos — e **commitar** o resultado. "A equipe vê o que foi criado" vira
`git pull`, não sincronização em tempo real: se duas pessoas editarem ao mesmo
tempo sem dar pull uma da outra, o desencontro aparece como merge de git, não
como corrupção de dado.

`lib/dados.ts` concentra a leitura/escrita (`ler`/`gravar`/`remover`), sempre
**síncrona** — `readFileSync`/`writeFileSync`. Não é preguiça: Node só tem uma
thread de JS, e uma chamada síncrona não cede o controle no meio de si mesma.
É o que substitui o `pg_advisory_xact_lock` que existia antes pra proteger o
teto do 80/20 — com leitura+escrita atômica por natureza, duas Server Actions
não conseguem entrelaçar e ler o mesmo estado antes de uma delas gravar.

Não há mais chave estrangeira nem `ON DELETE CASCADE`: excluir página remove
o arquivo `paginas/<id>.json` explicitamente em `queries.ts`; excluir nó
filtra as arestas e a gaveta dele do mesmo canvas na mesma escrita. A cascata
virou código, não constraint — ver `excluirPasta`, `excluirPagina` e
`excluirNo` em `lib/queries.ts`.

Nó e aresta não carregam mais um id global de banco: como cada página é o seu
próprio arquivo, uma função que recebe só o id (`estiloNo`, `excluirAresta`,
`marcarItem`...) precisa **achar** em qual página ele mora antes de gravar —
`acharPaginaDoNo`/`acharPaginaDaAresta`/`acharPaginaDaAba`/`acharPaginaDoItem`
varrem os arquivos de `dados/paginas/`. São no máximo algumas páginas; varrer
todas a cada escrita é mais barato que manter um índice separado que possa
dessincronizar.

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
- **publicação pro aluno** — hoje o app só serve quem edita, local. Virar
  página pública (HTML exportado, sem escrita, sem este servidor) é discussão
  em aberto, não iniciada nesta mudança

## 9. Deploy

Hoje: `index.html` no GitHub Pages, domínio `cockpit.easybuilder.com.br`. O app
novo (`src/`) ainda não foi publicado em lugar nenhum — quem usa roda
`npm run dev` local.

### O modo aluno (2026-08-03)

**A decisão:** o editor NUNCA vai pro ar. Roda local, na máquina de quem edita.
O que vai pro ar é uma build separada, só de leitura, gerada do mesmo código.

```bash
npm run build          # EDITOR — standalone, tudo sob demanda, escrita ligada
npm run build:aluno    # PUBLICADO — HTML estático em out/, escrita impossível
```

**O bloqueio que definiu o desenho:** `output: "export"` e Server Action não
convivem — e o problema não é a ação ser *chamada*, é ela *existir* no grafo.
O Next varre o manifesto e aborta o build se achar uma, mesmo com a UI toda
escondida. E `actions.ts` está importado no topo de 8 componentes de tela.
Esconder botão não resolveria nada.

Por isso a tranca mora no **bundler**, não na UI: `turbopack.resolveAlias`
troca `@/app/actions` por [`src/lib/acoes-vazias.ts`](../src/lib/acoes-vazias.ts)
quando `MODO=aluno`. No bundle publicado `actions.ts` simplesmente não entra —
não há escrita possível nem por caminho que a tela não mostra. O stub é tipado
`satisfies typeof import("@/app/actions")`, então **criar uma ação nova e
esquecer dele quebra o `npm run typecheck`**, que já é gate.

`PODE_EDITAR` ([`src/lib/modo.ts`](../src/lib/modo.ts)) é a segunda camada, e só
serve pro aluno não ver botão morto — é acabamento, não tranca. Sendo constante
de build, o bundler poda os ramos em vez de levá-los junto.

**O que publicar é um gesto:** `dados/publicadas.json` lista os ids que viram
HTML, e `generateStaticParams` lê dali. Página nova nasce rascunho; ela só vai
pro ar quando alguém escreve o id nessa lista. A barra lateral e o índice da
raiz filtram pela mesma lista — sem isso o aluno veria link pra página não
publicada e levaria 404.

**O que mudou de comportamento, e o preço:** `?v=` e `?andar=` eram resolvidos
no servidor. Não dá mais — ler `searchParams` força render por requisição, e no
estático não há requisição. Passaram pro cliente via
[`useParametroDaUrl`](../src/lib/useParametroDaUrl.ts) (`useSyncExternalStore`,
mesmo padrão do Motor). O custo é uma piscada curta: o checkpoint da URL acende
depois da hidratação, não no primeiro quadro.

**Página a página, literalmente, não dá.** Os chunks em `_next/static/*` têm
hash e são compartilhados entre rotas; subir só `out/p/onboarding/` quebra na
primeira mudança de bundle, e quebra em silêncio. O que existe é escolher
QUAIS páginas entram (a whitelist) e subir a pasta inteira, atômico.

**Defeito conhecido, não resolvido:** o exportador grava os payloads de
prefetch RSC como pasta aninhada (`__next.p/$d$id.txt`) e o cliente os pede
com ponto (`__next.p.$d$id.txt`). Dá 404 no console. Verificado que NÃO quebra
a tela — 176 nós renderizam, checkpoint da URL funciona, gaveta abre — mas
some com o prefetch e ainda não foi testado com duas páginas publicadas. Next
16.2.12.

**Quando o app novo assumir o domínio,** falta decidir onde a build do aluno
mora. Hoje `cockpit.easybuilder.com.br` serve o `index.html` legado da raiz do
repo, e o export colidiria com ele (`out/index.html` vs `index.html`). Duas
saídas: `basePath: '/app'` + um `.nojekyll` na raiz (obrigatório — o Jekyll do
Pages engole qualquer pasta que comece com `_`, e `_next/` sumiria inteiro), ou
um subdomínio próprio. **Não decidido.**

**Restrição que não pode ser quebrada, se e quando algo for pro ar:**
`cockpit.easybuilder.com.br` e `app.easybuilder.com.br` compartilham o mesmo
site registrável, e é por isso que a sessão do Easy Builder viaja pro iframe
embutido no board. Em `github.io` ou `localhost` seria cross-site e quebraria.
Qualquer host serve — desde que o domínio custom continue.
