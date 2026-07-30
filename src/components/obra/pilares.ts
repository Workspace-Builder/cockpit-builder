// ---------------------------------------------------------------------------
// Os 4 prédios — um por pilar
// ---------------------------------------------------------------------------
// A metáfora: pilar = PRÉDIO, passo = ANDAR, a Obra = o quarteirão. (O modelo
// antigo tratava pilar como andar de um prédio só — não convivia com uma torre
// de 9 andares por pilar.)
//
// A tipologia de cada prédio sai dos números do próprio pilar, não de estética:
// o 01 é quase todo obrigatório e automatizado, então é esteira — torre de
// andares iguais. O 04 tem 13% de 8020, o sistema constrói 25% e nada cicla,
// então é feito à mão — pavilhão baixo em terraços.
// ---------------------------------------------------------------------------

export type Tipologia = "torre" | "vitrine" | "tecnico" | "terracos";

export type PredioCfg = {
  n: 1 | 2 | 3 | 4;
  no: string;
  fase: string;
  titulo: string;
  cor: string;
  tipo: Tipologia;
  /** rótulo curto da tipologia, pro cabeçalho */
  tp: string;
  /** largura, profundidade, altura do andar, altura do térreo — unidades iso */
  W: number;
  Dp: number;
  FH: number;
  LOB: number;
  /** quanto do pilar o sistema constrói pra você (medidor do index.html) */
  sist: number;
  /** só no pavilhão: recuo por patamar */
  recuo?: number;
  tese: string;
};

export const PREDIOS: Record<1 | 2 | 3 | 4, PredioCfg> = {
  1: {
    n: 1, no: "01", fase: "ENTREGA", titulo: "Entrega de alto valor",
    cor: "#4e7df6", tipo: "torre", tp: "TORRE DE ESCRITÓRIO · VIDRO",
    W: 124, Dp: 124, FH: 32, LOB: 42, sist: 90,
    tese: "O que sai da tua mão. Padrão de quem cobra caro — em dias, não semanas.",
  },
  2: {
    n: 2, no: "02", fase: "VALOR PERCEBIDO", titulo: "Valor percebido",
    cor: "#54c98a", tipo: "vitrine", tp: "ESQUINA · FACHADA-VITRINE",
    W: 172, Dp: 104, FH: 20, LOB: 44, sist: 70,
    tese: "Como o mercado te vê. Ser encontrado, ser desejado e cobrar o preço que você pede.",
  },
  3: {
    n: 3, no: "03", fase: "GESTÃO", titulo: "Gestão e eficiência",
    cor: "#33c6d6", tipo: "tecnico", tp: "BLOCO TÉCNICO · CASA DE MÁQUINAS",
    W: 128, Dp: 128, FH: 26, LOB: 36, sist: 60,
    tese: "O negócio por dentro. Água e luz antes do cliente entrar — nada range.",
  },
  4: {
    n: 4, no: "04", fase: "AMBIENTE", titulo: "Ambiente e mentalidade",
    cor: "#e8a13c", tipo: "terracos", tp: "PAVILHÃO EM TERRAÇOS · MADEIRA",
    W: 168, Dp: 168, FH: 22, LOB: 34, sist: 25, recuo: 13,
    tese: "Onde você constrói e como você pensa. Este pilar segura os outros três.",
  },
};

export const ORDEM: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
