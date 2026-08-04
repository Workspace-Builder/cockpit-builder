// ---------------------------------------------------------------------------
// O motor isométrico da Obra — desenho SVG puro
// ---------------------------------------------------------------------------
// Fica fora do React de propósito: são ~40 paths por andar, 36 andares. Como
// componentes, cada marcação viraria uma reconciliação de milhares de nós.
// Aqui o React manda o ESTADO e o motor redesenha o `<svg>`; a UI (checklist,
// painel) essa sim é React.
//
// Regras que o desenho obedece (BLUEPRINT-PAGINAS.md §2):
//   marcou, construiu · não marcou, não construiu
//   andar não marcado com marcado acima vira PULADO: sai da obra e o prédio encurta
//   8020 = viga/laje: pode pular, mas é o que segura o resultado
//   na unha = alvenaria aparente: não tem ferramenta e o prédio não finge que tem
// ---------------------------------------------------------------------------

import type { Passo } from "@/lib/model";
import { PREDIOS, ORDEM, type PredioCfg } from "./pilares";
import {
  ehRetrato,
  reservaBase,
  reservaDireita,
  reservaEsquerda,
  reservaTopo,
  SELETOR_UI_TOPO,
} from "./layout";

export type EstadoAndar = "done" | "now" | "wait" | "skip";

export type EstadoObra = {
  /** id do passo -> construído */
  feitos: Record<string, boolean>;
  /** 0 = o quarteirão inteiro · 1..4 = câmera fechada num prédio */
  foco: 0 | 1 | 2 | 3 | 4;
  /** id do passo selecionado (o painel dos nós é dele) */
  sel: string | null;
  /**
   * O painel do andar está por cima da cena, à direita?
   *
   * A câmera precisa saber: ela enquadra a FAIXA LIVRE, não a tela (layout.ts).
   * Sem isso o prédio é centralizado embaixo do painel — que foi exatamente o
   * que aconteceu quando o painel cresceu.
   */
  painel: boolean;
  /** O checklist do pilar está por cima da cena, à esquerda? */
  aside: boolean;
};

export type Callbacks = {
  /** clique no prédio ou num andar: leva a câmera, sem abrir o painel */
  onPredio: (n: 1 | 2 | 3 | 4, passoId?: string) => void;
  /** clique no checklist ao lado da torre: seleciona E abre os entregáveis */
  onPasso: (n: 1 | 2 | 3 | 4, passoId: string) => void;
};

const NS = "http://www.w3.org/2000/svg";
const WX = 0.866, WY = 0.5;
const PASSO_PLOT = 205, AFASTA = 215;

/**
 * O passo entre prédios NA PILHA.
 *
 * Não é o mesmo 205 da fileira, e a diferença é aritmética da projeção: o
 * deslocamento de tela é `2·t·WX` na horizontal (355px com t=205) e `2·t·WY`
 * na vertical (205px com o mesmo t) — WY é 0,5 contra 0,866 de WX. Só isso já
 * aproximaria os prédios.
 *
 * Some a isso a forma do objeto: um prédio é ALTO. O Pilar 01 vai de
 * `iso(0,0,zt)` a `iso(W,Dp,-20)` e ocupa ~570px de tela na vertical, contra
 * ~215px na horizontal. Empilhar com o passo da fileira faz a torre de cima
 * atravessar a de baixo — foi o que aconteceu na primeira tentativa.
 *
 * 620 = os ~570 do prédio mais alto + ar. Fixo, e não medido, porque `caixa()`
 * precisa do passo ANTES de conhecer a altura de qualquer prédio: é ela quem
 * calcula a altura, e mediria a si mesma.
 */
const PASSO_PILHA = 620;

// --- helpers ---------------------------------------------------------------

const rgba = (h: string, a: number) => {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const claro = (h: string, w: number) => {
  const n = parseInt(h.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * w);
  const g = Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * w);
  const b = Math.round((n & 255) + (255 - (n & 255)) * w);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};
const rng = (s: number) => () => ((s = (s * 1103515245 + 12345) & 0x7fffffff), s / 0x7fffffff);

