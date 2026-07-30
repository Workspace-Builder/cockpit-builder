# Cockpit Builder — Blueprint

Registro do que existe, do que foi decidido e por quê, e do que está aberto.
Atualizado em 2026-07-28.

---

## 1. O que o produto é

Um **container de documentos** navegáveis em canvas infinito. Cada documento é um
board com nós posicionados e conectores. Hoje tem dois:

| doc | id | nós | origem |
|---|---|---|---|
| O Método 10k | `metodo-10k` | 56 | construído em código, ao longo do tempo |
| Onboarding do Cliente | `onboarding` | 43 | reconstruído do Figma `dy5OTiV0GoLWQUJsAVF5lt` / `443:113` |

Deploy: arquivo único `index.html` no GitHub Pages → `cockpit.easybuilder.com.br`.
Sem build, sem dependência externa, ES5.

---

## 2. Arquitetura atual

`index.html` (~4.200 linhas) com 17 blocos `<script>` independentes que se falam
por **um único global**: `window.CanvasAPI`.

```
#viewport (fixed, captura roda e arrasto)
└── #world  (transform: translate(tx,ty) scale(z))
    ├── #edgeLayer (svg)  — conectores bézier
    └── .node[data-doc][data-nid]  — um por elemento
        ├── .node-tab       — aba de arrastar (escondida na maioria)
        └── .node-content   — o conteúdo
```

**Blocos, em ordem de execução:** timeline → motor de tijolos → **engine do canvas**
→ dados base64 → funil P1 + esquetes → conta do 10k → funil P2 → 4 pilares →
onboarding → dock de views → sidebar → modo edição → modo leitura → trava de zoom.

O engine (bloco 3) é o coração: pan, zoom, seleção, arrastar, conectores,
undo/redo, persistência, enquadramento animado.

### `CanvasAPI` — superfície pública
`makeNode` `addEdge` `deleteNode` `fit` `frameIds` `framePred` `frameNode` `frameAll`
`getView` `setView` `showDoc` `docOf` `syncEdgeVis` `updateEdges` `onSel` `getSel`
`selecionar` `worldCenter` `zTop`

> `onSel`/`getSel` estão inertes hoje — foram adicionados para um editor que ainda
> não existe. Remover se o editor não for adiante.

### Documentos
Cada nó recebe `data-doc` na criação, lendo o global `window.__DOC`.
`showDoc(id)` mostra/esconde por `display` e re-enquadra. Conectores acompanham.
Deep-link por hash: `#onboarding`.

---

## 3. Vocabulário visual do fluxograma

Extraído do Figma e transformado em CSS reutilizável. **Este é o ativo mais
importante do trabalho do Onboarding** — qualquer fluxograma futuro usa o mesmo
dicionário, e quem aprende a ler uma vez lê todos.

| classe | forma | cor | significado |
|---|---|---|---|
| `.fx-term` | pílula | `#757575` | terminal — entrada/saída de fase |
| `.fx-act` | retângulo | `#9747FF` | ação operacional (você executa) |
| `.fx-doc` | retângulo | `#FFC7C2` | documento/artefato gerado |
| `.fx-reg` | paralelogramo | `#FFC7C2` | lançamento em registro |
| `.fx-in` | paralelogramo | `#14AE5C` | input — alguém preenche |
| `.fx-dec` | losango | `#14AE5C` | decisão binária |
| `.fx-db` | cilindro | `#FFCD29` | repositório |
| `.fx-copy` | retângulo | `#FFCD29` | ação da trilha paralela (Copy) |
| `.fx-lane` | bloco translúcido | `#FFCB28` | swimlane / agrupador |

Conector sólido = fluxo principal · tracejado = secundário/retorno · vermelho
(`.efail2`) = caminho de reprovação.

Cores conferidas por amostragem de pixel nos PNGs exportados do Figma, não a olho.

---

## 4. Padrões técnicos descobertos

Coisas que custaram investigação e não devem ser redescobertas.

### 4.1 Iframe: renderizar grande e reduzir, nunca espremer
Espremer um iframe **corta** a página (barra horizontal, conteúdo decepado).
A solução é renderizar na largura lógica natural e reduzir por `transform: scale()`.

```js
ifr.style.width  = LOGICA + 'px';
ifr.style.height = (ALTURA_ALVO / k) + 'px';
ifr.style.transformOrigin = '0 0';
ifr.style.transform = 'scale(' + (LARGURA_ALVO / LOGICA) + ')';
```

| conteúdo | largura lógica | por quê |
|---|---|---|
| Google Docs | **816px** | largura de página A4 |
| site responsivo | **1280px** | viewport desktop — abaixo disso o site serve layout mobile |

### 4.2 Card redimensionado ancora pela base e pelo centro
Ancorar pelo topo-esquerdo faz o card crescer **para baixo**, invadindo o fluxo.
Como a altura só se sabe depois do layout, medir num `requestAnimationFrame`:

