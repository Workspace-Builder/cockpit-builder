"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { PropsAnimacao } from "../animacoes";

// ---------------------------------------------------------------------------
// FURADEIRA > QUADRO NA PAREDE — esquete 3
// ---------------------------------------------------------------------------
// "Ninguém quer uma furadeira, quer o quadro na parede." Os dois clientes são
// os dois jeitos de comprar: um paga pela ferramenta (e reclama do preço), o
// outro paga pelo resultado (e manda o pix). Clicar acende um lado e apaga o
// outro — as palavras que orbitam trocam junto.
//
// Terceira peça portada do board legado (`index.html`, linhas 2348-2444). Toda
// coordenada de desenho veio VERBATIM: as caixas da furadeira, o gradiente da
// paisagem, os raios das órbitas, os pesos das fontes. Redesenhar "parecido"
// é como a esquete deixa de ser a mesma sem ninguém notar na revisão.
//
// O que mudou de forma: o markup virou JSX, o `mode` virou estado (é ele que
// acende o botão) e o `requestAnimationFrame` ganhou cancelamento no cleanup —
// no legado o loop rodava pra sempre, porque nada lá era desmontado.
//
// `f1`/`f2` (o quanto cada lado está em foco) ficam em ref, não em estado:
// mudam a 60fps, e passar isso por `setState` seria um render por quadro.
// ---------------------------------------------------------------------------

const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';

/** o que o cliente 1 pede — e o que ele traz junto */
const W1 = ["bonito", "rápido", "profissional", "responsivo", "IA"];
const C1 = ["preço baixo", "paga pouco", "dá problema", "reclama", "alteração"];
/** o que o cliente 2 pede — e o que ele traz junto */
const W2 = ["reconhecimento", "vendas", "escala", "retorno", "confiança"];
const C2 = ["preço justo", "aprovado!", "manda o pix", "nova demanda", "indicação"];

/** o canvas do legado tinha tamanho fixo, e as coordenadas dependem dele */
const CW = 460;
const CH = 316;

