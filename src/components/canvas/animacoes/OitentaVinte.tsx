"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { PropsAnimacao } from "../animacoes";

// ---------------------------------------------------------------------------
// O 80/20 DA TUA FASE — esquete 4
// ---------------------------------------------------------------------------
// Quatro andares, de baixo pra cima: EXECUÇÃO (80% do esforço, migalha de
// resultado), ENTREGA (20%), NEGÓCIO (4%) e SER (0,8%). Cada andar acima está
// na névoa até você terminar o de baixo — porque não dá pra ver o que ainda
// não se viveu.
//
// A trava que faz a esquete valer: o slider de ESFORÇO sozinho não desbloqueia
// nada. Sem o botão de foco ligado, esforço vira resultado numa taxa ridícula
// e a barra de progresso não anda. Suar não é subir.
//
// No fim, a pirâmide inverte: SER vira a ponta de apoio embaixo e tudo se
// equilibra sobre os 0,8%. É o argumento inteiro em uma imagem.
//
// Portada de `index.html` 2445-2648. As taxas (`rateA` ativa, `rateP` passiva),
// as larguras dos trapézios e as espessuras dos feixes vieram VERBATIM.
//
// `nodrag` nos controles: sem isso, arrastar o slider no modo de edição
// arrasta o nó em vez de mover o cursor.
// ---------------------------------------------------------------------------

const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const CW = 460;
const CH = 432;
/** o eixo da pirâmide */
const MX = 185;

type Andar = {
  nome: string;
  esf: string;
  itens: string[];
  col: [number, number, number];
  y0: number;
  y1: number;
  wT: number;
  wB: number;
  beam: number;
};

/** ordem de subida: EXECUÇÃO → ENTREGA → NEGÓCIO → SER (topo) */
const L: Andar[] = [
  {
    nome: "EXECUÇÃO",
    esf: "80%",
    itens: ["implementar · configurar · responsivar", "otimizar · ajustar · refazer"],
    col: [74, 90, 117],
    y0: 330,
    y1: 396,
    wT: 290,
    wB: 350,
    beam: 3,
  },
  {
    nome: "ENTREGA",
    esf: "20%",
    itens: ["posicionamento · prazo · compromisso", "performance · bonito · sem erros"],
    col: [190, 150, 80],
    y0: 256,
    y1: 330,
    wT: 200,
    wB: 290,
    beam: 9,
  },
  {
    nome: "NEGÓCIO",
    esf: "4%",
    itens: ["plano de negócio", "empacotamento · valor percebido"],
    col: [245, 178, 63],
    y0: 186,
    y1: 256,
    wT: 118,
    wB: 200,
    beam: 16,
  },
  {
    nome: "SER",
    esf: "0,8%",
    itens: ["soft skills · valores", "disciplina · mentalidade builder"],
    col: [255, 217, 133],
    y0: 118,
    y1: 186,
    wT: 44,
    wB: 118,
    beam: 25,
  },
];

/** a mesma pirâmide de cabeça pra baixo: SER embaixo, virando ponta de apoio */
const INV = [
  { i: 3, y0: 330, y1: 396, wT: 118, wB: 44 },
  { i: 2, y0: 256, y1: 330, wT: 200, wB: 118 },
  { i: 1, y0: 186, y1: 256, wT: 290, wB: 200 },
  { i: 0, y0: 118, y1: 186, wT: 350, wB: 290 },
];

/** quanto a fase ATIVA rende por segundo, por andar */
const RATE_A = [0.02, 0.05, 0.11, 0.22];
/** quanto cada andar já concluído rende sozinho, pra sempre */
const RATE_P = [0.004, 0.009, 0.018, 0.04];

const midY = (i: number) => (L[i].y0 + L[i].y1) / 2;
const rgba = (a: [number, number, number], al: number) =>
  "rgba(" + a[0] + "," + a[1] + "," + a[2] + "," + al + ")";