```js
n.style.top = (BASE_ORIGINAL - conteudo.offsetHeight) + 'px';
n.style.left = (CENTRO_X - conteudo.offsetWidth/2) + 'px';
```

### 4.3 Chrome da janela desloca a imagem
A janela `.winw` tem barra de título (~28px) que o Figma não tinha. Sem compensar,
o print cai 28px abaixo do original. Constante `CHROME=28`.

### 4.4 Escudo do iframe
Iframe engole a roda do mouse — nenhum `preventDefault` do documento pai alcança,
então Ctrl+roda vira zoom do navegador. Solução: overlay transparente que torna o
iframe inerte até receber um clique. Clique fora ou Esc re-arma. É o que Figma e
Miro fazem com conteúdo embutido.
**Efeito colateral bom:** volta a ser possível arrastar o nó pegando na área do iframe.

### 4.5 Zoom é do canvas, nunca da página
Trava global em captura: `Ctrl/⌘ + roda` e `Ctrl +/−` cancelados na janela inteira.
`Ctrl+0` deixado livre de propósito — é a saída se o navegador abrir já com zoom.

### 4.6 Embed de terceiros — o que passa
Testado por header e por render real:

| destino | embeda | observação |
|---|---|---|
| `docs.google.com/.../preview` | sim | limpo, só o documento |
| `docs.google.com/.../edit` | sim | mas arrasta toda a UI do Google — inútil |
| `drive.google.com/file/d/ID/preview` | sim | equivalente ao `/preview` |
| `forms.clickup.com` | sim | — |
| `form.jotform.com` | sim | — |
| `juniorlorenzi.com.br` | sim | — |
| `app.easybuilder.com.br` | sim* | *redireciona pra `/login` sem sessão |

**Detalhe que só funciona por causa do domínio custom:** `cockpit.easybuilder.com.br`
e `app.easybuilder.com.br` compartilham o mesmo site (`easybuilder.com.br`). O bloqueio
de cookie em iframe é por *site*, não por origem — então a sessão do EB viaja pro
iframe. No `github.io` ou em `localhost` seria cross-site e quebraria.
**Consequência:** aluno logado vê o app; quem for aprovar vê tela de login. Precisa
de fallback.

---

## 5. Bugs encontrados e corrigidos

| onde | defeito | correção |
|---|---|---|
| `linkify()` e olho do card | posição do `pointerdown` guardada e **nunca zerada** — o clique seguinte comparava com coordenada velha e era engolido em silêncio se o board tivesse panado | consumir (`d=null`) no clique |
| marquee de seleção | errava 264px com a sidebar aberta (não somava o offset do viewport) | somar `vp.getBoundingClientRect().left/top` |
| roda do mouse | só andava na vertical — `deltaX` só existe em trackpad | `⇧ + roda` = horizontal |
| `fit()` / `bboxOf()` | contavam nós escondidos de outros documentos | pular `display:none` |

---

## 6. Conteúdo mapeado

### Contrato
- abrir: `docs.google.com/document/d/17UN1_UhV0bS2Fqa_9hWhVJGdzpKSr3zi/edit?usp=sharing`
- embutir: mesma URL com `/preview`

### Briefings — 7 abas no navegador do nó "Preencher Briefing"
| aba | destino |
|---|---|
| ✍️ Captura | `forms.clickup.com/9007068676/f/8cdtxg4-4633/XQXBKR08XN0T32ULJK` |
| 🧱 Vendas | `forms.clickup.com/9007068676/f/8cdtxg4-3153/NCLA70CTUCM70U0GVR` |
| 🌐 Site | `form.jotform.com/241658769271065` |
| 🚀 Copy | `juniorlorenzi.com.br/briefing-com-copy/` |
| 🎯 Sessão | `juniorlorenzi.com.br/briefing-pagina-se/` |
| 📋 Geral | `juniorlorenzi.com.br/formulario/` |
| 🎉 Parabéns | `juniorlorenzi.com.br/parabens-briefing-enviado/` |

### Pendente
- **Vídeo Página de Obrigado** — único item do módulo ainda sem link
- 6 nós do fluxo sem destino, marcados no board com contorno tracejado:
  Solicitar Pagamento · Nota Fiscal · Criar Tarefa ClickUp · Criar grupo ·
  Criar Drive · Enviar para aprovação

### Correção de fonte
A anotação do Figma estava desatualizada: tinha "Briefings Institucional"
(não existe mais) e faltavam Contrato e Vídeo Página de Obrigado. O board já
usa a lista nova; **o Figma é que precisa ser atualizado.**

---

## 7. Decisões tomadas

1. **Um HTML só, com páginas por `data-doc`** — em vez de arquivo por documento.
   Motivo: prático para levar à aprovação, sem servidor nem roteador.
2. **Sidebar por manifesto estático** (`DOCS`, array no código) — não precisa de
   banco para ter N documentos. Banco só é necessário se o usuário criar documento
   pela interface.
