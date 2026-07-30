"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { PropsAnimacao } from "../animacoes";

// ---------------------------------------------------------------------------
// OS DOIS BALCÕES — Meio × Fim — esquete 2
// ---------------------------------------------------------------------------
// Dois balcões lado a lado. No da esquerda, 500 mil designers vendendo "um
// site" — oferta lotada, demanda fraca, guerra de preço a R$ 300, e o cliente
// que chega muitas vezes desiste no meio do caminho. No da direita, meia dúzia
// de builders vendendo resultado — oferta rara, fila enorme, R$ 3.000 firme.
//
// O botão troca VOCÊ de balcão. Não muda o desenho: muda quem entra na sua
// fila, quanto cada troca deposita e o contador de "iguais a você", que cai de
// 500.000 para 37. É a esquete inteira num número.
//
// Portada de `index.html` 2160-2347. A simulação veio VERBATIM: o passo dos
// clientes, o bloqueio de fila (segura quem tem alguém 17px à frente), a
// chance de 60% de desistir no meio, os 72% que preferem o raro, o arco das
// moedas voando pro caixa. Números calibrados até a cena ficar honesta.
//
// `nodrag` no botão: sem isso, clicar nele no modo de edição arrasta o nó.
// ---------------------------------------------------------------------------

const CW = 460;
const CH = 488;

/** o eixo de cada balcão e a altura do tampo */
const MID_X = 118;
const FIM_X = 342;
const DESK = 232;

type Estado = "walk" | "trade" | "leave" | "quit";
type Cliente = {
  side: 0 | 1;
  x: number;
  y: number;
  st: Estado;
  t: number;
  quit: boolean;
  pref: boolean;
  j: number;
};
type Moeda = { x0: number; y0: number; x1: number; y1: number; t: number };
type Flutuante = { x: number; y: number; t: number; txt: string };

