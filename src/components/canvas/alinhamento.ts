// ---------------------------------------------------------------------------
// O motor de alinhamento — as guias do Figma, em função pura
// ---------------------------------------------------------------------------
// Nada de React aqui: entra caixa arrastada + caixas de referência, sai a
// posição corrigida, as linhas a desenhar e as cotas de distância. Assim dá
// pra conferir o cálculo lendo, sem precisar arrastar nó na tela.
//
// Por que snap a OBJETO e não a grid: "centralizar com o de cima" é alinhar
// centro com centro, e centro de outro nó quase nunca cai no grid. O snap ao
// grid nativo do React Flow (`snapToGrid`) resolveria o caso fácil e atrapalharia
// justo o que interessa — por isso ele fica desligado e o encaixe é este.
//
// Tudo aqui está em COORDENADAS DE FLUXO, não em pixels de tela. Quem chama
// divide a tolerância pelo zoom: senão a guia "gruda" de longe com o board
// afastado e não gruda nunca com ele ampliado.
// ---------------------------------------------------------------------------

export type Caixa = { id: string; x: number; y: number; w: number; h: number };

/**
 * Uma linha de alinhamento. `eixo: "v"` = linha vertical, ou seja, alinhamento
 * no eixo X; `pos` é o X dela e `de`/`ate` são a extensão em Y.
 */
export type LinhaGuia = { eixo: "v" | "h"; pos: number; de: number; ate: number };

/** Uma cota: o vão medido entre a caixa arrastada e o vizinho mais próximo. */
export type Cota = {
  eixo: "v" | "h";
  /** onde a cota é desenhada no eixo perpendicular (meio da sobreposição) */
  transversal: number;
  de: number;
  ate: number;
  valor: number;
};

export type Alinhamento = {
  /** posição corrigida pelo encaixe; `null` = nada a corrigir neste eixo */
  x: number | null;
  y: number | null;
  linhas: LinhaGuia[];
  cotas: Cota[];
};

/** folga pra considerar duas bordas "na mesma linha" depois do encaixe */
const EPS = 0.5;

/** As 3 âncoras de uma caixa num eixo: início, meio, fim. */
function ancoras(inicio: number, tamanho: number): number[] {
  return [inicio, inicio + tamanho / 2, inicio + tamanho];
}

/**
 * O menor deslocamento que faz alguma âncora da caixa arrastada coincidir com
 * alguma âncora de alguma referência. São 9 pares por referência (as 3 âncoras
 * contra as 3 dela) — é isso que faz borda-com-borda, centro-com-centro E
 * borda-com-borda-oposta funcionarem sem código separado pra cada caso.
 */
function melhorDeslocamento(
  alvo: number[],
  refs: number[][],
  tolerancia: number,
): number | null {
  let melhor: number | null = null;
  for (const ref of refs) {
    for (const a of alvo) {
      for (const b of ref) {
        const d = b - a;
        if (Math.abs(d) > tolerancia) continue;
        if (melhor === null || Math.abs(d) < Math.abs(melhor)) melhor = d;
      }
    }
  }
  return melhor;
}

/**
 * As linhas a desenhar, já com a caixa na posição final. Roda DEPOIS do
 * encaixe de propósito: assim, quando três nós ficam alinhados, os três
 * aparecem sob a mesma linha — que é o que o Figma faz e o que responde
 * "alinhei com quem?".
 */
function linhasDoEixo(a: Caixa, refs: Caixa[], eixo: "v" | "h"): LinhaGuia[] {
  const vertical = eixo === "v";
  const alvo = vertical ? ancoras(a.x, a.w) : ancoras(a.y, a.h);
  // Uma entrada por posição: se dois nós alinham no mesmo X, é UMA linha que
  // cobre os dois, não duas empilhadas.
  const porPos = new Map<number, { de: number; ate: number }>();

  for (const r of refs) {
    const ref = vertical ? ancoras(r.x, r.w) : ancoras(r.y, r.h);
    for (const va of alvo) {
      for (const vr of ref) {
        if (Math.abs(va - vr) > EPS) continue;
        const pos = Math.round(vr);
        const de = vertical ? Math.min(a.y, r.y) : Math.min(a.x, r.x);
        const ate = vertical
          ? Math.max(a.y + a.h, r.y + r.h)
          : Math.max(a.x + a.w, r.x + r.w);
        const atual = porPos.get(pos);
        if (atual) {
          atual.de = Math.min(atual.de, de);
          atual.ate = Math.max(atual.ate, ate);
        } else {
          porPos.set(pos, { de, ate });
        }
      }
    }
  }

  return [...porPos].map(([pos, ext]) => ({ eixo, pos, de: ext.de, ate: ext.ate }));
}

