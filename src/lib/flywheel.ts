// ---------------------------------------------------------------------------
// O FLYWHEEL — o arsenal por setor
// ---------------------------------------------------------------------------
// Extraído verbatim do board legado. É o conteúdo da subtarefa #7 (as
// funcionalidades por setor): 6 fases do ciclo, cada uma com os "tijolos" que
// vivem nela. Um tijolo pode aparecer em mais de uma fase — aparece onde
// agrega, e isso é de propósito.
//
// Isto é DADO, não desenho. O componente é uma leitura dele.
// ---------------------------------------------------------------------------

/** Natureza do tijolo: o ícone diz O QUE ele é; a cor, em que fase vive. */
export type Natureza =
  | "ia" | "tool" | "setup" | "curso"
  | "comunidade" | "mentoria" | "suporte" | "bonus" | "processo";

/** Pilar de origem do tijolo (`passos.ts`). `0` = não nasceu de passo nenhum. */
export type Pilar = 0 | 1 | 2 | 3 | 4;

export type Tijolo = {
  n: string;
  t: Natureza;
  note?: string;
  loop?: boolean;
  /**
   * De ONDE o tijolo vem. O setor diz onde ele é usado; o pilar, de onde saiu.
   *
   * O cruzamento foi feito pelo rótulo, porque é só isso que existe hoje: os
   * mesmos entregáveis estão escritos duas vezes, à mão, aqui e em `passos.ts`
   * ("IA 05 Estrutura de Sites" lá, "05 · Estrutura de Sites" aqui). De 40
   * entregáveis, 5 batem por nome. Enquanto não houver id ligando os dois, esta
   * coluna é curadoria — e desincroniza sozinha na próxima edição.
   *
   * `0` não é erro: é item de plataforma (bônus, comunidade, acervo) que não
   * nasceu de passo nenhum. A tela mostra a contagem em vez de fingir cobertura.
   */
  p?: Pilar;

  /**
   * O MESMO entregável, do lado da Obra: `"<id-do-passo>:<vaga>"`.
   *
   * A Obra e o Motor mostram o mesmo arsenal por eixos diferentes — lá por
   * andar, aqui por fase do ciclo. Até agora os dois guardavam o item pelo
   * rótulo escrito à mão, e o mesmo entregável tinha dois nomes: "IA 05
   * Estrutura de Sites" no `passos.ts`, "05 · Estrutura de Sites" aqui. Este
   * campo é a costura: quem tem `ref` deixa de ser texto solto e passa a
   * apontar pra vaga real, com URL, plataforma e marcação 80/20 já resolvidas
   * do outro lado.
   *
   * 41 dos 67 tijolos têm par. Os 26 sem `ref` não são erro — são acervo e
   * bônus (PageBox, +800 seções, Licenças Elementor) que não nascem de passo
   * nenhum. Enquanto não tiverem, não abrem: link que não leva a lugar nenhum
   * é pior que ausência de link.
   */
  ref?: string;
};

export const PILARES: Record<Pilar, { n: string; c: string }> = {
  1: { n: "Pilar 01 · Entrega de alto valor", c: "var(--c-p1)" },
  2: { n: "Pilar 02 · Valor percebido", c: "var(--c-p2)" },
  3: { n: "Pilar 03 · Gestão e eficiência", c: "var(--c-p3)" },
  4: { n: "Pilar 04 · Ambiente e mentalidade", c: "var(--c-p4)" },
  0: { n: "Sem pilar mapeado", c: "var(--texto-3)" },
};

export type Fase = {
  key: string;
  name: string;
  /** variável CSS da cor do setor */
  varc: string;
  role: string;
  bricks: Tijolo[];
};

/** Caminhos SVG dos ícones, 24×24. */
export const ICONS={
  ia:'M8 8h8v8H8z M10 4.5v3.5 M14 4.5v3.5 M10 16v3.5 M14 16v3.5 M4.5 10h3.5 M4.5 14h3.5 M16 10h3.5 M16 14h3.5',
  tool:'M4 5h6.5v6.5H4z M13.5 12.5H20V19h-6.5z M13.5 5H20v5h-6.5z M4 14.5h6.5V19H4z',
  setup:'M9 4.5h6v3H9z M7 6h2 M15 6h2 M7 6v14h10V6 M9.5 11h5 M9.5 14.5h5',
  curso:'M3 17.5h18 M6 17.5v-2.2a6 6 0 0 1 12 0v2.2 M11 6v3 M13 6v3 M9 9h6',
  comunidade:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M15.5 10.5a2.4 2.4 0 1 0 0-4.8 M4 19a5 5 0 0 1 10 0 M14.5 15a4.6 4.6 0 0 1 5.5 4',
  mentoria:'M12 4l2.3 4.8 5.2.6-3.8 3.6 1 5.2-4.7-2.6-4.7 2.6 1-5.2-3.8-3.6 5.2-.6z',
  suporte:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M7 7l2.6 2.6 M17 7l-2.6 2.6 M7 17l2.6-2.6 M17 17l-2.6-2.6',
  bonus:'M4.5 11h15v8.5h-15z M4 8h16v3H4z M12 8v11.5 M12 8C10.5 4 7.5 4.5 7.5 6.4S10 9 12 8 M12 8c1.5-4 4.5-3.5 4.5-1.6S14 9 12 8z',
  processo:'M4 12a8 8 0 0 1 13.5-5.8L20 8 M20 4v4h-4 M20 12a8 8 0 0 1-13.5 5.8L4 16 M4 20v-4h4'
} as Record<Natureza, string>;

