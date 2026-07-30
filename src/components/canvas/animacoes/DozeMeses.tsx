"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { PropsAnimacao } from "../animacoes";

// ---------------------------------------------------------------------------
// OS 12 MESES — partida, mix e retenção — esquete 5
// ---------------------------------------------------------------------------
// O ano inteiro em doze colunas. Três alavancas, e a esquete existe pra mostrar
// que a terceira é a que manda:
//
//   · PARTIDA — de quanto você sai (1k a 10k). Importa no começo e só.
//   · MIX     — Design, Web Design, Estratégia. Cada um puxa o teto pra cima,
//               mas entra escalonado: web no mês 2, estratégia no mês 5.
//   · FUROS   — clicar tapa. Cada furo tapado devolve 15% de retenção, e
//               retenção reaparece meses depois como cliente recorrente.
//
// A conta que faz a esquete honesta: um cliente retido hoje volta parcelado em
// 50% no mês+2, 30% no mês+3 e 20% no mês+4. É por isso que tapar furo em
// janeiro só aparece no gráfico em março — e é exatamente esse atraso que
// desanima quem desiste antes.
//
// Portada de `index.html` 2649-2827. Tetos, decaimentos (0.80^mês) e a curva de
// clientes vieram VERBATIM: são eles que decidem quando o primeiro 10k chega.
//
// `nodrag` nos botões e no canvas: os furos são clicáveis, e sem isso o clique
// vira arrasto do nó no modo de edição.
// ---------------------------------------------------------------------------

const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
const CW = 760;
const CH = 356;

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const STARTS = [1000, 3000, 5000, 10000];

/** teto de faturamento por combinação de serviços (bitmask D=1 W=2 E=4) */
const TETO = [0, 4000, 6000, 7500, 9000, 10000, 11000, 12500];
/** e quantos clientes essa combinação sustenta */
const CLIT = [0, 10, 6, 8, 4, 6, 5, 6];

/** os furos no rodapé: onde ficam e qual o raio de clique */
const FY = 336;
const FX0 = 170;
const FDX = 26;

type Mes = {
  fat: number;
  cli: number;
  rec: number;
  nov: number;
  tk: number;
  d: boolean;
  w: boolean;
  e: boolean;
};

