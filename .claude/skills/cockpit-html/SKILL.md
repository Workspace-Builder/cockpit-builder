---
name: cockpit-html
description: >
  Pipeline completo de extração de aula para o Cockpit Builder. Classifica a aula na taxonomia
  (pistão + etapa do funil + tipo), persiste o insumo bruto, decompõe em paredes e tijolos
  associados a cadeias de execução, mescla nos cômodos da obra e gera o HTML de apoio.
  Usa subagentes isolados para não acumular contexto entre aulas.
  Use quando: "gera o html da aula", "cockpit html", "extrai a aula", "processa a aula",
  "processa o lote de aulas", ou quando o usuário colar um output do NotebookLM com blocos
  RESULTADO/PLATAFORMA/AÇÕES.
---

# Cockpit HTML — Pipeline de Extração de Aula

## Missão

Transformar o output do NotebookLM nos 3 artefatos do Cockpit Builder, com contexto isolado por aula para que a aula 47 tenha a mesma precisão da aula 1.

```
Output NotebookLM
  → FASE 0: Classificar (pistão + etapa do funil + tipo)
  → FASE 1: Persistir insumo bruto  → extracoes/{curso}/{modulo}/aula-XX-raw.md
  → FASE 2: Mesclar nos cômodos     → obras/{obra}/{comodo}.md      [SUBAGENTE por cômodo]
  → FASE 3: Gerar HTML da aula      → htmls/{curso}/XX-slug.html    [SUBAGENTE]
  → FASE 4: Atualizar índices       → _indice-aulas.yaml + _index.md
```

---

# ⚠️ REGRA DE CONTEXTO — a mais importante desta skill

**O contexto do orquestrador precisa ficar leve.** Processar aula após aula na mesma sessão degrada a precisão da mesclagem — o modelo passa a duplicar tijolo e a confundir paredes.

## O que o orquestrador NUNCA carrega

| Nunca ler no orquestrador | Motivo | Quem lê |
|---------------------------|--------|---------|
| Templates HTML (`mockup-*.html`) | 38KB e 29KB — envenena o contexto | Subagente da FASE 3 |
| Conteúdo dos cômodos | Cresce a cada aula processada | Subagente da FASE 2 |
| HTMLs já gerados | Nunca são necessários | Ninguém |
| Transcrições completas | O NotebookLM já comprimiu | Ninguém |

## O que o orquestrador carrega

- `taxonomia.yaml` (10KB, fixo)
- `obras/{obra}/_cadeias.yaml` (pequeno, fixo)
- `extracoes/_indice-aulas.yaml` (índice leve — nunca o conteúdo dos arquivos)
- O output do NotebookLM da aula atual

## O que os subagentes devolvem

**Apenas resumos estruturados. Nunca conteúdo.**

Um subagente de mesclagem devolve `{comodo, tijolos_novos: 3, tijolos_enriquecidos: 1, paredes: [...]}` — não o arquivo. Um subagente de HTML devolve `{path, secoes: 4, acoes: 11}` — não o HTML.

## Lote de aulas

Se o usuário pedir para processar várias aulas: **uma aula por vez, ciclo completo, e limpar as variáveis da aula anterior antes de começar a próxima.** Nunca carregar duas aulas simultaneamente.

---

## Arquivos governantes

Ler **antes** de qualquer operação:

| Arquivo | Define |
|---------|--------|
| `workspace/bus/easy-builder/cockpit-builder/taxonomia.yaml` | Pistões, etapas do funil, cômodos, categorias, tipos de aula |
| `workspace/bus/easy-builder/cockpit-builder/obras/{obra}/_cadeias.yaml` | Cadeias de execução (entregáveis que atravessam cômodos) |

**Nunca inventar valor que não esteja nesses arquivos.** Se algo não encaixar, perguntar ao usuário.

## Input esperado

