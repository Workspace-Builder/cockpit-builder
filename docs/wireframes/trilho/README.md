# O Trilho — wireframes do flywheel

Quatro perspectivas do mesmo ciclo, feitas pra escolher **uma**. Abra os arquivos
direto no navegador (são HTML puro, sem build).

| arquivo | o que é | veredito |
|---|---|---|
| [`d-estrada.html`](./d-estrada.html) | **a estrada com a roda ainda lá** — um círculo só + botão de zoom | **candidata** |
| [`b-lateral.html`](./b-lateral.html) | side-scroller plano, com minimapa | virou rascunho da D |
| [`a-velodromo.html`](./a-velodromo.html) | a roda deitada, personagem correndo na borda | descartada |
| [`c-mapa.html`](./c-mapa.html) | rota serpenteando a tela, vista de cima | descartada |

> **A `d-estrada.html` é arquivo único.** CSS, dado e script estão dentro dela —
> dá pra mandar só esse `.html` por e-mail/WhatsApp que abre e funciona.
> As outras três (A, B, C) dependem de `base.css` + `dados.js` na mesma pasta:
> são artefato de comparação, não peça pra enviar. Mandar `b-lateral.html`
> sozinho chega sem estilo e sem dado nenhum do outro lado.

`base.css` e `dados.js` existem porque **o dado é o mesmo nas quatro** — só a
pista muda. Era essa a razão de existirem quatro.

---

## O modelo (o que ficou decidido)

**A estrada é a roda desenrolada, e ela fecha em circuito.** Estrada com fim não é
flywheel, é linha do tempo.

| conceito | na estrada |
|---|---|
| fase do flywheel | trecho, com cor e placa |
| passo do ciclo (`cicloPos`) | posto — e cada posto é **um prédio** |
| item do checklist | **um andar** do prédio |
| passo 8020 | pedágio: o prédio precisa estar de pé pra passar |
| passo não-8020 | acostamento: dá pra seguir com o prédio pela metade |
| tijolo do arsenal | térreo do prédio — a loja do que você usa pra levantar |
| ciclo fechado | a volta; o km 11 devolve pro km 01 |
| **Atração** | **a descida** — o único trecho sem parada nenhuma |

A Atração ter zero passos não é buraco no dado: ela é *efeito* das outras cinco.
Numa lista isso viraria uma seção vazia; numa estrada vira a descida que o
momentum da volta anterior pagou. É o anti-prospecção, desenhado.

## O que a D resolve que as outras não resolviam

1. **O zoom é a ponte.** Longe: o círculo inteiro, com os 6 setores coloridos —
   é o flywheel de sempre. Perto: o mesmo círculo por dentro, e a curva continua
   visível no canto da tela. Não são duas telas, é uma câmera.
2. **O checklist parou de ser lista.** Marcar item acende andar. Prédio de pé =
   entregável entregue, e isso aparece **na estrada**: a rota vira o skyline do
   que você já construiu.
3. **O gate 8020 virou física.** Pedágio não é aviso, é prédio sem andar.
4. **A roda expandida gira em loop** (`g`). O rótulo fica colado no setor, então
   nasce torto embaixo e vai ficando em pé conforme sobe: o topo da roda é a
   *posição de leitura*, e o brilho de cada título é a distância até lá. Os
   números contra-giram — título pode girar, número é navegação e "6" de cabeça
   pra baixo vira "9". De quebra, **o giro é o seletor**: o posto que passa pela
   leitura vira o selecionado, e voltar pra pista aterrissa nele.

## Duas armadilhas que já custaram caro aqui

- **Não anime `stroke-width` do anel.** A primeira tentativa fazia a pista
  engordar (460 → 1400) na transição de zoom. Com o giro rodando em `rAF` ao
  mesmo tempo, o Chrome repinta o anel em blocos e cada bloco aparece numa
  espessura diferente — o anel picota inteiro. A pista tem **uma largura só**
  nos dois zooms; o que muda entre eles é opacidade e transform, nada de
  geometria.
- **O zoom de longe não pode ser número fixo.** Com `preserveAspectRatio=slice`
  o viewBox é recortado pra cobrir a janela; em tela mais baixa o círculo passa
  do rodapé. `ajustaLonge()` mede o SVG renderizado, desfaz a conta do recorte e
  calcula a escala que cabe — contando os prédios que ficam por fora do anel.

## O que ainda não existe

- **Os checklists são proposta, não conteúdo aprovado.** São a subtask
  [#9](https://app.clickup.com/t/86ajqefzc), que ainda não tem conteúdo. Foram
  derivados do campo `sub` de cada passo. A tela marca isso em toda tela.
- **`passos.ts` não tem campo `fase`.** Os 6 trechos coloridos precisam dele; hoje
  a divisão está hardcoded em `dados.js` (campo `f`), igual o wireframe antigo
  fazia. Virar código exige esse campo no dado.
- **A Decisão 3** (Flywheel é vista, faixa ou página) segue travada —
  BLUEPRINT-PAGINAS §8. O wireframe existe pra destravar; não substitui.

Prints em [`prints/`](./prints/).