function fmt(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** 12500 → "12,5k" · 800 → "800" */
function kf(n: number) {
  return n >= 1000
    ? (n / 1000).toFixed(1).replace(".", ",").replace(",0", "") + "k"
    : String(Math.round(n));
}

export default function DozeMeses({ largura }: PropsAnimacao) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [partida, setPartida] = useState(1);
  const [svc, setSvc] = useState([true, false, false]);

  const sim = useRef({
    sIdx: 1,
    svc: [true, false, false],
    furos: [false, false, false, false, false],
    /** faturamento suavizado por mês — a barra desliza em vez de pular */
    fatA: Array.from({ length: 12 }, () => 0),
  });

  useEffect(() => {
    sim.current.sIdx = partida;
  }, [partida]);
  useEffect(() => {
    sim.current.svc = svc;
  }, [svc]);

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

    /** cada furo tapado devolve 15% de retenção; os 5 valem 75% */
    const ret = () => (s.furos.filter(Boolean).length / 5) * 0.75;

    function furoAt(mx: number, my: number) {
      for (let i = 0; i < 5; i++)
        if (Math.hypot(mx - (FX0 + i * FDX), my - FY) < 12) return i;
      return -1;
    }
    function ponto(e: PointerEvent) {
      const r = cv!.getBoundingClientRect();
      return {
        mx: ((e.clientX - r.left) / r.width) * CW,
        my: ((e.clientY - r.top) / r.height) * CH,
      };
    }
    function onDown(e: PointerEvent) {
      const { mx, my } = ponto(e);
      const fi = furoAt(mx, my);
      if (fi >= 0) s.furos[fi] = !s.furos[fi];
    }
    function onMove(e: PointerEvent) {
      const { mx, my } = ponto(e);
      cv!.style.cursor = furoAt(mx, my) >= 0 ? "pointer" : "default";
    }
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);

    function calc(): Mes[] {
      const st = STARTS[s.sIdx];
      const r = ret();
      const out: Mes[] = [];
      /** clientes que voltam, já distribuídos nos meses futuros */
      const due = Array.from({ length: 18 }, () => 0);

      // O primeiro serviço marcado vale desde janeiro. Os outros respeitam a
      // ordem de entrada — vender estratégia no mês 1 seria mentira.
      let first = -1;
      for (let f2 = 0; f2 < 3; f2++)
        if (s.svc[f2]) {
          first = f2;
          break;
        }

      for (let m = 0; m < 12; m++) {
        let d = 0;
        let wv = 0;
        let e = 0;
        if (s.svc[0] && (first === 0 || m >= 1)) d = 1;
        if (s.svc[1] && (first === 1 || m >= 1)) wv = 2;
        if (s.svc[2] && (first === 2 || m >= 4)) e = 4;
        const mask = d | wv | e;
        if (first === -1) {
          out.push({ fat: 0, cli: 0, rec: 0, nov: 0, tk: 0, d: false, w: false, e: false });
          continue;
        }
        let teto = TETO[mask] * (0.55 + 0.6 * r);
        if (teto > TETO[mask]) teto = TETO[mask];
        // converge pro teto a 20% por mês; a partida some no meio do ano
        const fat = teto + (st - teto) * Math.pow(0.8, m);
        const cliT = CLIT[mask];
        const cli = Math.max(1, Math.round(10 + (cliT - 10) * (1 - Math.pow(0.8, m))));
        const rec = Math.min(Math.round(due[m]), cli);
        const nov = cli - rec;
        const base = cli * r;
        due[m + 2] += base * 0.5;
        due[m + 3] += base * 0.3;
        due[m + 4] += base * 0.2;
        out.push({ fat, cli, rec, nov, tk: fat / cli, d: !!d, w: !!wv, e: !!e });
      }
      return out;
    }

    function draw(dt: number) {
      if (!c) return;
      const Y = calc();
      let total = 0;
      let first10 = -1;
      for (let m = 0; m < 12; m++) {
        total += Y[m].fat;
        if (first10 < 0 && Y[m].fat >= 10000) first10 = m;
        s.fatA[m] += (Y[m].fat - s.fatA[m]) * Math.min(1, dt * 5);
      }
      c.clearRect(0, 0, CW, CH);
      const none = !s.svc[0] && !s.svc[1] && !s.svc[2];

      c.textAlign = "left";
      c.textBaseline = "top";
      c.font = "800 21px " + SANS;
      c.fillStyle = "#ffd985";
      c.fillText("TOTAL ANUAL  R$ " + fmt(total), 16, 2);
      c.font = "600 9.5px " + SANS;
      c.fillStyle = "#8a97b0";
      c.fillText("média R$ " + fmt(total / 12) + " / mês", 16, 26);
      if (first10 >= 0) {
        c.textAlign = "right";
        c.font = "600 10px " + SANS;
        c.fillStyle = "#54c98a";
        c.fillText("✦ primeiro 10k em " + MESES[first10], CW - 16, 8);
      }
      c.textAlign = "right";
      c.font = "600 8.5px " + SANS;
      c.fillStyle = "#5d6a83";
      c.fillText("web design entra no mês 2 · estratégia no mês 5", CW - 16, 26);

      const X0 = 16;
      const SW = (CW - 32) / 12;
      const TOP = 52;
      const BOT = 252;
      const MAXF = 15000;
      const y10 = BOT - (10000 / MAXF) * (BOT - TOP);
      c.save();
      c.strokeStyle = "rgba(255,217,133,.35)";
      c.setLineDash([5, 6]);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(X0, y10);
      c.lineTo(CW - 16, y10);
      c.stroke();
      c.restore();
      c.font = "600 8px " + SANS;
      c.textAlign = "left";
      c.fillStyle = "rgba(255,217,133,.6)";
      c.fillText("10k", X0 + 2, y10 - 11);

      for (let m2 = 0; m2 < 12; m2++) {
        const x = X0 + m2 * SW;
        const d2 = Y[m2];
        const fa = s.fatA[m2];
        c.fillStyle = "rgba(255,255,255,.025)";
        c.beginPath();
        c.roundRect(x + 2, TOP, SW - 4, BOT - TOP, 6);
        c.fill();
        c.strokeStyle = "rgba(138,151,176,.14)";
        c.lineWidth = 1;
        c.beginPath();
        c.roundRect(x + 2, TOP, SW - 4, BOT - TOP, 6);
        c.stroke();

        // barra empilhada: novos (ciano) embaixo, recorrentes (dourado) em cima
        const fh = Math.max(0, fa / MAXF) * (BOT - TOP - 4);
        if (fh > 2 && d2.cli > 0) {
          const recFrac = d2.rec / d2.cli;
          const hNov = fh * (1 - recFrac);
          const hRec = fh * recFrac;
          const gN = c.createLinearGradient(0, BOT - hNov, 0, BOT);
          gN.addColorStop(0, "rgba(51,198,214,.75)");
          gN.addColorStop(1, "rgba(78,125,246,.32)");
          c.fillStyle = gN;
          c.beginPath();
          c.roundRect(x + 4, BOT - 2 - hNov, SW - 8, hNov, hRec > 1 ? 2 : 5);
          c.fill();
          if (hRec > 1) {
            const gR = c.createLinearGradient(0, BOT - fh, 0, BOT - hNov);
            gR.addColorStop(0, "rgba(255,217,133,.95)");
            gR.addColorStop(1, "rgba(245,178,63,.5)");
            c.fillStyle = gR;
            c.beginPath();
            c.roundRect(x + 4, BOT - 2 - fh, SW - 8, hRec, 5);
            c.fill();
          }
        }

        c.font = "600 9px " + SANS;
        c.textAlign = "center";
        c.textBaseline = "top";
        c.fillStyle = "#8a97b0";
        c.fillText(MESES[m2], x + SW / 2, BOT + 8);
        if (none || d2.cli === 0) continue;
        c.font = "700 11.5px " + SANS;
        c.fillStyle = d2.fat >= 10000 ? "#ffd985" : "#eef2fb";
        c.fillText(kf(d2.fat), x + SW / 2, TOP + 8);
        c.font = "500 8px " + SANS;
        c.fillStyle = "#a9b4c9";
        c.fillText(d2.cli + " cli · R$" + kf(d2.tk), x + SW / 2, TOP + 23);
        if (d2.rec > 0) {
          c.fillStyle = "#ffd985";
          c.fillText("↺ " + d2.rec + " recorrente" + (d2.rec > 1 ? "s" : ""), x + SW / 2, TOP + 34);
        }
        // os selos D/W/E que dizem qual serviço estava ativo naquele mês
        let bx = x + SW / 2 - (((d2.d ? 1 : 0) + (d2.w ? 1 : 0) + (d2.e ? 1 : 0)) * 13 - 4) / 2;
        const by = BOT - 14;
        (
          [
            ["D", "#33c6d6", d2.d],
            ["W", "#4e7df6", d2.w],
            ["E", "#f5b23f", d2.e],
          ] as [string, string, boolean][]
        ).forEach(function (bd) {
          if (!bd[2]) return;
          c.fillStyle = bd[1];
          c.font = "700 8px " + SANS;
          c.textAlign = "left";
          c.fillText(bd[0], bx, by);
          bx += 13;
        });
        c.textAlign = "center";
      }

      if (none) {
        c.font = "600 11px " + SANS;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = "#8a97b0";
        c.fillText("selecione pelo menos um serviço", CW / 2, (TOP + BOT) / 2);
      }

      // ===== rodapé: os furos, a legenda e o resumo jan → dez =====
      c.font = "600 8.5px " + SANS;
      c.textAlign = "left";
      c.textBaseline = "middle";
      c.fillStyle = "#8a97b0";
      c.fillText("FUROS · retenção", 16, FY);
      for (let f = 0; f < 5; f++) {
        const fx = FX0 + f * FDX;
        c.beginPath();
        c.arc(fx, FY, 7, 0, 7);
        if (s.furos[f]) {
          c.fillStyle = "#f5b23f";
          c.fill();
          c.strokeStyle = "#a97b1f";
          c.lineWidth = 2;
          c.stroke();
        } else {
          c.fillStyle = "#070a10";
          c.fill();
          c.strokeStyle = "rgba(160,175,200,.65)";
          c.lineWidth = 1.5;
          c.stroke();
        }
      }
      c.fillStyle = ret() > 0 ? "#54c98a" : "#f26a43";
      c.fillText(Math.round(ret() * 100) + "% dos clientes voltam", FX0 + 5 * FDX + 2, FY);
      c.textAlign = "right";
      c.fillStyle = "rgba(51,198,214,.9)";
      c.fillText("■ novos", CW - 118, FY);
      c.fillStyle = "rgba(255,217,133,.9)";
      c.fillText("■ recorrentes", CW - 16, FY);

      if (!none) {
        const j = Y[0];
        const dz = Y[11];
        c.font = "600 9.5px " + SANS;
        c.textAlign = "left";
        c.textBaseline = "top";
        c.fillStyle = "#8a97b0";
        c.fillText(
          "jan: " +
            j.cli +
            " clientes · ticket R$" +
            kf(j.tk) +
            "   →   dez: " +
            dz.cli +
            " clientes (" +
            dz.rec +
            " recorrentes) · ticket R$" +
            kf(dz.tk),
          16,
          BOT + 26,
        );
        c.textAlign = "right";
        c.fillStyle = "#54c98a";
        c.fillText("menos clientes · ticket maior · faturamento maior", CW - 16, BOT + 26);
      }
    }

    let raf = 0;
    let last = performance.now() / 1000;
    function loop() {
      const t = performance.now() / 1000;
      const dt = Math.min(0.05, t - last);
      last = t;
      draw(dt);
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
      <div className="eskhead">Os 12 Meses</div>

      <div className="eskrow nodrag">
        {STARTS.map((v, i) => (
          <button
            key={v}
            type="button"
            className={clsx("eskbtn", i === partida && "lit")}
            style={{ padding: "5px 12px" }}
            onClick={() => setPartida(i)}
          >
            {v / 1000}k
          </button>
        ))}
        <span style={{ color: "#5d6a83", alignSelf: "center", margin: "0 4px" }}>·</span>
        {["Design", "Web Design", "Estratégia"].map((lab, i) => (
          <button
            key={lab}
            type="button"
            className={clsx("eskbtn", svc[i] && "lit")}
            onClick={() => setSvc((v) => v.map((on, k) => (k === i ? !on : on)))}
          >
            {lab}
          </button>
        ))}
      </div>

      <canvas ref={cvRef} className="nodrag block bg-transparent" />
    </div>
  );
}