```
---
RESULTADO: [resultado concreto e contável]
PLATAFORMA: [Instagram, Meta Ads, Site, WhatsApp, etc.]

AÇÕES:
1. [Nome da ação]
   Como fazer:
   - [Passo 1]
   - [Passo 2]
   Contexto da aula: [frase do professor]

DEPENDE DE: [outro resultado ou "nada"]
REFERENCIA CRUZADA: [PILAR: X > Y]
---
```

No final: DECISÕES PENDENTES, PRÉ-REQUISITOS e REFERÊNCIAS CRUZADAS. Múltiplas rodadas vêm separadas por `---` — mesclar antes de processar.

---

# Hierarquia — o modelo mental

| Nível | O que é | Onde vive |
|-------|---------|-----------|
| **Obra** | Projeto macro | `obras/{obra}/` |
| **Cadeia** | Entregável que atravessa cômodos | `_cadeias.yaml` |
| **Cômodo** | Plataforma/canal | `obras/{obra}/{comodo}.md` |
| **Parede** | Resultado concreto e contável | Seção dentro do cômodo |
| **Tijolo** | Ação micro autossuficiente | Checkbox dentro da parede |
| **Checklist** | Passo a passo do tijolo | Sub-checkboxes |

**A cadeia é o que costura tudo.** Sem ela, cada cômodo é uma ilha e ninguém enxerga que o carrossel do Instagram é o passo 2 do funil que termina no WhatsApp.

`RESULTADO` do NotebookLM = **Parede**. `PLATAFORMA` = **Cômodo**. `AÇÃO` = **Tijolo**.

---

# FASE 0 — Classificar a aula

Coletar 6 metadados. Perguntar o que não foi informado.

| Campo | Como obter | Valores |
|-------|-----------|---------|
| `curso` | Perguntar | `taxonomia.yaml > cursos` |
| `modulo` | Perguntar | `taxonomia.yaml > cursos[].modulos` |
| `numero_aula` | Perguntar (2 dígitos) | — |
| `tipo` | Derivar | `pratica` \| `conceitual` \| `hibrida` |
| `pistao` | Derivar, confirmar | `taxonomia.yaml > pistoes` |
| `etapa_funil` | Derivar, confirmar | `taxonomia.yaml > etapas_funil` |

## Derivar o TIPO

| Situação | Tipo | Template |
|----------|------|----------|
| 3+ ações concretas | `pratica` | `mockup-html-aula.html` |
| 0-2 ações, muito conceito | `conceitual` | `mockup-html-insight.html` |
| Conceito forte E 3+ ações | `hibrida` | Prático + hero quote no topo |

## Derivar o PISTÃO

| A aula é sobre... | Pistão |
|-------------------|--------|
| Design, construção, qualidade da entrega | `entrega-alto-valor` |
| Posicionamento, percepção, ticket, portfólio | `valor-percebido` |
| Processos, organização, contratos, financeiro | `gestao-eficiencia` |
| Mentalidade, comunidade, disciplina | `ambiente-mentalidade` |

## Derivar a ETAPA DO FUNIL

| A aula trata de... | Etapa |
|--------------------|-------|
| Conteúdo, tráfego, fazer aparecer | `atracao` |
| Bio, portfólio, prova, link na bio | `percepcao` |
| Filtrar lead, diagnóstico, descobrir se pode pagar | `qualificacao` |
| Oferta, objeções, fechamento, preço | `negociacao` |
| Executar o serviço, prazo, qualidade | `entrega` |
| Indicação, recorrência, LTV | `retroalimentacao` |

**Confirmar pistão e etapa com o usuário.** Se cobre mais de uma etapa, escolher a dominante e anotar as outras em `etapas_secundarias`.

---

# FASE 1 — Persistir o insumo bruto

Salvar o output **sem modificar**:

```
extracoes/{curso}/{modulo}/aula-{XX}-raw.md
```