export function criarObra(svg: SVGSVGElement, passos: Passo[], cb: Callbacks) {
  let OX = 0, OY = 0;

  /**
   * A DIREÇÃO DO QUARTEIRÃO — fileira ou pilha.
   *
   * Os quatro prédios sempre se afastaram pela diagonal `OY = -OX`. Na
   * projeção isométrica isso é deslocamento PURAMENTE HORIZONTAL: com
   * `OX = t, OY = -t`, o x de tela vira `(x - y + 2t)·WX` e o y não muda. Foi
   * assim que o quarteirão nasceu fileira.
   *
   * Trocando o sinal — `OY = +OX` — o par se inverte: o x de tela para de
   * andar e o y passa a `(x + y + 2t)·WY`. Os mesmos prédios, o mesmo desenho,
   * empilhados. Nada é redesenhado; muda a direção em que eles se afastam.
   *
   * POR QUE ISSO IMPORTA EM RETRATO: em 375px de largura, quatro prédios lado
   * a lado dão 90px cada, e a placa de cada um sai ilegível. A largura é
   * justamente a dimensão que falta no celular — e a altura, a que sobra.
   * Empilhar paga na moeda certa.
   *
   * -1 = fileira (paisagem, o de sempre) · +1 = pilha (retrato).
   */
  let EIXO: -1 | 1 = ehRetrato(window.innerWidth) ? 1 : -1;

  /** Distância entre prédios vizinhos, na direção em que eles se afastam. */
  const PASSO = () => (EIXO === 1 ? PASSO_PILHA : PASSO_PLOT);

  const iso = (x: number, y: number, z: number): [number, number] =>
    [(x + OX - (y + OY)) * WX, (x + OX + y + OY) * WY - z];
  const P = (x: number, y: number, z: number) => {
    const a = iso(x, y, z);
    return `${a[0].toFixed(2)},${a[1].toFixed(2)}`;
  };
  const box = (x0: number, y0: number, x1: number, y1: number, z0: number, z1: number) => ({
    top: `M${P(x0, y0, z1)} L${P(x1, y0, z1)} L${P(x1, y1, z1)} L${P(x0, y1, z1)} Z`,
    rgt: `M${P(x1, y0, z1)} L${P(x1, y1, z1)} L${P(x1, y1, z0)} L${P(x1, y0, z0)} Z`,
    lft: `M${P(x1, y1, z1)} L${P(x0, y1, z1)} L${P(x0, y1, z0)} L${P(x1, y1, z0)} Z`,
  });
  const fR = (X: number, a0: number, a1: number, z0: number, z1: number) =>
    `M${P(X, a0, z0)} L${P(X, a1, z0)} L${P(X, a1, z1)} L${P(X, a0, z1)} Z`;
  const fL = (Y: number, a0: number, a1: number, z0: number, z1: number) =>
    `M${P(a0, Y, z0)} L${P(a1, Y, z0)} L${P(a1, Y, z1)} L${P(a0, Y, z1)} Z`;

  const el = (t: string, a?: Record<string, string | number | null>) => {
    const e = document.createElementNS(NS, t);
    if (a) for (const k in a) if (a[k] != null) e.setAttribute(k, String(a[k]));
    return e;
  };
  const add = (p: Element, t: string, a?: Record<string, string | number | null>) => {
    const e = el(t, a);
    p.appendChild(e);
    return e;
  };

  const doPilar = (n: 1 | 2 | 3 | 4) =>
    passos.filter((p) => p.pilar === n).sort((a, b) => a.ordem - b.ordem);

  let E: EstadoObra = { feitos: {}, foco: 0, sel: null, painel: false, aside: false };
  const GRUPO: Record<number, SVGGElement> = {};

  const feitos = (n: 1 | 2 | 3 | 4) => doPilar(n).filter((p) => E.feitos[p.id]).length;
  const topo = (n: 1 | 2 | 3 | 4) => {
    const l = doPilar(n);
    let t = -1;
    l.forEach((p, i) => { if (E.feitos[p.id]) t = i; });
    return t;
  };
  const est = (n: 1 | 2 | 3 | 4, i: number): EstadoAndar => {
    const l = doPilar(n);
    if (E.feitos[l[i].id]) return "done";
    if (i < topo(n)) return "skip";
    return E.sel === l[i].id ? "now" : "wait";
  };
  const slotsDe = (n: 1 | 2 | 3 | 4) => {
    const l = doPilar(n);
    const slotOf: number[] = [];
    let slot = 0;
    l.forEach((_, i) => { slotOf[i] = est(n, i) === "skip" ? -1 : slot++; });
    return { slotOf, slots: slot };
  };
  /* ---- raio-X da obra ----------------------------------------------------
     Com um andar em foco a torre ABRE: cada andar afasta do de baixo, e o andar
     ativo ainda sai do prumo e cresce. Isso dá ar pro checklist ficar reto ao
     lado de cada laje, e faz o andar selecionado virar acontecimento em vez de
     contorno mais grosso. */
  const GAP_ABERTO = 11;    // ar entre lajes: é o que deixa o checklist reto
  const VAO = 44;           // rasgo aberto ACIMA do andar ativo
  const SOBE_ATIVO = 16;    // o ativo sobe também — senão o do slot 0 entra no térreo
  const PUXA = 34, ESCALA = 0.16;   // desloca pra DIREITA, na direção do painel

  /* A geometria do andar é desenhada SEMPRE na posição de repouso. Abrir a
     torre, puxar o andar e crescer viram `transform` no <g> dele, interpolado
     no mesmo laço da câmera.
     Antes isso entrava direto no path: o prédio pulava pro estado novo em UM
     quadro enquanto a câmera levava 620ms — daí a sensação de travado. O FPS
     nunca foi o problema (60fps nos dois); o problema era o prédio não animar. */
  type Tr = { s: number; p: number; e: number };      // sobe · puxa · escala
  type Mapa = Record<number, number>;
  const TR: Record<string, Tr> = {};                   // por id de passo, valor ATUAL
  const GA: Record<string, { g: SVGGElement; cx: number; cy: number }> = {};
  /* Navegar não pode reconstruir o SVG. O quadro de reconstrução caía no INÍCIO
     do movimento e a transição começava engasgada. Por isso guardamos o grupo
     de cada andar, o das etiquetas e o da placa: trocar de tela passa a mexer
     só em transform e opacity, e só o andar que mudou de estado é redesenhado. */
  const FG: Record<string, { g: SVGGElement; n: 1 | 2 | 3 | 4; i: number }> = {};
  const GETQ: Record<number, SVGGElement> = {};
  const GPLACA: Record<number, SVGGElement> = {};

  /** o pavilhão recua em patamares, não a cada andar */
  const recuo = (c: PredioCfg, slot: number) =>
    c.tipo === "terracos" ? Math.floor(slot / 2) * (c.recuo ?? 0) : 0;
  const fp = (c: PredioCfg, slot: number): [number, number] => {
    const r = recuo(c, slot);
    return [c.W - r, c.Dp - r];
  };

  // --- defs ---------------------------------------------------------------
  function defs() {
    const d = el("defs");
    // `g80` saiu junto com o glow do 8020 — filtro declarado e não usado é
    // rasterização paga por quadro em troca de nada.
    ([["gN", 7], ["gS", 3.4], ["gT", 2.2], ["gW", 2.6]] as [string, number][])
      .forEach(([id, sd]) => {
        const f = add(d, "filter", { id, x: "-95%", y: "-95%", width: "290%", height: "290%" });
        add(f, "feGaussianBlur", { stdDeviation: sd, result: "b" });
        const m = add(f, "feMerge");
        add(m, "feMergeNode", { in: "b" });
        add(m, "feMergeNode", { in: "SourceGraphic" });
      });
    const grad = (id: string, a: string, ao: string, b: string, bo: string) => {
      const g = add(d, "linearGradient", { id, x1: "0", y1: "0", x2: "0", y2: "1" });
      add(g, "stop", { offset: "0", "stop-color": a, "stop-opacity": ao });
      add(g, "stop", { offset: "1", "stop-color": b, "stop-opacity": bo });
    };
    grad("conc", "#2a323e", ".95", "#151b24", ".95");
    grad("wood", "#b98a4e", ".5", "#6d4a25", ".6");
    grad("mirr", "#b9dcff", ".16", "#060a12", ".72");
    // vidro, térreo e halo do chão saem da cor do PILAR — a base identifica o
    // prédio tanto quanto o corpo. Antes eram um âmbar único pros quatro.
    ORDEM.forEach((n) => {
      const c = PREDIOS[n];
      grad("vidro" + n, claro(c.cor, 0.6), ".40", c.cor, ".58");
      grad("lob" + n, claro(c.cor, 0.5), ".40", c.cor, ".52");
      const h = add(d, "radialGradient", { id: "halo" + n });
      add(h, "stop", { offset: "0", "stop-color": c.cor, "stop-opacity": ".16" });
      add(h, "stop", { offset: "1", "stop-color": c.cor, "stop-opacity": "0" });
    });
    return d;
  }

  // --- terreno, entorno ----------------------------------------------------
  function terreno(root: Element, c: PredioCfg) {
    const G = 42;
    add(root, "ellipse", {
      cx: iso(c.W / 2, c.Dp / 2, 0)[0], cy: iso(c.W / 2, c.Dp / 2, 0)[1] + 20,
      rx: (c.W + c.Dp + 84) * 0.43, ry: (c.W + c.Dp + 84) * 0.19, fill: `url(#halo${c.n})`,
    });
    const g1 = box(-G, -G, c.W + G, c.Dp + G, -20, -12);
    add(root, "path", { d: g1.lft, fill: "#080c13" });
    add(root, "path", { d: g1.rgt, fill: "#0a0f17" });
    add(root, "path", { d: g1.top, fill: "#0b1119", stroke: "rgba(255,255,255,.04)", "stroke-width": 0.8 });
    for (let t = -G + 18; t < c.W + G; t += 26)
      add(root, "line", {
        x1: iso(t, -G, -12)[0], y1: iso(t, -G, -12)[1],
        x2: iso(t, c.Dp + G, -12)[0], y2: iso(t, c.Dp + G, -12)[1],
        stroke: "rgba(255,255,255,.025)", "stroke-width": 0.6,
      });
    const g2 = box(-18, -18, c.W + 18, c.Dp + 18, -12, -3);
    add(root, "path", { d: g2.lft, fill: "#0c1219" });
    add(root, "path", { d: g2.rgt, fill: "#0e141d" });
    add(root, "path", { d: g2.top, fill: "#111823", stroke: rgba(c.cor, 0.18), "stroke-width": 0.9 });
  }
  function arvore(root: Element, x: number, y: number, z: number, s: number, cor?: string) {
    const t = iso(x, y, z);
    add(root, "line", { x1: t[0], y1: t[1], x2: t[0], y2: t[1] - 8 * s, stroke: "#2a2118", "stroke-width": 1.5 * s });
    ([[0, -10, 6], [-3, -13.5, 4.6], [3, -15, 4], [0, -18, 3]] as number[][]).forEach((o) => {
      add(root, "ellipse", {
        cx: t[0] + o[0] * s, cy: t[1] + o[1] * s, rx: o[2] * s, ry: o[2] * 0.78 * s,
        fill: cor || "rgba(46,102,72,.85)", stroke: "rgba(78,150,110,.32)", "stroke-width": 0.5,
      });
    });
  }
  function lobby(root: Element, c: PredioCfg) {
    const r = rng(7);
    const b = box(0, 0, c.W, c.Dp, 0, c.LOB);
    add(root, "path", { d: b.lft, fill: "#0c1219", stroke: "rgba(255,255,255,.06)", "stroke-width": 0.8 });
    add(root, "path", { d: b.rgt, fill: "#0f1520", stroke: "rgba(255,255,255,.06)", "stroke-width": 0.8 });
    add(root, "path", { d: fR(c.W, 7, c.Dp - 7, 6, c.LOB - 10), fill: `url(#lob${c.n})` });
    add(root, "path", { d: fL(c.Dp, 7, c.W - 7, 6, c.LOB - 10), fill: `url(#lob${c.n})`, opacity: 0.8 });
    for (let i = 0; i < Math.floor(c.Dp / 16); i++) {
      const a = 10 + i * 15;
      add(root, "path", { d: fR(c.W, a, a + 8, 6, 6 + 6 + r() * 9), fill: "rgba(6,10,16,.55)" });
    }
    for (let i = 10; i < c.W - 6; i += 13) add(root, "path", { d: fL(c.Dp, i, i + 1.4, 6, c.LOB - 10), fill: "rgba(8,11,16,.75)" });
    for (let i = 10; i < c.Dp - 6; i += 13) add(root, "path", { d: fR(c.W, i, i + 1.4, 6, c.LOB - 10), fill: "rgba(8,11,16,.75)" });
    const mq = box(-5, -5, c.W + 5, c.Dp + 5, c.LOB - 9, c.LOB - 4);
    add(root, "path", { d: mq.lft, fill: "#101724" });
    add(root, "path", { d: mq.rgt, fill: "#131b29" });
    add(root, "path", { d: mq.top, fill: "#18202e", stroke: rgba(c.cor, 0.4), "stroke-width": 0.8 });
    const s = iso(c.W + 5, c.Dp * 0.5, c.LOB - 14);
    // "OBRA 10K" é o selo comum aos quatro — o que muda de prédio é a cor da fachada
    const tx = add(root, "text", {
      x: s[0], y: s[1] + 3, fill: claro(c.cor, 0.55), "text-anchor": "middle", filter: "url(#gW)",
      style: "font:700 9px ui-monospace,monospace;letter-spacing:.2em",
    });
    tx.textContent = "OBRA 10K";
    add(root, "path", { d: b.top, fill: rgba(c.cor, 0.07), stroke: rgba(c.cor, 0.45), "stroke-width": 1.3 });
  }

  // --- um andar ------------------------------------------------------------
  function andar(root: Element, c: PredioCfg, n: 1 | 2 | 3 | 4, i: number, slot: number) {
    const lst = doPilar(n);
    const Q = lst[i], st = est(n, i);
    const ativo = st === "now";
    const [W0, D0] = fp(c, slot);
    /* o ativo sai do prumo e cresce; os demais só sobem pelo exploded */
    const W = W0, Dd = D0;
    const x0 = 0, y0 = 0, x1 = W, y1 = Dd;             // repouso: o resto é transform
    const z0 = c.LOB + slot * c.FH, z1 = z0 + c.FH - 3;
    const b = box(x0, y0, x1, y1, z0, z1);
    const CP = c.cor, CL = claro(CP, 0.55);
    const cor = ativo ? CL : CP;
    const g = add(root, "g", st === "wait" ? { class: "holo" } : undefined);
    const r = rng(31 + n * 97 + i * 37);

    /* registra o grupo e o centro (pra escala sair do meio da laje, não do canto) */
    const cIso = iso(W / 2, Dd / 2, z0 + c.FH / 2);
    GA[Q.id] = { g: g as SVGGElement, cx: cIso[0], cy: cIso[1] };
    if (!TR[Q.id]) TR[Q.id] = { s: 0, p: 0, e: 1 };

    if (st === "wait") {
      /* FUTURO: wireframe rebaixado. Não usa mais a cor cheia do pilar —
         projeto não pode competir com obra. Só o 8020 mantém um fio da cor,
         porque é viga: dá pra pular, mas é o que segura o resultado. */
      const est0 = "#24304A";
      const op = Q.e8020 ? 0.95 : 0.6;
      add(g, "path", { d: b.lft, fill: "rgba(36,48,74,.10)", stroke: rgba(est0, op), "stroke-width": 0.9 });
      add(g, "path", { d: b.rgt, fill: "rgba(36,48,74,.16)", stroke: rgba(est0, op), "stroke-width": 0.9 });
      ([[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as number[][]).forEach((p2) => {
        const a = iso(p2[0], p2[1], z0), e2 = iso(p2[0], p2[1], z1);
        add(g, "line", { x1: a[0], y1: a[1], x2: e2[0], y2: e2[1], stroke: rgba(est0, op * 0.8), "stroke-width": 0.8 });
      });
      add(g, "path", {
        d: b.top, fill: "none",
        stroke: Q.e8020 ? rgba(CP, 0.45) : rgba(est0, 1),
        "stroke-width": Q.e8020 ? 1.5 : 1,
      });

    } else if (ativo && !E.feitos[Q.id]) {
      /* ATIVO E AINDA NÃO CONSTRUÍDO: o raio-X. Casca de vidro, miolo aceso,
         laje grossa. É o maior contraste da tela — a obra acontecendo agora. */
      add(g, "path", { d: b.lft, fill: "#0D1526", stroke: rgba(CL, 0.5), "stroke-width": 1 });
      add(g, "path", { d: b.rgt, fill: "#101A2E", stroke: rgba(CL, 0.5), "stroke-width": 1 });
      add(g, "path", { d: fR(x1, y0 + 6, y1 - 6, z0 + 5, z1 - 6), fill: "url(#vidro" + n + ")" });
      add(g, "path", { d: fL(y1, x0 + 6, x1 - 6, z0 + 5, z1 - 6), fill: "url(#vidro" + n + ")", opacity: 0.88 });
      for (let k = 0; k < 9; k++) {
        const bx = x0 + 12 + r() * (W - 34), by = y0 + 12 + r() * (Dd - 34);
        const sz = 8 + r() * 10, hh = 5 + r() * (c.FH * 0.5);
        const bb = box(bx, by, bx + sz, by + sz, z0 + 3, z0 + 3 + hh);
        add(g, "path", { d: bb.lft, fill: rgba(CP, 0.14), stroke: rgba(CL, 0.5), "stroke-width": 0.6 });
        add(g, "path", { d: bb.rgt, fill: rgba(CP, 0.2), stroke: rgba(CL, 0.5), "stroke-width": 0.6 });
        add(g, "path", { d: bb.top, fill: rgba(CL, 0.3), stroke: rgba(claro(CP, 0.8), 0.7), "stroke-width": 0.6 });
      }
      for (let k = 10; k < Dd - 8; k += 13) add(g, "path", { d: fR(x1, y0 + k, y0 + k + 1.5, z0 + 5, z1 - 6), fill: "rgba(8,14,26,.5)" });
      const lj = box(x0 - 4, y0 - 4, x1 + 4, y1 + 4, z1 - 7, z1);
      add(g, "path", { d: lj.lft, fill: "#16243D" });
      add(g, "path", { d: lj.rgt, fill: "#1A2B47" });
      add(g, "path", { d: lj.top, fill: rgba(CP, 0.2), stroke: claro(CP, 0.45), "stroke-width": 2.4, filter: "url(#gN)" });

    } else {
      /* CONSTRUÍDO: sólido, na cor do pilar. Matéria, não projeto. */
      const atual = ativo;
      add(g, "path", { d: b.lft, fill: "#0b1118", stroke: "rgba(255,255,255,.05)", "stroke-width": 0.7 });
      add(g, "path", { d: b.rgt, fill: "#0d141d", stroke: "rgba(255,255,255,.05)", "stroke-width": 0.7 });

      if (Q.unha) {
        // alvenaria aparente: sem vidro, porque não tem ferramenta pra este passo
        add(g, "path", { d: fR(x1, y0 + 5, y1 - 5, z0 + 4, z1 - 5), fill: "rgba(90,64,42,.62)" });
        add(g, "path", { d: fL(y1, x0 + 5, x1 - 5, z0 + 4, z1 - 5), fill: "rgba(76,54,36,.62)" });
        for (let k = z0 + 6; k < z1 - 6; k += 5) {
          add(g, "path", { d: fR(x1, y0 + 5, y1 - 5, k, k + 0.8), fill: "rgba(0,0,0,.32)" });
          add(g, "path", { d: fL(y1, x0 + 5, x1 - 5, k, k + 0.8), fill: "rgba(0,0,0,.26)" });
        }
      } else if (c.tipo === "torre") {
        add(g, "path", { d: fR(x1, y0 + 6, y1 - 6, z0 + 5, z1 - 6), fill: "url(#vidro" + n + ")" });
        add(g, "path", { d: fL(y1, x0 + 6, x1 - 6, z0 + 5, z1 - 6), fill: "url(#vidro" + n + ")", opacity: 0.82 });
        for (let k = 0; k < 7; k++) {
          const a1 = y0 + 8 + k * 15;
          add(g, "path", { d: fR(x1, a1, a1 + 7, z0 + 5, z0 + 5 + 4 + r() * 10), fill: "rgba(8,18,34,.6)" });
        }
        for (let k = 8; k < Dd - 6; k += 12) add(g, "path", { d: fR(x1, y0 + k, y0 + k + 1.2, z0 + 5, z1 - 6), fill: "rgba(7,10,15,.78)" });
        for (let k = 8; k < W - 6; k += 12) add(g, "path", { d: fL(y1, x0 + k, x0 + k + 1.2, z0 + 5, z1 - 6), fill: "rgba(7,10,15,.78)" });
      } else if (c.tipo === "vitrine") {
        // espelhada: reflete, quase não acende por dentro — a luz vem do letreiro
        add(g, "path", { d: fR(x1, y0 + 5, y1 - 5, z0 + 4, z1 - 5), fill: "url(#mirr)" });
        add(g, "path", { d: fL(y1, x0 + 5, x1 - 5, z0 + 4, z1 - 5), fill: "url(#mirr)", opacity: 0.75 });
        for (let k = 6; k < Dd - 5; k += 17) add(g, "path", { d: fR(x1, y0 + k, y0 + k + 1.4, z0 + 4, z1 - 5), fill: rgba(claro(CP, 0.6), 0.1) });
        for (let k = 6; k < W - 5; k += 17) add(g, "path", { d: fL(y1, x0 + k, x0 + k + 1.4, z0 + 4, z1 - 5), fill: "rgba(6,14,10,.8)" });
      } else if (c.tipo === "tecnico") {
        add(g, "path", { d: fR(x1, y0 + 4, y1 - 4, z0 + 3, z1 - 4), fill: "url(#conc)" });
        add(g, "path", { d: fL(y1, x0 + 4, x1 - 4, z0 + 3, z1 - 4), fill: "url(#conc)", opacity: 0.9 });
        for (let k = 0; k < 3; k++) {
          const a2 = y0 + 16 + k * 36;
          add(g, "path", { d: fR(x1, a2, a2 + 16, z1 - 13, z1 - 7), fill: rgba(CP, atual ? 0.55 : 0.34) });
        }
        for (let k = 0; k < 3; k++) {
          const x2 = x0 + W - 16 - k * 36;
          add(g, "path", { d: fL(y1, x2 - 16, x2, z1 - 13, z1 - 7), fill: rgba(CP, 0.25) });
        }
        // a tubulação é externa: o processo deste pilar aparece por fora
        const du = box(x1, y0 + Dd * 0.18, x1 + 7, y0 + Dd * 0.18 + 11, z0, z1 + 3);
        add(g, "path", { d: du.rgt, fill: "rgba(38,52,62,.95)", stroke: rgba(CP, 0.35), "stroke-width": 0.7 });
        add(g, "path", { d: du.top, fill: "rgba(52,70,82,.95)", stroke: rgba(CP, 0.4), "stroke-width": 0.7 });
      } else {
        add(g, "path", { d: fR(x1, y0 + 5, y1 - 5, z0 + 4, z1 - 6), fill: "url(#wood)" });
        add(g, "path", { d: fL(y1, x0 + 5, x1 - 5, z0 + 4, z1 - 6), fill: "url(#wood)", opacity: 0.8 });
        for (let k = 6; k < Dd - 5; k += 11) add(g, "path", { d: fR(x1, y0 + k, y0 + k + 1.6, z0 + 4, z1 - 6), fill: "rgba(40,26,12,.6)" });
        // o único prédio com gente: este pilar é sobre com quem você está
        for (let k = 0; k < 3; k++) {
          const pxx = x0 + 12 + r() * (W - 30), py = y1 - 8 - r() * 7, ph = iso(pxx, py, z1);
          add(g, "line", { x1: ph[0], y1: ph[1], x2: ph[0], y2: ph[1] - 7, stroke: "rgba(255,205,140,.7)", "stroke-width": 1.6 });
          add(g, "circle", { cx: ph[0], cy: ph[1] - 9, r: 1.5, fill: "rgba(255,205,140,.8)" });
        }
      }

      // laje opaca: sem ela o último andar fica sem teto e vê-se o miolo do prédio
      add(g, "path", { d: b.top, fill: "#0d141e" });
      /* A laje do 8020 continua mais grossa, mas perdeu o brilho (`g80`): a
         espessura é relevo de prédio, o glow era um NOME — dizia "olhe pra
         este andar e não pros outros". Ver `e8020` em lib/model.ts. */
      add(g, "path", {
        d: b.top, fill: rgba(CP, atual ? 0.16 : 0.09), stroke: cor,
        "stroke-width": (atual ? 2.2 : 1.4) + (Q.e8020 ? 0.7 : 0),
        filter: atual ? "url(#gS)" : null,
      });

      if (c.tipo === "terracos") {
        const nf = fp(c, slot + 1);
        add(g, "line", {
          x1: iso(x0 + nf[0], y1, z1)[0], y1: iso(x0 + nf[0], y1, z1)[1],
          x2: iso(x1, y1, z1)[0], y2: iso(x1, y1, z1)[1], stroke: rgba(CP, 0.5), "stroke-width": 1,
        });
        arvore(g, x1 - 9, y1 - 9, z1, 0.72, "rgba(78,130,84,.85)");
      }
    }

    /* a SETA até os entregáveis — o andar ativo aponta pro painel da direita.
       Sem ela o painel parecia de outra tela. (O nome do andar não é repetido
       aqui dentro: ele já está na etiqueta, ao lado da laje.) */
    if (ativo) {
      const a = iso(x1, y0 + Dd * 0.42, z0 + c.FH * 0.5);
      const fim2 = a[0] + 168;
      add(g, "path", {
        d: `M${a[0]},${a[1]} L${a[0] + 52},${a[1] - 26} L${fim2},${a[1] - 26}`,
        fill: "none", stroke: rgba(claro(c.cor, 0.45), 0.65), "stroke-width": 1.3,
      });
      add(g, "path", {
        d: `M${fim2},${a[1] - 26} l-9,-4.5 l0,9 Z`, fill: claro(c.cor, 0.45),
      });
      add(g, "circle", { cx: a[0], cy: a[1], r: 3.6, fill: claro(c.cor, 0.5), filter: "url(#gS)" });
    }
  }

  /* --- o checklist, ao lado das lajes -------------------------------------
     Fica no SVG e não numa barra lateral: assim cada linha aponta pra laje
     dela, reta. É o exploded que dá o espaço — sem ele os nomes se encavalam
     na altura real do andar. */
  function etiquetas(root: Element, c: PredioCfg, n: 1 | 2 | 3 | 4) {
    const lst = doPilar(n);
    /* Lista de passo fixo, afastada da torre e SEM fio até a laje.
       Amarrar cada linha ao andar obrigava a etiqueta a seguir a altura da laje
       — e andar pulado não tem laje, então os pulados se amontoavam. Aqui todo
       passo tem a mesma linha, sempre visível; o pulado aparece riscado. */
    const ESP = Math.max(c.FH * 0.9, 34);
    const LX = iso(0, c.Dp, 0)[0] - 76;
    const Y0 = iso(0, c.Dp, c.LOB + c.FH * 0.5)[1];

    lst.forEach((Q, i) => {
      const st = est(n, i);
      const skip = st === "skip", ativo = st === "now", pronto = st === "done";
      const y = Y0 - i * ESP;
      const g = add(root, "g", { class: "cursor-pointer" });
      g.addEventListener("click", (ev) => { ev.stopPropagation(); cb.onPasso(n, Q.id); });

      /* alvo de clique da linha inteira — o texto sozinho é difícil de acertar.
         Em pilha o nome não é desenhado (ver abaixo), então o alvo encolhe pro
         redor do número: mantido em 232 ele seguiria reservando a largura da
         lista que saiu, e o recorte do prédio não ganharia nada. */
      add(g, "rect",
        EIXO === 1
          ? { x: LX - 22, y: y - 15, width: 44, height: 30, fill: "transparent" }
          : { x: LX - 210, y: y - 15, width: 232, height: 30, fill: "transparent" });

      add(g, "circle", {
        cx: LX, cy: y, r: 11,
        fill: ativo ? c.cor : pronto ? rgba(c.cor, 0.14) : "rgba(16,22,36,.9)",
        stroke: ativo ? claro(c.cor, 0.5) : pronto ? c.cor : "#24304A",
        "stroke-width": 1.4, filter: ativo ? "url(#gS)" : null,
      });
      const tn = add(g, "text", {
        x: LX, y: y + 3.4, "text-anchor": "middle",
        fill: ativo ? "#04070d" : pronto ? c.cor : "#5B6884",
        style: "font:700 10px ui-monospace,monospace",
      });
      tn.textContent = pronto ? "\u2713" : skip ? "\u2013" : String(Q.ordem).padStart(2, "0");

      /* O NOME DO ANDAR NÃO EXISTE EM PILHA — e não é economia de pixel, é
         legibilidade. Medido no wireframe: com a torre enquadrada em 375px,
         estes 13px do mundo chegam à tela a 7,8px, contra o mínimo de 12 da
         auditoria. Ilegível, e ocupando 26% da largura (a coluna toda) que é
         justamente o que falta pro desenho.
         O nome não some do app: ele é o título da folha, que abre ao tocar no
         número — lugar onde ele é lido de verdade. O que fica aqui é o badge,
         que já carrega o estado (ativo acende na cor do pilar, pronto vira ✓,
         pulado vira travessão). */
      if (EIXO !== 1) {
        const nm = add(g, "text", {
          x: LX - 19, y: Q.unha ? y - 1 : y + 3.6, "text-anchor": "end",
          fill: ativo ? "#F3F6FC" : pronto ? "#A8B6CC" : skip ? "#46505f" : "#5B6884",
          "text-decoration": skip ? "line-through" : null,
          style: "font:600 13px system-ui,sans-serif",
        });
        nm.textContent = Q.titulo;
      }

      /* Só "NA UNHA" sobra aqui. O selo "8020" saiu: ele dividia a lista em
         andares que importam e andares que não, e os 36 são obrigatórios. O
         80/20 agora é do ENTREGÁVEL e mora dentro do painel do andar, onde há
         escolha de verdade entre aula, ferramenta e IA. */
      /* Em pilha ele sai junto com o nome: mora na mesma coluna, e a 7,5px do
         mundo chegaria à tela perto de 4px — flutuando num vazio, já que o
         nome que o ancorava não está mais lá. O painel do andar continua
         mostrando "NA UNHA · SEM FERRAMENTA", que é onde ele decide algo. */
      if (Q.unha && EIXO !== 1) {
        const t8 = add(g, "text", {
          x: LX - 19, y: y + 10, "text-anchor": "end",
          fill: "#c98a2f",
          style: "font:700 7.5px ui-monospace,monospace;letter-spacing:.14em",
        });
        t8.textContent = "NA UNHA";
      }
    });
  }

  // --- cobertura -----------------------------------------------------------
  function cobertura(root: Element, c: PredioCfg, zt: number, slots: number, cheio: boolean) {
    const [W, Dd] = fp(c, slots);
    const col = rgba(c.cor, cheio ? 0.8 : 0.45);

    // a laje de cobertura — o "teto". Sem ela o topo é vazado.
    const lj = box(0, 0, W, Dd, zt - 4, zt);
    add(root, "path", { d: lj.lft, fill: "#0a1018" });
    add(root, "path", { d: lj.rgt, fill: "#0c131c" });
    add(root, "path", { d: lj.top, fill: "#0e1620" });
    add(root, "path", { d: lj.top, fill: rgba(c.cor, cheio ? 0.13 : 0.06), stroke: col, "stroke-width": 1.4, filter: cheio ? "url(#gS)" : null });

    const par = box(-3, -3, W + 3, Dd + 3, zt, zt + 5);
    (["lft", "rgt", "top"] as const).forEach((k, i) =>
      add(root, "path", { d: par[k], fill: "none", stroke: col, "stroke-width": i === 2 ? 1.1 : 0.9 }));

    if (c.tipo === "torre") {
      ([[24, 26, 30, 18], [64, 58, 24, 12]] as number[][]).forEach((u) => {
        const bb = box(u[0], u[1], u[0] + u[2], u[1] + u[2], zt + 5, zt + 5 + u[3]);
        (["lft", "rgt", "top"] as const).forEach((k) =>
          add(root, "path", { d: bb[k], fill: cheio ? "#111a28" : "none", stroke: col, "stroke-width": 0.7 }));
      });
      const m = iso(36, 42, zt + 22);
      add(root, "line", { x1: m[0], y1: m[1], x2: m[0], y2: m[1] - 30, stroke: col, "stroke-width": 0.9 });
      if (cheio) add(root, "path", { d: `M${m[0]},${m[1] - 30} l15,4 l-15,4 Z`, fill: rgba(c.cor, 0.85), filter: "url(#gS)" });
      add(root, "circle", { cx: m[0], cy: m[1] - 33, r: 2.3, fill: "#ff6b5a", class: "beacon", filter: "url(#gW)" });
    } else if (c.tipo === "vitrine") {
      // o letreiro acende conforme constrói: este pilar é o único que se anuncia
      const pct = feitos(2) / doPilar(2).length, br = 0.22 + pct * 0.72;
      const lt = box(6, Dd * 0.3, W - 6, Dd * 0.3 + 9, zt + 5, zt + 26);
      add(root, "path", { d: lt.rgt, fill: rgba(c.cor, br * 0.5), stroke: rgba(c.cor, br), "stroke-width": 1.2, filter: pct > 0.15 ? "url(#gS)" : null });
      add(root, "path", { d: lt.top, fill: rgba(c.cor, br * 0.7), stroke: rgba(c.cor, br), "stroke-width": 1 });
      const s = iso(W - 6, Dd * 0.34, zt + 14);
      const tx = add(root, "text", {
        x: s[0] - 8, y: s[1] + 4, "text-anchor": "end", fill: `rgba(255,255,255,${0.3 + pct * 0.7})`,
        filter: pct > 0.15 ? "url(#gS)" : null, style: "font:700 13px ui-monospace,monospace;letter-spacing:.1em",
      });
      tx.textContent = "VALOR";
    } else if (c.tipo === "tecnico") {
      const cx = box(20, 26, 54, 60, zt + 5, zt + 26);
      (["lft", "rgt", "top"] as const).forEach((k) =>
        add(root, "path", { d: cx[k], fill: "rgba(30,44,54,.95)", stroke: col, "stroke-width": 0.8 }));
      ([[70, 30], [92, 58], [68, 74]] as number[][]).forEach((u) => {
        const e2 = box(u[0], u[1], u[0] + 15, u[1] + 15, zt + 5, zt + 12);
        (["rgt", "top"] as const).forEach((k) =>
          add(root, "path", { d: e2[k], fill: "rgba(40,56,66,.95)", stroke: col, "stroke-width": 0.7 }));
        add(root, "circle", {
          cx: iso(u[0] + 7.5, u[1] + 7.5, zt + 12)[0], cy: iso(u[0] + 7.5, u[1] + 7.5, zt + 12)[1],
          r: 4.5, fill: "none", stroke: rgba(c.cor, 0.55), "stroke-width": 0.8,
        });
      });
    } else {
      for (let k = 0; k < 5; k++)
        add(root, "line", {
          x1: iso(8 + k * 12, 6, zt + 11)[0], y1: iso(8 + k * 12, 6, zt + 11)[1],
          x2: iso(8 + k * 12, Dd - 6, zt + 11)[0], y2: iso(8 + k * 12, Dd - 6, zt + 11)[1],
          stroke: rgba(c.cor, 0.42), "stroke-width": 1,
        });
      const fg = iso(W * 0.5, Dd * 0.5, zt + 5);
      add(root, "circle", { cx: fg[0], cy: fg[1], r: 6, fill: "rgba(255,150,60,.35)", filter: "url(#gW)" });
    }
  }

  /** o guindaste fica só no 01 — é o único pilar em produção ativa por cliente */
  function guindaste(root: Element, c: PredioCfg, zt: number) {
    const base = iso(c.W + 26, -8, 0), h = zt + 70;
    add(root, "line", { x1: base[0], y1: base[1], x2: base[0], y2: base[1] - h, stroke: "rgba(255,178,86,.5)", "stroke-width": 1.8 });
    for (let k = 0; k < Math.floor(h / 13); k++)
      add(root, "line", { x1: base[0] - 4, y1: base[1] - k * 13, x2: base[0] + 4, y2: base[1] - (k + 1) * 13, stroke: "rgba(255,178,86,.22)", "stroke-width": 0.7 });
    const top = base[1] - h;
    add(root, "line", { x1: base[0] - 130, y1: top + 8, x2: base[0] + 34, y2: top - 4, stroke: "rgba(255,178,86,.5)", "stroke-width": 1.6 });
    add(root, "circle", { cx: base[0], cy: top - 3, r: 2.2, fill: "#ff6b5a", class: "beacon", filter: "url(#gW)" });
  }

  // --- a cena --------------------------------------------------------------
  function cena(root: Element) {
    ORDEM.forEach((n, k) => {
      const c = PREDIOS[n];
      const t = k * PASSO(); 
      const ativo = E.foco === n;
      const g = add(root, "g", { class: "cursor-pointer", "data-p": n }) as SVGGElement;
      g.addEventListener("click", () => cb.onPredio(n));
      OX = t; OY = EIXO * t;

      // área de clique: a silhueta inteira, invisível. Sem isso o clique cai no
      // vazio entre as linhas do wireframe e o prédio não seleciona.
      const { slotOf, slots } = slotsDe(n);
      const sil = box(0, 0, c.W, c.Dp, -20, c.LOB + doPilar(n).length * c.FH);
      (["top", "rgt", "lft"] as const).forEach((f) => add(g, "path", { d: sil[f], fill: "transparent" }));

      terreno(g, c);
      lobby(g, c);
      doPilar(n).forEach((Q, i) => {
        if (slotOf[i] < 0) return;
        const fg = add(g, "g", { class: "cursor-pointer" }) as SVGGElement;
        fg.addEventListener("click", (ev) => { ev.stopPropagation(); cb.onPredio(n, Q.id); });
        FG[Q.id] = { g: fg, n, i };
        OX = t; OY = EIXO * t;
        andar(fg, c, n, i, slotOf[i]);
      });
      OX = t; OY = EIXO * t;
      /* o teto sobe junto com o último andar — num grupo próprio, animado pelo
         mesmo laço, senão ele pula enquanto as lajes deslizam */
      const zt = c.LOB + slots * c.FH - 3;
      const gTeto = add(g, "g") as SVGGElement;
      const cTeto = iso(c.W / 2, c.Dp / 2, zt);
      GA["teto" + n] = { g: gTeto, cx: cTeto[0], cy: cTeto[1] };
      if (!TR["teto" + n]) TR["teto" + n] = { s: 0, p: 0, e: 1 };
      cobertura(gTeto, c, zt, slots, feitos(n) === doPilar(n).length);
      if (c.tipo === "torre" && feitos(n) < doPilar(n).length) guindaste(g, c, zt);
      /* checklist e placa existem nos quatro prédios o tempo todo; quem some é
         a opacidade. Antes eram criados/destruídos a cada troca de foco. */
      const gEtq = add(g, "g", { opacity: ativo ? 1 : 0 }) as SVGGElement;
      GETQ[n] = gEtq;
      OX = t; OY = EIXO * t;
      etiquetas(gEtq, c, n);
      if (c.tipo === "terracos") { arvore(g, -12, c.Dp + 14, -3, 1.1); arvore(g, c.W + 14, c.Dp + 10, -3, 0.95); }

      /* A PLACA NÃO EXISTE EM PILHA — e o motivo é o vazamento, não o gosto.
         Ela é desenhada DENTRO do mundo SVG, embaixo do prédio. Em fileira
         isso funciona porque cada torre tem sua faixa de x. Empilhados, os
         bboxes se cruzam na vertical: a placa do Pilar 03 caía dentro do
         desenho do Pilar 02, e o aluno lia o nome do prédio errado sobre o
         prédio certo.
         Além disso ela dizia o mesmo que a faixa do topo — dois lugares, o
         mesmo nome, e um deles no lugar errado. Fica o do topo, que é DOM e
         portanto sempre no painel a que pertence. */
      const gPl = add(g, "g", { opacity: EIXO === 1 ? 0 : ativo ? 0 : 1 }) as SVGGElement;
      GPLACA[n] = gPl;
      OX = t; OY = EIXO * t;
      if (EIXO !== 1) placa(gPl, c, n);
      GRUPO[n] = g;
    });
  }

  /** linha de base comum das placas — o enquadramento precisa contar com ela */
  const BASE = (() => {
    let b = 0;
    ORDEM.forEach((n) => { const c = PREDIOS[n]; b = Math.max(b, (c.W + c.Dp + 84) * 0.5 + 20); });
    return b + 30;
  })();
  /* Altura reservada pra placa abaixo de BASE. Subiu de 74 junto com a
     tipografia: a última linha fecha em ~by+78, e sem folgar aqui a câmera
     enquadraria a obra cortando o contador de andares. */
  const PLACA_H = 88;

  /* A placa é o nome do prédio visto da rua — e era ela que ninguém lia.
     O título vinha a 14px e a tipologia a 8.5px num cinza de 55% de opacidade:
     na escala em que a câmera enquadra os quatro prédios, isso chega na tela
     menor que a legenda de um gráfico. Prédio de 9 andares com etiqueta de
     rodapé é desenho gritando e texto sussurrando.
     O título dobra de peso e vai a 21px; a tipologia sai de 55% de opacidade
     pra 92%. PLACA_H acompanha, senão a câmera corta a última linha. */
  function placa(g: Element, c: PredioCfg, n: 1 | 2 | 3 | 4) {
    const lst = doPilar(n), f = feitos(n);
    const bx = iso(c.W * 0.5, c.Dp * 0.5, 0)[0], by = BASE;
    const t1 = add(g, "text", { x: bx, y: by, "text-anchor": "middle", fill: c.cor, style: "font:700 13px ui-monospace,monospace;letter-spacing:.18em" });
    t1.textContent = "PILAR " + c.no;
    const t2 = add(g, "text", { x: bx, y: by + 25, "text-anchor": "middle", fill: "#f5f8ff", style: "font:800 21px system-ui,sans-serif;letter-spacing:-.01em" });
    t2.textContent = c.titulo;
    const t3 = add(g, "text", { x: bx, y: by + 42, "text-anchor": "middle", fill: "rgba(154,167,190,.92)", style: "font:600 10px ui-monospace,monospace;letter-spacing:.15em" });
    t3.textContent = c.tp;
    add(g, "rect", { x: bx - 66, y: by + 52, width: 132, height: 6, rx: 3, fill: "#141c29" });
    if (f) add(g, "rect", { x: bx - 66, y: by + 52, width: 132 * (f / lst.length), height: 6, rx: 3, fill: c.cor, filter: "url(#gS)" });
    const t4 = add(g, "text", { x: bx, y: by + 74, "text-anchor": "middle", fill: "rgba(180,193,214,.9)", style: "font:700 12px ui-monospace,monospace;letter-spacing:.1em" });
    t4.textContent = `${f} / ${lst.length} andares`;
  }

  // --- câmera --------------------------------------------------------------
  // Alvo GEOMÉTRICO, pela altura de projeto: marcar ou pular andar não pode
  // mexer o enquadramento, senão a câmera treme a cada clique. E a escala é
  // guardada em px/unidade — guardar largura fazia o zoom saltar quando o
  // container mudava de tamanho.
  function caixa(n: 1 | 2 | 3 | 4, k: number, kAtivo: number, af: number, comPlaca: boolean) {
    const c = PREDIOS[n], qtd = doPilar(n).length;
    OX = k * PASSO() + (k - kAtivo) * af; OY = EIXO * OX;
    const folga = comPlaca ? (c.tipo === "torre" ? 96 : 54) : c.tipo === "torre" ? 52 : 26;
    /* o raio-X estica a torre: sem somar o exploded aqui, a obra passa a não
       caber na tela quando um andar entra em foco */
    const aberto = n === E.foco ? qtd * GAP_ABERTO + VAO + SOBE_ATIVO : 0;
    const zt = c.LOB + qtd * c.FH + folga + aberto;
    const pe = iso(c.W, c.Dp, -20)[1] + (comPlaca ? 30 : 16);

    /* AS ETIQUETAS ENTRAM NA CAIXA — em pilha elas SÃO o checklist.
       Elas moram 76 unidades à esquerda da torre (ver `LX` em `etiquetas`),
       fora do rastro dela, e esta caixa media só a torre. Resultado medido: no
       Pilar 04, o mais largo, os 8 badges caíam inteiros fora da tela — o
       prédio aparecia e o checklist não, que foi o "pilar 4 some".
       Só no prédio em FOCO, que é o único cujas etiquetas estão acesas, e só
       em pilha: na cabine quem reserva essa faixa é `reservaEsquerda`, e somar
       as duas afastaria a obra do nada. */
    const badge = iso(0, c.Dp, 0)[0] - 76 - 11;
    const comEtiqueta = EIXO === 1 && n === E.foco;

    const x0 = iso(0, c.Dp + (comPlaca ? 42 : 16), 0)[0] - (comPlaca ? 24 : 8);
    /* a etiqueta do térreo desce ~11 abaixo da linha de base dela; sem contar,
       o círculo do andar 01 ficava mordido pela borda de baixo */
    const y1 = comPlaca ? Math.max(pe, BASE + PLACA_H) : pe;

    return {
      x0: comEtiqueta ? Math.min(x0, badge - 12) : x0,
      x1: iso(c.W + (comPlaca ? 42 : 16), 0, 0)[0] + (comPlaca ? 24 : 8),
      y0: iso(0, 0, zt)[1] - (comPlaca ? 18 : 8),
      y1: comEtiqueta ? y1 + 14 : y1,
    };
  }
  /* A tela, e dentro dela a FAIXA LIVRE: o que sobra depois da UI. Em paisagem
     a UI ladeia (checklist à esquerda, painel à direita) e a faixa é medida na
     largura. Em retrato ela empilha (barra em cima, folha embaixo) e a faixa é
     medida na ALTURA — mesma ideia, girada 90°, porque não existe largura de
     painel que caiba ao lado de um isométrico em 375px (layout.ts).
     Com tudo fechado, faixa livre = tela, e nada muda em relação ao antigo.
     Os pisos são pra tela muito estreita não gerar faixa negativa — nesse caso
     a obra volta a caber embaixo da UI, que é ruim, mas menos ruim que escala
     negativa. */
  const medida = () => {
    const pai = svg.parentElement;
    const W = pai?.clientWidth || 1000, H = pai?.clientHeight || 620;
    const esq = E.aside ? reservaEsquerda(W) : 0;
    const dir = E.painel ? reservaDireita(W) : 0;
    /* medido, não declarado: a barra dos pilares quebra em duas linhas conforme
       a largura, e chutar a altura erra sempre pro mesmo lado — obra enquadrada
       por baixo dela. */
    const uiTopo = pai?.querySelector(SELETOR_UI_TOPO);
    const topo = reservaTopo(W, uiTopo?.getBoundingClientRect().height ?? 0);
    const base = E.painel ? reservaBase(W, H) : 0;
    return {
      W,
      H,
      x0: esq,
      livre: Math.max(280, W - esq - dir),
      y0: topo,
      livreAlt: Math.max(200, H - topo - base),
    };
  };
  function alvoCam() {
    const kA = (E.foco || 1) - 1, af = E.foco ? AFASTA : 0, obra = !E.foco;
    /* `comPlaca` reserva ~88px embaixo do prédio pro letreiro. Em pilha não há
       letreiro, e reservar mesmo assim afastaria a câmera de um espaço vazio —
       o prédio encolheria pra caber numa placa que não existe. */
    const comPlaca = obra && EIXO !== 1;
    let r: { x0: number; y0: number; x1: number; y1: number } | null = null;
    ORDEM.forEach((n, k) => {
      if (!obra && n !== E.foco) return;
      const c = caixa(n, k, kA, af, comPlaca);
      r = r ? { x0: Math.min(r.x0, c.x0), y0: Math.min(r.y0, c.y0), x1: Math.max(r.x1, c.x1), y1: Math.max(r.y1, c.y1) } : c;
    });
    const b = r!;
    const pad = obra ? 36 : 16, m = medida();
    const lg = b.x1 - b.x0 + pad * 2, al = b.y1 - b.y0 + pad * 2;
    /* a escala cabe na FAIXA nos DOIS eixos: fechar o painel devolve a largura
       (paisagem) ou a altura (retrato) e a obra cresce sozinha — é o "aumentar
       a obra", sem número fixo. Usar `m.H` aqui em vez de `livreAlt` faria o
       retrato calcular a escala por uma altura que a folha já tomou, e a obra
       ficaria grande demais, cortada por baixo. */
    return {
      cx: (b.x0 + b.x1) / 2,
      cy: (b.y0 + b.y1) / 2,
      esc: Math.min(m.livre / lg, m.livreAlt / al),
    };
  }

  /* ------------------------------------------------------------------------
     A ANIMAÇÃO É DO BROWSER, NÃO DO JS
     ------------------------------------------------------------------------
     Antes: rAF interpolava a câmera e escrevia `transform` em ~40 grupos por
     quadro. Transform em <g> de SVG não vira camada de composição, então cada
     quadro re-rasterizava o desenho inteiro — e clicar várias vezes empilhava
     esse trabalho. Daí o "travado" mesmo a 60fps.

     Agora: escrevemos o estado final UMA vez em `style.transform` e deixamos a
     transição CSS interpolar. O JS não toca em nada durante o movimento.
     Enquanto anima, os filtros de blur saem (classe `voando`): filtro é o que
     torna a rasterização cara.
     ------------------------------------------------------------------------ */
  /** para onde cada andar do prédio em foco deve ir */
  function alvoTR(): Record<string, Tr> {
    const r: Record<string, Tr> = {};
    ORDEM.forEach((n) => {
      const lst = doPilar(n);
      const { slotOf } = slotsDe(n);
      const foco = n === E.foco;
      let slotSel = -1;
      if (foco && E.sel) {
        const i = lst.findIndex((q) => q.id === E.sel);
        if (i >= 0) slotSel = slotOf[i];
      }
      lst.forEach((Q, i) => {
        const slot = slotOf[i];
        if (slot < 0 || !foco) { r[Q.id] = { s: 0, p: 0, e: 1 }; return; }
        const ativo = E.sel === Q.id;
        let sobe = slot * GAP_ABERTO;
        if (slotSel >= 0 && slot > slotSel) sobe += VAO;
        if (ativo) sobe += SOBE_ATIVO;
        r[Q.id] = { s: sobe, p: ativo ? PUXA : 0, e: ativo ? 1 + ESCALA : 1 };
      });
      const nSlots = slotOf.filter((x) => x >= 0).length;
      let sTeto = foco ? Math.max(0, nSlots - 1) * GAP_ABERTO : 0;
      if (foco && slotSel >= 0 && nSlots - 1 > slotSel) sTeto += VAO;
      r["teto" + n] = { s: sTeto, p: 0, e: 1 };
    });
    return r;
  }

  /* O MUNDO é fixo: viewBox constante, 1 unidade = 1px. A câmera é um
     `transform` CSS no <svg> — o browser rasteriza o desenho uma vez e compõe.
     Animar o viewBox obrigava a re-rasterizar 700+ paths por quadro. */
  const MUNDO = { x: -700, y: -1500, w: 2600, h: 2100 };
  function estilo() {
    if (document.getElementById("obra-css")) return;
    const st = document.createElement("style");
    st.id = "obra-css";
    /* durante o voo, sem blur: filtro de SVG é rasterização cara por quadro.
       O glow volta assim que a câmera para. */
    st.textContent =
      "svg[data-obra].voando *{filter:none!important}" +
      "@media (prefers-reduced-motion:reduce){svg[data-obra],svg[data-obra] *{transition:none!important}}";
    document.head.appendChild(st);
  }
  function montaMundo() {
    estilo();
    svg.setAttribute("viewBox", `${MUNDO.x} ${MUNDO.y} ${MUNDO.w} ${MUNDO.h}`);
    svg.setAttribute("width", String(MUNDO.w));
    svg.setAttribute("height", String(MUNDO.h));
    svg.removeAttribute("preserveAspectRatio");
    svg.style.position = "absolute";
    svg.style.left = "0";
    svg.style.top = "0";
    svg.style.transformOrigin = "0 0";
    svg.style.willChange = "transform";
  }

  const CURVA = "cubic-bezier(.22,1,.36,1)";
  /* mais lento de propósito: o olho lê melhor um deslize longo do que um
     salto curto, e sobra quadro pro browser compor sem engasgar */
  const DUR_MIN = 620, DUR_MAX = 1050;
  let CAM: { cx: number; cy: number; esc: number } | null = null;
  let DX: Mapa = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let OP: Mapa = { 1: 1, 2: 1, 3: 1, 4: 1 };
  let voando = 0;

  const alvoDX = (): Mapa => {
    const kA = (E.foco || 1) - 1, r: Mapa = {};
    /* O afastamento do foco segue a MESMA direção do quarteirão: em fileira ele
       empurra os vizinhos pros lados (`2·WX`), em pilha empurra pra cima e pra
       baixo (`2·WY`). Fixo no eixo x, a pilha via os vizinhos saírem de lado
       enquanto ela cresce pra baixo — dois movimentos discordando. */
    const passoAf = AFASTA * 2 * (EIXO === 1 ? WY : WX);
    ORDEM.forEach((n, k) => { r[n] = E.foco ? (k - kA) * passoAf : 0; });
    return r;
  };
  const alvoOP = (): Mapa => {
    const r: Mapa = {};
    /* Em FILEIRA o vizinho a 38% é contexto: ele fica ao LADO, e ver o
       quarteirão inteiro esmaecido diz "há mais três prédios aqui".
       Em PILHA ele fica ACIMA e ABAIXO, dentro da mesma coluna — e a 38% a
       torre de cima entra pela borda superior por trás do trilho, lida como
       sujeira, não como contexto. Quem responde "há mais três" na pilha é o
       trilho de pontos; o desenho pode ficar com um prédio só. */
    const vizinho = EIXO === 1 ? 0 : 0.38;
    ORDEM.forEach((n) => { r[n] = E.foco && n !== E.foco ? vizinho : 1; });
    return r;
  };

  function poeCamadas() {
    ORDEM.forEach((n) => {
      const foco = E.foco === n;
      if (GETQ[n]) GETQ[n].style.opacity = foco ? "1" : "0";
      // Em pilha a placa nunca acende: ela não foi nem desenhada (ver `cena`).
      if (GPLACA[n]) GPLACA[n].style.opacity = EIXO === 1 ? "0" : foco ? "0" : "1";
    });
  }

  function poeAndares() {
    const alvo = alvoTR();
    for (const id in GA) {
      const t = alvo[id] ?? { s: 0, p: 0, e: 1 };
      const a = GA[id];
      if (!a?.g) continue;
      TR[id] = t;
      const dy = -t.s, dx = t.p * 2 * WX;
      const partes: string[] = [];
      if (dx || dy) partes.push(`translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px)`);
      if (Math.abs(t.e - 1) > 0.001)
        partes.push(`translate(${a.cx.toFixed(1)}px,${a.cy.toFixed(1)}px) scale(${t.e.toFixed(3)}) translate(${(-a.cx).toFixed(1)}px,${(-a.cy).toFixed(1)}px)`);
      a.g.style.transform = partes.join(" ");
    }
  }

  function poe() {
    if (!CAM) return;
    poeAndares();
    poeCamadas();
    ORDEM.forEach((n, k) => {
      const g = GRUPO[n];
      if (!g) return;
      // mesma razão do `passoAf`: em pilha o afastamento é no eixo y
      g.style.transform = DX[n]
        ? EIXO === 1
          ? `translate(0,${DX[n].toFixed(2)}px)`
          : `translate(${DX[n].toFixed(2)}px,0)`
        : "";
      g.style.opacity = OP[n].toFixed(3);
      void k;
    });
    const m = medida();
    /* centro da FAIXA LIVRE, não da tela. É esta linha que faz a obra deslizar
       pra esquerda quando o painel abre — e como `svg.style.transition` já está
       ligada por `transicao()`, ela desliza com a mesma curva e a mesma duração
       do afastamento entre pilares, em vez de saltar.
       Em retrato o mesmo vale no eixo Y: a obra sobe quando a folha do andar
       abre embaixo, com o mesmo deslize. */
    const tx = m.x0 + m.livre / 2 - (CAM.cx - MUNDO.x) * CAM.esc;
    const ty = m.y0 + m.livreAlt / 2 - (CAM.cy - MUNDO.y) * CAM.esc;
    svg.style.transform = `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${CAM.esc.toFixed(4)})`;
  }

  /** liga as transições e agenda o desligamento dos filtros */
  function transicao(ms: number) {
    const t = `transform ${ms}ms ${CURVA}, opacity ${ms}ms ${CURVA}`;
    svg.style.transition = `transform ${ms}ms ${CURVA}`;
    ORDEM.forEach((n) => {
      if (GRUPO[n]) GRUPO[n].style.transition = t;
      if (GETQ[n]) GETQ[n].style.transition = `opacity ${ms}ms ${CURVA}`;
      if (GPLACA[n]) GPLACA[n].style.transition = `opacity ${ms}ms ${CURVA}`;
    });
    for (const id in GA) GA[id].g.style.transition = `transform ${ms}ms ${CURVA}`;
    svg.classList.add("voando");
    clearTimeout(voando);
    voando = window.setTimeout(() => svg.classList.remove("voando"), ms + 60);
  }
  function semTransicao() {
    svg.style.transition = "none";
    ORDEM.forEach((n) => {
      if (GRUPO[n]) GRUPO[n].style.transition = "none";
      if (GETQ[n]) GETQ[n].style.transition = "none";
      if (GPLACA[n]) GPLACA[n].style.transition = "none";
    });
    for (const id in GA) GA[id].g.style.transition = "none";
  }

  function camera(inst?: boolean) {
    const a = alvoCam();
    const dist = CAM ? Math.hypot(a.cx - CAM.cx, a.cy - CAM.cy) * ((a.esc + CAM.esc) / 2) : 0;
    CAM = a; DX = alvoDX(); OP = alvoOP();
    if (inst) { semTransicao(); poe(); return; }
    transicao(Math.min(DUR_MAX, Math.max(DUR_MIN, 560 + dist * 0.32)));
    poe();
  }

  function render(estado: EstadoObra, inst?: boolean) {
    E = estado;
    montaMundo();
    for (const id in GA) delete GA[id];
    svg.innerHTML = "";
    svg.appendChild(defs());
    const root = el("g");
    cena(root);
    svg.appendChild(root);
    camera(inst);
  }

  /** troca de tela (foco/andar): NÃO reconstrói o SVG.
      Redesenha só os andares cujo estado visual mudou e anima o resto. */
  function navegar(estado: EstadoObra) {
    const selAntes = E.sel, focoAntes = E.foco;
    E = estado;

    const mexer = new Set<string>();
    if (selAntes && selAntes !== E.sel) mexer.add(selAntes);
    if (E.sel && E.sel !== selAntes) mexer.add(E.sel);
    if (focoAntes !== E.foco) {                       // o ativo do prédio que saiu volta ao normal
      if (selAntes) mexer.add(selAntes);
    }
    mexer.forEach((id) => {
      const f = FG[id];
      if (!f) return;
      const c = PREDIOS[f.n];
      const { slotOf } = slotsDe(f.n);
      if (slotOf[f.i] < 0) return;
      const k = ORDEM.indexOf(f.n);
      OX = k * PASSO(); OY = EIXO * OX;
      while (f.g.firstChild) f.g.removeChild(f.g.firstChild);
      andar(f.g, c, f.n, f.i, slotOf[f.i]);
    });
    // o checklist muda de item ativo — é leve (uma dezena de elementos)
    ORDEM.forEach((n) => {
      const g = GETQ[n];
      if (!g || (n !== E.foco && n !== focoAntes)) return;
      const k = ORDEM.indexOf(n);
      OX = k * PASSO(); OY = EIXO * OX;
      while (g.firstChild) g.removeChild(g.firstChild);
      etiquetas(g, PREDIOS[n], n);
    });
    camera();
  }

  /* Redimensionar muda a faixa livre — a reserva do painel depende da largura
     da tela —, então a ESCALA precisa ser refeita, e `poe()` sozinho só
     reposiciona. Instantâneo de propósito: acompanhar o arraste da janela com
     uma transição de 600ms deixa a obra correndo atrás do mouse. */
  const onResize = () => {
    /* Cruzar o limiar do retrato troca a DIREÇÃO do quarteirão, e direção é
       geometria: `camera()` só reposiciona o que já está desenhado, então
       sozinha ela deixaria a fileira intacta numa tela que virou pilha. Só
       reconstrói quando o eixo REALMENTE mudou — girar o celular passa por
       aqui a cada quadro do arraste, e reconstruir 700+ paths por quadro é o
       que `navegar` existe pra evitar. */
    const eixoAgora: -1 | 1 = ehRetrato(window.innerWidth) ? 1 : -1;
    if (eixoAgora !== EIXO) {
      EIXO = eixoAgora;
      render(E, true);
      return;
    }
    camera(true);
  };
  window.addEventListener("resize", onResize);

  return {
    render,
    navegar,
    destruir() {
      clearTimeout(voando);
      window.removeEventListener("resize", onResize);
      svg.innerHTML = "";
    },
  };
}
