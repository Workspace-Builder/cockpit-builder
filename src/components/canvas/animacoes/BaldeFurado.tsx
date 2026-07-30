"use client";

import { useEffect, useRef, useState } from "react";
import type { PropsAnimacao } from "../animacoes";

// ---------------------------------------------------------------------------
// OCEANO · FILTRO · BALDE FURADO — esquete 1
// ---------------------------------------------------------------------------
// A esquete mais completa do board legado (`index.html`, 1895-2158), e a única
// que é simulação de verdade: a água entra pelo cano, o filtro decide quanto
// passa e com que pureza, os furos vazam pelo lado e o balde transborda quando
// tudo está tapado. Cada controle mexe numa alavanca do negócio:
//
//   · FONTE  — oceano (volume bruto) ou caixa d'água (nicho pequeno, seco)
//   · FILTRO — posicionamento: filtra mais, entra menos e vale mais por gota
//   · FUROS  — vazamentos da operação; clicar tapa e destapa
//   · BALDE  — capacidade (ticket, time). Transbordar é problema BOM.
//
// A física veio VERBATIM: vazão por furo = 0.10·√(nível-altura), o escoamento
// da poça, a mistura de cor sujo→limpo, o dinheiro acumulando por vazão×filtro.
// São números calibrados a olho no legado até a metáfora ficar honesta — e
// mexer neles muda o que a esquete ensina, não só como ela parece.
//
// O que mudou de forma: os mostradores agora são `ref` em vez de `getElementById`
// (React não gosta de DOM alheio), os sliders são estado controlado, e o
// `requestAnimationFrame` ganhou cancelamento no cleanup.
//
// `nodrag`: sem isso, arrastar o slider no modo de edição arrasta o NÓ. O
// React Flow para de capturar o ponteiro em qualquer subárvore com essa classe.
// ---------------------------------------------------------------------------

const CW = 400;
const CH = 536;

/** o eixo do cano e do balde, e o chão onde a água cai */
const SPX = 200;
const CX = 200;
const BOT_Y = 468;
const FLOOR = 498;

const SRC = [
  { id: "oceano", label: "OCEANO AZUL", flow: 0.16, cx: 200 },
  { id: "cxa", label: "CAIXA A", sub: "nicho saturado", flow: 0.012, cx: 86 },
  { id: "cxb", label: "CAIXA B", sub: "público errado", flow: 0.012, cx: 314 },
];

/** as cores da água conforme o filtro: bruta, filtrada, e o fundo do balde */
const SUJO: [number, number, number] = [122, 114, 88];
const LIMPO: [number, number, number] = [51, 198, 214];
const FUNDO: [number, number, number] = [78, 125, 246];

/** zonas clicáveis do canvas: fonte, as duas caixas e o registro */
const Z = {
  oce: { x: 0, y: 0, w: CW, h: 66 },
  cxa: { x: 44, y: 94, w: 86, h: 104 },
  cxb: { x: 270, y: 94, w: 86, h: 104 },
  tor: { x: 150, y: 236, w: 100, h: 52 },
};

type Furo = { f: number; k: number; plug: boolean; x: number; y: number; rate: number };
type Gota = { x: number; y: number; vx: number; vy: number; l: number; g: number };

function mixc(a: [number, number, number], b: [number, number, number], t: number) {
  return (
    Math.round(a[0] + (b[0] - a[0]) * t) +
    "," +
    Math.round(a[1] + (b[1] - a[1]) * t) +
    "," +
    Math.round(a[2] + (b[2] - a[2]) * t)
  );
}