```markdown
---
curso: easy-sales
modulo: planejamento
numero_aula: "03"
titulo_original: "Generalista VS Especialista"
tipo: conceitual
pistao: valor-percebido
etapa_funil: percepcao
etapas_secundarias: []
extraido_em: "2026-08-04"
notebooklm_rodadas: 1
---

# Aula 03 — Generalista VS Especialista

> Output bruto do NotebookLM. Não editar — é o insumo original.

[OUTPUT INTEIRO, SEM ALTERAR]
```

---

# FASE 2 — Mesclar nos cômodos (SUBAGENTE por cômodo)

## Passo 2.1 — Agrupar por cômodo no orquestrador

Ler as PLATAFORMAS do output e mapear para cômodos via `taxonomia.yaml`. Agrupar os blocos RESULTADO por cômodo. Se aparecer plataforma sem cômodo correspondente, **perguntar antes de criar**.

## Passo 2.2 — Resolver as cadeias

Para cada RESULTADO (parede), verificar em `_cadeias.yaml` se ele corresponde a um passo de alguma cadeia existente (comparar pelo nome do resultado).

| Situação | Ação |
|----------|------|
| Bate com um passo existente | Registrar `cadeia` + `posicao` na parede |
| Não bate, mas parece sequência que atravessa cômodos | **Registrar como proposta** e seguir (ver abaixo) |
| Não bate e é isolado | Parede sem cadeia — é válido, seguir |

### Cadeia nova: registrar, não travar

**Quem roda a skill é o Elvis. Ele não decide arquitetura de cadeia — mas também não pode parar.**

Quando surgir uma sequência que atravessa cômodos e não existe em `_cadeias.yaml`:

1. **Não criar a cadeia.** A parede entra no cômodo sem cadeia declarada — isso é válido e não quebra nada.
2. **Registrar a proposta** em `obras/{obra}/_cadeias-propostas.yaml`:

```yaml
propostas:
  - id_sugerido: prospeccao-ativa
    nome_sugerido: "Prospecção Ativa via WhatsApp"
    origem: "Easy Sales · Técnicas de Venda · Aula 01"
    motivo: "A aula descreve uma sequência Instagram → WhatsApp → Reunião que não bate com nenhuma cadeia existente"
    passos_observados:
      - { comodo: instagram, parede: "lista-de-prospects-montada" }
      - { comodo: whatsapp, parede: "script-abordagem-enviado" }
      - { comodo: reuniao, parede: "call-diagnostico-realizada" }
    status: aguardando_ceo
```

3. **Avisar no relatório final** da aula: `⚠️ 1 cadeia nova proposta — CEO precisa revisar antes de virar oficial`

O CEO revisa as propostas em lote e promove as que fizerem sentido para `_cadeias.yaml`. Depois disso, rodar a skill de novo naquelas aulas associa as paredes — ou o CEO edita direto os cômodos.

**Nunca criar cadeia sozinha.** Uma cadeia errada contamina o mapa inteiro do Cockpit.

## Passo 2.3 — Disparar um subagente por cômodo

**Um subagente por cômodo tocado.** Cada um recebe apenas o necessário e devolve só um resumo.

Prompt do subagente:

```
Você vai mesclar tijolos novos no cômodo {comodo} da obra {obra}.

ARQUIVO ALVO: workspace/bus/easy-builder/cockpit-builder/obras/{obra}/{comodo}.md
(se não existir, criar do zero seguindo o formato abaixo)

ORIGEM DOS TIJOLOS: {curso} · {modulo} · Aula {XX}
CLASSIFICAÇÃO: pistão {pistao} · etapa {etapa_funil}

PAREDES E TIJOLOS A MESCLAR:
{blocos RESULTADO daquele cômodo, com as cadeias já resolvidas}

REGRAS DE MESCLAGEM:
- Tijolo novo com o MESMO resultado de um existente → ENRIQUECER o existente
  (adicionar passos ao checklist, detalhar a descrição). NÃO criar duplicata.
- Tijolo com resultado DIFERENTE → adicionar como tijolo novo na parede correta
- Mesma ação vinda de 3 aulas = 1 tijolo com checklist mais rico
- Toda parede começa com categoria Setup se for a primeira do cômodo
- Marcar a origem de cada tijolo e de cada enriquecimento

FORMATO DO CÔMODO: {ver seção "Formato do cômodo" abaixo}

RETORNE APENAS este JSON, nada mais:
{"comodo": "...", "tijolos_novos": N, "tijolos_enriquecidos": N,
 "paredes": ["nome da parede 1", "..."], "cadeias_tocadas": ["..."]}
```

