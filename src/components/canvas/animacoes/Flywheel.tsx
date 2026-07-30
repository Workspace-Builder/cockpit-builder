"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import { ICONS, NAT, PHASES } from "@/lib/flywheel";
import type { Natureza } from "@/lib/flywheel";
import type { PropsAnimacao } from "../animacoes";

// ---------------------------------------------------------------------------
// O FLYWHEEL — a roda do motor de tijolos
// ---------------------------------------------------------------------------
// Segunda peça portada, e a que o board tinha de mais interativo: 6 fases em
// setores clicáveis, trilho lateral com os tijolos da fase, faísca girando pelo
// anel de momentum e botão de parar o movimento.
//
// No legado a roda era construída com `createElementNS` num `<script>` de 327
// linhas. Aqui o SVG é JSX e a seleção é estado — a geometria (raios, ângulos,
// arcos) veio verbatim, porque é ela que faz o desenho ser o mesmo.
//
// O botão de movimento não é enfeite: `prefers-reduced-motion` desliga sozinho.
// ---------------------------------------------------------------------------

const CX = 500;
const CY = 500;
const R_IN = 236;
const R_OUT = 398;
const R_MOM_IN = 418;
const R_MOM_OUT = 452;
const GAP = 2.2;
const R_FAISCA = (R_MOM_IN + R_MOM_OUT) / 2;

const polar = (r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};
const fmt = (p: [number, number]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;

/** Fatia de anel: o setor da fase. */
function anel(rIn: number, rOut: number, a0: number, a1: number) {
  const p0 = polar(rOut, a0);
  const p1 = polar(rOut, a1);
  const p2 = polar(rIn, a1);
  const p3 = polar(rIn, a0);
  const g = a1 - a0 <= 180 ? 0 : 1;
  return `M${fmt(p0)}A${rOut} ${rOut} 0 ${g} 1 ${fmt(p1)}L${fmt(p2)}A${rIn} ${rIn} 0 ${g} 0 ${fmt(p3)}Z`;
}

/** Linha de arco — serve de trilho pro rótulo curvo do setor. */
function arco(r: number, a0: number, a1: number) {
  const p0 = polar(r, a0);
  const p1 = polar(r, a1);
  const g = Math.abs(a1 - a0) <= 180 ? 0 : 1;
  return `M${fmt(p0)}A${r} ${r} 0 ${g} ${a1 > a0 ? 1 : 0} ${fmt(p1)}`;
}

// O CSS do legado é `.ico svg{stroke:currentColor}` — o span carrega a cor e o
// svg herda. Trocar a estrutura quebraria a cor de todos os ícones.
const Icone = ({ t }: { t: Natureza }) => (
  <span className="ico">
    <svg viewBox="0 0 24 24">
      <path d={ICONS[t]} />
    </svg>
  </span>
);

const PASSO = 360 / PHASES.length;

const MQ_REDUZ = "(prefers-reduced-motion: reduce)";

/**
 * Preferência do sistema, lida como fonte externa.
 *
 * Não é effect + setState de propósito: além de o lint da casa barrar, assim
 * ela é reativa — quem liga "reduzir movimento" no sistema vê a roda parar sem
 * recarregar. No servidor devolve `false`, que é o padrão de quem não pediu nada.
 */
function usePrefereMenosMovimento() {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia(MQ_REDUZ);
      mq.addEventListener("change", avisar);
      return () => mq.removeEventListener("change", avisar);
    },
    () => window.matchMedia(MQ_REDUZ).matches,
    () => false,
  );
}