/** milhar com ponto, como o legado escrevia */
function fmt(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function BaldeFurado({ largura }: PropsAnimacao) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const bsN = useRef<HTMLElement>(null);
  const bsR = useRef<HTMLElement>(null);
  const bsV = useRef<HTMLElement>(null);
  const bsF = useRef<HTMLElement>(null);
  const barI = useRef<HTMLElement>(null);

  const [filtro, setFiltro] = useState(50);
  const [balde, setBalde] = useState(100);

  const sim = useRef({
    SZ: 1,
    cap: 1,
    rimY: 0,
    rimRx: 0,
    botRx: 0,
    rimRyV: 0,
    botRyV: 0,
    on: true,
    level: 0.12,
    lost: 0,
    dripT: 0,
    filtro: 0.5,
    pureza: 0.5,
    valor: 0,
    srcIdx: 0,
    drops: [] as Gota[],
    holes: [
      { f: 0.08, k: -0.42, plug: false, x: 0, y: 0, rate: 0 },
      { f: 0.24, k: 0.5, plug: false, x: 0, y: 0, rate: 0 },
      { f: 0.42, k: -0.55, plug: false, x: 0, y: 0, rate: 0 },
      { f: 0.58, k: 0.42, plug: true, x: 0, y: 0, rate: 0 },
      { f: 0.74, k: -0.18, plug: true, x: 0, y: 0, rate: 0 },
    ] as Furo[],
  });

  /** o slider do filtro é lido a 60fps; o estado é só pro rótulo */
  useEffect(() => {
    sim.current.filtro = filtro / 100;
  }, [filtro]);

  // Mudar a capacidade preserva o VOLUME, não o nível: dobrar o balde com ele
  // meio cheio tem que deixá-lo um quarto cheio, senão a água aparece do nada.
  useEffect(() => {
    const s = sim.current;
    const s2 = balde / 100;
    const nc = s2 * s2;
    s.level = Math.min(1.02, (s.level * s.cap) / nc);
    s.cap = nc;
    s.SZ = s2;
    geom(s);
  }, [balde]);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const c = cv.getContext("2d");
    if (!c) return;
    const s = sim.current;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = CW * DPR;
    cv.height = CH * DPR;
    cv.style.width = CW + "px";
    cv.style.height = CH + "px";
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    geom(s);

    const rxAt = (y: number) =>
      s.rimRx + ((s.botRx - s.rimRx) * (y - s.rimY)) / (BOT_Y - s.rimY);
    const surfY = () =>
      BOT_Y - 7 - Math.min(s.level, 1) * (BOT_Y - 7 - (s.rimY + 5));
    const flowNow = () => (s.on ? SRC[s.srcIdx].flow * (1 - 0.6 * s.filtro) : 0);
    const inZ = (z: { x: number; y: number; w: number; h: number }, mx: number, my: number) =>
      mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h;

    function ponto(e: PointerEvent) {
      const cv = cvRef.current!;
      const r = cv.getBoundingClientRect();
      return {
        mx: ((e.clientX - r.left) / r.width) * CW,
        my: ((e.clientY - r.top) / r.height) * CH,
      };
    }

    function onDown(e: PointerEvent) {
      const { mx, my } = ponto(e);
      // O furo ganha do resto: ele é pequeno e fica por cima das outras zonas.
      let best: Furo | null = null;
      let bd = 1e9;
      s.holes.forEach((o) => {
        const d = Math.hypot(mx - o.x, my - o.y);
        if (d < bd) {
          bd = d;
          best = o;
        }
      });
      if (best && bd < 16) {
        (best as Furo).plug = !(best as Furo).plug;
        return;
      }
      if (inZ(Z.tor, mx, my)) return void (s.on = !s.on);
      if (inZ(Z.oce, mx, my)) return void (s.srcIdx = 0);
      if (inZ(Z.cxa, mx, my)) return void (s.srcIdx = 1);
      if (inZ(Z.cxb, mx, my)) return void (s.srcIdx = 2);
    }

    function onMove(e: PointerEvent) {
      const { mx, my } = ponto(e);
      const hit =
        inZ(Z.tor, mx, my) ||
        inZ(Z.oce, mx, my) ||
        inZ(Z.cxa, mx, my) ||
        inZ(Z.cxb, mx, my) ||
        s.holes.some((o) => Math.hypot(mx - o.x, my - o.y) < 16);
      if (cvRef.current) cvRef.current.style.cursor = hit ? "pointer" : "default";
    }

    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);

    function step(dt: number) {
      const inflow = flowNow();
      let leak = 0;
      s.holes.forEach((o) => {
        o.rate = 0;
        // Torricelli de pobre: quanto mais coluna d'água acima do furo, mais
        // forte o jato. É por isso que tapar o furo de baixo muda mais.
        if (!o.plug && s.level > o.f) {
          o.rate = 0.1 * Math.sqrt(s.level - o.f);
          leak += o.rate;
        }
      });
      const spill = s.level >= 1 && inflow / s.cap > leak ? inflow / s.cap - leak : 0;
      s.level += (inflow / s.cap - leak) * dt;
      if (s.level > 1.02) s.level = 1.02;
      if (s.level < 0) s.level = 0;
      s.lost += (leak + spill) * dt;
      s.lost *= Math.max(0, 1 - 0.12 * dt);
      if (inflow > 0) {
        s.pureza += (s.filtro - s.pureza) * Math.min(1, inflow * 5 * dt);
        s.valor += inflow * (1 + 3 * s.filtro) * 3000 * dt;
      }
      // Vazão fraca não faz jato, faz gota: é o que denuncia a caixa d'água.
      if (s.on && inflow > 0 && inflow < 0.05) {
        s.dripT += dt;
        if (s.dripT > 0.55) {
          s.dripT = 0;
          s.drops.push({ x: SPX, y: 296, vx: 0, vy: 26, l: 0, g: 1 });
        }
      }
      if (s.on && inflow >= 0.05 && Math.random() < 0.5)
        s.drops.push({
          x: SPX + (Math.random() * 10 - 5),
          y: Math.min(surfY(), FLOOR - 8),
          vx: Math.random() * 50 - 25,
          vy: -30 - Math.random() * 50,
          l: 0,
          g: 0,
        });
      for (let i = s.drops.length - 1; i >= 0; i--) {
        const d = s.drops[i];
        d.vy += (d.g ? 230 : 320) * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.l += dt;
        if (d.g && d.y >= surfY()) {
          s.drops.splice(i, 1);
          continue;
        }
        if (d.l > 1.6 || d.y > FLOOR + 6) s.drops.splice(i, 1);
      }

      const pct = Math.round(Math.min(s.level, 1) * 100);
      const open = s.holes.filter((o) => !o.plug).length;
      const cheio = s.level >= 1;
      const nTxt = cheio ? "CHEIO ↑ ESCALA" : pct + "%";
      if (bsN.current && bsN.current.textContent !== nTxt) {
        bsN.current.textContent = nTxt;
        bsN.current.style.color = cheio ? "#ffd985" : "";
      }
      const rTxt = "R$ " + fmt(s.valor);
      if (bsR.current && bsR.current.textContent !== rTxt) bsR.current.textContent = rTxt;
      const vTxt = open + "/5";
      if (bsV.current && bsV.current.textContent !== vTxt) bsV.current.textContent = vTxt;
      const fTxt = SRC[s.srcIdx].id === "oceano" ? "OCEANO" : SRC[s.srcIdx].label;
      if (bsF.current && bsF.current.textContent !== fTxt) {
        bsF.current.textContent = fTxt;
        bsF.current.style.color = s.srcIdx === 0 ? "" : "#f5b23f";
      }
      if (barI.current) {
        barI.current.style.width = pct + "%";
        barI.current.style.background = cheio ? "#f5b23f" : "#33c6d6";
      }
    }

    function bodyPath() {
      if (!c) return;
      c.beginPath();
      c.moveTo(CX - s.rimRx, s.rimY);
      c.lineTo(CX - s.botRx, BOT_Y);
      c.ellipse(CX, BOT_Y, s.botRx, s.botRyV, 0, Math.PI, 0, true);
      c.lineTo(CX + s.rimRx, s.rimY);
      c.ellipse(CX, s.rimY, s.rimRx, s.rimRyV, 0, 0, Math.PI, false);
      c.closePath();
    }

    /** o cano da fonte até o registro; tracejado fino quando não é a escolhida */
    function pipeTo(fromX: number, fromY: number, sel: boolean, t: number) {
      if (!c) return;
      c.lineCap = "round";
      c.lineJoin = "round";
      function path() {
        if (!c) return;
        c.beginPath();
        if (fromX === SPX) {
          c.moveTo(SPX, fromY);
          c.lineTo(SPX, 204);
        } else {
          c.moveTo(fromX, fromY);
          c.lineTo(fromX, 182);
          c.quadraticCurveTo(fromX, 198, fromX < SPX ? fromX + 22 : fromX - 22, 198);
          c.lineTo(fromX < SPX ? SPX - 14 : SPX + 14, 198);
          c.quadraticCurveTo(SPX, 198, SPX, 206);
        }
      }
      if (sel) {
        c.strokeStyle = "#39445c";
        c.lineWidth = 13;
        path();
        c.stroke();
        c.strokeStyle = "#4d5a75";
        c.lineWidth = 9;
        path();
        c.stroke();
        if (s.on && flowNow() >= 0.05) {
          c.save();
          c.strokeStyle = "rgba(122,114,88,.75)";
          c.lineWidth = 4;
          c.setLineDash([10, 12]);
          c.lineDashOffset = -t * 60;
          path();
          c.stroke();
          c.restore();
        }
      } else {
        c.save();
        c.strokeStyle = "rgba(90,105,135,.3)";
        c.lineWidth = 5;
        c.setLineDash([4, 7]);
        path();
        c.stroke();
        c.restore();
      }
    }

    function draw(t: number) {
      if (!c) return;
      c.clearRect(0, 0, CW, CH);

      // ===== OCEANO AZUL (bruto, sujo) =====
      const og = c.createLinearGradient(0, 0, 0, 64);
      og.addColorStop(0, "#0e5e7d");
      og.addColorStop(1, "#0a2f4d");
      c.fillStyle = og;
      c.fillRect(0, 0, CW, 62);
      c.fillStyle = "rgba(60,54,38,.35)";
      for (let mb = 0; mb < 4; mb++) {
        const mx2 = (mb * 113 + t * 9) % CW;
        const my2 = 30 + ((mb * 17) % 24);
        c.beginPath();
        c.ellipse(mx2, my2, 16 + mb * 4, 4, 0, 0, 7);
        c.fill();
      }
      c.fillStyle = "rgba(30,26,18,.5)";
      for (let sp2 = 0; sp2 < 10; sp2++) {
        const sx2 = (sp2 * 47 + t * 14) % CW;
        c.fillRect(sx2, 18 + ((sp2 * 11) % 36), 2.5, 2.5);
      }
      c.strokeStyle = "rgba(120,220,235,.5)";
      c.lineWidth = 2;
      for (let wv = 0; wv < 2; wv++) {
        c.beginPath();
        for (let x = 0; x <= CW; x += 8)
          c.lineTo(x, 10 + wv * 9 + Math.sin(x * 0.05 + t * (1.4 + wv * 0.5) + wv * 2) * 3);
        c.stroke();
        c.strokeStyle = "rgba(120,220,235,.25)";
      }
      c.font = "700 11px ui-monospace,Menlo,monospace";
      c.textAlign = "left";
      c.textBaseline = "top";
      c.fillStyle = "rgba(220,245,250,.92)";
      c.fillText("OCEANO AZUL", 12, 10);
      c.font = "8px ui-monospace,Menlo,monospace";
      c.fillStyle = "rgba(190,230,240,.55)";
      c.fillText("demanda infinita · bruta", 12, 25);
      if (s.srcIdx === 0) {
        c.strokeStyle = "rgba(51,198,214,.9)";
        c.lineWidth = 2;
        c.strokeRect(1, 1, CW - 2, 60);
      }

      // ===== CAIXAS D'ÁGUA (o nicho que seca) =====
      SRC.slice(1).forEach(function (src, i) {
        const bx = src.cx;
        const sel = s.srcIdx === i + 1;
        const cg = c.createLinearGradient(bx - 34, 0, bx + 34, 0);
        cg.addColorStop(0, "#232b3d");
        cg.addColorStop(0.4, "#39445c");
        cg.addColorStop(1, "#1c2333");
        c.fillStyle = cg;
        c.beginPath();
        c.moveTo(bx - 32, 112);
        c.lineTo(bx - 30, 162);
        c.quadraticCurveTo(bx, 170, bx + 30, 162);
        c.lineTo(bx + 32, 112);
        c.closePath();
        c.fill();
        c.fillStyle = "rgba(51,198,214,.25)";
        c.fillRect(bx - 24, 150, 48, 8);
        c.fillStyle = "#2a3142";
        c.beginPath();
        c.ellipse(bx, 112, 36, 9, 0, 0, 7);
        c.fill();
        c.fillStyle = "#39445c";
        c.beginPath();
        c.ellipse(bx, 107, 26, 6, 0, 0, 7);
        c.fill();
        c.strokeStyle = sel ? "rgba(51,198,214,.9)" : "rgba(138,151,176,.35)";
        c.lineWidth = sel ? 2.5 : 1.5;
        c.beginPath();
        c.ellipse(bx, 112, 36, 9, 0, 0, 7);
        c.stroke();
        c.font = "700 9px ui-monospace,Menlo,monospace";
        c.textAlign = "center";
        c.textBaseline = "top";
        c.fillStyle = sel ? "#8fe3ee" : "#8a97b0";
        c.fillText(src.label, bx, 176);
        c.font = "8px ui-monospace,Menlo,monospace";
        c.fillStyle = "#5d6a83";
        c.fillText(src.sub ?? "", bx, 188);
      });

      pipeTo(SPX, 62, s.srcIdx === 0, t);
      pipeTo(SRC[1].cx + 18, 166, s.srcIdx === 1, t);
      pipeTo(SRC[2].cx - 18, 166, s.srcIdx === 2, t);

      // ===== FILTRO no cano =====
      c.fillStyle = "#1a2130";
      c.strokeStyle = "rgba(138,151,176,.55)";
      c.lineWidth = 1.5;
      c.beginPath();
      c.roundRect(SPX - 16, 206, 32, 26, 5);
      c.fill();
      c.stroke();
      c.strokeStyle = "rgba(138,151,176,.3)";
      c.lineWidth = 1;
      for (let fl = 0; fl < 3; fl++) {
        c.beginPath();
        c.moveTo(SPX - 12 + fl * 8, 210);
        c.lineTo(SPX - 4 + fl * 8, 228);
        c.stroke();
      }
      c.fillStyle = "rgba(51,198,214," + (0.25 + s.filtro * 0.6) + ")";
      c.fillRect(SPX - 13, 224 - s.filtro * 14, 26, s.filtro * 14 + 3);
      c.font = "700 7px ui-monospace,Menlo,monospace";
      c.textAlign = "center";
      c.textBaseline = "top";
      c.fillStyle = "#8fe3ee";
      c.fillText(Math.round(s.filtro * 100) + "%", SPX, 212);

      // ===== registro (a torneira que liga a fonte) =====
      c.strokeStyle = "#39445c";
      c.lineWidth = 15;
      c.beginPath();
      c.moveTo(SPX, 232);
      c.lineTo(SPX, 286);
      c.stroke();
      c.strokeStyle = "#4d5a75";
      c.lineWidth = 11;
      c.beginPath();
      c.moveTo(SPX, 232);
      c.lineTo(SPX, 284);
      c.stroke();
      c.fillStyle = "#4d5a75";
      c.beginPath();
      c.moveTo(SPX - 10, 284);
      c.lineTo(SPX + 10, 284);
      c.lineTo(SPX + 8, 294);
      c.lineTo(SPX - 8, 294);
      c.closePath();
      c.fill();
      c.save();
      c.translate(SPX - 26, 258);
      c.rotate(s.on ? 0 : -0.65);
      c.strokeStyle = "#2a3142";
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(12, 0);
      c.lineTo(24, 0);
      c.stroke();
      c.strokeStyle = s.on ? "#54c98a" : "#f26a43";
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(-12, 0);
      c.lineTo(12, 0);
      c.stroke();
      c.fillStyle = s.on ? "#54c98a" : "#f26a43";
      c.beginPath();
      c.arc(0, 0, 4, 0, 7);
      c.fill();
      c.restore();

      // ===== chão, poça do que vazou, sombra =====
      c.strokeStyle = "rgba(255,255,255,.07)";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(16, FLOOR + s.botRyV + 6);
      c.lineTo(CW - 16, FLOOR + s.botRyV + 6);
      c.stroke();
      const prx = Math.min(155, s.lost * 260);
      if (prx > 4) {
        c.fillStyle = "rgba(" + mixc(SUJO, LIMPO, s.pureza) + ",.15)";
        c.beginPath();
        c.ellipse(CX, FLOOR + s.botRyV + 4, prx, 6 + prx * 0.03, 0, 0, 7);
        c.fill();
        c.strokeStyle = "rgba(" + mixc(SUJO, LIMPO, s.pureza) + ",.3)";
        c.lineWidth = 1;
        c.beginPath();
        c.ellipse(CX, FLOOR + s.botRyV + 4, prx, 6 + prx * 0.03, 0, 0, 7);
        c.stroke();
      }
      c.fillStyle = "rgba(0,0,0,.4)";
      c.beginPath();
      c.ellipse(CX, BOT_Y + s.botRyV + 4, s.botRx + 14, 8, 0, 0, 7);
      c.fill();

      // ===== o jato, com a cor da filtragem =====
      const sy = surfY();
      const fl2 = flowNow();
      const jTop = 296;
      if (fl2 >= 0.05 && sy > jTop + 4) {
        const jc = mixc(SUJO, LIMPO, s.filtro);
        const grad = c.createLinearGradient(0, jTop, 0, sy);
        grad.addColorStop(0, "rgba(" + jc + ",.95)");
        grad.addColorStop(1, "rgba(" + mixc(SUJO, FUNDO, s.filtro) + ",.5)");
        c.fillStyle = grad;
        const jw = 2 + fl2 * 22;
        c.beginPath();
        let yy: number;
        for (yy = jTop; yy <= sy; yy += 6)
          c.lineTo(SPX - jw / 2 + Math.sin(yy * 0.11 + t * 10) * 1.1, yy);
        for (yy = sy; yy >= jTop; yy -= 6)
          c.lineTo(SPX + jw / 2 + Math.sin(yy * 0.11 + t * 10) * 1.1, yy);
        c.closePath();
        c.fill();
        // a sujeira que o filtro deixou passar
        const nd = Math.round((1 - s.filtro) * 6);
        c.fillStyle = "rgba(30,26,18,.7)";
        for (let di = 0; di < nd; di++) {
          const dy = jTop + ((t * 140 + di * 67) % Math.max(8, sy - jTop));
          c.fillRect(SPX - 3 + ((di * 37) % 7), dy, 2, 2);
        }
      }

      // ===== o balde =====
      bodyPath();
      const mg = c.createLinearGradient(CX - s.rimRx, 0, CX + s.rimRx, 0);
      mg.addColorStop(0, "#232b3d");
      mg.addColorStop(0.35, "#39445c");
      mg.addColorStop(0.55, "#2c3549");
      mg.addColorStop(1, "#1c2333");
      c.fillStyle = mg;
      c.fill();
      c.save();
      bodyPath();
      c.clip();
      if (s.level > 0.005) {
        const wc = mixc(SUJO, LIMPO, s.pureza);
        const wg2 = c.createLinearGradient(0, sy, 0, BOT_Y);
        wg2.addColorStop(0, "rgba(" + wc + ",.5)");
        wg2.addColorStop(1, "rgba(" + mixc(SUJO, FUNDO, s.pureza) + ",.3)");
        c.fillStyle = wg2;
        c.fillRect(CX - s.rimRx - 4, sy, s.rimRx * 2 + 8, BOT_Y - sy + s.botRyV + 4);
        const srx = rxAt(sy) - 3;
        c.fillStyle =
          "rgba(" + mixc([150, 140, 110], [93, 214, 228], s.pureza) + ",.65)";
        c.beginPath();
        c.ellipse(CX, sy, srx, Math.max(4, s.rimRyV * (srx / s.rimRx)), 0, 0, 7);
        c.fill();
      }
      c.fillStyle = "rgba(255,255,255,.05)";
      c.fillRect(CX - s.rimRx * 0.55, s.rimY + 6, 14, BOT_Y - s.rimY - 10);
      c.restore();
      c.strokeStyle = "#8a97b0";
      c.lineWidth = 4;
      c.beginPath();
      c.ellipse(CX, s.rimY, s.rimRx, s.rimRyV, 0, 0, 7);
      c.stroke();
      c.strokeStyle = "rgba(138,151,176,.55)";
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(CX - s.rimRx, s.rimY);
      c.lineTo(CX - s.botRx, BOT_Y);
      c.stroke();
      c.beginPath();
      c.moveTo(CX + s.rimRx, s.rimY);
      c.lineTo(CX + s.botRx, BOT_Y);
      c.stroke();
      c.beginPath();
      c.ellipse(CX, BOT_Y, s.botRx, s.botRyV, 0, Math.PI, 0, true);
      c.stroke();

      // ===== transbordo = problema BOM (dourado, não vermelho) =====
      if (s.level >= 1) {
        c.strokeStyle = "rgba(245,178,63,.85)";
        c.lineWidth = 4;
        ([
          [CX - s.rimRx + 8, -1],
          [CX + s.rimRx - 8, 1],
        ] as [number, number][]).forEach(function (lado) {
          c.beginPath();
          c.moveTo(lado[0], s.rimY + 4);
          c.quadraticCurveTo(
            lado[0] + lado[1] * 16,
            s.rimY + 70,
            lado[0] + lado[1] * 24,
            FLOOR + 4,
          );
          c.stroke();
        });
        c.font = "700 10px ui-monospace,Menlo,monospace";
        c.textAlign = "center";
        c.textBaseline = "top";
        c.fillStyle = "#ffd985";
        c.fillText("↑ escala o balde", CX, s.rimY - 26);
      }

      // ===== furos e o que escapa por eles =====
      s.holes.forEach(function (o) {
        if (o.rate > 0) {
          const dir = o.k < 0 ? -1 : 1;
          const reach = 24 + o.rate * 230;
          c.strokeStyle =
            "rgba(" + mixc(SUJO, LIMPO, s.pureza) + "," + Math.min(0.9, 0.35 + o.rate * 4) + ")";
          c.lineWidth = 2 + o.rate * 18;
          c.lineCap = "round";
          c.beginPath();
          c.moveTo(o.x, o.y);
          c.quadraticCurveTo(
            o.x + dir * reach * 0.72,
            o.y + (FLOOR - o.y) * 0.55,
            o.x + dir * reach,
            FLOOR + 2,
          );
          c.stroke();
        }
        c.beginPath();
        c.arc(o.x, o.y, 7, 0, 7);
        if (o.plug) {
          c.fillStyle = "#f5b23f";
          c.fill();
          c.strokeStyle = "#a97b1f";
          c.lineWidth = 2;
          c.stroke();
          c.fillStyle = "rgba(255,255,255,.35)";
          c.beginPath();
          c.arc(o.x - 2, o.y - 2, 2, 0, 7);
          c.fill();
        } else {
          c.fillStyle = "#070a10";
          c.fill();
          c.strokeStyle = "rgba(160,175,200,.65)";
          c.lineWidth = 1.5;
          c.stroke();
        }
      });

      // ===== respingos =====
      c.fillStyle = "rgba(" + mixc(SUJO, LIMPO, s.filtro) + ",.85)";
      s.drops.forEach(function (d) {
        c.globalAlpha = Math.max(0, 1 - d.l / (d.g ? 1.6 : 0.7));
        c.beginPath();
        c.arc(d.x, d.y, d.g ? 2.6 : 2, 0, 7);
        c.fill();
      });
      c.globalAlpha = 1;
    }

    let raf = 0;
    let last = performance.now() / 1000;
    function loop() {
      const t = performance.now() / 1000;
      const dt = Math.min(0.05, t - last);
      last = t;
      step(dt);
      draw(t);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="winw" style={{ width: largura }}>
      <div className="node-tab wintop">
        <span className="rt">
          <span>🌊 FONTE</span>
          <span>·</span>
          <span>FILTRO</span>
          <span>·</span>
          <span>BALDE FURADO</span>
        </span>
      </div>

      <canvas ref={cvRef} className="nodrag block" style={{ background: "#0b0f16" }} />

      <div className="bfil nodrag">
        <span>FILTRO</span>
        <input
          type="range"
          min={0}
          max={100}
          value={filtro}
          onChange={(e) => setFiltro(+e.target.value)}
        />
        <b>{filtro}%</b>
      </div>

      <div className="bfil nodrag">
        <span>BALDE&nbsp;</span>
        <input
          type="range"
          min={60}
          max={130}
          value={balde}
          onChange={(e) => setBalde(+e.target.value)}
          style={{ background: "linear-gradient(90deg,#39445c 0%,#f5b23f 100%)" }}
        />
        <b style={{ color: "#f5b23f" }}>×{(balde / 100).toFixed(1)}</b>
      </div>

      <div className="bstats">
        <span className="bs aqua">
          BALDE <b ref={bsN}>0%</b>
        </span>
        <span className="bs ok">
          VALOR <b ref={bsR}>R$ 0</b>
        </span>
        <span className="bs warn">
          VAZANDO <b ref={bsV}>0/5</b>
        </span>
        <span className="bs aqua">
          FONTE <b ref={bsF}>OCEANO</b>
        </span>
      </div>

      <div className="bbar">
        <i ref={barI} />
      </div>

      <div className="baldecap">
        a água do oceano é infinita — e SUJA. o filtro é o posicionamento: quanto
        mais filtra, menos volume e mais valor por gota.
        <br />
        furos = vazamentos da operação · transbordou com tudo tapado? problema bom:
        ESCALA O BALDE (capacidade: ticket ↑, time ↑).
      </div>
    </div>
  );
}

/** Recalcula o balde a partir do tamanho: aro, fundo e onde cada furo cai. */
function geom(s: {
  SZ: number;
  rimY: number;
  rimRx: number;
  botRx: number;
  rimRyV: number;
  botRyV: number;
  holes: Furo[];
}) {
  const H = 146 * s.SZ;
  s.rimY = BOT_Y - H;
  s.rimRx = 80 * s.SZ;
  s.botRx = 57 * s.SZ;
  s.rimRyV = 12 * Math.max(0.75, s.SZ);
  s.botRyV = 8 * Math.max(0.75, s.SZ);
  const rxAt = (y: number) =>
    s.rimRx + ((s.botRx - s.rimRx) * (y - s.rimY)) / (BOT_Y - s.rimY);
  s.holes.forEach((o) => {
    o.y = BOT_Y - 13 - o.f * (H - 30);
    o.x = CX + o.k * rxAt(o.y);
  });
}