export default function Furadeira({ largura }: PropsAnimacao) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [modo, setModo] = useState(0);
  /** o loop lê o modo por ref: o effect não deve reiniciar a cada clique */
  const modoRef = useRef(0);
  useEffect(() => {
    modoRef.current = modo;
  }, [modo]);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const c = cv.getContext("2d");
    if (!c) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = CW * DPR;
    cv.height = CH * DPR;
    cv.style.width = CW + "px";
    cv.style.height = CH + "px";
    c.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Quem pediu menos movimento não quer cinco palavras girando: o relógio do
    // desenho congela, mas o clique continua trocando os lados — a esquete
    // ainda diz o que tem pra dizer, parada.
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** o quanto cada lado está em foco — 0 a 1, perseguindo o modo */
    let f1 = 0;
    let f2 = 0;

    function orbit(
      base: string[],
      alt: string[],
      mix: number,
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      t: number,
      colA: string,
      colB: string,
      dim: number,
    ) {
      if (!c) return;
      c.textAlign = "center";
      c.textBaseline = "middle";
      base.forEach(function (word, i) {
        const a = t * 0.26 + (i * Math.PI * 2) / base.length;
        const x = cx + Math.cos(a) * rx;
        const y = cy + Math.sin(a) * ry;
        const pulse = (0.5 + 0.35 * Math.sin(t * 1.2 + i * 1.7)) * dim;
        if (mix < 0.999) {
          c.globalAlpha = pulse * (1 - mix);
          c.font = "600 12px " + SANS;
          c.fillStyle = colA;
          c.fillText(word, x, y);
        }
        if (mix > 0.001) {
          c.globalAlpha = pulse * mix;
          c.font = "600 12.5px " + SANS;
          c.fillStyle = colB;
          c.fillText(alt[i], x, y);
        }
      });
      c.globalAlpha = 1;
    }

    /** o facho de luz que cai sobre o lado em foco */
    function spot(cx: number, a: number) {
      if (!c || a < 0.02) return;
      c.save();
      c.globalAlpha = a;
      const lg = c.createLinearGradient(0, 0, 0, 250);
      lg.addColorStop(0, "rgba(255,236,190,.13)");
      lg.addColorStop(1, "rgba(255,236,190,0)");
      c.fillStyle = lg;
      c.beginPath();
      c.moveTo(cx - 20, 0);
      c.lineTo(cx + 20, 0);
      c.lineTo(cx + 72, 250);
      c.lineTo(cx - 72, 250);
      c.closePath();
      c.fill();
      c.restore();
    }

    function draw(t: number, dt: number) {
      if (!c) return;
      const modo = modoRef.current;
      f1 += ((modo === 1 ? 1 : 0) - f1) * Math.min(1, dt * 3);
      f2 += ((modo === 2 ? 1 : 0) - f2) * Math.min(1, dt * 3);
      c.clearRect(0, 0, CW, CH);
      spot(116, f1);
      spot(345, f2);

      // ===== furadeira (esmaece quando o foco é o quadro) =====
      c.save();
      c.globalAlpha = 1 - f2 * 0.85;
      const bg = c.createLinearGradient(0, 128, 0, 172);
      bg.addColorStop(0, "#4d5a75");
      bg.addColorStop(1, "#2c3549");
      c.fillStyle = bg;
      c.beginPath();
      c.roundRect(62, 130, 88, 42, 10);
      c.fill();
      c.fillStyle = "rgba(255,255,255,.12)";
      c.beginPath();
      c.roundRect(68, 134, 76, 7, 4);
      c.fill();
      c.fillStyle = "#39445c";
      c.beginPath();
      c.moveTo(150, 136);
      c.lineTo(172, 142);
      c.lineTo(172, 164);
      c.lineTo(150, 168);
      c.closePath();
      c.fill();
      c.fillStyle = "#232b3d";
      c.fillRect(172, 144, 9, 18);
      c.strokeStyle = "#8a97b0";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(181, 153);
      c.lineTo(214, 153);
      c.stroke();
      c.lineWidth = 1.2;
      for (let bx = 185; bx < 212; bx += 6) {
        c.beginPath();
        c.moveTo(bx, 149);
        c.lineTo(bx + 4, 157);
        c.stroke();
      }
      c.fillStyle = "#39445c";
      c.beginPath();
      c.roundRect(92, 170, 27, 46, 7);
      c.fill();
      c.fillStyle = "#232b3d";
      c.beginPath();
      c.roundRect(117, 176, 8, 13, 3);
      c.fill();
      c.fillStyle = "#2c3549";
      c.beginPath();
      c.roundRect(84, 214, 42, 13, 4);
      c.fill();
      orbit(W1, C1, f1, 116, 168, 88, 74, t, "#8a97b0", "#f28b66", 1 - f2 * 0.85);
      c.restore();

      // ===== quadro (esmaece quando o foco é a furadeira) =====
      c.save();
      c.globalAlpha = 1 - f1 * 0.85;
      c.fillStyle = "#8a97b0";
      c.beginPath();
      c.arc(345, 84, 2.4, 0, 7);
      c.fill();
      c.strokeStyle = "rgba(138,151,176,.45)";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(305, 114);
      c.lineTo(345, 84);
      c.lineTo(385, 114);
      c.stroke();
      const sway = Math.sin(t * 0.9) * 0.012;
      c.save();
      c.translate(345, 152);
      c.rotate(sway);
      if (f2 > 0.02) {
        c.shadowColor = "#f5b23f";
        c.shadowBlur = 16 * f2;
      }
      c.fillStyle = "#8a6a1f";
      c.fillRect(-48, -40, 96, 80);
      c.fillStyle = "#f5b23f";
      c.fillRect(-44, -36, 88, 72);
      c.fillStyle = "#e8e2d4";
      c.fillRect(-38, -30, 76, 60);
      c.shadowBlur = 0;
      c.save();
      c.beginPath();
      c.rect(-34, -26, 68, 52);
      c.clip();
      const sky = c.createLinearGradient(0, -26, 0, 26);
      sky.addColorStop(0, "#1d3d5c");
      sky.addColorStop(1, "#2e6da0");
      c.fillStyle = sky;
      c.fillRect(-34, -26, 68, 52);
      c.fillStyle = "#ffd985";
      c.beginPath();
      c.arc(13, -7, 7, 0, 7);
      c.fill();
      c.fillStyle = "#173a2c";
      c.beginPath();
      c.moveTo(-34, 26);
      c.lineTo(-9, 0);
      c.lineTo(15, 26);
      c.closePath();
      c.fill();
      c.fillStyle = "#1f4d3a";
      c.beginPath();
      c.moveTo(-4, 26);
      c.lineTo(21, 6);
      c.lineTo(42, 26);
      c.closePath();
      c.fill();
      c.restore();
      c.restore();
      orbit(W2, C2, f2, 345, 152, 98, 84, t, "#54c98a", "#7fe0aa", 1 - f1 * 0.85);
      c.restore();
    }

    let raf = 0;
    let last = performance.now() / 1000;
    function loop() {
      const t = performance.now() / 1000;
      const dt = Math.min(0.05, t - last);
      last = t;
      // `dt` continua real com movimento reduzido: é ele que faz o clique
      // transicionar. Só o relógio do desenho para.
      draw(reduzido ? 0 : t, dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="winw" style={{ width: largura }}>
      <div className="eskhead">Furadeira &gt; Quadro na parede</div>
      <canvas ref={cvRef} className="block bg-transparent" />
      <div className="eskrow">
        {[1, 2].map((n) => (
          <button
            key={n}
            type="button"
            className={clsx("eskbtn nodrag", modo === n && "lit")}
            // Clicar no que já está aceso apaga: é assim que se volta a ver os
            // dois lados lado a lado, que é a comparação da esquete.
            onClick={() => setModo((m) => (m === n ? 0 : n))}
          >
            Cliente {n}
          </button>
        ))}
      </div>
    </div>
  );
}
