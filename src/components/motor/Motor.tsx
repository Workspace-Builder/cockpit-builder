"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import clsx from "clsx";
import { FOUNDATION, ICONS, NAT, PHASES, PILARES } from "@/lib/flywheel";
import type { Natureza, Pilar } from "@/lib/flywheel";
import { ID_OBRA } from "@/lib/passos";
import { useRetrato } from "@/components/obra/useRetrato";

// ---------------------------------------------------------------------------
// O MOTOR DE TIJOLOS — a tela
// ---------------------------------------------------------------------------
// A roda do funil anti-prospecção com o arsenal por setor, ocupando a página
// inteira. Não é o nó do canvas (`canvas/animacoes/Flywheel.tsx`): aquele vive
// dentro de um retângulo de 1000×721 no board, este É a página — o mesmo
// desenho, outro enquadramento e outra interação.
//
// A GEOMETRIA VEIO DO LEGADO, VERBATIM (index.html, nó "🧱 Motor de Tijolos"):
// R_IN 236 / R_OUT 398, anel de momentum 418-452, 5 fiadas de tijolo por setor
// e a faísca dando uma volta a cada 9s. Mudar qualquer um desses números faz
// deixar de ser a mesma roda.
//
// AS CLASSES SÃO AS QUE JÁ EXISTEM em globals.css (.wheelBox, .hub, .sector,
// .foundation, .brick). O que é só desta tela mora sob `.motor` — assim o nó do
// canvas não herda o layout de página inteira.
//
// O FLUXO: clicar num setor ENCOLHE a roda e a desloca pra esquerda; o modal
// entra pela direita no vão que ela abriu. Sem véu escuro de propósito — ele
// apagaria justamente a roda que o movimento acabou de liberar, e o setor
// escolhido precisa continuar à vista.
// ---------------------------------------------------------------------------

const CX = 500;
const CY = 500;
const R_IN = 236;
const R_OUT = 398;
const R_MOM_IN = 418;
const R_MOM_OUT = 452;
const GAP = 2.2;
const R_FAISCA = (R_MOM_IN + R_MOM_OUT) / 2;
const PASSO = 360 / PHASES.length;

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

/** Linha de arco — trilho do rótulo curvo e da marca de seleção. */
function arco(r: number, a0: number, a1: number) {
  const p0 = polar(r, a0);
  const p1 = polar(r, a1);
  const g = Math.abs(a1 - a0) <= 180 ? 0 : 1;
  return `M${fmt(p0)}A${r} ${r} 0 ${g} ${a1 > a0 ? 1 : 0} ${fmt(p1)}`;
}

const Icone = ({ t }: { t: Natureza }) => (
  <span className="ico">
    <svg viewBox="0 0 24 24">
      <path d={ICONS[t]} />
    </svg>
  </span>
);

/**
 * As 9 naturezas do arsenal em 4 famílias de cor.
 *
 * Nove tintas na mesma lista viram confete — nenhuma significa nada. As três
 * primeiras famílias são o vocabulário que a Obra já ensina em
 * `obra/entregaveis.ts`: a AULA ensina a fazer, a FERRAMENTA é onde se executa,
 * a IA acelera. O que sobra sustenta o ciclo sem estar dentro dele (comunidade,
 * mentoria, suporte, bônus, processo) e fica em neutro de propósito.
 *
 * Agrupar a COR não apaga a informação: o olho do cartão continua escrevendo a
 * natureza exata — "SETUP" e "FERRAMENTA" dividem o verde e seguem legíveis.
 */
const FAMILIA: Record<Natureza, string> = {
  curso: "aprende",
  tool: "executa",
  setup: "executa",
  ia: "acelera",
  comunidade: "sustenta",
  mentoria: "sustenta",
  suporte: "sustenta",
  bonus: "sustenta",
  processo: "sustenta",
};

const MQ_REDUZ = "(prefers-reduced-motion: reduce)";

