"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { PropsAnimacao } from "../animacoes";

// ---------------------------------------------------------------------------
// TIMELINE — "o tempo compõe, se você empenhar"
// ---------------------------------------------------------------------------
// Primeira das 7 animações portadas do board legado. A matemática (âncoras de
// cenário, interpolação, crescimento exponencial, moedas, atrito) veio
// verbatim: reescrever fórmula à mão é como o defeito entra sem ninguém ver.
//
// O que mudou de forma: o markup virou JSX e o ciclo de vida virou effect com
// cancelamento. O que NÃO mudou: os números.
//
// Os mostradores (faturamento, mês) são escritos por `ref`, não por estado.
// A simulação roda a 60fps — passar isso por `setState` seria um render por
// quadro, e o React não é o dono desse relógio.
// ---------------------------------------------------------------------------

const COR = {
  alto: "#54c98a",
  medio: "#f5b23f",
  baixo: "#f26a43",
  exec: "#4e7df6",
  texto: "#eef2fb",
  dim: "#9aa7be",
  fraco: "#5d6a83",
} as const;

const TMAX = 12;
const DTM = 12 / (9 * 60); // 12 meses em ~9 segundos a 60fps
const PAD = { l: 58, r: 18, t: 16, b: 34 };

/** [empenho, faturamento inicial, faturamento aos 12 meses] */
const ANCORAS: [number, number, number][] = [
  [0, 2500, 3800],
  [0.4, 2600, 4200],
  [0.55, 3000, 6500],
  [0.72, 3000, 9500],
  [0.9, 3200, 15000],
  [1, 3500, 18000],
];

/** A história da Ana: marcos que aparecem quando o cenário dela roda. */
const ANA = [
  { t: 0.07, l: "2 dias", h: "1º site" },
  { t: 3, l: "3 meses", h: "largou o CLT" },
  { t: 12, l: "12 meses", h: "+R$15k/mês" },
];

const CENARIOS = [
  { label: "Baixo", e: 28, ana: false },
  { label: "Médio", e: 55, ana: false },
  { label: "Alto", e: 80, ana: false },
  { label: "✦ Ana", e: 92, ana: true },
];