3. **Reconstruir o fluxograma como nós nativos**, não colar os 68 PNGs exportados
   do Figma. PNG não escala, não tem hover, não linka, não tem tema.
   Só as 14 evidências (prints reais) entraram como imagem.
4. **Preview inline, não modal.** O olho `◎` alterna print ⇄ documento ao vivo
   dentro do próprio card.
5. **Não adotar biblioteca de canvas.** Ver seção 8.

---

## 8. Motor: as 5 arquiteturas avaliadas

| | iframe vivo | sem build | reusa os 100 nós | formas prontas |
|---|---|---|---|---|
| **1. DOM + SVG** *(atual)* | sim | sim | sim | fazer (~15 em CSS) |
| 2. Canvas 2D (Excalidraw) | **não** | sim | não | sim |
| 3. SVG (draw.io/mxGraph) | frágil | sim | reescrever | sim, enorme |
| 4. SDK pronto (tldraw) | parcial | **não** | não | sim |
| 5. WebGL + WASM (Figma) | não | não | não | — |

**Escolha: 1.** O requisito de iframe vivo elimina a 2; "sem build" elimina a 4.
O que falta para virar editor não é motor — é modelo de dados e painéis.
Formas curvas saem de máscara SVG em CSS (`mask-image` com
`preserveAspectRatio="none"`), que escala igual a path.

Da biblioteca externa vale pegar **a especificação, não o código**: ISO 5807 / ANSI
(símbolos clássicos) e BPMN 2.0. O vocabulário atual já cobre 8 dos ~12 clássicos.
Faltam: conector de página, documento múltiplo, preparação, entrada manual, atraso.

---

## 9. O que o editor exigiria

### O buraco estrutural
O board **não tem modelo de dados** — tem DOM. Um nó nasce de
`makeNode(titulo, elementoDOM, x, y, id)`, e o que vai pro `localStorage` é posição
mais **HTML serializado** (`el.outerHTML`).

Isso aguenta arrastar coisa e escrever num post-it. Não aguenta editor:
- **cor e texto são marcação, não propriedade** — trocar cor exigiria parsear HTML salvo
- **página não é dado** — `DOCS` está no código; não dá pra criar página em runtime
- **camada não existe** — ordem é `zIndex = ++zTop`, contador nunca persistido

### Modelo proposto
```js
{ v:1,
  paginas:[{id, nome, grupo, ordem, codigo?}],
  nos:[{id, pag, tipo, x, y, w, h, txt, cor, corTxt, fs, fw, ta, z}],
  arestas:[{id, pag, de, para, tracejada, lados, rotulo}] }
```
Com isso cada feature vira uma view sobre o modelo: biblioteca escreve `nos`,
inspetor edita `cor`/`txt`, camadas reordena `z`, sidebar lê `paginas`.
100 nós dão ~30KB — contra `outerHTML`, que estoura a cota de 5MB rápido.

### Ordem sugerida
1. modelo + persistência + exportar/importar
2. páginas: criar, renomear, duplicar, excluir, reordenar
3. biblioteca de formas (paleta)
4. inspetor: texto, cor, tamanho, formatação básica
5. camadas
6. snap e guias de alinhamento — *é o que mais dá "cara de Figma" pelo custo*

---

## 10. Aberto — precisa de decisão

1. **O editor mexe nas páginas de código?** Método 10k e Onboarding vêm do Figma
   via código. Se o editor os altera, a próxima mudança no código conflita com o
   que ficou salvo. Alternativa: editor só cria páginas novas; as de código ficam
   somente-leitura.
2. **Como a equipe vê o que foi criado?** `localStorage` é por navegador — cada
   pessoa abre e vê vazio. Ou exportar/importar JSON, ou banco. Não há meio-termo,
   e isso decide o tamanho do projeto.
3. **Criar página serve pra quê?** Documentar mais processos como o Onboarding
   exige pouco. Desenhar livre exige muito mais.
4. **Mobile entra?** O board hoje é inutilizável em celular: não há pinch,
   só pan, e o mundo tem ~9.000px de largura.

---

## 11. Dívida técnica conhecida

- **8 loops `requestAnimationFrame` permanentes** (6 esquetes + timeline + roda),
  sem `IntersectionObserver` nem gate de visibilidade — animam a 60fps fora da tela
- **~1 MB de base64** numa única linha do HTML, bloqueante, sem lazy-load
- **`data-nid` derivado do título** — renomear um nó quebra silenciosamente sua
  posição salva e sua presença nas views
- **duas fontes de verdade para posição** — o código posiciona, o `DEFAULT_STATE`
  reposiciona por cima; as coordenadas no código são ficção
- **helpers duplicados** (`h`, `zone`, `note`, `hideTab`, `qlink`) em 4 IIFEs
- **`plano-4-pilares.html`** — 306 linhas órfãs, não linkadas de lugar nenhum