function fmt(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function DoisBalcoes({ largura }: PropsAnimacao) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const b2T = useRef<HTMLElement>(null);
  const b2K = useRef<HTMLElement>(null);
  const b2I = useRef<HTMLElement>(null);
  const b2F = useRef<HTMLElement>(null);

  /** 0 = você vende o meio · 1 = você vende o fim */
  const [lado, setLado] = useState<0 | 1>(0);

  const sim = useRef({
    side: 0 as 0 | 1,
    youX: MID_X + 52,
    youT: MID_X + 52,
    iguais: 500000,
    iguaisAlvo: 500000,
    trocas: 0,
    saldo: 0,
    spawnM: 0,
    spawnF: 0,
    clients: [] as Cliente[],
    coins: [] as Moeda[],
    floats: [] as Flutuante[],
  });

  // Trocar de balcão não teleporta: `youT` é o destino e o boneco caminha até
  // lá. O contador de iguais também persegue o alvo, em vez de saltar.
  useEffect(() => {
    const s = sim.current;
    s.side = lado;
    s.youT = lado ? FIM_X + 34 : MID_X + 52;
    s.iguaisAlvo = lado ? 37 : 500000;
  }, [lado]);

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

    /** o bonequinho: cabeça e tronco, nada mais */
    function dude(x: number, y: number, col: string, glow?: boolean) {
      if (!c) return;
      if (glow) {
        c.shadowColor = col;
        c.shadowBlur = 10;
      }
      c.fillStyle = col;
      c.beginPath();
      c.arc(x, y - 9, 3.4, 0, 7);
      c.fill();
      c.beginPath();
      c.moveTo(x - 3.6, y + 7);
      c.lineTo(x + 3.6, y + 7);
      c.lineTo(x + 2.2, y - 4);
      c.lineTo(x - 2.2, y - 4);
      c.closePath();
      c.fill();
      c.shadowBlur = 0;
    }

    /** pra onde o cliente converge — e quem embolsa a moeda dele */
    function sellerX(q: Cliente) {
      if (q.side === 0) return MID_X + (q.j || 0);
      return q.pref && s.side === 1 ? s.youX : FIM_X - 30;
    }

    function label(x: number, y: number, txt: string, col: string, align?: CanvasTextAlign) {
      if (!c) return;
      c.font = "8.5px ui-monospace,Menlo,monospace";
      c.textAlign = align || "center";
      c.textBaseline = "top";
      c.fillStyle = col;
      c.fillText(txt, x, y);
    }

    function step(dt: number) {
      s.spawnM += dt;
      s.spawnF += dt;
      // O meio recebe um cliente a cada 3,6s; o fim, a cada 0,9s. A diferença
      // de ritmo É a demanda desigual — não há texto que diga isso melhor.
      if (s.spawnM > 3.6) {
        s.spawnM = 0;
        s.clients.push({
          side: 0,
          x: MID_X + (Math.random() * 130 - 65),
          y: CH + 10,
          st: "walk",
          t: 0,
          quit: Math.random() < 0.6,
          pref: false,
          j: Math.random() * 60 - 30,
        });
      }
      if (s.spawnF > 0.9) {
        s.spawnF = 0;
        s.clients.push({
          side: 1,
          x: FIM_X + (Math.random() * 150 - 75),
          y: CH + 10,
          st: "walk",
          t: 0,
          quit: false,
          pref: Math.random() < 0.72,
          j: Math.random() * 14 - 7,
        });
      }

      for (let i = s.clients.length - 1; i >= 0; i--) {
        const q = s.clients[i];
        q.t += dt;
        if (q.st === "walk") {
          // fila: segura quem tem alguém logo à frente, senão todos atravessam
          let blocked = false;
          for (let b = 0; b < s.clients.length; b++) {
            const o = s.clients[b];
            if (
              o !== q &&
              o.side === q.side &&
              (o.st === "walk" || o.st === "trade") &&
              o.y < q.y &&
              q.y - o.y < 17 &&
              Math.abs(o.x - q.x) < 11
            ) {
              blocked = true;
              break;
            }
          }
          if (!blocked) q.y -= 34 * dt;
          const txx = sellerX(q) + (q.side === 1 ? q.j : 0);
          if (q.side === 1 || q.y < DESK + 120) q.x += (txx - q.x) * Math.min(1, dt * 1.4);
          if (q.quit && q.y < CH - 120) {
            q.st = "quit";
            q.t = 0;
          } else if (q.y <= DESK + 42) {
            q.st = "trade";
            q.t = 0;
          }
        } else if (q.st === "trade") {
          if (q.t > 0.8) {
            q.st = "leave";
            q.t = 0;
            const sx = sellerX(q);
            s.coins.push({ x0: q.x, y0: q.y - 10, x1: sx, y1: DESK - 38, t: 0 });
            // No fim, quem prefere o raro é seu. No meio, você pega 12% —
            // é o que sobra quando 500 mil disputam o mesmo cliente.
            const meu =
              q.side === s.side && (q.side === 1 ? q.pref === true : Math.random() < 0.12);
            if (meu) {
              s.trocas++;
              s.saldo += s.side ? 3000 : 300;
              s.floats.push({
                x: q.x,
                y: q.y - 18,
                t: 0,
                txt: "+R$ " + (s.side ? "3.000" : "300"),
              });
            }
          }
        } else if (q.st === "leave") {
          q.x += (q.side ? 1 : -1) * 46 * dt;
          q.y += 12 * dt;
          if (q.t > 2.2) s.clients.splice(i, 1);
        } else if (q.st === "quit") {
          q.x += (q.side ? -1 : 1) * 40 * dt;
          q.y += 16 * dt;
          if (q.t > 2.4) s.clients.splice(i, 1);
        }
      }

      for (let j2 = s.coins.length - 1; j2 >= 0; j2--) {
        s.coins[j2].t += dt * 2;
        if (s.coins[j2].t >= 1) s.coins.splice(j2, 1);
      }
      for (let k = s.floats.length - 1; k >= 0; k--) {
        s.floats[k].t += dt;
        if (s.floats[k].t > 1.6) s.floats.splice(k, 1);
      }
      s.youX += (s.youT - s.youX) * Math.min(1, dt * 3.2);
      s.iguais += (s.iguaisAlvo - s.iguais) * Math.min(1, dt * 2.2);

      const tt = "" + s.trocas;
      if (b2T.current && b2T.current.textContent !== tt) b2T.current.textContent = tt;
      const kk = s.side ? "R$ 3.000" : "R$ 300";
      if (b2K.current && b2K.current.textContent !== kk) {
        b2K.current.textContent = kk;
        b2K.current.style.color = s.side ? "#54c98a" : "";
      }
      const ii = fmt(s.iguais);
      if (b2I.current && b2I.current.textContent !== ii) {
        b2I.current.textContent = ii;
        b2I.current.style.color = s.iguais < 100 ? "#54c98a" : "";
      }
      const ff =
        "" +
        s.clients.filter((q) => q.side === s.side && (q.st === "walk" || q.st === "trade"))
          .length;
      if (b2F.current && b2F.current.textContent !== ff) b2F.current.textContent = ff;
    }

    function draw(t: number) {
      if (!c) return;
      c.clearRect(0, 0, CW, CH);

      // ===== friso do topo: tempo → dinheiro → solução =====
      c.strokeStyle = "#8a97b0";
      c.lineWidth = 1.8;
      c.beginPath();
      c.arc(110, 20, 10, 0, 7);
      c.stroke();
      c.beginPath();
      c.moveTo(110, 20);
      c.lineTo(110, 13);
      c.moveTo(110, 20);
      c.lineTo(115, 22);
      c.stroke();
      label(110, 36, "tempo", "#5d6a83");
      c.strokeStyle = "#f5b23f";
      c.beginPath();
      c.arc(230, 20, 10, 0, 7);
      c.stroke();
      c.fillStyle = "#f5b23f";
      c.font = "700 11px ui-monospace,Menlo,monospace";
      c.textAlign = "center";
      c.fillText("$", 230, 14);
      label(230, 36, "dinheiro", "#5d6a83");
      c.strokeStyle = "#54c98a";
      c.strokeRect(340, 10, 20, 20);
      c.fillStyle = "#54c98a";
      c.font = "700 11px ui-monospace,Menlo,monospace";
      c.fillText("✓", 350, 14);
      label(350, 36, "solução", "#5d6a83");
      c.strokeStyle = "rgba(138,151,176,.4)";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(126, 20);
      c.lineTo(214, 20);
      c.stroke();
      c.beginPath();
      c.moveTo(246, 20);
      c.lineTo(334, 20);
      c.stroke();
      const pp = (t * 46) % 176;
      const realx = pp <= 88 ? 126 + pp : 246 + (pp - 88);
      c.fillStyle = "#ffd985";
      c.beginPath();
      c.arc(realx, 20, 2.6, 0, 7);
      c.fill();

      // ===== divisória entre os dois mundos =====
      c.save();
      c.strokeStyle = "rgba(138,151,176,.18)";
      c.setLineDash([4, 8]);
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(230, 50);
      c.lineTo(230, CH - 6);
      c.stroke();
      c.restore();

      // ===== letreiros, com oferta × demanda explícita =====
      (
        [
          [MID_X, "WEB DESIGNER", "· vende o meio: sites ·", "#8a97b0", "oferta ▲▲▲ lotada", "demanda ▼ fraca", false],
          [FIM_X, "BUILDER", "· vende o fim: resultado ·", "#54c98a", "oferta ▼ rara", "demanda ▲▲▲ enorme", true],
        ] as [number, string, string, string, string, string, boolean][]
      ).forEach(function (L) {
        const bx = L[0];
        c.fillStyle = "#141b2a";
        c.strokeStyle = "rgba(138,151,176,.3)";
        c.lineWidth = 1.5;
        c.beginPath();
        c.roundRect(bx - 92, 54, 184, 50, 7);
        c.fill();
        c.stroke();
        c.font = "700 10px ui-monospace,Menlo,monospace";
        c.textAlign = "center";
        c.textBaseline = "top";
        c.fillStyle = L[3];
        c.fillText(L[1] + " " + L[2], bx, 61);
        c.font = "8.5px ui-monospace,Menlo,monospace";
        if (L[6]) {
          c.fillStyle = "#5d6a83";
          c.fillText(L[4], bx - 44, 78);
          c.fillStyle = "#54c98a";
          c.fillText(L[5], bx + 46, 78);
        } else {
          c.fillStyle = "#f26a43";
          c.fillText(L[4], bx - 44, 78);
          c.fillStyle = "#5d6a83";
          c.fillText(L[5], bx + 46, 78);
        }
      });

      label(MID_X, 112, "↓ 500 mil designers brigando pra vender", "rgba(242,106,67,.85)");
      label(FIM_X, 112, "↓ pouquíssimos builders", "rgba(84,201,138,.85)");

      // ===== a multidão idêntica do meio =====
      for (let r = 0; r < 3; r++)
        for (let q2 = 0; q2 < 8; q2++) {
          const vx = MID_X - 77 + q2 * 22;
          const vy = 138 + r * 26;
          // abre o buraco onde VOCÊ está, pra não desenhar dois no mesmo lugar
          if (s.side === 0 && Math.abs(vx - (MID_X + 52)) < 10 && r === 2) continue;
          dude(vx, vy, "#4a5670");
        }

      dude(FIM_X - 30, 168, "#5d8a75");
      label(FIM_X - 30, 178, "builder", "#5d8a75");

      // ===== VOCÊ, e o saldo que acumula =====
      c.font = "700 9px ui-monospace,Menlo,monospace";
      c.textAlign = "center";
      c.textBaseline = "top";
      c.fillStyle = "#54c98a";
      c.fillText("saldo R$ " + fmt(s.saldo), s.youX, 168);
      dude(s.youX, 194, "#f5b23f", true);
      c.font = "700 8px ui-monospace,Menlo,monospace";
      c.textAlign = "center";
      c.fillStyle = "#f5b23f";
      c.fillText("VOCÊ", s.youX, 204);

      // ===== os balcões =====
      [MID_X, FIM_X].forEach(function (bx) {
        c.fillStyle = "#232b3d";
        c.fillRect(bx - 88, DESK, 176, 15);
        c.fillStyle = "#39445c";
        c.fillRect(bx - 88, DESK, 176, 5);
        c.strokeStyle = "rgba(138,151,176,.35)";
        c.lineWidth = 1.5;
        c.strokeRect(bx - 88, DESK, 176, 15);
        c.fillStyle = "#1a2130";
        c.fillRect(bx - 80, DESK + 15, 7, 10);
        c.fillRect(bx + 73, DESK + 15, 7, 10);
      });

      // ===== etiquetas de preço =====
      c.textAlign = "center";
      c.textBaseline = "top";
      c.font = "700 13px ui-monospace,Menlo,monospace";
      c.fillStyle = "#8a97b0";
      c.fillText("R$ 300", MID_X, DESK + 24);
      c.font = "8.5px ui-monospace,Menlo,monospace";
      c.fillStyle = "#f26a43";
      // pisca: a guerra de preço não é um estado, é uma pressão que volta
      c.fillText(Math.sin(t * 2) > 0 ? "↓ guerra de preço" : "", MID_X, DESK + 40);
      c.font = "700 13px ui-monospace,Menlo,monospace";
      c.fillStyle = "#54c98a";
      c.fillText("R$ 3.000", FIM_X, DESK + 24);
      c.font = "8.5px ui-monospace,Menlo,monospace";
      c.fillStyle = "rgba(84,201,138,.8)";
      c.fillText("preço firme ✓", FIM_X, DESK + 40);

      label(MID_X, DESK + 70, "poucos clientes querendo", "rgba(138,151,176,.7)");
      label(MID_X, DESK + 82, 'comprar "um site"', "rgba(138,151,176,.7)");
      label(FIM_X, DESK + 70, "MUITOS clientes querendo", "rgba(84,201,138,.9)");
      label(FIM_X, DESK + 82, "resolver o problema →  fila pro raro", "rgba(84,201,138,.9)");

      // ===== os clientes =====
      s.clients.forEach(function (q) {
        const col = q.st === "quit" ? "#5d6a83" : q.side ? "#7fc9d6" : "#6b7a95";
        dude(q.x, q.y, col);
        if (q.st === "quit" && q.t < 1.2) {
          c.font = "700 9px ui-monospace,Menlo,monospace";
          c.textAlign = "center";
          c.fillStyle = "#f26a43";
          c.fillText("?", q.x + 8, q.y - 20);
        }
        if (q.st === "trade") {
          c.strokeStyle = "rgba(245,178,63,.5)";
          c.lineWidth = 1;
          c.beginPath();
          c.arc(q.x, q.y - 2, 9 + Math.sin(t * 6) * 1.5, 0, 7);
          c.stroke();
        }
      });

      // ===== as moedas indo pro caixa =====
      s.coins.forEach(function (m) {
        const mt = m.t;
        const mx = m.x0 + (m.x1 - m.x0) * mt;
        const my = m.y0 + (m.y1 - m.y0) * mt - Math.sin(mt * Math.PI) * 36;
        c.fillStyle = "#f5b23f";
        c.beginPath();
        c.arc(mx, my, 3.8, 0, 7);
        c.fill();
        c.fillStyle = "#0c1018";
        c.font = "700 5px ui-monospace,Menlo,monospace";
        c.textAlign = "center";
        c.fillText("$", mx, my - 2.5);
      });

      // ===== o "+R$" subindo =====
      s.floats.forEach(function (f) {
        c.globalAlpha = Math.max(0, 1 - f.t / 1.6);
        c.fillStyle = "#54c98a";
        c.font = "700 11px ui-monospace,Menlo,monospace";
        c.textAlign = "center";
        c.fillText(f.txt, f.x, f.y - f.t * 22);
        c.globalAlpha = 1;
      });
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

  return (
    <div className="winw" style={{ width: largura }}>
      <div className="node-tab wintop">
        <span className="rt">
          <span>⚖ TROCA</span>
          <span>·</span>
          <span>OFERTA×DEMANDA</span>
          <span>·</span>
          <span>RARIDADE</span>
        </span>
      </div>

      <canvas ref={cvRef} className="block" style={{ background: "#0b0f16" }} />

      <button
        type="button"
        className={clsx("jogoBtn nodrag", lado === 1 && "lit")}
        onClick={() => setLado((l) => (l === 1 ? 0 : 1))}
      >
        {lado ? "↩ voltar a vender o meio" : "💡 entender o jogo do valor"}
      </button>

      <div className="bstats">
        <span className="bs aqua">
          TROCAS <b ref={b2T}>0</b>
        </span>
        <span className="bs aqua">
          TICKET <b ref={b2K}>R$ 300</b>
        </span>
        <span className="bs warn">
          IGUAIS A VOCÊ <b ref={b2I}>500.000</b>
        </span>
        <span className="bs ok">
          FILA <b ref={b2F}>0</b>
        </span>
      </div>

      <div className="baldecap">
        dinheiro é tempo cristalizado — a troca só fecha quando a solução vale mais
        que o tempo que o dinheiro custou.
        <br />
        MEIO: todo mundo vende site, quase ninguém acorda querendo &quot;um site&quot;.
        FIM: todo mundo quer vender mais — e quase ninguém vende isso.
      </div>
    </div>
  );
}