O subagente lê o cômodo, escreve o cômodo, e devolve o JSON. **O orquestrador nunca vê o conteúdo do arquivo.**

## Formato do cômodo

```markdown
---
comodo: instagram
obra: bootcamp-10k
pistoes: [valor-percebido]
etapas_funil: [atracao, percepcao]
cadeias: [funil-7-reais]
paredes: 2
tijolos: 3
fontes:
  - "Easy Sales · Posicionamento · Aula 18"
atualizado_em: "2026-08-04"
---

# Instagram 📸

---

## Conta profissional configurada
`categoria: setup` · `pistão: valor-percebido` · `etapa: percepcao`
`cadeia: funil-7-reais` · `posição: 1 de 5`

Pré-requisito para qualquer ação neste cômodo.

### - [ ] Configurar bio do Instagram com nicho + resultado + CTA e 3 destaques
**Como fazer:** transformar o perfil em vitrine que o lead entende em 3 segundos — quem você atende, o que entrega, e o próximo passo.

- Ir em Configurações > Conta > Mudar para profissional > Categoria: Designer
- Bio: o que faz + pra quem + resultado + CTA
- Foto profissional (não logo)
- Criar 3 destaques: Portfólio, Processo, Depoimentos
- Remover posts de "designer para designer"

> O perfil é onde o lead valida se você é profissional antes de responder
> — *Easy Sales · Posicionamento · Aula 18*

---

## 1 carrossel de dor publicado
`categoria: posts` · `pistão: valor-percebido` · `etapa: atracao`
`cadeia: funil-7-reais` · `posição: 2 de 5`

Depende de: Conta profissional configurada
Ref cruzada: Pilar Posicionamento > Conteúdo intencional de atração

### - [ ] Criar carrossel estático de dor (atraso de designer) com referências visuais do infoprodutor na capa
**Como fazer:** produzir o criativo que vai ser turbinado depois. Precisa falar da dor do cliente e usar linguagem visual que o infoprodutor já reconhece.

- Identificar dor principal do ICP: atrasos de prazo, sumiço de designer
- Capa com referências familiares ao infoprodutor
- Sem imagens abstratas de Pinterest
- Publicar SEM música (música bloqueia turbinar por direitos autorais)
- Última lâmina: CTA direto pro produto

> Posts que atacam a dor atraem leads prontos pra pagar
> — *Easy Sales · Planejamento · Aula 03*
```

**As linhas de cadeia e posição são obrigatórias quando a parede pertence a uma cadeia.** É isso que permite ler o cômodo isolado e entender onde ele está no mapa.

## Passo 2.4 — Setup automático

Todo cômodo começa com parede de **Setup**. Se o NotebookLM não mencionar setup para um cômodo novo, o subagente injeta uma parede de setup genérica marcada com `origem: injetado pela skill`.

---

# FASE 3 — Gerar o HTML (SUBAGENTE)

Disparar **um subagente** que lê o template e escreve o HTML. O orquestrador nunca carrega o template.

Prompt do subagente:

```
Você vai gerar o HTML de apoio da aula {XX} — {titulo} do curso {curso}.

TEMPLATE (ler e seguir a estrutura e o CSS exatamente):
workspace/bus/easy-builder/cockpit-builder/{template}

SALVAR EM:
workspace/bus/easy-builder/cockpit-builder/htmls/{curso}/{XX}-{slug}.html

BADGES DO HEADER: {pistao} · {etapa_funil} · {tipo}

CADEIA DE EXECUÇÃO (bloco no topo, antes das seções):
{cadeia com nome, descrição e passos — ou "nenhuma" se a aula não pertence a cadeia}

DADOS DAS SEÇÕES:
{blocos RESULTADO agrupados por plataforma, com paredes e cadeias resolvidas}

RETORNE APENAS: {"path": "...", "secoes": N, "paredes": N, "acoes": N}
```