export default function Flywheel({ largura, altura }: PropsAnimacao) {
  const [aberta, setAberta] = useState<number | null>(null);
  const [parado, setParado] = useState(false);
  const [pulsando, setPulsando] = useState(-1);
  const faiscaRef = useRef<SVGGElement>(null);

  // O hook vem antes do `&&`: colocar depois faria o React ler a chamada como
  // condicional (curto-circuito) e a ordem dos hooks deixaria de ser estável.
  const menosMovimento = usePrefereMenosMovimento();
  const movimento = !parado && !menosMovimento;

  // A faísca dá uma volta a cada 9s e acende o setor por onde passa.
  useEffect(() => {
    if (!movimento) return;
    let raf = 0;
    let anterior = 0;
    let theta = 0;
    let setorAnterior = -1;

    function quadro(ts: number) {
      if (!anterior) anterior = ts;
      const dt = (ts - anterior) / 1000;
      anterior = ts;
      theta = (theta + dt * 40) % 360;

      const [x, y] = polar(R_FAISCA, theta);
      const [x0, y0] = polar(R_FAISCA, 0);
      faiscaRef.current?.setAttribute(
        "transform",
        `translate(${(x - x0).toFixed(2)},${(y - y0).toFixed(2)})`,
      );

      const setor = Math.floor(theta / PASSO) % PHASES.length;
      if (setor !== setorAnterior) {
        setorAnterior = setor;
        setPulsando(setor);
      }
      raf = requestAnimationFrame(quadro);
    }
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, [movimento]);

  // Esc fecha o trilho — mesmo atalho do board legado.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAberta(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const total = PHASES.reduce((s, p) => s + p.bricks.length, 0);
  const fase = aberta !== null ? PHASES[aberta] : null;

  return (
    // `fw-no` = este widget dentro de UM nó. O legado era a página inteira, e
    // por isso o CSS dele usa vw/vh e não tem limite de largura. Aqui o nó tem
    // 1000×721 fixos: sem este escopo, a roda se dimensiona pela viewport e
    // atravessa tudo (foi exatamente o que quebrou na primeira tentativa).
    <div className="fw-no" style={{ width: largura, height: altura }}>
      <header className="top">
        <div className="brand">
          <span className="kicker">EASY BUILDER · METODOLOGIA</span>
          <h1 className="title">O Motor de Tijolos</h1>
          <p className="lede">
            Cada entregável é um tijolo. Juntos, eles formam um motor que gira
            sozinho: a execução devolve tempo, o tempo vira posicionamento, o
            posicionamento traz o próximo cliente.
          </p>
        </div>
        {/* `nodrag`: no modo de edição, sem isto o clique vira arrasto do nó. */}
        <div className="controls nodrag">
          <button
            type="button"
            className="btn"
            aria-pressed={movimento}
            onClick={() => setParado((v) => !v)}
          >
            <span className="dot" /> Movimento
          </button>
        </div>
      </header>

      <div className="stage">
        {/* os setores da roda e o trilho são clicáveis — `nodrag` protege os dois */}
        <div className="wheelBox nodrag">
          <svg viewBox="0 0 1000 1000" className="wheel" id="wheel">
            <defs>
              <filter id="fw-glow">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {PHASES.map((p, i) => (
                <linearGradient
                  key={p.key}
                  id={`fw-grad${i}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0" stopColor={`var(${p.varc})`} stopOpacity=".42" />
                  <stop offset="1" stopColor={`var(${p.varc})`} stopOpacity=".12" />
                </linearGradient>
              ))}
              {PHASES.map((p, i) => {
                const a0 = i * PASSO;
                const a1 = a0 + PASSO;
                const meio = (a0 + a1) / 2;
                const embaixo = meio > 90 && meio < 270;
                const labR = (R_IN + R_OUT) / 2 + 4;
                return (
                  <path
                    key={p.key}
                    id={`fw-lp${i}`}
                    fill="none"
                    d={
                      embaixo
                        ? arco(labR, a1 - 1.5, a0 + 1.5)
                        : arco(labR, a0 + 1.5, a1 - 1.5)
                    }
                  />
                );
              })}
            </defs>

            {/* anel de momentum: o que nunca para */}
            <g
              className={clsx("momentum", movimento && "girando")}
              style={{ transformOrigin: "500px 500px" }}
            >
              <circle
                cx={CX}
                cy={CY}
                r={(R_MOM_IN + R_MOM_OUT) / 2}
                fill="none"
                stroke="rgba(255,255,255,.10)"
                strokeWidth={R_MOM_OUT - R_MOM_IN}
                strokeDasharray="14 10"
              />
            </g>

            {PHASES.map((p, i) => {
              const a0 = i * PASSO + GAP / 2;
              const a1 = (i + 1) * PASSO - GAP / 2;
              const meio = (a0 + a1) / 2;
              const [ix, iy] = polar(R_IN + 20, meio);
              const [cx2, cy2] = polar(R_OUT - 20, meio);
              const nome = p.name.length > 12 ? 14 : p.name.length > 8 ? 17 : 21;
              return (
                <g
                  key={p.key}
                  className={clsx(
                    "sector",
                    aberta === i && "active",
                    pulsando === i && "pulsing",
                  )}
                  tabIndex={0}
                  role="button"
                  aria-label={`Fase ${i + 1}: ${p.name}`}
                  onClick={() => setAberta(aberta === i ? null : i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setAberta(aberta === i ? null : i);
                    }
                  }}
                >
                  <path
                    className="sfill"
                    d={anel(R_IN, R_OUT, a0, a1)}
                    fill={`url(#fw-grad${i})`}
                  />
                  <path
                    className="sedge"
                    d={anel(R_IN, R_OUT, a0, a1)}
                    fill="none"
                    stroke={`var(${p.varc})`}
                    strokeWidth={1.5}
                  />
                  <text className="slabel" fontSize={nome}>
                    <textPath
                      href={`#fw-lp${i}`}
                      startOffset="50%"
                      textAnchor="middle"
                    >
                      {p.name.toUpperCase()}
                    </textPath>
                  </text>
                  <text
                    className="sindex"
                    x={ix}
                    y={iy + 5}
                    textAnchor="middle"
                    fontSize="15"
                    fill={`var(${p.varc})`}
                  >
                    {"0" + (i + 1)}
                  </text>
                  <text
                    className="scount"
                    x={cx2}
                    y={cy2 + 4}
                    textAnchor="middle"
                    fontSize="12"
                  >
                    {p.bricks.length}▪
                  </text>
                </g>
              );
            })}

            <circle
              cx={CX}
              cy={CY}
              r={R_IN - 4}
              fill="none"
              stroke="rgba(255,255,255,.10)"
              strokeWidth={1.5}
            />
            <circle
              cx={CX}
              cy={CY}
              r={R_IN - 10}
              fill="none"
              stroke="rgba(255,255,255,.05)"
              strokeWidth={1}
            />

            <g ref={faiscaRef}>
              <circle
                cx={polar(R_FAISCA, 0)[0]}
                cy={polar(R_FAISCA, 0)[1]}
                r={16}
                fill="rgba(255,255,255,.18)"
                filter="url(#fw-glow)"
              />
              <circle
                cx={polar(R_FAISCA, 0)[0]}
                cy={polar(R_FAISCA, 0)[1]}
                r={7}
                fill="#fff"
                filter="url(#fw-glow)"
              />
            </g>

          </svg>

          {/* O miolo é HTML sobreposto, não texto de SVG: assim o tamanho da
              fonte acompanha o container (clamp) como no original. */}
          <div className="hub">
            <div className="hub-eyebrow">A TESE</div>
            <div className="hub-thesis">
              O builder pensa,
              <br />
              <b>o sistema constrói.</b>
            </div>
            <div className="hub-sub">
              {PHASES.length} fases · {total} encaixes · 1 volante
            </div>
          </div>
          <div className="loopTag" title="A entrega vira o próximo lead">
            ↻ ciclo virtuoso
          </div>
        </div>

        {/* trilho: os tijolos da fase escolhida */}
        <aside
          className={clsx("rail nodrag", fase && "open")}
          aria-hidden={!fase}
          style={
            fase ? ({ "--railc": `var(${fase.varc})` } as React.CSSProperties) : undefined
          }
        >
          {fase && (
            <>
              <div className="rail-head">
                <span
                  className="rail-index"
                  style={{ background: `var(${fase.varc})` }}
                >
                  {"0" + ((aberta ?? 0) + 1)}
                </span>
                <b className="rail-name">{fase.name}</b>
                <span
                  className="rail-count"
                  style={{ color: `var(${fase.varc})` }}
                >
                  {fase.bricks.length} tijolo{fase.bricks.length > 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  className="rail-close"
                  aria-label="Fechar"
                  onClick={() => setAberta(null)}
                >
                  ✕
                </button>
              </div>
              <p className="rail-role">{fase.role}</p>
              <div className="rail-list">
                {fase.bricks.map((b, i) => (
                  <div
                    key={b.n + i}
                    className="brick"
                    style={{ ["--railc" as string]: `var(${fase.varc})` }}
                  >
                    <Icone t={b.t} />
                    <span>
                      <span className="bn">{b.n}</span>
                      <span className="bt">
                        {NAT[b.t]}
                        {b.note ? ` · ${b.note}` : ""}
                      </span>
                    </span>
                    {b.loop && <span className="loop">↻ fecha o ciclo</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>

    </div>
  );
}