/**
 * Preferência do sistema lida como fonte externa — não é effect + setState de
 * propósito: assim quem liga "reduzir movimento" vê a roda parar sem recarregar.
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

/** As fiadas de tijolo do setor: é a textura que faz ler alvenaria, não pizza. */
function fiadas(a0: number, a1: number, cor: string) {
  const linhas: React.ReactElement[] = [];
  const n = 5;
  for (let c = 1; c < n; c++) {
    const r = R_IN + ((R_OUT - R_IN) * c) / n;
    linhas.push(
      <path
        key={`f${c}`}
        className="course"
        d={arco(r, a0 + 0.4, a1 - 0.4)}
        stroke={cor}
        strokeOpacity={0.16}
        strokeWidth={1}
      />,
    );
  }
  // juntas verticais, desencontradas a cada fiada (running bond)
  for (let c = 0; c < n; c++) {
    const rA = R_IN + ((R_OUT - R_IN) * c) / n;
    const rB = R_IN + ((R_OUT - R_IN) * (c + 1)) / n;
    const off = c % 2 ? 3.6 : 0;
    for (let ang = a0 + 3.6 + off; ang < a1 - 2; ang += 7.2) {
      linhas.push(
        <path
          key={`j${c}-${ang.toFixed(1)}`}
          d={`M${fmt(polar(rA + 2, ang))}L${fmt(polar(rB - 2, ang))}`}
          stroke={cor}
          strokeOpacity={0.14}
          strokeWidth={1}
        />,
      );
    }
  }
  return linhas;
}