## Estrutura obrigatória do HTML

```
badges (pistão + etapa + tipo)
título + subtítulo
contexto da aula (entregáveis + pré-requisitos + objetivo)
CADEIA DE EXECUÇÃO          ← bloco visual com os passos clicáveis
barra de progresso
seções por plataforma (id="plat-{comodo}")
  PAREDE (id="parede-N")    ← subtítulo nomeado + "Cadeia X · passo N"
    action-cards            ← checkbox + categoria + título + descrição + sub-checklist + insight
referências cruzadas
footer
```

## Mapeamento NotebookLM → HTML

| NotebookLM | HTML |
|------------|------|
| PLATAFORMA | Seção de plataforma com `id="plat-{comodo}"` |
| **RESULTADO** | **Parede nomeada com `id="parede-N"` — título visível, não implícito** |
| AÇÃO (nome) | Título do action-card |
| **Contexto da aula** | **Descrição logo abaixo do título (`.action-description`)** |
| Como fazer | Sub-checklist |
| DEPENDE DE | Ordenação das seções |
| REFERÊNCIA CRUZADA | Card "Veja também" |
| PRÉ-REQUISITOS | Bloco de contexto |
| DECISÕES PENDENTES | **Não incluir** — é para o time |

## Regras não-negociáveis do HTML

1. **Toda parede tem título visível.** Nunca agrupamento implícito.
2. **Todo action-card tem descrição** entre o título e o sub-checklist. Se o `Contexto da aula` vier vazio, derivar dos passos "Como fazer".
3. **Bloco de cadeia no topo** quando a aula pertence a uma cadeia, com os passos linkados às paredes por âncora.
4. **Cada passo da cadeia acende** quando todas as ações daquela parede são marcadas (JS do template já faz isso).
5. HTML **self-contained** — CSS inline, só a font Inter externa.

## Título autossuficiente

**Padrão: ação + contexto + resultado esperado**

| ERRADO | CERTO |
|--------|-------|
| "Configurar perfil" | "Configurar bio do Instagram com nicho + resultado + CTA e 3 destaques" |
| "Turbinar post" | "Turbinar carrossel de dor com R$7/dia por 7 dias para aquecimento de pixel" |

Se o NotebookLM trouxer ação vaga, enriquecer com o contexto dos passos.

## Título da aula

Resumir **o que o Builder constrói**. Não genérico.

| ERRADO | CERTO |
|--------|-------|
| "Aula de Tráfego" | "Funil de Tráfego com R$7/dia" |
| "Como vender mais" | "Máquina de Prospecção via WhatsApp" |

## Tipo conceitual

| Transcrição | Página de Insight |
|-------------|-------------------|
| Frase mais forte do professor | Hero quote |
| Conceitos centrais | Insight cards com categoria |
| Contrastes ("X vs Y") | Bloco de comparação VS |
| Frameworks mentais | Seção "Modelo Mental" |
| Aplicação mencionada | Callout "Na prática →" |

Categorias: `cat-decisao`, `cat-principio`, `cat-erro`, `cat-modelo`, `cat-insight`, `cat-metrica`.

---

# FASE 4 — Atualizar índices

## Índice de aulas

Append em `extracoes/_indice-aulas.yaml`:

