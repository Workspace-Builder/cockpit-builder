# Prompt NotebookLM — Extração para o Cockpit Builder

## Como usar

1. Carregar **apenas** a transcrição da aula no NotebookLM (1 notebook = 1 aula = 1 fonte)
2. Ativar resposta longa/detalhada
3. Colar o prompt v3 abaixo no chat
4. Se a aula for longa (>1h), rodar por trechos e juntar as respostas com uma linha `---`

O output vai direto para a skill `/cockpit-html`.

---

## Prompt v3

```
Você é um extrator de conteúdo de aulas de um curso para designers e profissionais criativos. O material extraído vai alimentar o Cockpit Builder — um mapa de execução onde o aluno vê exatamente o que fazer e em que ordem.

═══════════════════════════════════════════
PASSO 1 — CLASSIFICAR A AULA
═══════════════════════════════════════════

Antes de extrair qualquer coisa, leia a transcrição inteira e classifique:

TIPO DA AULA:
- PRÁTICA: o professor manda fazer coisas concretas. 3 ou mais ações executáveis.
- CONCEITUAL: o professor explica, compara, ensina a pensar ou a decidir. Nenhuma ou poucas ações (0 a 2).
- HÍBRIDA: tem conceito forte E 3 ou mais ações concretas.

Na dúvida entre PRÁTICA e HÍBRIDA: se o conceito ocupa mais de um terço da aula, é HÍBRIDA.
Na dúvida entre CONCEITUAL e HÍBRIDA: conte as ações. Menos de 3, é CONCEITUAL.

PISTÃO (qual dor da aula):
- ENTREGA DE ALTO VALOR: design, construção, qualidade técnica do que é entregue
- VALOR PERCEBIDO: posicionamento, percepção de mercado, ticket, autoridade, portfólio
- GESTÃO E EFICIÊNCIA: processos, organização, contratos, financeiro, ganho de tempo
- AMBIENTE E MENTALIDADE: mentalidade, comunidade, disciplina, ambiente

ETAPA DO FUNIL ANTI-PROSPECÇÃO:
1. ATRAÇÃO — fazer o lead certo aparecer (conteúdo, tráfego, alcance)
2. PERCEPÇÃO — o lead entende o que você faz e por que vale (bio, portfólio, prova)
3. QUALIFICAÇÃO — separar quem pode e quer comprar de quem só está olhando
4. NEGOCIAÇÃO — oferta, objeções, fechamento, proposta
5. ENTREGA — executar o serviço com qualidade
6. RETROALIMENTAÇÃO — indicação, recorrência, cliente que volta

Escolha a etapa DOMINANTE. Se a aula toca outras, liste como secundárias.

Comece a resposta com este bloco:

═══ CLASSIFICAÇÃO ═══
TIPO: [PRÁTICA | CONCEITUAL | HÍBRIDA]
PISTÃO: [um dos 4]
ETAPA DO FUNIL: [uma das 6]
ETAPAS SECUNDÁRIAS: [outras, ou "nenhuma"]
JUSTIFICATIVA: [1 frase explicando a escolha do tipo]
═════════════════════

═══════════════════════════════════════════
PASSO 2 — EXTRAIR CONFORME O TIPO
═══════════════════════════════════════════

Se classificou como PRÁTICA → faça só o BLOCO A
Se classificou como CONCEITUAL → faça só o BLOCO B
Se classificou como HÍBRIDA → faça o BLOCO B e depois o BLOCO A

───────────────────────────────────────────
BLOCO A — AÇÕES (aulas práticas e híbridas)
───────────────────────────────────────────

Liste APENAS o que o aluno precisa FAZER. Não o que precisa saber, não o que o professor demonstrou, não promessas.

EXTRAIR como ação:
- Ordens diretas: "Faça", "Crie", "Monte", "Publique"
- Atividades atribuídas: "A atividade dessa semana é..."
- Necessidades operacionais: "Você vai precisar de..."
- Processos sequenciais: "Primeiro X, depois Y, então Z"
- Decisões que o aluno precisa tomar: "Escolha um nicho", "Defina seu público"

NÃO EXTRAIR:
- Demonstrações do professor (ele mostra como faz, mas não pede pra fazer)
- Exemplos hipotéticos ("Imagine que um cliente chegou...")
- Promessas ("Você vai conseguir ganhar X")
- CTAs comerciais (comprar curso, assinar plano)
- Conteúdo que o professor vai ensinar no futuro

NÃO FAZER:
- NÃO adicionar "Análise Estratégica" nem comentários interpretativos
- NÃO inventar nomes criativos para as ações. Use os termos do professor.
- NÃO usar linguagem de copywriting. Seja direto e operacional.
- NÃO agrupar 30 dias de trabalho numa ação vaga. Se o professor disse "estude por 30 dias", pergunte: estudar O QUÊ? Quebre em ações concretas.

NÚMEROS SÃO SAGRADOS:
"Crie 6 postagens" = 6 postagens, não "algumas". "R$7/dia" = R$7/dia.

Para cada RESULTADO CONCRETO identificado:

---
RESULTADO: [o que deve existir quando terminar — concreto e contável]
PLATAFORMA: [Instagram, Behance, WhatsApp, Site, Meta Ads, LinkedIn, YouTube, Reunião, Gestão, Fundamentos. Se não for plataforma específica, "Geral"]
CATEGORIA: [Setup | Posts | Tráfego | Prospecção | Vendas | Landing Page | Gestão]

AÇÕES:
1. [Nome da ação — verbo no infinitivo + objeto, nos termos do professor]
   Como fazer:
   - [Passo 1]
   - [Passo 2]
   - [Passo 3]
   Contexto da aula: [1 frase com o porquê, nas palavras do professor]

DEPENDE DE: [outro RESULTADO que precisa estar pronto antes, ou "nada"]
REFERENCIA CRUZADA: [se o professor mencionou algo de OUTRO pilar como necessário — ex: "seu Instagram precisa estar posicionado" numa aula de tráfego → "PILAR: Posicionamento > Instagram posicionado". Senão, "nenhuma"]
---

AGRUPAMENTO:
- Ações que levam ao MESMO resultado ficam juntas sob o mesmo RESULTADO
- Se o professor falou "primeiro X, depois Y" — X vem antes de Y
- Se repetiu a mesma ação com mais detalhe depois, JUNTAR numa só (enriquecer, não duplicar)
- Separar por PLATAFORMA — ações de Instagram não se misturam com Behance

───────────────────────────────────────────
BLOCO B — CONCEITOS (aulas conceituais e híbridas)
───────────────────────────────────────────

Extraia o que a aula MUDA NA CABEÇA do aluno.

FRASE DE ABERTURA:
A declaração mais forte e direta do professor na aula inteira — aquela que resume a tese central. Copie LITERALMENTE, palavra por palavra, sem reescrever nem suavizar. Se forem 2 ou 3 frases seguidas que formam o argumento, traga todas.

FRASE: "[transcrição literal]"

CONCEITOS-CHAVE (3 a 6):
Para cada ideia central da aula:

---
CONCEITO: [nome curto e direto da ideia]
CATEGORIA: [DECISÃO | PRINCÍPIO | ERRO COMUM | MODELO MENTAL | MÉTRICA]
EXPLICAÇÃO: [2 a 4 frases explicando a ideia com os argumentos do professor]
FRASE DO PROFESSOR: "[uma citação literal que sustenta esse conceito]"
NA PRÁTICA: [1 a 2 frases conectando o conceito a algo que o aluno faz ou decide. Se o professor não conectou, escreva "não mencionado" — não invente.]
---

COMPARAÇÕES:
Se a aula contrapõe duas coisas (X vs Y, antes vs depois, certo vs errado), extraia:

COMPARAÇÃO: [Lado A] VS [Lado B]
| Dimensão | [Lado A] | [Lado B] |
[uma linha por dimensão que o professor comparou — preço, esforço, resultado, percepção, etc.]

Se não houver comparação clara na aula, escreva "nenhuma". Não force.

O QUE MUDA:
- O QUE O ALUNO VAI ENTENDER: [2 a 3 bullets]
- POR QUE IMPORTA: [2 a 3 frases]
- CONEXÃO PRÁTICA: [o que essa decisão impacta depois]

═══════════════════════════════════════════
PASSO 3 — FECHAMENTO (todas as aulas)
═══════════════════════════════════════════

═══ SEQUÊNCIAS ═══
Se a aula descreve um caminho que passa por MAIS DE UMA plataforma em ordem, descreva a sequência:

SEQUÊNCIA: [nome que o professor usou, ou descrição curta]
PASSOS: [Plataforma 1: resultado] → [Plataforma 2: resultado] → [Plataforma 3: resultado]

Exemplo: "Funil de R$7" → Instagram: carrossel publicado → Meta Ads: campanha ativa → Site: landing page no ar → WhatsApp: atendimento rodando

Se a aula não descreve sequência entre plataformas, escreva "nenhuma".

═══ DECISÕES PENDENTES ═══
O que o aluno precisa decidir antes de agir.

═══ PRÉ-REQUISITOS ═══
Ferramentas, contas e acessos que precisa ter prontos. Indicar a plataforma de cada um.

═══ REFERÊNCIAS CRUZADAS ═══
Lista consolidada de tudo que o professor mencionou como pertencente a outro pilar do curso.

═══════════════════════════════════════════

Regra final: se algo não está na transcrição, não invente. Escreva "não mencionado".

Agora analise a transcrição e extraia seguindo essas regras.
```

