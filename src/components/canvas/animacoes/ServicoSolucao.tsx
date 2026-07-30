"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { PropsAnimacao } from "../animacoes";

// ---------------------------------------------------------------------------
// SERVIÇO > SOLUÇÃO — régua vertical — esquete 6
// ---------------------------------------------------------------------------
// Uma régua no meio: embaixo SERVIÇO (commodity), em cima SOLUÇÃO (premium).
// À esquerda a demanda, à direita a oferta. Arrastar VOCÊ pela régua mostra,
// no seu nível, quantos clientes te enxergam e contra quantos você briga.
//
// Embaixo: 300 concorrentes empilhados e ticket no chão — CANIBALIZAÇÃO. Em
// cima: quase ninguém do outro lado e os clientes é que disputam a vaga.
// A régua não é opinião, é a razão entre os dois lados no mesmo corte.
//
// O botão "era da IA" muda o jogo dos DOIS lados de uma vez, e é isso que o
// torna honesto: a IA despeja oferta na base (todo mundo entrega o simples) E
// cria demanda nova no topo. Embaixo, a conta piora; em cima, melhora.
//
// Portada de `index.html` 2828-3018. As nuvens de pontos são geradas por um
// `rnd(i)` determinístico — seno multiplicado e truncado — e NÃO por
// `Math.random()`: assim o desenho nasce igual toda vez, e a esquete que o
// aluno vê é a mesma que está no board legado.
//
// `nodrag` no canvas e no botão: a régua se arrasta com o ponteiro, e sem isso
// o React Flow entenderia o gesto como arrastar o nó.
// ---------------------------------------------------------------------------

const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const CW = 560;
const CH = 560;

/** a régua: eixo X, topo (SOLUÇÃO) e base (SERVIÇO) */
const RX = 70;
const RT = 104;
const RB = 486;
/** os dois campos: demanda à esquerda, oferta à direita */
const D1 = 150;
const D2 = 330;
const O1 = 360;
const O2 = 536;
/** meia-largura da faixa que conta como "o seu nível" */
const BAND = 0.115;

