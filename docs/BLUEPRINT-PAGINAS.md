# Cockpit Builder — Blueprint da Arquitetura de Páginas

> **Task:** [`86ajqefwd`](https://app.clickup.com/t/86ajqefwd) · Planejar a arquitetura de páginas do Cockpit
> **Gate:** 🚦 aprovação do CEO antes de codar — destrava 6 subtarefas
> **Base:** `DEMANDA-COCKPIT-ELVIS.md` §6 (fonte da verdade) + código atual do `index.html`
> **Autor:** Elvis Oliveira (Dev Junior) · 2026-07-29

Este documento responde **uma** pergunta: qual estrutura de páginas transforma os
45+ entregáveis do ecossistema num mapa que dá pra executar.

Não propõe layout visual (isso vem do Figma, subtarefa #8). Propõe **estrutura**.

---

## 0. Resumo em 6 linhas

1. **Uma página "A Obra"** com os 4 pilares empilhados como andares de um prédio — não 4 páginas separadas.
2. **"Uma por pilar" vira vista, não página.** O dock (teclas 1-4) enquadra cada pilar. Máquina já existe.
3. **A tag 8020 é estrutura.** Passo 8020 = viga/laje (não pode pular). Passo não-8020 = acabamento (pula, e o prédio fica menor).
4. **O Flywheel não é redundante nem é conteúdo novo** — é a *mesma* lista de passos renderizada como ciclo em vez de prédio.
5. **O nó clicável abre 3 vagas:** aula · IA · ferramenta (EB / DB / AB). Vaga vazia aparece tracejada e vira backlog visível.
6. **Uma lista de 36 passos sustenta tudo.** Cada página é uma vista filtrada. Zero conteúdo duplicado.

**As 7 decisões que precisam do seu OK estão na §8.** O resto é fundamentação.

---

## 1. O problema, na frase do CEO

> "45+ ferramentas e entregáveis. Quando tudo é importante, nada é importante." (§6.1)

O aluno hoje assiste conteúdo solto na área de membros, sem aplicação no momento
em que precisa. O Cockpit inverte: **o aluno identifica o gargalo → vai na etapa →
o mapa abre as ferramentas + aulas + IAs daquela etapa.**

Norte declarado: organizar de um jeito que fique **impossível de não conseguir
executar** (§1). Não é mapa pra olhar — é mapa pra fazer.

Consequência de arquitetura: **a estrutura tem que carregar ordem e prioridade.**
Uma lista alfabética de 45 ferramentas resolve zero. O que resolve é um caminho
com "faça isso primeiro" embutido na forma.

---

## 2. A metáfora: o prédio

Metáfora oficial = **OBRA** (§6.9 — nunca avião). O Cockpit é a cabine do guindaste;
cada objetivo é uma **obra**; "Obra 10k" é a primeira (§1).

Levando a sério: **os 4 pilares são os andares de um prédio que o aluno sobe.**

```
                          ┌─────────────────────────────┐
   COBERTURA              │  PILAR 04 · AMBIENTE        │  ← "segura os outros três"
   você / mentalidade     │  8 passos                   │
                          ├─────────────────────────────┤
   3º ANDAR               │  PILAR 03 · GESTÃO          │
   o negócio por dentro   │  8 passos                   │
                          ├─────────────────────────────┤
   2º ANDAR               │  PILAR 02 · VALOR PERCEBIDO │
   como o mercado te vê   │  11 passos                  │
                          ├─────────────────────────────┤
   TÉRREO / FUNDAÇÃO      │  PILAR 01 · ENTREGA         │
   o que sai da tua mão   │  9 passos                   │
                          └─────────────────────────────┘
                             ▲ 36 passos no total
```

A ordem vem do §6.3: *"execução → entrega → negócio → topo = VOCÊ/mentalidade
(inverte a pirâmide)"*. Você começa fazendo, e **sobe até chegar em você.**

### Por que empilhado e não lado a lado

Hoje os 4 pilares são 4 cards **na horizontal** (`PX-240 + i*640`). Quatro cards
lado a lado comunicam "quatro assuntos". Quatro andares comunicam **"você está no
2º e falta subir"** — que é a leitura que o §6.5 pede ("marcando e vendo sua evolução").

Prédio também dá o que nenhuma outra forma dá de graça: **um prédio incompleto
ainda é um prédio.** É exatamente o comportamento do 8020 (§3).

### A contradição que precisa da sua decisão

O Pilar 04 tem duas descrições que não fecham:

- §6.3 diz que ele é o **topo** ("inverte a pirâmide")
- A tese dele no código diz: *"este pilar **segura** os outros três"* — que é linguagem de fundação

Nas duas leituras a metáfora funciona, mas o prédio fica diferente:

| leitura | Pilar 04 é | significado |
|---|---|---|
| **A** — topo | cobertura / laje que amarra | você **conquista** o direito de trabalhar em si mesmo |
| **B** — base | fundação | sem mentalidade **nada** sobe; é pré-requisito |

Recomendo **A**, porque é o que o §6.3 diz explicitamente e é a leitura mais
incomum (logo, mais autoral). Mas é sua metáfora — decide você. → **Decisão 2, §8**

---

## 3. A tag 8020 = estrutura vs. acabamento

O §6.2 diz: ordenar tudo do **+8020 pro −8020**, e dar **tag visual** nos imprescindíveis.

Dentro da metáfora do prédio isso deixa de ser um selo decorativo e ganha função:

| | é | pode pular? | consequência |
|---|---|---|---|
| **8020** | estrutura — pilar, viga, laje | **não** | o andar não fecha, o prédio não sobe |
| não-8020 | acabamento — revestimento, pintura | sim | prédio de pé, **menor e menos completo** |

> Sua frase: *"pode ser um prédio menor mas não tão completo se ela não seguir o
> passo a passo do pilar."* É exatamente isso — e é o que faz a tag ter dente.

**Já existe precedente no código:** cada pilar tem hoje um passo marcado `first:1`
que renderiza o badge "FAZ PRIMEIRO" ([index.html:3536](index.html#L3536)). O 8020 é
a generalização disso — de 1 marcado por pilar para N.

E existe um segundo marcador reaproveitável: `unha:1` → badge "🔨 NA UNHA", usado
nos passos que **não têm ferramenta nem IA** (ex: "Postura", "Delegar"). Serve pra
sinalizar honestamente onde o sistema não ajuda.

```
   ┌────────────────────────────────────────────────┐
   │ ███ 1  Estratégia da página          [8020]    │  estrutura — sólido
   │ ███ 2  Copy                          [8020]    │
   │ ███ 3  Design                        [8020]    │
   │ ░░░ 4  Imagem e direção visual                 │  acabamento — tracejado
   │ ███ 5  Código e efeitos              [8020]    │
   │ ░░░ 6  Responsividade                          │
   └────────────────────────────────────────────────┘
     ▲ a barra à esquerda diz se o passo é estrutural
```

**O que falta:** quais dos 36 passos são 8020. Isso é curadoria sua, não minha —
vou levar uma proposta marcada pra você corrigir, não uma pergunta em branco.
→ **Decisão 4, §8**

---

## 4. Navegação: página ≠ vista

Aqui está a resposta pro item mais ambíguo da task ("uma página por pilar").

O Cockpit tem **dois** níveis de navegação, e eles já existem no código:

| nível | controle | o que troca | onde está |
|---|---|---|---|
| **Página** | barra lateral | o documento inteiro (`data-doc`) | `DOCS`, [index.html:4047](index.html#L4047) |
| **Vista** | dock inferior + teclas | o enquadramento dentro da página | `VIEWSET`, [index.html:3953](index.html#L3953) |

**"Uma por pilar" se resolve com vista, não com página.** A tecla `2` enquadra o
Pilar 01, a `3` o Pilar 02, e assim por diante — você tem o zoom individual de cada
pilar *sem* quebrar o prédio em quatro prédios.

Custo: 4 linhas no `VIEWSET`. A função `framePred` já faz o enquadramento por
predicado — é o que a view "Pilares" (tecla 5) já faz hoje.

### Inventário de páginas proposto

```
┌──────────────────────┐
│ 🏗 COCKPIT BUILDER   │
│                      │
│ OBRA 10K             │
│  🏗 O Método         │  ← existe. A tese: funil, conta do 10k, motor de tijolos
│  🧱 A Obra          ◀│  ← NOVA. O prédio: 4 pilares, 36 passos
│  ↻ O Ciclo           │  ← NOVA. Mesmos passos, vista cíclica (§5)
│                      │
│ SETUP AGÊNCIA 6D     │
│  ◇ Onboarding        │  ← existe. Fluxograma do processo
└──────────────────────┘
```

**4 páginas, não 7.** Grupos na sidebar já são suportados (`DOCS` tem `grupo`).

Note a divisão de trabalho entre as duas primeiras: **"O Método" responde por quê
e quanto** (o funil anti-prospecção, a conta do 10k, as esquetes). **"A Obra"
responde o que construir.** Hoje os pilares moram dentro do Método e disputam
atenção com o funil; separados, cada página tem uma pergunta só.

### Vistas de "A Obra"

```
  ⌂ Tudo    Pilar 01    Pilar 02    Pilar 03    Pilar 04      8020
   [1]        [2]         [3]         [4]         [5]         [6]
```

A vista `6 · 8020` é a que entrega o §6.2 de verdade: **enquadra só os passos
estruturais.** É o "caminho mínimo" — o aluno com pressa vê só o que não pode pular.

---

## 5. O Flywheel: mesma lista, outra forma

### Sua observação está certa — e é ela que resolve o problema

> *"acredito que pode ser redundante, porque o que eu vi é que o flywheel tinha os
> mesmos passos, só mais enxuto, no ramo de desenvolver e finalizar com o cliente.
> Não tinha etapas como trabalhar a mente. Ele funciona mais como passo a passo de
> trabalho, e o pilar a estrutura para a profissão."*

Os passos **se repetem** de propósito. O que muda não é o conteúdo — é o **eixo de tempo**:

| | O Prédio (pilares) | O Ciclo (flywheel) |
|---|---|---|
| natureza | **cumulativo** | **cíclico** |
| roda quando | uma vez — cada andar fica pronto pra sempre | **a cada cliente**, pra sempre |
| pergunta | "o que eu tenho que construir?" | "o que eu faço agora com esse cliente?" |
| escopo | a profissão inteira, mentalidade incluída | só o que repete por cliente |
| tem mentalidade? | sim (Pilar 04) | **não** — mentalidade não cicla |

Sua leitura de que "não tinha etapas como trabalhar a mente" **é a prova** de que
não é redundância: o flywheel é **menor por definição**, porque mentalidade se
constrói uma vez e não roda por cliente.

O flywheel do §6.6 é o ciclo virtuoso do funil anti-prospecção:

```
              tapa o furo do balde
                      │
                      ▼
        ┌───────►  cliente entra
        │             │
        │             ▼
   menos esforço   entrega bem
   pra próximo        │
        │             ▼
        └────── ele fica / indica
```

### Três caminhos — e o que eu recomendo

| | proposta | conteúdo duplicado? | task #7 | perda |
|---|---|---|---|---|
| **A** ✅ | **Flywheel = 2ª vista sobre os mesmos 36 passos** | nenhum | fica, e fica barata | nenhuma |
| B | Flywheel morre; vira uma faixa dentro do prédio | nenhum | fecha sem entregar | perde a leitura cíclica — que é a tese do funil anti-prospecção |
| C | Flywheel = página com conteúdo próprio (leitura literal da task) | **sim** | fica, e fica caro | a segunda edição desincroniza as duas páginas |

**Recomendo A.** É o que aproveita a sua observação em vez de contorná-la: a
sobreposição deixa de ser um defeito e passa a ser o mecanismo. E responde
literalmente o nome da subtarefa #7 — *"as funcionalidades por setor"* — porque
**as posições do ciclo *são* os setores.**

Na prática: cada passo ganha um campo `cicloPos`. Quem tem `cicloPos` aparece no
Ciclo, na ordem do ciclo. Quem não tem (mentalidade, plano de negócio) só existe
no Prédio. Um dado, duas páginas.

→ **Decisão 3, §8**

---

## 6. O nó clicável

O §6.4 é chamado no próprio documento de "o coração do dev": cada nó, ao clicar,
abre **3 coisas** — ferramentas, aulas, IAs.

### Isso já está meio-construído

Cada passo no código já carrega `chips` tipados
([index.html:3508](index.html#L3508)) — 6 tipos: `ia` `tool` `tpl` `aula` `ref` `proc`.
Exemplo real, o passo "Design" do Pilar 01:

```js
{t:'Design', sub:'Direção com intenção: arquétipo, paleta, tipografia.',
 chips:[ ['tool','Extensão EB · 1.000+ componentes', GO.recursos],
         ['ia',  'IA 09 Diretor Criativo',           GO.app],
         ['aula','Design Easy',                      GO.membros] ]}
```

Os três destinos já estão lá. A subtarefa #5 **não é construir isso** — é promover
o chip inline a um painel com estrutura fixa e legível.

### O painel proposto

Usando o seu exemplo (Diretor Criativo):

```
   ┌──────────────────────────────────────────────────┐
   │  PILAR 01 · ENTREGA            passo 3 de 9      │
   │  Design                                  [8020]  │
   │  ─────────────────────────────────────────────    │
   │  Direção com intenção: arquétipo, paleta,        │
   │  tipografia. Nunca do zero.                      │
   │                                                  │
   │  ▶  AULA        Design Easy                  ↗   │
   │  ⚡  IA          IA 09 · Diretor Criativo     ↗   │
   │  ⚙  FERRAMENTA  Extensão · 1.000+ componentes    │
   │                 ┌────┐                       ↗   │
   │                 │ EB │                           │
   │                 └────┘                           │
   │  ─────────────────────────────────────────────    │
   │  ☐ marcar como feito                             │
   └──────────────────────────────────────────────────┘
```

**Três vagas fixas, sempre nessa ordem.** A ordem importa: *aprende → pensa com a
IA → executa na ferramenta.* É a sequência pedagógica, e ela fica igual nos 36 nós
— o aluno aprende a ler uma vez e lê todas.

O `☐ marcar como feito` é o gancho da subtarefa #9 (checklists, §6.5) — o
checklist não é uma tela separada, **é o próprio nó**.

### O selo da plataforma: EB · DB · AB

Sua ideia de identificar em qual plataforma a ferramenta vive é nova e resolve um
problema real — o aluno precisa saber pra onde está sendo mandado antes de clicar:

| selo | plataforma | cobertura no código hoje |
|---|---|---|
| **EB** | Easy Builder | `app.easybuilder.com.br` — as 12 IAs e os recursos ✅ |
| **DB** | Design Builder | ⚠️ **sem URL no código** |
| **AB** | Arena Builder | ⚠️ **sem URL no código** |

→ **Decisão 5, §8**

### Vaga vazia = backlog visível

Nem todo passo tem os 3. "Postura" e "Delegar" não têm ferramenta nenhuma (já
marcados `unha:1` no código). A vaga que falta **aparece tracejada**, não desaparece:

```
   ▶  AULA        Design Easy                  ↗
   ⚡  IA          IA 09 · Diretor Criativo     ↗
   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
     ⚙  FERRAMENTA   — sem link ainda —
   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

Isso reaproveita convenção que o board já usa (os 6 nós sem destino do Onboarding
aparecem com contorno tracejado) e tem efeito colateral bom: **o mapa mostra o
próprio buraco.** A lacuna de aulas deixa de ser planilha e passa a ser visível.

---

## 7. O que sustenta tudo: uma lista, N vistas

Prédio, Ciclo e vista 8020 são **três leituras dos mesmos 36 passos**. Se cada
página tiver sua própria cópia, a segunda edição desincroniza e o projeto apodrece.

Então: **um registro por passo, e cada página é um filtro.**

```js
{ id:        'p1-design',
  pilar:     1,              // qual andar
  ordem:     3,              // posição no andar
  titulo:    'Design',
  sub:       'Direção com intenção: arquétipo, paleta, tipografia.',
  e8020:     true,           // estrutura (§3) — não pode pular
  cicloPos:  2,              // posição no flywheel; null = não cicla (§5)
  aula:      {label:'Design Easy',            url:'…'},
  ia:        {label:'IA 09 · Diretor Criativo', url:'…'},
  ferram:    {label:'Extensão · 1.000+ comp', plat:'EB', url:'…'},
  unha:      false }         // true = não tem ferramenta, é na mão
```

36 registros. E cada página cai numa linha:

| página / vista | como se deriva |
|---|---|
| A Obra | agrupa por `pilar`, ordena por `ordem` |
| vista Pilar 0N | filtra `pilar === N` |
| vista 8020 | filtra `e8020` |
| O Ciclo | filtra `cicloPos != null`, ordena por `cicloPos` |
| painel do nó | lê `aula` · `ia` · `ferram` do registro |
| checklist | escreve `feito` no registro |

Isso converge com o que o `BLUEPRINT.md` §9 já havia proposto como modelo de
dados, por outro motivo (viabilizar edição). **As duas necessidades pedem a mesma
coisa** — então o trabalho conta duas vezes.

---

## 8. As 7 decisões que precisam do seu OK 🚦

As sete não têm o mesmo peso. **Três travam tudo** — sem elas eu não escrevo linha.
As outras quatro travam **uma coisa cada**, e podem chegar depois sem parar a obra.

```mermaid
flowchart TD
    GATE(["🚦 GATE DO CEO"])

    GATE --> D1
    GATE --> D2
    GATE --> D3
    GATE --> D4
    GATE --> D567

    D1{"D1 · os 4 pilares em<br/>1 página ou em 4?"}
    D2{"D2 · Pilar 04 é cobertura<br/>ou é fundação?"}
    D3{"D3 · Flywheel: vista,<br/>faixa ou página própria?"}
    D4{"D4 · quais dos 36 passos<br/>levam a tag 8020?"}
    D567{"D5·D6·D7 · URLs de DB/AB,<br/>das aulas e das 12 IAs"}

    D1 -->|"1 página ✅"| M
    D1 -->|"4 páginas"| X1["4 docs na sidebar<br/>perde a leitura de prédio<br/>e o senso de progresso"]
    D2 --> M
    D3 -->|"vista ✅"| M
    D3 -->|"vira faixa do prédio"| X3["fecha a #7 sem entregar<br/>perde a leitura cíclica"]
    D3 -->|"página com conteúdo próprio"| X3B["36 passos em 2 cópias<br/>desincroniza na 2ª edição"]

    M["ORDEM 0<br/>lista única dos 36 passos<br/>· o modelo ·"]

    M --> T4["#4 · páginas + navegação<br/>sidebar + dock de vistas"]
    M --> T7["#7 · O Ciclo<br/>vista cíclica"]
    M --> T5["#5 · nó clicável<br/>painel de 3 vagas"]
    D567 --> T5
    D4 --> T6["#6 · tag 8020<br/>+ vista do caminho mínimo"]
    T5 --> T9["#9 · checklists por etapa"]

    FIG(["Figma do CEO<br/>pendente"]) --> T8["#8 · transpor o Figma"]

    classDef dec fill:#14AE5C22,stroke:#14AE5C,stroke-width:2px
    classDef act fill:#9747FF22,stroke:#9747FF
    classDef term fill:#75757522,stroke:#757575
    classDef mod fill:#FFCD2922,stroke:#FFCD29,stroke-width:2px
    classDef bad fill:#e7353518,stroke:#e73535,stroke-dasharray:4 3

    class D1,D2,D3,D4,D567 dec
    class T4,T5,T6,T7,T8,T9 act
    class GATE,FIG term
    class M mod
    class X1,X3,X3B bad
```

**Como ler:** losango verde = decisão sua · amarelo = o modelo de dados (§7) ·
roxo = subtarefa que destrava · tracejado vermelho = o custo de escolher a
alternativa. Mesmo vocabulário visual do board (`BLUEPRINT.md` §3).

Três coisas que o desenho mostra e a tabela não:

1. **Tudo passa pela Ordem 0.** Cinco das seis subtarefas leem da mesma lista de 36
   passos. É o gargalo real do projeto — e hoje não é subtarefa de ninguém.
2. **D4 e D5·D6·D7 são laterais.** Se as URLs demorarem, a #5 entrega o painel com
   as vagas tracejadas e o #6 espera. Nada mais para.
3. **O Figma só trava a #8.** Ele não é insumo deste blueprint — entra depois
   (é o passo 5 do §4 da demanda).

| # | decisão | minha recomendação | por quê |
|---|---|---|---|
| **1** | Os 4 pilares são **1 página com 4 faixas** ou **4 páginas**? | **1 página**, com 4 vistas no dock | O prédio só comunica "falta subir" se estiver inteiro. E "uma por pilar" fica atendido por vista (§4) |
| **2** | Pilar 04 (Ambiente/mentalidade) é **cobertura** ou **fundação**? | **cobertura** | §6.3 diz "topo, inverte a pirâmide". Mas a tese dele diz "segura os outros três" — a metáfora é sua (§2) |
| **3** | O Flywheel é **vista** sobre os mesmos passos, **morre**, ou é **página própria com conteúdo próprio**? | **vista** (opção A) | Zero duplicação, e as posições do ciclo *são* os "setores" que a subtarefa #7 pede (§5) |
| **4** | Quais dos **36 passos** levam a tag 8020? | levo uma proposta marcada pra você corrigir | A curadoria é do método, não do dev (§3) |
| **5** | **DB** (Design Builder) e **AB** (Arena Builder) têm URL? | — | Só EB está no código. Sem URL, o selo não linka (§6) |
| **6** | Aulas ficam em `easybuilder.club` ou `aulas.easybuilder.com.br`? | — | O código usa `.club`; você falou `aulas.`. Um dos dois está velho |
| **7** | As **12 IAs** têm link individual, ou tudo cai na home do app? | individual, se existir | Hoje as 12 apontam pro mesmo `app.easybuilder.com.br/` — o aluno cai na home e procura |

---

## 9. Ordem de implementação (as 6 subtarefas, reordenadas)

Com o blueprint aprovado, a ordem que minimiza retrabalho:

| ordem | o que | subtarefa | depende de |
|---|---|---|---|
| 0 | Extrair os 36 passos do código pra uma lista única (§7) | *(pré-requisito de todas)* | Decisões 1-3 |
| 1 | Páginas + navegação: sidebar + `VIEWSET` | [#4 `86ajqefwq`](https://app.clickup.com/t/86ajqefwq) | ordem 0 |
| 2 | Nó clicável: painel de 3 vagas | [#5 `86ajqefwz`](https://app.clickup.com/t/86ajqefwz) | ordem 0 + Decisões 5-7 |
| 3 | Tag 8020 | [#6 `86ajqefxn`](https://app.clickup.com/t/86ajqefxn) | Decisão 4 |
| 4 | Página do Flywheel (como vista) | [#7 `86ajqefyp`](https://app.clickup.com/t/86ajqefyp) | ordem 0 + Decisão 3 |
| 5 | Checklists por etapa | [#9 `86ajqefzc`](https://app.clickup.com/t/86ajqefzc) | ordem 2 |
| 6 | Transpor o Figma | [#8 `86ajqefz3`](https://app.clickup.com/t/86ajqefz3) | Figma chegar |

A ordem 0 não é uma subtarefa hoje. Ela é pequena (mover dado que já existe), mas
**todas as outras cinco leem dela** — se cada uma reescrever os passos por conta,
o projeto ganha 5 cópias divergentes dos mesmos 36 itens.

---

## 10. Pendências que não são minhas

Coisas que travam subtarefas e não dependem de mim:

1. **🔴 O mapa de links das aulas.** A subtarefa [`86ajrj8f2`](https://app.clickup.com/t/86ajrj8f2)
   ("verificar transcrições + criar mapa com todos os links das aulas") está
   **pendente e sem responsável**. Sem ela, um terço de cada nó (a vaga AULA) não
   tem destino — a #5 entrega dois terços.
2. **URLs de DB e AB** (Decisão 5).
3. **O Figma** — §7 da demanda ainda está com o campo em branco. Trava a #8.
   Recebi um link de board (`Fluxograma Easy Builder | Oficial`) que é um arquivo
   **diferente** do que gerou o Onboarding — precisa confirmar se é esse.
4. **Subir a `DEMANDA-COCKPIT-ELVIS.md` pro repo** (§9 da própria demanda, item
   aberto). Hoje ela só existe local, e é a referência que eu leio.

---

## 11. Correções de fonte encontradas

Divergências entre a demanda e o código. O código está mais novo:

| onde | demanda diz | código diz |
|---|---|---|
| §6.7, Venda | "**Epson** Vendedor" | **Webson** Vendedor (IA 04) — erro de transcrição da live |
| §9, pendências | acesso do Elvis ao repo pendente | já liberado ([`86ajqefw4`](https://app.clickup.com/t/86ajqefw4) resolvido) |

E uma nota de escopo: o §6.7 lista **7 grupos** de conteúdo (Posicionamento,
Execução, Negócio, Venda, Gestão, Mentalidade, Transversais) contra **4 pilares**.
"Venda" e "Transversais" não têm pilar. Na proposta deste blueprint eles caem no
**Ciclo** — Venda é literalmente o funil anti-prospecção (= o flywheel), e
Transversais é o arsenal que o §6.6 diz estar na roda. Se você discordar, isso
volta pra Decisão 3.