/** Quanto duas faixas se cruzam. <= 0 = não se cruzam. */
function sobreposicao(a1: number, a2: number, b1: number, b2: number) {
  return Math.min(a2, b2) - Math.max(a1, b1);
}

/**
 * As cotas — os números entre um nó e o outro.
 *
 * Regra: só mede vizinho que se sobrepõe no eixo perpendicular. Sem isso, o
 * "vizinho mais próximo à esquerda" poderia ser um nó lá em cima na diagonal,
 * e a medida não diria nada sobre o espaçamento que se está tentando acertar.
 * Vizinho encostado ou sobreposto (vão <= 0) também sai: cota de 0 é ruído.
 */
function cotasDaCaixa(a: Caixa, refs: Caixa[]): Cota[] {
  const dir = a.x + a.w;
  const base = a.y + a.h;

  let esq: Cota | null = null;
  let dirC: Cota | null = null;
  let cima: Cota | null = null;
  let baixo: Cota | null = null;

  for (const r of refs) {
    const rDir = r.x + r.w;
    const rBase = r.y + r.h;

    // --- horizontal: precisa cruzar em Y ---
    if (sobreposicao(a.y, base, r.y, rBase) > 0) {
      const meio = (Math.max(a.y, r.y) + Math.min(base, rBase)) / 2;
      const vaoEsq = a.x - rDir;
      if (vaoEsq > 0 && (!esq || vaoEsq < esq.valor)) {
        esq = { eixo: "h", transversal: meio, de: rDir, ate: a.x, valor: vaoEsq };
      }
      const vaoDir = r.x - dir;
      if (vaoDir > 0 && (!dirC || vaoDir < dirC.valor)) {
        dirC = { eixo: "h", transversal: meio, de: dir, ate: r.x, valor: vaoDir };
      }
    }

    // --- vertical: precisa cruzar em X ---
    if (sobreposicao(a.x, dir, r.x, rDir) > 0) {
      const meio = (Math.max(a.x, r.x) + Math.min(dir, rDir)) / 2;
      const vaoCima = a.y - rBase;
      if (vaoCima > 0 && (!cima || vaoCima < cima.valor)) {
        cima = { eixo: "v", transversal: meio, de: rBase, ate: a.y, valor: vaoCima };
      }
      const vaoBaixo = r.y - base;
      if (vaoBaixo > 0 && (!baixo || vaoBaixo < baixo.valor)) {
        baixo = { eixo: "v", transversal: meio, de: base, ate: r.y, valor: vaoBaixo };
      }
    }
  }

  return [esq, dirC, cima, baixo].filter((c): c is Cota => c !== null);
}

/**
 * O cálculo completo de um frame de arrasto.
 *
 * @param arrastada onde a caixa está NESTE frame (posição crua do mouse)
 * @param refs      as outras caixas visíveis
 * @param tolerancia distância de encaixe, em coordenadas de fluxo
 */
export function calcularAlinhamento(
  arrastada: Caixa,
  refs: Caixa[],
  tolerancia: number,
): Alinhamento {
  const outras = refs.filter((r) => r.id !== arrastada.id);
  if (!outras.length) return { x: null, y: null, linhas: [], cotas: [] };

  const dx = melhorDeslocamento(
    ancoras(arrastada.x, arrastada.w),
    outras.map((r) => ancoras(r.x, r.w)),
    tolerancia,
  );
  const dy = melhorDeslocamento(
    ancoras(arrastada.y, arrastada.h),
    outras.map((r) => ancoras(r.y, r.h)),
    tolerancia,
  );

  const encaixada: Caixa = {
    ...arrastada,
    x: arrastada.x + (dx ?? 0),
    y: arrastada.y + (dy ?? 0),
  };

  return {
    x: dx === null ? null : encaixada.x,
    y: dy === null ? null : encaixada.y,
    linhas: [
      ...linhasDoEixo(encaixada, outras, "v"),
      ...linhasDoEixo(encaixada, outras, "h"),
    ],
    cotas: cotasDaCaixa(encaixada, outras),
  };
}