export default function OitentaVinte({ largura }: PropsAnimacao) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [esforco, setEsforco] = useState(0);
  const [foco, setFoco] = useState(false);
  const [topoDone, setTopoDone] = useState(false);
  const [invertMode, setInvertMode] = useState(false);

  const sim = useRef({
    nivel: 0,
    prog: 0,
    done: [false, false, false, false],
    fog: [0, 1, 1, 1],
    esforco: 0,
    foco: false,
    topoDone: false,
    invertMode: false,
    invert: 0,
    res: 0,
    mult: 1,
    youY: midY(0),
    youT: midY(0),
  });

  useEffect(() => {
    sim.current.esforco = esforco / 100;
  }, [esforco]);
  useEffect(() => {
    sim.current.foco = foco;
  }, [foco]);
  useEffect(() => {
    sim.current.invertMode = invertMode;
  }, [invertMode]);

  const aoClicar = useCallback(() => {
    const s = sim.current;
    if (s.invertMode) {
      // recomeçar: volta tudo ao estado de quem nunca subiu um andar
      s.nivel = 0;
      s.prog = 0;
      s.done = [false, false, false, false];
      s.fog = [0, 1, 1, 1];
      s.topoDone = false;
      s.invert = 0;
      s.res = 0;
      s.mult = 1;
      s.youT = midY(0);
      setTopoDone(false);
      setInvertMode(false);
      setFoco(false);
      return;
    }
    if (s.topoDone) {
      setInvertMode(true);
      setFoco(true);
      return;
    }
    setFoco((f) => !f);
  }, []);

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

    function trapAt(g: { y0: number; y1: number; wT: number; wB: number }) {
      if (!c) return;
      c.beginPath();
      c.moveTo(MX - g.wT / 2, g.y0);
      c.lineTo(MX + g.wT / 2, g.y0);
      c.lineTo(MX + g.wB / 2, g.y1);
      c.lineTo(MX - g.wB / 2, g.y1);
      c.closePath();
    }

    function dude2(x: number, y: number, col: string) {
      if (!c) return;
      c.shadowColor = col;
      c.shadowBlur = 10;
      c.fillStyle = col;
      c.beginPath();
      c.arc(x, y - 9, 3.6, 0, 7);
      c.fill();
      c.beginPath();
      c.moveTo(x - 3.8, y + 7);
      c.lineTo(x + 3.8, y + 7);
      c.lineTo(x + 2.3, y - 4);
      c.lineTo(x - 2.3, y - 4);
      c.closePath();
      c.fill();
      c.shadowBlur = 0;
    }

    /** a engrenagem que marca "isto virou sistema, roda sem você" */
    function gear(x: number, y: number, r: number, t: number) {
      if (!c) return;
      c.save();
      c.translate(x, y);
      c.rotate(t * 1.2);
      c.strokeStyle = "rgba(143,227,238,.9)";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, 0, r, 0, 7);
      c.stroke();
      for (let g = 0; g < 6; g++) {
        const a = (g * Math.PI) / 3;
        c.beginPath();
        c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        c.lineTo(Math.cos(a) * (r + 3.5), Math.sin(a) * (r + 3.5));
        c.stroke();
      }
      c.beginPath();
      c.arc(0, 0, r * 0.35, 0, 7);
      c.stroke();
      c.restore();
    }

    function step(dt: number) {
      // A fase só anda com FOCO ligado. Esforço bruto não desbloqueia andar —
      // é essa linha que impede a esquete de virar "aperte o slider e suba".
      if (!s.invertMode && !s.topoDone && s.foco) {
        s.prog += s.esforco * dt * 0.22;
        if (s.prog >= 1) {
          s.done[s.nivel] = true;
          if (s.nivel < 3) {
            s.nivel++;
            s.prog = 0;
            s.youT = midY(s.nivel);
          } else {
            s.topoDone = true;
            s.prog = 1;
            // o rótulo do botão vive no React; avisa uma vez só
            setTopoDone(true);
            setFoco(false);
          }
        }
      }

      // resultado = o que os andares concluídos rendem sozinhos + a fase ativa
      let taxa: number;
      if (s.invertMode) {
        taxa = 0.03 + s.esforco * 0.24;
      } else {
        let base = 0;
        for (let i = 0; i < 4; i++) if (s.done[i]) base += RATE_P[i];
        taxa = base + (s.foco ? 1 : 0.25) * s.esforco * RATE_A[s.nivel];
      }
      s.res += taxa * dt;
      if (s.res >= 1) {
        if (s.invertMode) {
          s.mult++;
          s.res = 0.12;
        } else s.res = 1;
      }

      for (let f = 0; f < 4; f++) {
        const alvo = f <= s.nivel ? 0 : 1;
        s.fog[f] += (alvo - s.fog[f]) * Math.min(1, dt * 2.2);
      }
      s.youY += (s.youT - s.youY) * Math.min(1, dt * 3);
      s.invert += ((s.invertMode ? 1 : 0) - s.invert) * Math.min(1, dt * 2);
    }

    function drawPyr(alpha: number, t: number, inverted: boolean) {
      if (!c || alpha < 0.02) return;
      c.save();
      c.globalAlpha = alpha;
      for (let gi = 0; gi < 4; gi++) {
        const g = inverted
          ? INV[gi]
          : { i: gi, y0: L[gi].y0, y1: L[gi].y1, wT: L[gi].wT, wB: L[gi].wB };
        const a = L[g.i];
        const vis = inverted ? 1 : 1 - s.fog[g.i];
        const ym = (g.y0 + g.y1) / 2;

        // o feixe que sai do andar em direção ao coletor de resultado
        const ativo = inverted || g.i <= s.nivel;
        if (vis > 0.05 && ativo) {
          const x0 = MX + (g.wT + g.wB) / 4;
          c.save();
          c.globalAlpha = alpha * vis;
          c.strokeStyle = rgba(a.col, 0.85);
          c.lineWidth = a.beam * (inverted ? 1.25 : 1);
          c.lineCap = "round";
          c.setLineDash([14, 10]);
          c.lineDashOffset = -t * (inverted ? 110 : 50);
          c.beginPath();
          c.moveTo(x0 + 4, ym);
          c.quadraticCurveTo((x0 + 422) / 2 + 14, ym - 8, 409, ym);
          c.stroke();
          c.setLineDash([]);
          c.restore();
        }

        trapAt(g);
        const g2 = c.createLinearGradient(MX - g.wB / 2, 0, MX + g.wB / 2, 0);
        g2.addColorStop(0, rgba(a.col, 0.16 + vis * 0.22));
        g2.addColorStop(0.5, rgba(a.col, 0.34 + vis * 0.3));
        g2.addColorStop(1, rgba(a.col, 0.12 + vis * 0.18));
        c.fillStyle = g2;
        c.fill();
        c.strokeStyle = rgba(a.col, 0.25 + vis * 0.55);
        c.lineWidth = 1.5;
        trapAt(g);
        c.stroke();

        // a névoa do que ainda não se viveu
        if (!inverted && s.fog[g.i] > 0.03) {
          trapAt(g);
          c.fillStyle = "rgba(10,13,20," + 0.88 * s.fog[g.i] + ")";
          c.fill();
          c.font = "700 15px " + SANS;
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.fillStyle = "rgba(138,151,176," + 0.5 * s.fog[g.i] + ")";
          c.fillText("?", MX, ym);
          for (let nb = 0; nb < 3; nb++) {
            c.fillStyle = "rgba(90,100,125," + 0.14 * s.fog[g.i] + ")";
            c.beginPath();
            c.ellipse(
              MX - 60 + nb * 60 + Math.sin(t * 0.7 + nb + g.i) * 10,
              ym + (nb % 2 ? 8 : -8),
              34,
              8,
              0,
              0,
              7,
            );
            c.fill();
          }
        }

        if (vis > 0.4) {
          const a2 = (vis - 0.4) / 0.6;
          const wMax = Math.max(g.wT, g.wB);
          c.textAlign = "right";
          c.textBaseline = "middle";
          c.font = "700 11px " + SANS;
          c.fillStyle = "rgba(238,242,251," + 0.9 * a2 + ")";
          c.fillText(a.esf, MX - wMax / 2 - 10, ym - 6);
          c.font = "600 8px " + SANS;
          c.fillStyle = "rgba(138,151,176," + 0.85 * a2 + ")";
          c.fillText("do esforço", MX - wMax / 2 - 10, ym + 7);
          c.textAlign = "center";
          c.font = "700 9.5px " + SANS;
          c.fillStyle = "rgba(238,242,251," + 0.95 * a2 + ")";
          // andar estreito não cabe texto dentro: joga pro lado com um fiozinho
          const wide = Math.min(g.wT, g.wB) >= 110;
          if (wide) {
            c.fillText(a.nome, MX, Math.min(g.y0, g.y1) + 13);
            c.font = "500 8.5px " + SANS;
            c.fillStyle = "rgba(220,228,244," + 0.75 * a2 + ")";
            c.fillText(a.itens[0], MX, Math.min(g.y0, g.y1) + 27);
            if (a.itens[1]) c.fillText(a.itens[1], MX, Math.min(g.y0, g.y1) + 39);
          } else {
            c.textAlign = "left";
            c.fillText(a.nome, MX + wMax / 2 + 12, ym - 14);
            c.font = "500 8.5px " + SANS;
            c.fillStyle = "rgba(220,228,244," + 0.75 * a2 + ")";
            c.fillText(a.itens[0], MX + wMax / 2 + 12, ym - 1);
            c.fillText(a.itens[1], MX + wMax / 2 + 12, ym + 11);
            c.strokeStyle = rgba(a.col, 0.4 * a2);
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(MX + Math.min(g.wT, g.wB) / 2 + 2, ym);
            c.lineTo(MX + wMax / 2 + 8, ym);
            c.stroke();
          }
        }

        if (!inverted && s.done[g.i] && vis > 0.5) {
          gear(MX - g.wB / 2 + 20, ym, 8, t);
          c.font = "600 7.5px " + SANS;
          c.textAlign = "left";
          c.textBaseline = "middle";
          c.fillStyle = "rgba(143,227,238,.85)";
          c.fillText("no sistema", MX - g.wB / 2 + 34, ym);
        }
        if (inverted) gear(MX - g.wB / 2 + 16, ym, 7, t);

        if (!inverted && g.i === s.nivel && !s.topoDone) {
          const pw = Math.min(g.wT, g.wB) * 0.8;
          c.strokeStyle = "rgba(255,255,255,.12)";
          c.lineWidth = 3;
          c.lineCap = "round";
          c.beginPath();
          c.moveTo(MX - pw / 2, g.y1 - 7);
          c.lineTo(MX + pw / 2, g.y1 - 7);
          c.stroke();
          c.strokeStyle = "rgba(255,217,133,.95)";
          c.beginPath();
          c.moveTo(MX - pw / 2, g.y1 - 7);
          c.lineTo(MX - pw / 2 + pw * Math.min(1, s.prog), g.y1 - 7);
          c.stroke();
        }
      }
      c.restore();
    }

    function draw(t: number) {
      if (!c) return;
      c.clearRect(0, 0, CW, CH);

      c.strokeStyle = "rgba(255,255,255,.07)";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(14, 404);
      c.lineTo(CW - 14, 404);
      c.stroke();

      // ===== o coletor de RESULTADO, à direita =====
      const colX = 422;
      const colT = 118;
      const colB = 396;
      c.strokeStyle = "rgba(138,151,176,.35)";
      c.lineWidth = 1.5;
      c.beginPath();
      c.roundRect(colX - 11, colT, 22, colB - colT, 7);
      c.stroke();
      const fillH = (colB - colT - 6) * Math.min(1, s.res);
      const cg = c.createLinearGradient(0, colB - fillH, 0, colB);
      cg.addColorStop(0, "rgba(255,217,133,.9)");
      cg.addColorStop(1, "rgba(245,178,63,.5)");
      c.fillStyle = cg;
      c.beginPath();
      c.roundRect(colX - 8, colB - 3 - fillH, 16, fillH, 5);
      c.fill();
      c.font = "600 8px " + SANS;
      c.textAlign = "center";
      c.textBaseline = "top";
      c.fillStyle = "#8a97b0";
      c.fillText("RESULTADO" + (s.mult > 1 ? " ×" + s.mult : ""), colX, colB + 8);

      // as duas pirâmides se cruzam no fade — nunca há um corte seco
      drawPyr(1 - s.invert, t, false);
      drawPyr(s.invert, t, true);

      if (s.invert < 0.5) {
        dude2(MX, s.youY + 8, "#ffd985");
        c.font = "700 8px " + SANS;
        c.textAlign = "center";
        c.textBaseline = "top";
        c.fillStyle = "#ffd985";
        c.fillText("VOCÊ", MX, s.youY + 18);
      } else {
        dude2(MX - 92, 384, "#ffd985");
        c.font = "700 8px " + SANS;
        c.textAlign = "center";
        c.textBaseline = "top";
        c.fillStyle = "#ffd985";
        c.fillText("VOCÊ", MX - 92, 394);
      }

      // ===== a frase do estado atual =====
      c.font = "600 9px " + SANS;
      c.textAlign = "center";
      c.textBaseline = "top";
      if (s.invert > 0.5) {
        c.fillStyle = "rgba(255,217,133," + (s.invert - 0.5) * 2 + ")";
        c.fillText("tudo apoiado no 0,8% — o 80/20 permanente", MX, 100);
      } else if (s.topoDone) {
        c.fillStyle = "rgba(255,217,133,.9)";
        c.fillText("fazer o 80/20 de TODAS as fases É o 80/20", MX, 100);
      } else if (!s.foco && s.esforco > 0.55) {
        c.fillStyle = "rgba(242,106,67,.85)";
        c.fillText(
          Math.round(s.esforco * 100) + "% de esforço sem 80/20 → migalha de resultado",
          MX,
          100,
        );
      } else if (s.esforco < 0.02) {
        c.fillStyle = "rgba(138,151,176,.6)";
        c.fillText("esforço 0 → resultado 0", MX, 100);
      }
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

    return () => cancelAnimationFrame(raf);
  }, []);

  const rotulo = invertMode
    ? "recomeçar"
    : topoDone
      ? "inverter a pirâmide"
      : foco
        ? "focando no 80/20 ✓"
        : "focar no 80/20";

  return (
    <div className="winw" style={{ width: largura }}>
      <div className="eskhead">O 80/20 da tua fase</div>
      <canvas ref={cvRef} className="block bg-transparent" />

      <div className="bfil nodrag">
        <span>ESFORÇO</span>
        <input
          type="range"
          min={0}
          max={100}
          value={esforco}
          onChange={(e) => setEsforco(+e.target.value)}
          style={{ background: "linear-gradient(90deg,#39445c 0%,#e8ecf6 100%)" }}
        />
        <b style={{ color: "#e8ecf6" }}>{esforco}%</b>
      </div>

      <div className="eskrow">
        <button
          type="button"
          className={clsx("eskbtn nodrag", (foco || invertMode) && "lit")}
          onClick={aoClicar}
        >
          {rotulo}
        </button>
      </div>
    </div>
  );
}