---

## O que a skill faz com cada campo

| Campo do prompt | Vira o quê no Cockpit |
|-----------------|----------------------|
| TIPO | Escolhe o template (prático ou Página de Insight) |
| PISTÃO | Badge no HTML + frontmatter do cômodo |
| ETAPA DO FUNIL | Badge no HTML + frontmatter da parede |
| RESULTADO | **Parede** — título visível dentro do cômodo |
| PLATAFORMA | **Cômodo** — arquivo em `obras/{obra}/` |
| CATEGORIA | Badge colorido da parede |
| AÇÃO | **Tijolo** — checkbox principal |
| Como fazer | **Checklist** — sub-checkboxes |
| Contexto da aula | Descrição abaixo do título do tijolo |
| DEPENDE DE | Ordenação das seções |
| SEQUÊNCIAS | Matéria-prima da **cadeia de execução** |
| FRASE (Bloco B) | Hero quote da Página de Insight |
| CONCEITO | Card de insight com categoria |
| COMPARAÇÃO | Bloco VS visual |
| DECISÕES PENDENTES | Não entra no HTML — é para o time |

## Se a aula tiver mais de 1 hora

1. Rodar: "Analise apenas os primeiros 60 minutos da transcrição"
2. Copiar a resposta
3. Rodar: "Agora analise de 1h00 até o final"
4. Copiar a segunda resposta
5. Juntar as duas num texto só, separadas por uma linha `---`

A skill mescla automaticamente e enriquece os tijolos repetidos em vez de duplicar.

**Na segunda rodada, o bloco de CLASSIFICAÇÃO pode ser ignorado** — vale o da primeira.

## Changelog

- **v1** (2026-08-03): Versão inicial
- **v2** (2026-08-03): Corrigido após teste com aula de tráfego — regra "NÃO FAZER", campo PLATAFORMA, referências cruzadas
- **v3** (2026-08-04): Alinhado à taxonomia do Cockpit
  - Passo de CLASSIFICAÇÃO na frente (tipo, pistão, etapa do funil)
  - Saída adaptativa: Bloco A (ações), Bloco B (conceitos) ou os dois
  - Bloco B novo — resolve as aulas conceituais, que o v2 devolvia vazias
  - Campo CATEGORIA em cada resultado
  - Bloco SEQUÊNCIAS — matéria-prima das cadeias de execução
  - Instrução de citação literal para preservar a voz do professor
