// ---------------------------------------------------------------------------
// Alinhar e distribuir uma seleção
// ---------------------------------------------------------------------------
// Módulo puro pelo mesmo motivo de `alinhamento.ts` e `ondeAbre.ts`: entram
// caixas, saem caixas. Dá pra conferir a conta sem abrir o board.
//
// A REFERÊNCIA É A CAIXA QUE ENVOLVE TODOS, não o primeiro selecionado. Alinhar
// pelo primeiro depende da ORDEM DO CLIQUE, que ninguém vê — dois usuários
// selecionando os mesmos três nós teriam resultados diferentes.
// ---------------------------------------------------------------------------

export type Caixa = { id: string; x: number; y: number; w: number; h: number };
export type Posicao = { id: string; x: number; y: number };

export type Alinhamento =
  | "esq" | "centroH" | "dir"
  | "topo" | "centroV" | "base";

export type Distribuicao = "horizontal" | "vertical";

function envolvente(cs: Caixa[]) {
  return {
    x1: Math.min(...cs.map((c) => c.x)),
    y1: Math.min(...cs.map((c) => c.y)),
    x2: Math.max(...cs.map((c) => c.x + c.w)),
    y2: Math.max(...cs.map((c) => c.y + c.h)),
  };
}

export function alinhar(caixas: Caixa[], como: Alinhamento): Posicao[] {
  if (caixas.length < 2) return [];
  const e = envolvente(caixas);
  return caixas.map((c) => {
    switch (como) {
      case "esq":     return { id: c.id, x: e.x1,                       y: c.y };
      case "dir":     return { id: c.id, x: e.x2 - c.w,                 y: c.y };
      case "centroH": return { id: c.id, x: (e.x1 + e.x2) / 2 - c.w / 2, y: c.y };
      case "topo":    return { id: c.id, x: c.x, y: e.y1 };
      case "base":    return { id: c.id, x: c.x, y: e.y2 - c.h };
      case "centroV": return { id: c.id, x: c.x, y: (e.y1 + e.y2) / 2 - c.h / 2 };
    }
  }).map((p) => ({ ...p, x: Math.round(p.x), y: Math.round(p.y) }));
}

/**
 * Espaço IGUAL entre as caixas, não centros igualmente espaçados.
 *
 * Centros equidistantes é o que a conta ingênua faz, e com caixas de larguras
 * diferentes o resultado tem vãos visivelmente distintos — o olho lê o vão, não
 * o centro. As duas das pontas ficam onde estão: elas definem o intervalo.
 */
export function distribuir(caixas: Caixa[], eixo: Distribuicao): Posicao[] {
  if (caixas.length < 3) return [];
  const h = eixo === "horizontal";
  const ord = [...caixas].sort((a, b) => (h ? a.x - b.x : a.y - b.y));
  const tamanho = (c: Caixa) => (h ? c.w : c.h);
  const inicio = h ? ord[0].x : ord[0].y;
  const fim = h
    ? ord[ord.length - 1].x + ord[ord.length - 1].w
    : ord[ord.length - 1].y + ord[ord.length - 1].h;

  const ocupado = ord.reduce((t, c) => t + tamanho(c), 0);
  const vao = (fim - inicio - ocupado) / (ord.length - 1);

  let cursor = inicio;
  return ord.map((c) => {
    const p = { id: c.id, x: h ? Math.round(cursor) : c.x, y: h ? c.y : Math.round(cursor) };
    cursor += tamanho(c) + vao;
    return p;
  });
}
