// ---------------------------------------------------------------------------
// Quanto da tela a UI cobre — o que a câmera não pode usar
// ---------------------------------------------------------------------------
// O motor centralizava a obra no MEIO DO CONTAINER, e o container inclui o que
// está por cima dele: o checklist do pilar à esquerda e o painel do andar à
// direita. Com o painel a 340px isso já empurrava o prédio um pouco pra baixo
// dele; a 490px passou a comer a torre.
//
// A correção não é encolher o painel: é a câmera enquadrar a FAIXA LIVRE em vez
// da tela inteira. Assim o prédio se afasta do painel quando ele abre — pelo
// mesmo caminho que os pilares se afastam entre si — e volta pro meio, maior,
// quando ele fecha. Um movimento, não dois comportamentos.
//
// Estes números são a fonte única: o CSS do painel sai daqui (Obra.tsx) e a
// reserva da câmera também (motor.ts). Escritos em dois lugares, a primeira
// mudança de largura desalinharia a câmera em silêncio — e "em silêncio" é o
// jeito caro de descobrir.
//
// ---------------------------------------------------------------------------
// RETRATO: a mesma ideia, girada 90°
// ---------------------------------------------------------------------------
// Em 375px de largura, as reservas laterais somavam 504px — mais que a tela
// inteira. A faixa livre dava −129, batia no piso de 280 e a câmera enquadrava
// uma faixa que começava em x=282: a obra inteira ia parar fora da tela.
//
// Encolher o painel não resolve, porque não existe largura de painel que caiba
// ao lado de um desenho isométrico em 375px. O que muda é o EIXO: em retrato a
// UI não fica ao lado da obra, fica acima e abaixo dela, e a faixa livre passa
// a ser medida na altura. A obra ganha a largura toda — que é a dimensão em que
// ela menos cabe — e paga em altura, que é a que sobra num celular em pé.
// ---------------------------------------------------------------------------

/** Abaixo disso o layout é retrato: a UI empilha, não ladeia. É o `lg` do Tailwind. */
export const LIMIAR_RETRATO = 1024;

export const ehRetrato = (larguraTela: number) => larguraTela < LIMIAR_RETRATO;

/** O painel do andar, à direita. `vw` é o teto em tela estreita. */
export const PAINEL = { max: 490, vw: 0.4, margem: 44 };

/** O checklist do pilar, à esquerda (`left-6` = 24px). */
export const ASIDE = { largura: 230, margem: 24 };

/** Ar entre a torre e a UI. Sem isto o prédio encosta na borda do painel. */
const FOLGA = 28;

// --- retrato ---------------------------------------------------------------

/**
 * A folha do andar, embaixo. Fração da altura, com teto.
 *
 * Meio da tela, não mais: com 0,56 a conta em 375×667 dava barra (110) + faixa
 * do pilar (140) + folha (373) = 623 de 667, e sobravam 44px de obra — ou
 * seja, o desenho sumia justamente quando você estava mais fundo nele. A 0,5,
 * e com a faixa do pilar colapsando quando o andar abre, sobram ~175px: pouco,
 * mas o suficiente pra ver a torre a que o andar pertence.
 *
 * Esta é declarada, e não medida, porque o CSS da folha sai daqui: é a mesma
 * regra do painel em paisagem — um número, dois consumidores.
 */
export const FOLHA = { fracao: 0.5, max: 470 };

/** Ar entre a obra e a UI no eixo vertical. Menor que o lateral: sobra menos. */
const FOLGA_V = 16;

/**
 * Marcador na UI do topo (barra dos pilares + faixa do pilar). A câmera MEDE
 * essa altura em vez de declará-la: a barra quebra em duas linhas conforme a
 * tela, e um número fixo aqui erraria em metade das larguras — sempre pro lado
 * de enquadrar a obra por baixo da barra.
 */
export const SELETOR_UI_TOPO = "[data-ui-topo]";

// --- o que a câmera pergunta ------------------------------------------------

export const reservaEsquerda = (larguraTela: number) =>
  ehRetrato(larguraTela) ? 0 : ASIDE.margem + ASIDE.largura + FOLGA;

export const reservaDireita = (larguraTela: number) =>
  ehRetrato(larguraTela)
    ? 0
    : PAINEL.margem + Math.min(PAINEL.max, larguraTela * PAINEL.vw) + FOLGA;

/** Em retrato, o que a UI do alto come — vem medido do DOM (ver acima). */
export const reservaTopo = (larguraTela: number, alturaMedida: number) =>
  ehRetrato(larguraTela) && alturaMedida > 0 ? alturaMedida + FOLGA_V : 0;

/** Em retrato, o que a folha do andar come embaixo. */
export const alturaFolha = (alturaTela: number) =>
  Math.min(FOLHA.max, alturaTela * FOLHA.fracao);

export const reservaBase = (larguraTela: number, alturaTela: number) =>
  ehRetrato(larguraTela) ? alturaFolha(alturaTela) + FOLGA_V : 0;