export default function Motor({ faseInicial }: { faseInicial?: string }) {
  const [aberta, setAberta] = useState<number | null>(null);

  /* O Alicerce nasce FECHADO no celular — 5 famílias de texto de referência
     abertas de cara competiam por altura com a roda antes de qualquer clique
     (era metade do bug do layout). `null` = "segue o aparelho"; um clique no
     cabeçalho grava a escolha do aluno e passa a valer até ele clicar de
     novo. Mesmo padrão de estado derivado do resto do arquivo: computado no
     render, sem `useEffect`. */
  const retrato = useRetrato();
  const [alicerceForcada, setAlicerceForcada] = useState<boolean | null>(null);
  const alicerceAberta = alicerceForcada ?? !retrato;

  /* `?fase=` é a mão inversa do `?andar=`: lá o tijolo linka pro andar da
     Obra, aqui o setor da roda embutida no Método 10k (`canvas/animacoes/
     Flywheel.tsx`) linka pra fase certa aqui. Aplicado NO RENDER, não em
     effect — mesmo padrão do `andarAplicado` em `obra/Obra.tsx`: aplica
     exatamente uma vez por link, sem brigar com o clique de trocar de fase
     depois. */
  const [faseAplicada, setFaseAplicada] = useState<string | undefined>(undefined);
  if (faseInicial && faseInicial !== faseAplicada) {
    setFaseAplicada(faseInicial);
    const i = PHASES.findIndex((p) => p.key === faseInicial);
    if (i >= 0) setAberta(i);
  }
  /**
   * Quais grupos de pilar estão abertos.
   *
   * A Execução tem 23 tijolos, e 23 linhas iguais é uma lista sem forma: você
   * rola até cansar e não fica sabendo de que a fase é feita. Fechados, o modal
   * abre mostrando a ANATOMIA (3 pilares, 9/1/13) em vez do inventário — e o
   * inventário fica a um clique.
   *
   * Todos nascem FECHADOS. Deixar o primeiro aberto parecia mais gentil, mas na
   * Execução ele sozinho tem 9 linhas e enche o painel — a anatomia, que é o
   * ponto, ficava embaixo da dobra. Fechado, o modal cabe inteiro sem rolar:
   * título, papel, a barra de composição e três linhas de pilar. O inventário
   * é um clique, e o clique é a pergunta que o aluno já ia fazer.
   */
  const [abertos, setAbertos] = useState<Pilar[]>([]);
  const [parado, setParado] = useState(false);
  const [pulsando, setPulsando] = useState(-1);
  /** Ângulo da faísca. Fica em estado porque o SVG é JSX, não DOM imperativo. */
  const [theta, setTheta] = useState(0);

  const menosMovimento = usePrefereMenosMovimento();
  const movimento = !parado && !menosMovimento;

  useEffect(() => {
    if (!movimento) return;
    let raf = 0;
    let anterior = 0;
    let setorAnterior = -1;
    let t = 0;

    function quadro(ts: number) {
      if (!anterior) anterior = ts;
      const dt = (ts - anterior) / 1000;
      anterior = ts;
      t = (t + dt * 40) % 360; // uma volta a cada 9s, igual ao legado
      setTheta(t);
      const setor = Math.floor(t / PASSO) % PHASES.length;
      if (setor !== setorAnterior) {
        setorAnterior = setor;
        setPulsando(setor);
      }
      raf = requestAnimationFrame(quadro);
    }
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, [movimento]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (aberta === null) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setAberta(null);
        return;
      }
      if (e.key === "ArrowRight") setAberta((i) => ((i ?? 0) + 1) % PHASES.length);
      if (e.key === "ArrowLeft")
        setAberta((i) => ((i ?? 0) + PHASES.length - 1) % PHASES.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberta]);

  const total = useMemo(
    () => PHASES.reduce((s, p) => s + p.bricks.length, 0),
    [],
  );

  const fase = aberta !== null ? PHASES[aberta] : null;

  /** Do que a fase é feita — leitura de uma olhada, sem contar linha por linha. */
  const composicao = useMemo(() => {
    if (!fase) return [];
    const por: Partial<Record<Natureza, number>> = {};
    fase.bricks.forEach((b) => {
      por[b.t] = (por[b.t] ?? 0) + 1;
    });
    return (Object.keys(por) as Natureza[])
      .sort((a, b) => (por[b] ?? 0) - (por[a] ?? 0))
      .map((t) => ({ t, qt: por[t] ?? 0 }));
  }, [fase]);

  /** Tijolos agrupados pelo pilar de origem — o "mapeado por pilar/setor". */
  const grupos = useMemo(() => {
    if (!fase) return [];
    const ordem: Pilar[] = [1, 2, 3, 4, 0];
    return ordem
      .map((pl) => ({
        pl,
        info: PILARES[pl],
        itens: fase.bricks.filter((b) => (b.p ?? 0) === pl),
      }))
      .filter((g) => g.itens.length > 0);
  }, [fase]);

  const semPilar = fase
    ? fase.bricks.filter((b) => (b.p ?? 0) === 0).length
    : 0;

  /* Trocar de fase reabre no primeiro grupo — herdar o que estava aberto na
     fase anterior faria o painel abrir num pilar que talvez nem exista aqui.
     O ajuste é feito NO RENDER, não num effect: effect com setState renderiza
     duas vezes e a primeira passada pintaria os grupos da fase velha. É o
     "ajustar estado quando uma prop muda" da documentação do React, e o próprio
     lint da casa barra a versão com effect. */
  const [faseDosAbertos, setFaseDosAbertos] = useState<number | null>(null);
  if (faseDosAbertos !== aberta) {
    setFaseDosAbertos(aberta);
    setAbertos([]);
  }

  const alternarGrupo = (pl: Pilar) =>
    setAbertos((v) => (v.includes(pl) ? v.filter((x) => x !== pl) : [...v, pl]));

  const [dx, dy] = polar(R_FAISCA, theta);
  const [x0, y0] = polar(R_FAISCA, 0);
  const corFase = fase ? `var(${fase.varc})` : undefined;

  return (
    <div className="motor">
      <button
        type="button"
        className="btn motor-mov"
        aria-pressed={movimento}
        onClick={() => setParado((v) => !v)}
      >
        <span className="dot" /> Movimento
      </button>

      {/* O palco só existe pra abrigar o par roda + modal: é ele que recebe a
          classe `aberto`, e é dele que sai o clique no vazio pra fechar. */}
      <div
        className={clsx("motor-palco", fase && "aberto")}
        onClick={(e) => {
          if (e.target === e.currentTarget) setAberta(null);
        }}
      >
        {/* Roda e painel são um PAR: ficam na mesma linha e o que se move é a
            linha inteira. Ancorados separados (roda centrada, painel na borda
            direita) eles nunca se encontravam no meio. */}
        <div className="motor-dupla">
        <div className="wheelBox">
          <svg
            viewBox="0 0 1000 1000"
            className={clsx("motor-roda", fase && "temSel")}
            role="group"
            aria-label="Motor de tijolos — 6 fases do ciclo"
          >
            <defs>
              <filter id="mtj-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {PHASES.map((p, i) => (
                <linearGradient
                  key={p.key}
                  id={`mtj-grad${i}`}
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
                const labR = (R_IN + R_OUT) / 2 + 6;
                return (
                  <path
                    key={p.key}
                    id={`mtj-lp${i}`}
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
              className={clsx("motor-mom", movimento && "girando")}
              style={{ transformOrigin: "500px 500px" }}
            >
              <circle
                cx={CX}
                cy={CY}
                r={R_FAISCA}
                fill="none"
                stroke="rgba(255,255,255,.06)"
                strokeWidth={R_MOM_OUT - R_MOM_IN}
              />
              {Array.from({ length: 36 }, (_, k) => {
                const d = k * 10;
                const s = 6;
                return (
                  <path
                    key={d}
                    className="chev"
                    d={`M${fmt(polar(R_FAISCA - s, d - 1.4))}L${fmt(polar(R_FAISCA, d + 2.2))}L${fmt(polar(R_FAISCA + s, d - 1.4))}`}
                    stroke="rgba(159,176,204,.5)"
                    strokeWidth={1.4}
                  />
                );
              })}
            </g>

            {PHASES.map((p, i) => {
              const a0 = i * PASSO + GAP / 2;
              const a1 = (i + 1) * PASSO - GAP / 2;
              const meio = (a0 + a1) / 2;
              const [ix, iy] = polar(R_IN + 20, meio);
              const [cx2, cy2] = polar(R_OUT - 20, meio);
              const nome = p.name.length > 12 ? 14 : p.name.length > 8 ? 17 : 21;
              const cor = `var(${p.varc})`;
              return (
                <g
                  key={p.key}
                  className={clsx(
                    "sector",
                    aberta === i && "active",
                    pulsando === i && aberta === null && "pulsing",
                  )}
                  tabIndex={0}
                  role="button"
                  aria-label={`Fase ${i + 1}: ${p.name}, ${p.bricks.length} tijolos`}
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
                    fill={`url(#mtj-grad${i})`}
                    filter="url(#mtj-glow)"
                  />
                  <path
                    className="sedge"
                    d={anel(R_IN, R_OUT, a0, a1)}
                    fill="none"
                    stroke={cor}
                    strokeOpacity={0.9}
                    strokeWidth={1.6}
                  />
                  {fiadas(a0, a1, cor)}
                  <text className="slabel" fontSize={nome}>
                    <textPath
                      href={`#mtj-lp${i}`}
                      startOffset="50%"
                      textAnchor="middle"
                    >
                      {p.name.toUpperCase()}
                    </textPath>
                  </text>
                  {/* As coordenadas saem ARREDONDADAS como string, não como
                      número cru. `Math.cos` não é bit-a-bit igual entre o Node
                      do servidor e o V8 do navegador: o último dígito diverge
                      (…4823 × …48224), o HTML servido não bate com o
                      renderizado, e o React derruba a hidratação da árvore
                      inteira. Nos atributos `d` isso já não acontecia porque
                      `fmt()` sempre arredondou. */}
                  <text
                    className="sindex"
                    x={ix.toFixed(2)}
                    y={(iy + 5).toFixed(2)}
                    textAnchor="middle"
                    fontSize="15"
                    fill={cor}
                  >
                    {"0" + (i + 1)}
                  </text>
                  <text
                    className="scount"
                    x={cx2.toFixed(2)}
                    y={(cy2 + 4).toFixed(2)}
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

            {/* a marca da fatia escolhida, na borda externa: é o que se vê antes
                de ler o rótulo */}
            {aberta !== null && (
              <path
                className="motor-marca"
                d={arco(
                  R_OUT + 8,
                  aberta * PASSO + GAP / 2 + 1,
                  (aberta + 1) * PASSO - GAP / 2 - 1,
                )}
                stroke={`var(${PHASES[aberta].varc})`}
              />
            )}

            <g transform={`translate(${(dx - x0).toFixed(2)},${(dy - y0).toFixed(2)})`}>
              <circle
                cx={x0.toFixed(2)}
                cy={y0.toFixed(2)}
                r={16}
                fill="rgba(255,255,255,.18)"
                filter="url(#mtj-glow)"
              />
              <circle
                cx={x0.toFixed(2)}
                cy={y0.toFixed(2)}
                r={7}
                fill="#fff"
                filter="url(#mtj-glow)"
              />
            </g>
          </svg>

          {/* O miolo é HTML sobreposto, não texto de SVG: assim a fonte
              acompanha o container por clamp(), como no original. */}
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

        {/* ---- o modal do setor ---- */}
        <aside
          className={clsx("motor-modal", fase && "on")}
          style={fase ? ({ "--secc": corFase } as React.CSSProperties) : undefined}
          aria-hidden={!fase}
        >
          {fase && aberta !== null && (
            <>
              <header className="mm-top">
                <span className="mm-idx" style={{ background: corFase }}>
                  {"0" + (aberta + 1)}
                </span>
                <div>
                  <h2>{fase.name}</h2>
                  <span className="mm-cnt">
                    {fase.bricks.length} tijolo
                    {fase.bricks.length > 1 ? "s" : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="mm-close"
                  aria-label="Fechar"
                  onClick={() => setAberta(null)}
                >
                  ✕
                </button>
              </header>

              <p className="mm-role">{fase.role}</p>

              <div className="mm-comp">
                <div className="mm-barra">
                  {composicao.map((c) => (
                    <i
                      key={c.t}
                      data-fam={FAMILIA[c.t]}
                      style={{ flexGrow: c.qt }}
                    />
                  ))}
                </div>
                <div className="mm-leg">
                  {composicao.map((c) => (
                    <span key={c.t}>
                      <i data-fam={FAMILIA[c.t]} />
                      <b>{c.qt}</b> {NAT[c.t]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mm-body">
                {grupos.map((g) => (
                  <div
                    key={g.pl}
                    className={clsx("mm-grupo", abertos.includes(g.pl) && "on")}
                    style={{ ["--gc" as string]: g.info.c }}
                  >
                    <button
                      type="button"
                      className={clsx("mm-gh", g.pl === 0 && "orfao")}
                      aria-expanded={abertos.includes(g.pl)}
                      onClick={() => alternarGrupo(g.pl)}
                    >
                      <span className="seta" aria-hidden>
                        ›
                      </span>
                      <span className="bola" />
                      <b>{g.info.n}</b>
                      <span className="qt">{g.itens.length}</span>
                    </button>
                    <div className="mm-wrap">
                      <div className="mm-lista">
                      {g.itens.map((b, k) => {
                        /* Quem tem `ref` sabe qual andar da Obra guarda este
                           mesmo entregável — e vira link. Quem não tem continua
                           `<div>`: link que não leva a lugar nenhum é pior que
                           ausência de link, porque só se descobre clicando. */
                        const andar = b.ref?.split(":")[0];
                        const comum = {
                          className: clsx("mm-tij", andar && "temLink"),
                          "data-fam": FAMILIA[b.t],
                          style: {
                            animationDelay: `${Math.min(k, 14) * 0.026}s`,
                          },
                        };
                        /* Título em cima, natureza embaixo — lista de sistema
                           não usa sobrancelha. A nota, quando existe, entra no
                           lugar do subtítulo: é mais específica que o tipo, e
                           duas linhas secundárias empatariam a leitura. */
                        const dentro = (
                          <>
                            <Icone t={b.t} />
                            <div className="tx">
                              <div className="mm-nm">{b.n}</div>
                              <div className="mm-sub">{b.note ?? NAT[b.t]}</div>
                            </div>
                            <span className="mm-ac">
                              {b.loop && (
                                <span className="marca mciclo">Fecha o ciclo</span>
                              )}
                              {andar && (
                                <span className="mm-seta" aria-hidden>
                                  ›
                                </span>
                              )}
                            </span>
                          </>
                        );
                        return andar ? (
                          <Link
                            key={b.n + k}
                            href={`/p/${ID_OBRA}?andar=${andar}`}
                            {...comum}
                          >
                            {dentro}
                          </Link>
                        ) : (
                          <div key={b.n + k} {...comum}>
                            {dentro}
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* A conferência fica na tela, não numa planilha: quantos tijolos
                  ainda não têm pilar de origem. */}
              <footer className="mm-pe">
                <b>{fase.bricks.length - semPilar}</b> com pilar
                {semPilar ? (
                  <span className="alerta">· {semPilar} sem</span>
                ) : (
                  <span>· cobertura completa</span>
                )}
                <span className="mm-nav">
                  <button
                    type="button"
                    onClick={() =>
                      setAberta((aberta + PHASES.length - 1) % PHASES.length)
                    }
                  >
                    ← {PHASES[(aberta + PHASES.length - 1) % PHASES.length].name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAberta((aberta + 1) % PHASES.length)}
                  >
                    {PHASES[(aberta + 1) % PHASES.length].name} →
                  </button>
                </span>
              </footer>
            </>
          )}
        </aside>
        </div>
      </div>

      {/* O alicerce envolve o ciclo inteiro — não é etapa, é base. Fica no pé da
          tela porque é isso que ele é: o chão de tudo que a roda gira. */}
      <section className="foundation" aria-label="Alicerce">
        <button
          type="button"
          className="found-head"
          aria-expanded={alicerceAberta}
          onClick={() => setAlicerceForcada(!alicerceAberta)}
        >
          <span className="found-label">ALICERCE</span>
          <span className="found-sub">
            envolve o ciclo inteiro — não é etapa, é base
          </span>
          <span className="found-seta" aria-hidden>
            ›
          </span>
        </button>
        <div className={clsx("found-wrap", alicerceAberta && "on")}>
          <div className="found-grid">
            {FOUNDATION.map((f) => (
              <div key={f.g} className="fcard">
                <div className="fh">
                  <Icone t={f.t} />
                  <b>{f.g}</b>
                </div>
                <div className="fitems">
                  {f.items.map((i) => (
                    <span key={i} className="chip">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
