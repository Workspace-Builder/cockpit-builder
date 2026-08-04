// ---------------------------------------------------------------------------
// Por onde a gaveta sai
// ---------------------------------------------------------------------------
// Arquivo próprio porque é a única parte da gaveta que dá pra provar sem tela:
// entram retângulos, sai um lado. O componente fica só com o desenho.
//
// TUDO AQUI É COORDENADA DE TELA, não de board. A gaveta não vive dentro do
// viewport transformado do React Flow — se vivesse, encolheria junto com o
// zoom e viraria ilegível a 20%. Ela flutua por cima, em pixels, e é por isso
// que a conta precisa das posições já projetadas.
// ---------------------------------------------------------------------------

export type Ret = { x: number; y: number; w: number; h: number };
export type Lado = "b" | "t" | "r" | "l";

export const GAP = 14;

/**
 * Baixo primeiro: é uma gaveta, e é pra baixo que gaveta abre. Cima é o
 * segundo natural. Os lados existem pra borda da tela, não como primeira
 * escolha — abrir de lado atravessa a seta que liga uma etapa na seguinte.
 */
const PREFERENCIA: Record<Lado, number> = { b: 1, t: 1.15, r: 1.3, l: 1.35 };

const LADOS: Lado[] = ["b", "t", "r", "l"];

/** Onde a gaveta ficaria se saísse por este lado. */
export function candidato(
  no: Ret,
  lado: Lado,
  larg: number,
  alt: number,
): { x: number; y: number } {
  switch (lado) {
    case "b":
      return { x: no.x + no.w / 2 - larg / 2, y: no.y + no.h + GAP };
    case "t":
      return { x: no.x + no.w / 2 - larg / 2, y: no.y - GAP - alt };
    case "r":
      return { x: no.x + no.w + GAP, y: no.y + no.h / 2 - alt / 2 };
    case "l":
      return { x: no.x - GAP - larg, y: no.y + no.h / 2 - alt / 2 };
  }
}

/** Área que vaza da tela. */
function fora(c: { x: number; y: number }, larg: number, alt: number, tela: Ret) {
  const dx =
    Math.max(0, tela.x - c.x) + Math.max(0, c.x + larg - (tela.x + tela.w));
  const dy =
    Math.max(0, tela.y - c.y) + Math.max(0, c.y + alt - (tela.y + tela.h));
  return dx * alt + dy * larg;
}

/** Área que cobre de outros nós. */
function colide(
  c: { x: number; y: number },
  larg: number,
  alt: number,
  vizinhos: Ret[],
) {
  let total = 0;
  for (const o of vizinhos) {
    const w = Math.min(c.x + larg, o.x + o.w) - Math.max(c.x, o.x);
    const h = Math.min(c.y + alt, o.y + o.h) - Math.max(c.y, o.y);
    if (w > 0 && h > 0) total += w * h;
  }
  return total;
}

/**
 * O lado que cabe.
 *
 * Vazar da tela pesa 3× mais que cobrir um vizinho, e não é arbitrário: nó
 * coberto continua ali atrás do vidro e volta com um clique; gaveta metade
 * fora da tela não tem conserto sem arrastar o board.
 */
export function melhorLado(
  no: Ret,
  larg: number,
  alt: number,
  tela: Ret,
  vizinhos: Ret[],
): Lado {
  let melhor: { lado: Lado; peso: number } | null = null;
  for (const lado of LADOS) {
    const c = candidato(no, lado, larg, alt);
    const peso =
      (fora(c, larg, alt, tela) * 3 + colide(c, larg, alt, vizinhos)) *
      PREFERENCIA[lado];
    if (melhor === null || peso < melhor.peso) melhor = { lado, peso };
    if (peso === 0) break; // lado limpo: não há o que melhorar
  }
  return melhor!.lado;
}

/**
 * Encaixa a gaveta na tela quando nenhum lado coube inteiro.
 *
 * Sem isto o lado escolhido ainda pode sangrar alguns pixels — a escolha é a
 * MENOS pior, não necessariamente uma que cabe. Empurrar é preferível a
 * escolher outro lado: o bico continua apontando pro nó certo.
 */
export function encaixar(
  c: { x: number; y: number },
  larg: number,
  alt: number,
  tela: Ret,
) {
  return {
    x: Math.min(Math.max(c.x, tela.x + 8), tela.x + tela.w - larg - 8),
    y: Math.min(Math.max(c.y, tela.y + 8), tela.y + tela.h - alt - 8),
  };
}