```yaml
  - curso: easy-sales
    modulo: planejamento
    numero: "03"
    titulo_original: "Generalista VS Especialista"
    titulo_cockpit: "Generalista VS Especialista"
    tipo: conceitual
    pistao: valor-percebido
    etapa_funil: percepcao
    comodos_alimentados: [instagram]
    cadeias_tocadas: [funil-7-reais]
    tijolos_novos: 2
    tijolos_enriquecidos: 1
    raw: "extracoes/easy-sales/planejamento/aula-03-raw.md"
    html: "htmls/easy-sales/03-generalista-vs-especialista.html"
    drive: ""
    area_membros: ""
    processado_em: "2026-08-04"
```

## Índice da obra

Regenerar `obras/{obra}/_index.md` a partir de `_cadeias.yaml` + frontmatter dos cômodos. **Nunca escrever à mão.** Deve conter: tabela de cômodos com contagens, as cadeias com seus passos e o cômodo de cada um, e as fontes.

## Relatório final

```
Aula processada: {curso} · {modulo} · Aula {XX} — {titulo}

Classificação:
  Pistão: {pistao}  ·  Etapa: {etapa}  ·  Tipo: {tipo}
  Cadeia: {cadeia} (passos {N}-{M})

Artefatos:
  ✓ extracoes/{curso}/{modulo}/aula-XX-raw.md
  ✓ obras/{obra}/{comodo}.md  ({N} tijolos novos, {M} enriquecidos)
  ✓ htmls/{curso}/XX-slug.html

Próximo passo:
  1. Revisar o preview do HTML
  2. Salvar no Drive na pasta do curso
  3. Colar na área de membros
  4. Trocar o título da aula se o original for genérico
  5. Marcar a subtask no ClickUp
```

---

# Regras invioláveis

- **NUNCA carregar templates ou cômodos no orquestrador** — só subagentes leem
- **NUNCA processar duas aulas no mesmo contexto**
- **NUNCA inventar ação** que não está no output do NotebookLM
- **NUNCA mudar números** do professor (R$7 = R$7, 6% = 6%)
- **NUNCA criar cadeia nova sozinha** — registrar em `_cadeias-propostas.yaml` e seguir
- **NUNCA criar cômodo ou categoria** fora da taxonomia sem perguntar ao usuário
- **NUNCA duplicar tijolo** — mesma ação em várias aulas = 1 tijolo enriquecido
- **NUNCA pular as fases 1 e 2** — o HTML sozinho não alimenta o Cockpit
- Toda parede que pertence a cadeia declara `cadeia` + `posição`
- Todo tijolo carrega a origem (curso · módulo · aula)
- Todo action-card tem descrição entre título e sub-checklist

# Validação antes de entregar

- [ ] `taxonomia.yaml` e `_cadeias.yaml` foram lidos?
- [ ] O orquestrador ficou sem carregar templates e cômodos?
- [ ] Insumo bruto salvo com frontmatter completo?
- [ ] Um subagente por cômodo, cada um devolvendo só JSON?
- [ ] Paredes com cadeia declaram `cadeia` + `posição`?
- [ ] Cada tijolo tem origem marcada?
- [ ] HTML tem bloco de cadeia no topo com âncoras funcionando?
- [ ] Toda parede tem título visível no HTML?
- [ ] Todo action-card tem descrição?
- [ ] Badges de pistão + etapa + tipo no header?
- [ ] Índices atualizados?

# Referências

| Artefato | Path |
|----------|------|
| **Taxonomia** | `workspace/bus/easy-builder/cockpit-builder/taxonomia.yaml` |
| **Cadeias** | `workspace/bus/easy-builder/cockpit-builder/obras/{obra}/_cadeias.yaml` |
| Template prático | `workspace/bus/easy-builder/cockpit-builder/mockup-html-aula.html` |
| Template conceitual | `workspace/bus/easy-builder/cockpit-builder/mockup-html-insight.html` |
| Prompt NotebookLM | `workspace/bus/easy-builder/cockpit-builder/prompt-notebooklm-extracao.md` |
| Spec | `workspace/bus/easy-builder/cockpit-builder/spec-skill-extracao.md` |
| Guia do Elvis | `workspace/bus/easy-builder/cockpit-builder/guia-elvis-cockpit.html` |
