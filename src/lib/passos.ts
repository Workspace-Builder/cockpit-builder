// ---------------------------------------------------------------------------
// ORDEM 0 — a lista única dos 36 passos
// ---------------------------------------------------------------------------
// Conteúdo extraído de index.html (blocos dos 4 pilares) + as flags 8020 e
// cicloPos do wireframe. Fonte única: Obra, Trilho, vista 8020, painel do nó e
// checklist são FILTROS sobre esta lista — nenhuma página reescreve passo.
//
// As 3 vagas do painel (Decisão 5) comportam menos tipos do que o legado tem:
// além de aula/IA/ferramenta, o index.html marca template, processo e
// referência. Eles entram na vaga `ferram` em vez de sumir — o Pilar 04 é
// quase todo processo/referência (comunidade, mentorias, indicações).
// ---------------------------------------------------------------------------

import type { Passo } from "./model";

export const PASSOS: Passo[] = [

  // --- PILAR 01 · ENTREGA ---------------------------------------------
  { id: "estrategia-da-pagina", paginaId: "obra", pilar: 1, ordem: 1, titulo: "Estratégia da página", sub: "O que ela precisa ter pra converter — decidido antes de abrir ferramenta.", e8020: true, cicloPos: 4, unha: false, ia: { label: "IA 05 Estrutura de Sites", url: "https://app.easybuilder.com.br/" } },
  { id: "copy", paginaId: "obra", pilar: 1, ordem: 2, titulo: "Copy", sub: "O texto que vende. Design bom não salva copy fraca.", e8020: true, cicloPos: 5, unha: false, ia: { label: "IA 06 Easy Copy", url: "https://app.easybuilder.com.br/" } },
  { id: "design", paginaId: "obra", pilar: 1, ordem: 3, titulo: "Design", sub: "Direção com intenção: arquétipo, paleta, tipografia. Nunca do zero.", e8020: true, cicloPos: 6, unha: false, aula: { label: "Design Easy", url: "https://easybuilder.club/" }, ia: { label: "IA 09 Diretor Criativo", url: "https://app.easybuilder.com.br/" }, ferram: { label: "Extensão EB · 1.000+ componentes", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "imagem-e-direcao-visual", paginaId: "obra", pilar: 1, ordem: 4, titulo: "Imagem e direção visual", e8020: false, cicloPos: null, unha: false, ia: { label: "IA 10 Easy Image", url: "https://app.easybuilder.com.br/" } },
  { id: "codigo-e-efeitos", paginaId: "obra", pilar: 1, ordem: 5, titulo: "Código e efeitos", sub: "O acabamento que separa página de página cara.", e8020: true, cicloPos: 7, unha: false, ia: { label: "IA 11 Easy Coder", url: "https://app.easybuilder.com.br/" } },
  { id: "responsividade", paginaId: "obra", pilar: 1, ordem: 6, titulo: "Responsividade", sub: "Perfeita em toda tela — nos componentes EB já vem pronta.", e8020: false, cicloPos: null, unha: false, ferram: { label: "Automática nos componentes", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "otimizacao", paginaId: "obra", pilar: 1, ordem: 7, titulo: "Otimização", sub: "Site lento devolve o cliente pro concorrente.", e8020: false, cicloPos: null, unha: false, aula: { label: "Easy Optimize", url: "https://easybuilder.club/" }, ferram: { label: "Backup otimizado", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "implementacao-tecnica", paginaId: "obra", pilar: 1, ordem: 8, titulo: "Implementação técnica", e8020: true, cicloPos: 8, unha: false, ferram: { label: "Backup WordPress · 3 cliques", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "qualidade-antes-de-enviar", paginaId: "obra", pilar: 1, ordem: 9, titulo: "Qualidade antes de enviar", sub: "O gate: a página só sai quando passa. Protege preço e reputação.", e8020: true, cicloPos: 9, unha: false, ia: { label: "IA 12 Analisador de Páginas", url: "https://app.easybuilder.com.br/" } },

  // --- PILAR 02 · VALOR PERCEBIDO ---------------------------------------------
  { id: "posicionamento", paginaId: "obra", pilar: 2, ordem: 1, titulo: "Posicionamento", sub: "1 frase: quem você atende e o que entrega. Vira bio, portfólio e conteúdo.", e8020: true, cicloPos: null, unha: false, aula: { label: "Anti Prospecção", url: "https://easybuilder.club/" }, ia: { label: "IA 02 ICP e Posicionamento", url: "https://app.easybuilder.com.br/" } },
  { id: "portfolio", paginaId: "obra", pilar: 2, ordem: 2, titulo: "Portfólio", sub: "3 projetos no ar. Projeto conceito conta igual.", e8020: true, cicloPos: null, unha: false, ferram: { label: "Template Portfólio (Figma)", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "instagram", paginaId: "obra", pilar: 2, ordem: 3, titulo: "Instagram", sub: "Bio que diz o que você faz, grid de projeto, busca te achando.", e8020: false, cicloPos: null, unha: false, aula: { label: "Reels N3 + SEO", url: "https://easybuilder.club/" }, ia: { label: "IA 07 Copy Carrossel", url: "https://app.easybuilder.com.br/" }, ferram: { label: "Template Carrossel", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "plano-de-negocio", paginaId: "obra", pilar: 2, ordem: 4, titulo: "Plano de negócio", sub: "Saber onde está e o que atacar.", e8020: false, cicloPos: null, unha: false, ia: { label: "IA 01 Análise Estratégica", url: "https://app.easybuilder.com.br/" }, ferram: { label: "O Plano [10k26/27]" } },
  { id: "atendimento", paginaId: "obra", pilar: 2, ordem: 5, titulo: "Atendimento", sub: "Investiga antes de dar preço. Conversa conduzida até o sim.", e8020: true, cicloPos: 1, unha: false, aula: { label: "Easy Sales", url: "https://easybuilder.club/" }, ia: { label: "IA 03 Atendimento e Negociação", url: "https://app.easybuilder.com.br/" } },
  { id: "proposta-profissional", paginaId: "obra", pilar: 2, ordem: 6, titulo: "Proposta profissional", sub: "Amador no zap derruba o ticket na hora.", e8020: true, cicloPos: 2, unha: false, ferram: { label: "Template de Proposta", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "precificacao-pelo-valor", paginaId: "obra", pilar: 2, ordem: 7, titulo: "Precificação pelo valor", sub: "Preço com critério, não com medo.", e8020: true, cicloPos: null, unha: false, ferram: { label: "Planilha Financeira", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "prova-social", paginaId: "obra", pilar: 2, ordem: 8, titulo: "Prova social", sub: "Pede hoje, publica essa semana.", e8020: false, cicloPos: 11, unha: false, ferram: { label: "Coleta de depoimento", url: "https://easybuilder.club/" } },
  { id: "eficiencia", paginaId: "obra", pilar: 2, ordem: 9, titulo: "Eficiência", sub: "Responder e entregar rápido vira percepção — o Pilar 1 inteiro trabalha aqui.", e8020: false, cicloPos: null, unha: false },
  { id: "postura", paginaId: "obra", pilar: 2, ordem: 10, titulo: "Postura", sub: "Segurança, palavra cumprida, presença. Não tem IA pra isso — tem referência e ambiente (Pilar 4).", e8020: false, cicloPos: null, unha: true },
  { id: "trafego-pago-nitro", paginaId: "obra", pilar: 2, ordem: 11, titulo: "Tráfego pago · nitro", sub: "Só se quiser acelerar. R$10/dia já valida.", e8020: false, cicloPos: null, unha: false, aula: { label: "Tráfego N3", url: "https://easybuilder.club/" }, ia: { label: "IA 08 Copy Ads", url: "https://app.easybuilder.com.br/" } },

  // --- PILAR 03 · GESTÃO ---------------------------------------------
  { id: "onboarding-do-cliente", paginaId: "obra", pilar: 3, ordem: 1, titulo: "Onboarding do cliente", sub: "Todo projeto entra pelo mesmo trilho. Começo padrão mata refação.", e8020: true, cicloPos: 3, unha: false, ferram: { label: "Formulário de Briefing", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "entregar-no-prazo", paginaId: "obra", pilar: 3, ordem: 2, titulo: "Entregar no prazo", sub: "Prazo cumprido é reputação composta.", e8020: true, cicloPos: 10, unha: false, ferram: { label: "Esteira ClickUp · Setup Builder", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "conciliar-as-demandas", paginaId: "obra", pilar: 3, ordem: 3, titulo: "Conciliar as demandas", sub: "Vários projetos sem deixar bola cair.", e8020: false, cicloPos: null, unha: false, ferram: { label: "ClickUp + pasta modelo", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "controlar-os-processos", paginaId: "obra", pilar: 3, ordem: 4, titulo: "Controlar os processos", sub: "O processo lembra por você.", e8020: false, cicloPos: null, unha: false, ferram: { label: "Checklists da esteira", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "proteger-escopo-e-contrato", paginaId: "obra", pilar: 3, ordem: 5, titulo: "Proteger escopo e contrato", sub: "Mata o \"só mais um ajuste\".", e8020: false, cicloPos: null, unha: false, ferram: { label: "Template de Contrato", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "controle-financeiro", paginaId: "obra", pilar: 3, ordem: 6, titulo: "Controle financeiro", sub: "Indicadores e controle: saber se tem lucro, não achar.", e8020: true, cicloPos: null, unha: false, ferram: { label: "Planilha Financeira", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "projetar-crescimento", paginaId: "obra", pilar: 3, ordem: 7, titulo: "Projetar crescimento", sub: "Projetos × ticket: as duas alavancas do 10k, todo mês.", e8020: false, cicloPos: null, unha: false, ia: { label: "IA 01 Análise Estratégica", url: "https://app.easybuilder.com.br/" }, ferram: { label: "Planilha Financeira", url: "https://app.easybuilder.com.br/index-v2/paginas?tipo=links", plat: "EB" } },
  { id: "delegar", paginaId: "obra", pilar: 3, ordem: 8, titulo: "Delegar", sub: "Ninguém delega caos. A esteira documentada é o que torna teu processo delegável.", e8020: false, cicloPos: null, unha: true },

  // --- PILAR 04 · AMBIENTE ---------------------------------------------
  { id: "mudar-a-mente", paginaId: "obra", pilar: 4, ordem: 1, titulo: "Mudar a mente", sub: "Não recomeçar sempre, decisão firme, projeto terminado. De fazedor de página pra dono de obra.", e8020: true, cicloPos: null, unha: false, aula: { label: "Mentalidade Builder", url: "https://easybuilder.club/" } },
  { id: "mentalidade-de-abundancia", paginaId: "obra", pilar: 4, ordem: 2, titulo: "Mentalidade de abundância", sub: "Ninguém esconde o jogo: tem cliente e dinheiro pra todo mundo. Concorrente vira parceiro.", e8020: false, cicloPos: null, unha: false, ferram: { label: "Comunidade Builder", url: "https://easybuilder.club/" } },
  { id: "estar-no-ambiente-certo", paginaId: "obra", pilar: 4, ordem: 3, titulo: "Estar no ambiente certo", sub: "Lugar onde vender página de R$3.000 a R$8.000 é o normal — a visão de mercado muda por osmose.", e8020: false, cicloPos: null, unha: false, ferram: { label: "Comunidade WhatsApp", url: "https://easybuilder.club/" } },
  { id: "cuidar-com-quem-anda", paginaId: "obra", pilar: 4, ordem: 4, titulo: "Cuidar com quem anda", sub: "Feedback construtivo sem julgamento, ajuda a qualquer hora. Ritmo emprestado nos dias sem vontade.", e8020: false, cicloPos: null, unha: false, ferram: { label: "Turma do bootcamp", url: "https://easybuilder.club/" } },
  { id: "acessar-mentes-que-construiram", paginaId: "obra", pilar: 4, ordem: 5, titulo: "Acessar mentes que construíram", sub: "Atalho de década: 14 mentorias gravadas + 1 nova todo mês com especialistas.", e8020: false, cicloPos: null, unha: false, ferram: { label: "Mentorias mensais", url: "https://easybuilder.club/" } },
  { id: "networking-e-oportunidades", paginaId: "obra", pilar: 4, ordem: 6, titulo: "Networking e oportunidades", sub: "Indicação de trabalho, parceria fechada, proposta circulando dentro da própria comunidade.", e8020: false, cicloPos: null, unha: false, ferram: { label: "Indicações e parcerias", url: "https://easybuilder.club/" } },
  { id: "ritmo-e-constancia", paginaId: "obra", pilar: 4, ordem: 7, titulo: "Ritmo e constância", sub: "A obra não pode parar. Semana com vistoria.", e8020: false, cicloPos: null, unha: false, ferram: { label: "As 4 semanas do Plano" } },
  { id: "pedir-ajuda-quando-trava", paginaId: "obra", pilar: 4, ordem: 8, titulo: "Pedir ajuda quando trava", sub: "Suporte instantâneo, 24h, na unha. Ninguém atravessa a obra calado.", e8020: false, cicloPos: null, unha: false, ferram: { label: "Comunidade", url: "https://easybuilder.club/" } },
];

export const TOTAL_PASSOS = 36;

// --- filtros: cada página do manifesto é uma linha aqui ---------------------

export const passosDoPilar = (n: 1 | 2 | 3 | 4) =>
  PASSOS.filter((p) => p.pilar === n).sort((a, b) => a.ordem - b.ordem);

export const passos8020 = () => PASSOS.filter((p) => p.e8020);

export const passosDoCiclo = () =>
  PASSOS.filter((p) => p.cicloPos !== null).sort(
    (a, b) => (a.cicloPos ?? 0) - (b.cicloPos ?? 0),
  );

export const getPasso = (id: string) => PASSOS.find((p) => p.id === id);