/** ruído determinístico: mesmo desenho em toda carga */
function rnd(i: number) {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const lvlY = (p: number) => RB - p * (RB - RT);
/** ticket em função do nível: R$50 na base, ×300 no topo */
const tk = (x: number) => 50 * Math.pow(300, x);

function fmt(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function cliCol(v: number) {
  return v > 0.8 ? "#ffd985" : v > 0.55 ? "#f5b23f" : v > 0.3 ? "#33c6d6" : "#5d6a83";
}

type Ponto = { x: number; y: number; v: number };
type Conc = { x: number; y: number; h: number };

// As nuvens são constantes de módulo: não dependem de estado nenhum, e gerar
// uma vez evita refazer 730 pontos a cada montagem do componente.

/** demanda: nível = valor. `^2.2` amontoa nos baratos, como o mercado real. */
const CLI: Ponto[] = Array.from({ length: 210 }, (_, i) => {
  const v = Math.pow(rnd(i * 3 + 1), 2.2);
  return { x: D1 + rnd(i * 7 + 2) * (D2 - D1), y: lvlY(v) + (rnd(i * 11 + 5) - 0.5) * 22, v };
});

/** oferta: `^3` concentra os concorrentes na base — a pirâmide de densidade */
const CON: Conc[] = Array.from({ length: 300 }, (_, j) => {
  const h = Math.pow(rnd(j * 13 + 7), 3.0);
  return { x: O1 + rnd(j * 5 + 9) * (O2 - O1), y: lvlY(h) + (rnd(j * 17 + 3) - 0.5) * 20, h };
});

/** a demanda NOVA que a IA cria — só no topo, de 0,55 pra cima */
const CIA: Ponto[] = Array.from({ length: 80 }, (_, k) => {
  const v = 0.55 + Math.pow(rnd(k * 19 + 41), 0.8) * 0.45;
  return { x: D1 + rnd(k * 23 + 11) * (D2 - D1), y: lvlY(v) + (rnd(k * 29 + 17) - 0.5) * 22, v };
});

/** e a oferta que ela despeja na base — `^5` gruda tudo no chão */
const CONI: Conc[] = Array.from({ length: 140 }, (_, k) => {
  const h = Math.pow(rnd(k * 31 + 53), 5) * 0.38;
  return { x: O1 + rnd(k * 37 + 29) * (O2 - O1), y: lvlY(h) + (rnd(k * 41 + 13) - 0.5) * 18, h };
});

export default function ServicoSolucao({ largura }: PropsAnimacao) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [ia, setIa] = useState(false);

  const sim = useRef({
    iaOn: false,
    /** IA entra por transição, não por chave: o gráfico se reorganiza à vista */
    iaF: 0,
    pos: 0.05,
    posA: 0.05,
    dragging: false,
  });

  useEffect(() => {
    sim.current.iaOn = ia;
  }, [ia]);

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

    /**
     * A conta que sustenta a esquete: soma o dinheiro da demanda e o número de
     * concorrentes DENTRO da faixa, e devolve a razão. A IA pesa dos dois
     * lados — corta demanda barata (`1-0.30·iaF`) e engrossa a oferta da base.
     */
    function medir(p: number) {
      let dR = 0;
      let dN = 0;
      let oN = 0;
      CLI.forEach(function (q) {
        if (Math.abs(q.v - p) < BAND) {
          const peso = q.v < 0.45 ? 1 - 0.3 * s.iaF : q.v < 0.6 ? 1 - 0.12 * s.iaF : 1;
          dN += peso;
          dR += tk(q.v) * peso;
        }
      });
      if (s.iaF > 0.02)
        CIA.forEach(function (q) {
          if (Math.abs(q.v - p) < BAND) {
            dN += s.iaF;
            dR += tk(q.v) * s.iaF * 1.2;
          }
        });
      CON.forEach(function (q) {
        if (Math.abs(q.h - p) < BAND) oN++;
      });
      if (s.iaF > 0.02)
        CONI.forEach(function (q) {
          if (Math.abs(q.h - p) < BAND) oN += s.iaF;
        });
      return { dR, dN, oN, ratio: dR / Math.max(1, oN * 60) };
    }

    // As âncoras da escala: a razão na base e no topo. Normalizar entre elas
    // (em log) é o que faz "canibaliza / equilíbrio / disputa" ter limiar fixo.
    const R0 = medir(0.02).ratio;
    const R1 = medir(0.95).ratio;

    function estado(p: number) {
      const m = medir(p);
      let n =
        (Math.log(m.ratio + 0.001) - Math.log(R0 + 0.001)) /
        (Math.log(R1 + 0.001) - Math.log(R0 + 0.001));
      n = Math.max(0, Math.min(1, n));
      return { m, n, tipo: n < 0.34 ? 0 : n > 0.7 ? 2 : 1 };
    }

    function ponto(e: PointerEvent) {
      const r = cv!.getBoundingClientRect();
      return {
        mx: ((e.clientX - r.left) / r.width) * CW,
        my: ((e.clientY - r.top) / r.height) * CH,
      };
    }
    /** a faixa de pegada da régua — larga o bastante pro dedo acertar */
    const naRegua = (mx: number, my: number) =>
      mx < RX + 50 && my > RT - 16 && my < RB + 16;

    function onDown(e: PointerEvent) {
      const { mx, my } = ponto(e);
      if (naRegua(mx, my)) {
        s.dragging = true;
        cv!.setPointerCapture(e.pointerId);
        s.pos = Math.max(0, Math.min(1, (RB - my) / (RB - RT)));
      }
    }
    function onMove(e: PointerEvent) {
      const { mx, my } = ponto(e);
      if (s.dragging) s.pos = Math.max(0, Math.min(1, (RB - my) / (RB - RT)));
      cv!.style.cursor = naRegua(mx, my) ? "ns-resize" : "default";
    }
    function onUp() {
      s.dragging = false;
    }
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);

    function draw(t: number, dt: number) {
      if (!c) return;
      s.posA += (s.pos - s.posA) * Math.min(1, dt * 6);
      s.iaF += ((s.iaOn ? 1 : 0) - s.iaF) * Math.min(1, dt * 3);
      c.clearRect(0, 0, CW, CH);

      const p = s.posA;
      const yy = lvlY(p);
      const st = estado(p);
      const canib = st.tipo === 0;
      const disp = st.tipo === 2;
      const fator = 0.6 + 0.55 * st.n;
      const stCol = canib ? "#f26a43" : disp ? "#ffd985" : "#8a97b0";

      // ===== painel de leitura =====
      c.textAlign = "left";
      c.textBaseline = "top";
      c.font = "600 9px " + SANS;
      c.fillStyle = "#8a97b0";
      c.fillText("NO SEU NÍVEL", 16, 6);
      c.font = "700 12.5px " + SANS;
      c.fillStyle = "#eef2fb";
      const oTx = st.m.oN <= 2 ? "quase ninguém" : "≈ " + fmt(st.m.oN * 1800) + " concorrentes";
      c.fillText(Math.round(st.m.dN) + " clientes te enxergam · " + oTx, 16, 18);
      if (s.iaF > 0.3) {
        c.font = "600 9px " + SANS;
        c.fillStyle = p < 0.4 ? "#f26a43" : "#9feaff";
        c.fillText(
          p < 0.4
            ? "⚡ IA: demanda segue viva — mas a oferta explodiu"
            : "⚡ IA: nova demanda premium entrou no jogo",
          16,
          40,
        );
      }
      c.textAlign = "right";
      c.font = "600 9px " + SANS;
      c.fillStyle = "#8a97b0";
      c.fillText("TICKET", CW - 16, 6);
      c.font = "800 19px " + SANS;
      c.fillStyle = "#ffd985";
      c.fillText("R$ " + fmt(tk(p) * fator), CW - 16, 16);
      c.font = "600 9px " + SANS;
      c.fillStyle = stCol;
      c.fillText(
        canib ? "▼ guerra de preço" : disp ? "▲ escassez premia" : "· equilíbrio ·",
        CW - 16,
        38,
      );

      // ===== a faixa: é ela que liga os dois lados no mesmo nível =====
      const bh = (RB - RT) * BAND;
      const fg = c.createLinearGradient(0, yy - bh, 0, yy + bh);
      const fc = canib ? "242,106,67" : disp ? "255,217,133" : "138,151,176";
      fg.addColorStop(0, "rgba(" + fc + ",0)");
      fg.addColorStop(0.5, "rgba(" + fc + ",.12)");
      fg.addColorStop(1, "rgba(" + fc + ",0)");
      c.fillStyle = fg;
      c.fillRect(RX - 20, yy - bh, O2 - RX + 20, bh * 2);
      c.strokeStyle = "rgba(" + fc + ",.35)";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(RX - 20, yy);
      c.lineTo(O2, yy);
      c.stroke();

      c.font = "700 10px " + SANS;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = stCol;
      const selo = canib
        ? s.iaF > 0.5 && p < 0.45
          ? "≈ oferta infinita × demanda de sempre — ticket no chão"
          : "⚔ CANIBALIZAÇÃO — oferta esmaga a demanda"
        : disp
          ? "✦ DISPUTA — clientes brigam pela vaga"
          : "equilíbrio";
      c.fillText(selo, (D1 + O2) / 2, yy - bh - 10);

      // ===== a régua =====
      const rg = c.createLinearGradient(0, RB, 0, RT);
      rg.addColorStop(0, "#39445c");
      rg.addColorStop(0.6, "#8a6a1f");
      rg.addColorStop(1, "#f5b23f");
      c.strokeStyle = "rgba(255,255,255,.12)";
      c.lineWidth = 10;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(RX, RB);
      c.lineTo(RX, RT);
      c.stroke();
      c.strokeStyle = rg;
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(RX, RB);
      c.lineTo(RX, RT);
      c.stroke();
      c.font = "700 9px " + SANS;
      c.textAlign = "center";
      c.fillStyle = "#ffd985";
      c.fillText("SOLUÇÃO", RX, RT - 18);
      c.fillStyle = "#8a97b0";
      c.fillText("SERVIÇO", RX, RB + 16);

      // ===== VOCÊ, na altura escolhida =====
      c.shadowColor = "#ffd985";
      c.shadowBlur = 12;
      c.fillStyle = "#ffd985";
      c.beginPath();
      c.arc(RX, yy - 11, 4, 0, 7);
      c.fill();
      c.beginPath();
      c.moveTo(RX - 4.2, yy + 4);
      c.lineTo(RX + 4.2, yy + 4);
      c.lineTo(RX + 2.6, yy - 6);
      c.lineTo(RX - 2.6, yy - 6);
      c.closePath();
      c.fill();
      c.shadowBlur = 0;
      c.font = "700 8px " + SANS;
      c.textAlign = "left";
      c.fillStyle = "#ffd985";
      c.fillText("VOCÊ ⇅", RX + 12, yy + 4);

      c.font = "600 8px " + SANS;
      c.textAlign = "left";
      c.textBaseline = "top";
      c.fillStyle = "#5d6a83";
      c.fillText("DEMANDA (clientes · cor = valor)", D1, RT - 26);
      c.fillText("OFERTA (concorrentes)", O1, RT - 26);

      // ===== demanda =====
      CLI.forEach(function (q, qi) {
        const on = Math.abs(q.v - p) < BAND;
        const fadeIA = q.v < 0.45 ? 1 - 0.3 * s.iaF : q.v < 0.6 ? 1 - 0.12 * s.iaF : 1;
        c.globalAlpha = (on ? 0.8 + 0.2 * Math.sin(t * 2 + qi) : 0.1) * fadeIA;
        c.fillStyle = cliCol(q.v);
        c.beginPath();
        c.arc(q.x, q.y, 2 + q.v * 2.4 + (on ? 0.5 : 0), 0, 7);
        c.fill();
        // na disputa, os premium puxam linha até você: são eles que procuram
        if (disp && on && q.v > 0.72 && qi % 2 === 0) {
          c.globalAlpha = 0.35 + 0.25 * Math.sin(t * 3 + qi);
          c.strokeStyle = "#ffd985";
          c.lineWidth = 1;
          c.setLineDash([4, 6]);
          c.lineDashOffset = -t * 30;
          c.beginPath();
          c.moveTo(q.x, q.y);
          c.lineTo(RX + 10, yy);
          c.stroke();
          c.setLineDash([]);
        }
      });
      c.globalAlpha = 1;

      // demanda criada pela IA: anel elétrico pra não confundir com a antiga
      if (s.iaF > 0.02) {
        CIA.forEach(function (q, qi) {
          const on = Math.abs(q.v - p) < BAND;
          c.globalAlpha = s.iaF * (on ? 0.85 + 0.15 * Math.sin(t * 2.4 + qi) : 0.14);
          c.fillStyle = "#9feaff";
          c.beginPath();
          c.arc(q.x, q.y, 2.2 + q.v * 2, 0, 7);
          c.fill();
          c.strokeStyle = "rgba(159,234,255," + (on ? 0.8 : 0.25) + ")";
          c.lineWidth = 1;
          c.beginPath();
          c.arc(q.x, q.y, 4.4 + q.v * 2 + Math.sin(t * 3 + qi) * 0.6, 0, 7);
          c.stroke();
          if (disp && on && qi % 2 === 0) {
            c.strokeStyle = "#9feaff";
            c.setLineDash([4, 6]);
            c.lineDashOffset = -t * 36;
            c.beginPath();
            c.moveTo(q.x, q.y);
            c.lineTo(RX + 10, yy);
            c.stroke();
            c.setLineDash([]);
          }
        });
        c.globalAlpha = 1;
      }

      // ===== oferta =====
      CON.forEach(function (q, qi) {
        const on = Math.abs(q.h - p) < BAND;
        c.globalAlpha = on ? 0.85 : 0.07;
        c.fillStyle = on ? (canib ? "#f26a43" : "#8a97b0") : "#6b7a95";
        c.beginPath();
        c.arc(q.x, q.y, on ? 2.8 : 2, 0, 7);
        c.fill();
        // canibalização: etiquetas de preço despencando entre os concorrentes
        if (canib && on && qi % 9 === 0) {
          c.globalAlpha = 0.6;
          const fy2 = q.y + ((t * 26 + qi * 7) % 22);
          c.font = "700 8px " + SANS;
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.fillStyle = "#f26a43";
          c.fillText("R$▼", q.x, fy2);
        }
      });
      if (s.iaF > 0.02) {
        CONI.forEach(function (q) {
          const on = Math.abs(q.h - p) < BAND;
          c.globalAlpha = s.iaF * (on ? 0.85 : 0.07);
          c.fillStyle = on ? (canib ? "#f26a43" : "#8a97b0") : "#6b7a95";
          c.beginPath();
          c.arc(q.x, q.y, on ? 2.8 : 2, 0, 7);
          c.fill();
        });
      }
      c.globalAlpha = 1;

      // ===== legenda =====
      c.font = "600 8px " + SANS;
      c.textAlign = "left";
      c.textBaseline = "middle";
      const ly = CH - 12;
      c.fillStyle = "#5d6a83";
      c.beginPath();
      c.arc(20, ly, 3, 0, 7);
      c.fill();
      c.fillStyle = "#8a97b0";
      c.fillText("commodity", 28, ly);
      c.fillStyle = "#33c6d6";
      c.beginPath();
      c.arc(92, ly, 3, 0, 7);
      c.fill();
      c.fillStyle = "#8a97b0";
      c.fillText("médio", 100, ly);
      c.fillStyle = "#ffd985";
      c.beginPath();
      c.arc(142, ly, 3.6, 0, 7);
      c.fill();
      c.fillStyle = "#8a97b0";
      c.fillText("premium", 151, ly);
      if (s.iaF > 0.3) {
        c.globalAlpha = s.iaF;
        c.fillStyle = "#9feaff";
        c.beginPath();
        c.arc(216, ly, 3.2, 0, 7);
        c.fill();
        c.strokeStyle = "rgba(159,234,255,.7)";
        c.lineWidth = 1;
        c.beginPath();
        c.arc(216, ly, 5.4, 0, 7);
        c.stroke();
        c.fillStyle = "#8a97b0";
        c.fillText("nova demanda (IA)", 226, ly);
        c.globalAlpha = 1;
      }
      c.textAlign = "right";
      c.fillStyle = "#5d6a83";
      c.fillText("arraste o VOCÊ pela régua ⇅", CW - 16, ly);
    }

    let raf = 0;
    let last = performance.now() / 1000;
    function loop() {
      const t = performance.now() / 1000;
      const dt = Math.min(0.05, t - last);
      last = t;
      draw(t, dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div className="winw" style={{ width: largura }}>
      <div className="eskhead">Serviço &gt; Solução</div>
      <canvas ref={cvRef} className="nodrag block bg-transparent" />
      <div className="eskrow">
        <button
          type="button"
          className={clsx("eskbtn nodrag", ia && "lit")}
          onClick={() => setIa((v) => !v)}
        >
          ⚡ era da IA
        </button>
      </div>
    </div>
  );
}
