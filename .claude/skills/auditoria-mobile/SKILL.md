---
name: auditoria-mobile
description: Mede a responsividade do Cockpit Builder em telas de celular e tablet — vazamento horizontal, alvo de toque pequeno, texto miúdo, painel que engole a tela. Roda a matriz de rotas × aparelhos no Playwright, tira print de cada uma e devolve um relatório com severidade. Use ao pedir "audita mobile", "está quebrado no celular", "roda a matriz de responsividade", "print em 390px", ou antes/depois de mexer em layout, AppShell, Dock, PainelDetalhes, Obra ou globals.css.
---

# Auditoria mobile

O espelho, não o conserto. Este skill **mede** e **fotografa**; consertar é
outra conversa, e sem os números ela vira chute.

O critério é um só: **o aluno consegue ler o mapa e navegar até a etapa dele no
celular?** Não é "está bonito". Achado que não atrapalha isso é ruído.

## Antes de rodar

1. Dev server de pé: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3970/`
   deve responder `200` ou `307`. Se não, `npm run dev` (e o Postgres antes:
   `npm run db:up`).
2. Playwright MCP conectado (`mcp__playwright__*`). Sem ele, não há varredura.
3. Leia `alvos.json` — é ele que manda nas rotas, aparelhos e limites.

## O procedimento

Uma vez, antes de tudo: `mkdir -p .mobile-audit`. O `browser_take_screenshot`
resolve o caminho a partir do diretório do projeto e **não cria a pasta** — sem
isso ele falha com ENOENT no primeiro print.

Se o Playwright reclamar de *"Browser is already in use for
chrome-mcp-profile"*, sobrou um Chrome órfão de sessão anterior. Confirme com o
usuário e encerre os processos daquele perfil; o MCP reabre sozinho.

Para cada aparelho × rota de `alvos.json`, nessa ordem:

```
browser_resize(w, h)
browser_navigate(base + rota)          # navegue DEPOIS do resize
browser_evaluate(corpo de sonda.js)    # sem argumentos, é auto-contida
browser_take_screenshot(filename: .mobile-audit/<rota>-<aparelho>.png)
```

Resize antes de navegar importa: o app mede a tela na montagem (React Flow
calcula o `fitView` com a largura que existia). Redimensionar depois deixa o
canvas enquadrado pra tela errada e o print mente.

Rode a sonda inteira **na primeira combinação** — ela devolve as listas de
culpados, que é o que dá nome ao problema. Nas seguintes, corte os campos
`piores`/`culpados` para os 4 primeiros: o padrão de falha se repete entre
larguras e a lista completa só queima contexto sem mudar conclusão.

Comece pelo **iphone-se (375×667)**. Se ele já reprova em `bloqueia`, rode os
outros mesmo assim — o padrão de falha entre larguras é o que diz se o
problema é de breakpoint ou de arquitetura de layout.

`deitado` é opcional: rode quando o achado for de altura (dock colado no
rodapé, painel que não cabe, topo + canvas se atropelando).

## Como classificar o que a sonda devolve

A sonda dá números. A severidade é sua, e é sempre em cima da pergunta do
aluno:

**bloqueia** — o conteúdo é inalcançável.
- `alemDaTela.decepado === true` — o pior caso: passa da tela E não há scroll
  pra alcançar. O `overflow-hidden` da raiz apaga o conteúdo em silêncio.
- `palco.pctLargura < 50` — o mapa perdeu a tela pro cromo. Veja
  `palco.roubandoLargura` pra saber quem levou.
- `cobrindoConteudo` com `pct > 60` num painel que não dá pra fechar
- `fundamentos.metaOk === false`

**atrapalha** — dá pra usar sofrendo.
- `toque.abaixoDe32 > 0` (o dedo erra sempre). `toque.foraDaTela` conta os que
  nem tocáveis são — esses na verdade são *bloqueia*.
- `texto.abaixoDe12px` em rótulo que precisa ser lido, não em legenda decorativa
- `fundamentos.elementos100vh > 0` — a barra de endereço do celular come o
  rodapé; o dock some atrás dela. Conserto: `dvh`.

Duas leituras que a sonda **não** entrega e você tem que fazer na mão:

- **é breakpoint ou é arquitetura?** Some as larguras de `roubandoLargura` e
  veja a partir de que viewport o palco ganharia metade da tela. Se a conta der
  acima de 1000px, nenhum breakpoint salva — o layout precisa mudar de forma,
  não de medida.
- **quebrou por tela pequena ou por contagem?** Barra de N itens em linha
  rígida decepa por número de itens. Se falha no tablet com espaço sobrando, o
  bug é do componente e aparece no desktop também assim que o conteúdo crescer.

**cosmético** — anota e segue.
- `toque.abaixoDe44` entre 32 e 44
- desalinhamento, respiro, corte de sombra

## O relatório

Escreva em `.mobile-audit/relatorio-<AAAA-MM-DD>.md` (a pasta está no
`.gitignore`; nada disso entra no repo). Formato:

```markdown
# Auditoria mobile — <data>
Rodou: <n> rotas × <n> aparelhos. Server: <commit curto>

## Bloqueia (n)
- **<rota> @ <aparelho>** — <o que> · culpado: `<elemento>` · print: <arquivo>

## Atrapalha (n)
...

## Números crus
| rota | aparelho | vazamento | toque<32 | toque<44 | texto<12 | engolindo |
```

Feche com **uma** linha: o achado que, resolvido, mata a maior parte da lista.
Quase sempre há um — num layout de cabine, é o container raiz.

## O que este skill NÃO faz

- Não edita componente. Se pedirem conserto junto, entregue o relatório
  primeiro e trate o conserto como tarefa separada, com o baseline na mão.
- Não julga o `index.html` legado. Ele é referência, não alvo (AGENTS.md).
- Não mede performance, LCP, nem peso de bundle. Outro problema, outro skill.

## Repetir depois de mexer

Rode de novo com a mesma matriz e compare tabela com tabela. Número que subiu
sem ninguém pedir é regressão, e é exatamente pra isso que o baseline existe.