function interp(e: number): [number, number] {
  e = Math.max(0, Math.min(1, e));
  for (let i = 1; i < ANCORAS.length; i++) {
    if (e <= ANCORAS[i][0]) {
      const a = ANCORAS[i - 1];
      const b = ANCORAS[i];
      const f = (e - a[0]) / (b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }
  }
  return [ANCORAS[5][1], ANCORAS[5][2]];
}

const zona = (e: number): "alto" | "medio" | "baixo" =>
  e >= 0.66 ? "alto" : e >= 0.4 ? "medio" : "baixo";

const dinheiro = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");

const hexA = (h: string, a: number) => {
  const s = h.replace("#", "");
  return `rgba(${parseInt(s.slice(0, 2), 16)},${parseInt(s.slice(2, 4), 16)},${parseInt(s.slice(4, 6), 16)},${a})`;
};

const kf = (v: number) =>
  v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : String(v | 0);

const tetoBonito = (x: number) => {
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const n = x / p;
  const f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return f * p;
};

type Moeda = { x: number; y: number; vx: number; vy: number; vida: number };
type Ponto = { t: number; v: number; z: "alto" | "medio" | "baixo" };

export default function Timeline({ largura, altura }: PropsAnimacao) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const fatRef = useRef<HTMLSpanElement>(null);
  const mesRef = useRef<HTMLSpanElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);

  const [empenho, setEmpenho] = useState(55);
  const [cenario, setCenario] = useState(1);
  const [rodando, setRodando] = useState(false);
  const [fim, setFim] = useState(false);

  // Tudo que muda a 60fps mora aqui, fora do React.
  const sim = useRef({
    te: 0.55,
    tt: 0,
    tV: 3000,
    rodando: false,
    modoAna: false,
    hist: [] as Ponto[],
    fantasma: [] as { t: number; v: number }[],
    moedas: [] as Moeda[],
    anaVista: [false, false, false],
    emitT: 0,
    ultimaTarefa: -1,
    VMAX: 8000,
  });

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const c = cv.getContext("2d");
    if (!c) return;
    const s = sim.current;

    let W = 0;
    let H = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function medir() {
      const cv = cvRef.current;
      if (!cv || !c) return;
      W = cv.parentElement?.offsetWidth || 640;
      H = cv.parentElement?.offsetHeight || 200;
      cv.width = W * DPR;
      cv.height = H * DPR;
      cv.style.width = W + "px";
      cv.style.height = H + "px";
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    const xAt = (x: number) => PAD.l + (x / TMAX) * (W - PAD.l - PAD.r);
    const yAt = (v: number) =>
      H - PAD.b - (v / s.VMAX) * (H - PAD.t - PAD.b);

    function moeda(explosao: boolean): Moeda {
      return {
        x: xAt(s.tt) + (Math.random() * 14 - 7),
        y: yAt(s.tV),
        vy: explosao ? -30 - Math.random() * 40 : 18 + Math.random() * 14,
        vx: Math.random() * 40 - 20,
        vida: 0,
      };
    }

    function toast() {
      const w = toastRef.current;
      if (!w) return;
      const d = document.createElement("div");
      d.className = "tt";
      d.textContent = "✓ tarefa concluída";
      w.appendChild(d);
      setTimeout(() => d.remove(), 1800);
      while (w.children.length > 3) w.removeChild(w.firstChild!);
    }

    function passo() {
      const [v0, v12] = interp(s.te);
      const g = Math.log(v12 / v0) / TMAX;
      s.tV *= Math.exp(g * DTM);
      s.tt += DTM;
      s.hist.push({ t: s.tt, v: s.tV, z: zona(s.te) });

      s.emitT += DTM;
      const iv = Math.max(0.22, 1.15 - s.tV / 13000);
      if (s.emitT >= iv) {
        s.emitT = 0;
        if (s.tV > 1500) s.moedas.push(moeda(false));
      }
      if (Math.random() < s.te * 0.02 && s.tt - s.ultimaTarefa > 0.5) {
        s.ultimaTarefa = s.tt;
        toast();
      }
      if (s.modoAna) {
        ANA.forEach((a, i) => {
          if (!s.anaVista[i] && s.tt >= a.t) {
            s.anaVista[i] = true;
            for (let k = 0; k < 6; k++) s.moedas.push(moeda(true));
          }
        });
      }
      if (s.tt >= TMAX) {
        s.rodando = false;
        setRodando(false);
        setFim(true);
      }
    }

    function moverMoedas() {
      const b = H - PAD.b;
      for (let i = s.moedas.length - 1; i >= 0; i--) {
        const o = s.moedas[i];
        o.vy += 130 / 60;
        o.y += o.vy / 60;
        o.x += o.vx / 60;
        o.vida += 1 / 60;
        if (o.y > b - 3 || o.vida > 2.2) s.moedas.splice(i, 1);
      }
    }

    function mostradores() {
      if (fatRef.current) fatRef.current.textContent = dinheiro(s.tV);
      if (mesRef.current)
        mesRef.current.textContent = `mês ${s.tt.toFixed(0)} · projeção 12 meses`;
    }

    function desenhar() {
      if (!c) return;
      c.clearRect(0, 0, W, H);

      let mx = 8000;
      for (const p of s.hist) if (p.v > mx) mx = p.v;
      for (const p of s.fantasma) if (p.v > mx) mx = p.v;
      s.VMAX = tetoBonito(mx * 1.12);

      const pl = PAD.l;
      const pr = W - PAD.r;
      const ptp = PAD.t;
      const pb = H - PAD.b;

      // grade
      c.strokeStyle = "rgba(255,255,255,.06)";
      c.lineWidth = 1;
      c.fillStyle = COR.fraco;
      c.font = "10px ui-monospace,Menlo,monospace";
      c.textAlign = "right";
      c.textBaseline = "middle";
      for (let gy = 0; gy <= 4; gy++) {
        const vv = (s.VMAX * gy) / 4;
        const yy = yAt(vv);
        c.beginPath();
        c.moveTo(pl, yy);
        c.lineTo(pr, yy);
        c.stroke();
        c.fillText("R$" + kf(vv), pl - 7, yy);
      }
      c.textAlign = "center";
      c.textBaseline = "top";
      for (let gx = 0; gx <= TMAX; gx += 2) {
        const xx = xAt(gx);
        c.strokeStyle = "rgba(255,255,255,.04)";
        c.beginPath();
        c.moveTo(xx, ptp);
        c.lineTo(xx, pb);
        c.stroke();
        c.fillStyle = COR.fraco;
        c.fillText(gx + "m", xx, pb + 7);
      }

      // faixa de atrito: o tempo não espera
      const bh = 13;
      const bg = c.createLinearGradient(0, pb - bh, 0, pb);
      bg.addColorStop(0, "rgba(242,106,67,0)");
      bg.addColorStop(1, "rgba(242,106,67,.14)");
      c.fillStyle = bg;
      c.fillRect(pl, pb - bh, pr - pl, bh);
      c.strokeStyle = "rgba(242,106,67,.3)";
      c.beginPath();
      c.moveTo(pl, pb);
      c.lineTo(pr, pb);
      c.stroke();
      c.fillStyle = "rgba(242,106,67,.55)";
      c.font = "8px ui-monospace,Menlo,monospace";
      c.textAlign = "left";
      c.textBaseline = "bottom";
      c.fillText("ATRITO DO MERCADO — O TEMPO NÃO ESPERA", pl + 5, pb - 2);

      // projeção
      if (s.fantasma.length) {
        c.setLineDash([3, 5]);
        c.strokeStyle = "rgba(255,255,255,.16)";
        c.lineWidth = 1.5;
        c.beginPath();
        s.fantasma.forEach((p, i) => {
          const gx2 = xAt(p.t);
          const gy2 = yAt(p.v);
          if (i) c.lineTo(gx2, gy2);
          else c.moveTo(gx2, gy2);
        });
        c.stroke();
        c.setLineDash([]);
        const ult = s.fantasma[s.fantasma.length - 1];
        c.fillStyle = COR.dim;
        c.font = "9px ui-monospace,Menlo,monospace";
        c.textAlign = "right";
        c.textBaseline = "bottom";
        c.fillText("projeção " + dinheiro(ult.v), xAt(ult.t) - 2, yAt(ult.v) - 6);
      }

      // marcos da Ana
      if (s.modoAna) {
        ANA.forEach((a, i) => {
          const amx = xAt(a.t);
          c.strokeStyle = s.anaVista[i]
            ? "rgba(78,125,246,.5)"
            : "rgba(78,125,246,.2)";
          c.setLineDash([4, 5]);
          c.beginPath();
          c.moveTo(amx, ptp);
          c.lineTo(amx, pb);
          c.stroke();
          c.setLineDash([]);
          c.fillStyle = s.anaVista[i] ? COR.exec : "rgba(78,125,246,.45)";
          c.font = "8px ui-monospace,Menlo,monospace";
          c.textAlign = "center";
          c.textBaseline = "top";
          c.fillText(a.l, amx, ptp);
          if (s.anaVista[i]) {
            c.fillStyle = COR.texto;
            c.font = "9px ui-monospace,Menlo,monospace";
            c.fillText(a.h, amx, ptp + 11);
          }
        });
      }

      // a curva de verdade
      if (s.hist.length > 1) {
        const zc = COR[s.hist[s.hist.length - 1].z];
        const grd = c.createLinearGradient(0, ptp, 0, pb);
        grd.addColorStop(0, hexA(zc, 0.26));
        grd.addColorStop(1, hexA(zc, 0.01));
        c.beginPath();
        c.moveTo(xAt(s.hist[0].t), pb);
        for (const p of s.hist) c.lineTo(xAt(p.t), yAt(p.v));
        c.lineTo(xAt(s.hist[s.hist.length - 1].t), pb);
        c.closePath();
        c.fillStyle = grd;
        c.fill();

        c.lineWidth = 3;
        c.lineJoin = "round";
        c.lineCap = "round";
        for (let i = 1; i < s.hist.length; i++) {
          c.strokeStyle = COR[s.hist[i].z];
          c.beginPath();
          c.moveTo(xAt(s.hist[i - 1].t), yAt(s.hist[i - 1].v));
          c.lineTo(xAt(s.hist[i].t), yAt(s.hist[i].v));
          c.stroke();
        }

        const ep = s.hist[s.hist.length - 1];
        const ex = xAt(ep.t);
        const ey = yAt(ep.v);
        c.shadowColor = zc;
        c.shadowBlur = 14;
        c.fillStyle = zc;
        c.beginPath();
        c.arc(ex, ey, 5, 0, 7);
        c.fill();
        c.shadowBlur = 0;
        c.strokeStyle = "#fff";
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(ex, ey, 5, 0, 7);
        c.stroke();
      }

      // moedas
      for (const o of s.moedas) {
        c.save();
        c.translate(o.x, o.y);
        c.font = "bold 14px ui-monospace,Menlo,monospace";
        c.fillStyle = COR.alto;
        c.shadowColor = COR.alto;
        c.shadowBlur = 7;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.globalAlpha = Math.max(0, 1 - o.vida / 2.2);
        c.fillText("$", 0, 0);
        c.restore();
        c.shadowBlur = 0;
        c.globalAlpha = 1;
      }
    }

    // exposto pros handlers da UI, que vivem fora deste effect
    api.current = {
      recomeçar(te: number, ana: boolean) {
        const [v0] = interp(te);
        s.te = te;
        s.tt = 0;
        s.tV = v0;
        s.hist = [{ t: 0, v: v0, z: zona(te) }];
        s.moedas = [];
        s.anaVista = [false, false, false];
        s.emitT = 0;
        s.ultimaTarefa = -1;
        s.modoAna = ana;
        s.fantasma = [];
        for (let x = 0; x <= TMAX + 0.001; x += 0.25) {
          const [a, b] = interp(te);
          s.fantasma.push({ t: x, v: a * Math.pow(b / a, x / TMAX) });
        }
        mostradores();
        desenhar();
      },
      ajustar(te: number) {
        s.te = te;
        s.modoAna = false;
        s.fantasma = [];
        for (let x = 0; x <= TMAX + 0.001; x += 0.25) {
          const [a, b] = interp(te);
          s.fantasma.push({ t: x, v: a * Math.pow(b / a, x / TMAX) });
        }
        if (!s.rodando) s.tV = interp(te)[0];
        mostradores();
        desenhar();
      },
      tocar(v: boolean) {
        s.rodando = v;
      },
      fim: () => s.tt >= TMAX,
    };

    let raf = 0;
    function loop() {
      if (s.rodando) passo();
      moverMoedas();
      if (s.rodando || s.moedas.length) desenhar();
      mostradores();
      raf = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(() => {
      medir();
      desenhar();
    });
    if (cv.parentElement) ro.observe(cv.parentElement);

    medir();
    api.current.recomeçar(0.55, false);
    raf = requestAnimationFrame(loop);

    // Sem isto, sair da página deixa um rAF vivo desenhando fora da tela —
    // era uma das dívidas do board legado (8 loops permanentes, §11).
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const api = useRef<{
    recomeçar: (te: number, ana: boolean) => void;
    ajustar: (te: number) => void;
    tocar: (v: boolean) => void;
    fim: () => boolean;
  }>(null!);

  const cor = COR[zona(empenho / 100)];

  return (
    <section
      className="tl"
      style={
        {
          width: largura,
          height: altura,
          "--tl-c": cenario === 3 ? COR.exec : cor,
        } as React.CSSProperties
      }
    >
      <div className="tl-head">
        <div>
          <span className="tl-k">EASY BUILDER · CRESCIMENTO NO TEMPO</span>
          <h2 className="tl-h">O tempo compõe — se você empenhar</h2>
        </div>
        <div className="tl-readout">
          <span className="r-k">FATURAMENTO / MÊS</span>
          <span className="r-v" ref={fatRef}>
            R$ 3.000
          </span>
          <span className="r-m" ref={mesRef}>
            mês 0 · projeção 12 meses
          </span>
        </div>
      </div>

      <div className="tl-chartwrap">
        <canvas ref={cvRef} />
        <div className="tl-toasts" ref={toastRef} />
      </div>

      {/* `nodrag`: no modo de edição, sem isto o React Flow captura o gesto e
          arrastar o slider sai arrastando o nó. */}
      <div className="tl-controls nodrag">
        <div className="tl-scen">
          {CENARIOS.map((cn, i) => (
            <button
              key={cn.label}
              type="button"
              className={clsx(i === cenario && "on", cn.ana && "ana")}
              onClick={() => {
                setCenario(i);
                setEmpenho(cn.e);
                setFim(false);
                api.current.recomeçar(cn.e / 100, cn.ana);
                api.current.tocar(true);
                setRodando(true);
              }}
            >
              {cn.label}
            </button>
          ))}
        </div>

        <div className="tl-slider">
          <input
            type="range"
            min="0"
            max="100"
            value={empenho}
            aria-label="Empenho"
            onChange={(e) => {
              const v = Number(e.target.value);
              setEmpenho(v);
              setCenario(-1);
              api.current.ajustar(v / 100);
            }}
          />
        </div>

        <button
          type="button"
          className="tl-play"
          onClick={() => {
            if (fim) {
              api.current.recomeçar(empenho / 100, cenario === 3);
              setFim(false);
            }
            const novo = !rodando;
            setRodando(novo);
            api.current.tocar(novo);
          }}
        >
          {rodando ? "⏸ Pausar" : fim ? "▶ Rodar de novo" : "▶ Rodar o tempo"}
        </button>
      </div>
    </section>
  );
}