export const NAT={ia:'IA',tool:'Ferramenta',setup:'Setup',curso:'Curso',comunidade:'Comunidade',mentoria:'Mentoria',suporte:'Suporte',bonus:'Bônus',processo:'Processo'} as Record<Natureza, string>;

export const PHASES=[
  {key:'atracao', name:'Atração', varc:'--c-atracao',
   role:'Leads chegam sem prospecção ativa — posicionamento, portfólio e conteúdo fazem o trabalho por você.',
   bricks:[
     {n:'02 · ICP e Posicionamento',t:'ia',p:2,ref:'posicionamento:ia'},
     {n:'08 · Copy Builder — Ads',t:'ia',p:2,ref:'trafego-pago-nitro:ia'},
     {n:'07 · Copy Builder — Carrossel',t:'ia',p:2,ref:'instagram:ia'},
     {n:'10 · Easy Image',t:'ia',p:1,ref:'imagem-e-direcao-visual:ia'},
     {n:'Template de Portfólio (Behance)',t:'setup',p:2,ref:'portfolio:ferram'},
     {n:'Template de Carrossel (Instagram)',t:'setup',p:2,ref:'instagram:ferram'},
     {n:'Comunidade Behance',t:'comunidade',p:0},
     {n:'Anti Prospecção',t:'curso',p:2,ref:'posicionamento:aula'},
     {n:'Easy Sales',t:'curso',p:2,ref:'atendimento:aula'},
     {n:'Indicação de clientes grandes',t:'comunidade',p:4},
     {n:'Arena Builder (marketplace)',t:'comunidade',p:0},
     {n:'Rede de contratação interna',t:'comunidade',p:0},
     {n:'Tools Builder (isca / front-end)',t:'tool',p:0}
   ]},
  {key:'venda', name:'Venda', varc:'--c-venda',
   role:'Qualquer pessoa vende como o Lorenzi. A IA investiga o lead e conduz a conversa até o sim.',
   bricks:[
     {n:'01 · Análise Estratégica',t:'ia',p:2,ref:'plano-de-negocio:ia'},
     {n:'03 · Atendimento e Negociação',t:'ia',p:2,ref:'atendimento:ia'},
     {n:'04 · Webson Vendedor',t:'ia',p:0},
     {n:'02 · ICP e Posicionamento',t:'ia',p:2,ref:'posicionamento:ia'},
     {n:'Proposta comercial',t:'setup',p:2,ref:'proposta-profissional:ferram'},
     {n:'Contrato profissional',t:'setup',p:3,ref:'proteger-escopo-e-contrato:ferram'},
     {n:'Easy Sales',t:'curso',p:2,ref:'atendimento:aula'}
   ]},
  {key:'gestao', name:'Gestão', varc:'--c-gestao',
   role:'A entrada e a organização do projeto, processualizadas. Briefing, contrato, pastas, financeiro — nada se perde.',
   bricks:[
     {n:'Formulários de briefing',t:'setup',p:3,ref:'onboarding-do-cliente:ferram'},
     {n:'Formulário de coleta de dados',t:'setup',p:0},
     {n:'Gestão ClickUp (Setup Builder)',t:'setup',p:3,ref:'entregar-no-prazo:ferram'},
     {n:'Pasta modelo (Google Drive)',t:'setup',p:3,ref:'conciliar-as-demandas:ferram'},
     {n:'Fluxograma dos processos',t:'setup',p:0},
     {n:'Planilha financeira',t:'setup',p:3,ref:'controle-financeiro:ferram'},
     {n:'Contrato profissional',t:'setup',p:3,ref:'proteger-escopo-e-contrato:ferram'},
     {n:'Proposta comercial',t:'setup',p:2,ref:'proposta-profissional:ferram'},
     {n:'Compartilhamento de recursos (equipe)',t:'tool',p:0},
     {n:'Meus Recursos',t:'tool',p:0}
   ]},
  {key:'execucao', name:'Execução', varc:'--c-execucao',
   role:'O coração. O sistema constrói tudo que é mecânico — 3× mais rápido — e devolve o tempo pro que importa.',
   bricks:[
     {n:'05 · Estrutura de Sites',t:'ia',p:1,ref:'estrategia-da-pagina:ia'},
     {n:'06 · Easy Copy',t:'ia',p:1,ref:'copy:ia'},
     {n:'09 · Diretor Criativo',t:'ia',p:1,ref:'design:ia'},
     {n:'10 · Easy Image',t:'ia',p:1,ref:'imagem-e-direcao-visual:ia'},
     {n:'11 · Easy Coder',t:'ia',p:1,ref:'codigo-e-efeitos:ia'},
     {n:'01 · Análise Estratégica',t:'ia',p:2,ref:'plano-de-negocio:ia'},
     {n:'Extensão Easy Builder — 1.000+ componentes',t:'tool',p:1,ref:'design:ferram'},
     {n:'+180 páginas completas',t:'tool',p:0},
     {n:'+800 seções',t:'tool',p:0},
     {n:'+120 códigos & elementos',t:'tool',p:0},
     {n:'Responsividade automática',t:'tool',p:1,ref:'responsividade:ferram'},
     {n:'Templates de IA',t:'tool',p:0},
     {n:'Backup WordPress (3 cliques)',t:'tool',p:1,ref:'implementacao-tecnica:ferram'},
     {n:'Meus Recursos',t:'tool',p:0},
     {n:'Novos drops (quinzenal)',t:'tool',p:0},
     {n:'PageBox — 70+ Figma',t:'tool',p:0},
     {n:'Arsenal do Web Designer',t:'tool',p:0},
     {n:'Design Easy',t:'curso',p:1,ref:'design:aula'},
     {n:'Fast Builder / Profissão Web Building',t:'curso',p:0},
     {n:'Figma Education',t:'bonus',p:0},
     {n:'Hospedagem VPS',t:'bonus',p:0},
     {n:'Licenças Elementor',t:'bonus',p:0},
     {n:'Suporte com desenvolvedores',t:'suporte',p:0}
   ]},
  {key:'qualidade', name:'Qualidade', varc:'--c-qualidade',
   role:'O gate. Otimização, performance, segurança e o olho do Lorenzi garantem que nenhuma página saia abaixo do padrão.',
   bricks:[
     {n:'12 · Analisador de Páginas',t:'ia',p:1,note:'o gate que toda página atravessa',ref:'qualidade-antes-de-enviar:ia'},
     {n:'Easy Optimize',t:'curso',p:1,ref:'otimizacao:aula'},
     {n:'11 · Easy Coder (otimização)',t:'ia',p:1,ref:'codigo-e-efeitos:ia'},
     {n:'Responsividade automática',t:'tool',p:1,ref:'responsividade:ferram'},
     {n:'Tools Builder (compressor / otimizador)',t:'tool',p:0},
     {n:'Backup WordPress (ambiente seguro)',t:'tool',p:1,ref:'otimizacao:ferram'},
     {n:'Suporte com desenvolvedores',t:'suporte',p:0}
   ]},
  {key:'posicionamento', name:'Posicionamento', varc:'--c-posicionamento',
   role:'A entrega vira portfólio, indicação e tráfego gratuito. Fecha o volante e reabastece a Atração.',
   bricks:[
     {n:'Template de Portfólio (Figma)',t:'setup',p:2,loop:true,ref:'portfolio:ferram'},
     {n:'Template de Carrossel (Instagram)',t:'setup',p:2,loop:true,ref:'instagram:ferram'},
     {n:'07 · Copy Builder — Carrossel',t:'ia',p:2,loop:true,ref:'instagram:ia'},
     {n:'10 · Easy Image (mockups)',t:'ia',p:1,ref:'imagem-e-direcao-visual:ia'},
     {n:'02 · ICP e Posicionamento',t:'ia',p:2,ref:'posicionamento:ia'},
     {n:'Comunidade Behance',t:'comunidade',p:0},
     {n:'Coleta de depoimento',t:'processo',p:2,ref:'prova-social:ferram'}
   ]}
] as Fase[];

/** A base que sustenta as 6 fases — não gira, sustenta. */
export const FOUNDATION=[
  {g:'Mentalidade',t:'curso',items:['Mentalidade Builder']},
  {g:'Comunidade',t:'comunidade',items:['WhatsApp','Discord','Community Manager','Monitoria 2×/sem','Networking','Rede de contratação','Arena Builder','Black Builders']},
  {g:'Mentoria',t:'mentoria',items:['Ao vivo','Gravadas (14+)','Mensal c/ especialista','Execução Lorenzi']},
  {g:'Suporte',t:'suporte',items:['Suporte normal','Com desenvolvedores']},
  {g:'Infra & Bônus',t:'bonus',items:['Figma Education','Hospedagem VPS','Licenças Elementor']}
] as { g: string; t: Natureza; items: string[] }[];
