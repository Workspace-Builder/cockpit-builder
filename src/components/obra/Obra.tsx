"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { PASSOS, passosDoPilar } from "@/lib/passos";
import type { Passo, Vaga } from "@/lib/model";
import { PREDIOS, ORDEM } from "./pilares";
import { criarObra, type EstadoObra } from "./motor";

// ---------------------------------------------------------------------------
// A OBRA — o quarteirão dos 4 pilares
// ---------------------------------------------------------------------------
// Uma tela só. Clicar num prédio não abre outra página: a câmera fecha nele e
// o checklist do pilar aparece. Clicar num passo do checklist abre os nós
// daquele andar. Esc volta uma camada.
//
// O desenho é SVG imperativo (`motor.ts`); aqui ficam o estado e a UI.
// ---------------------------------------------------------------------------

export default function Obra() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const motorRef = useRef<ReturnType<typeof criarObra> | null>(null);

  const [feitos, setFeitos] = useState<Record<string, boolean>>({});
  const [foco, setFoco] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [sel, setSel] = useState<string | null>(null);
  /* "andar em destaque" e "painel dos nós aberto" são estados diferentes:
     clicar no prédio leva a câmera e abre o CHECKLIST; só o checklist abre os nós. */
  const [aberto, setAberto] = useState(false);

  const estado: EstadoObra = useMemo(() => ({ feitos, foco, sel }), [feitos, foco, sel]);

  const onPasso = useCallback((n: 1 | 2 | 3 | 4, passoId: string) => {
    setFoco(n); setSel(passoId); setAberto(true);
  }, []);
  const onPredio = useCallback((n: 1 | 2 | 3 | 4, passoId?: string) => {
    setFoco(n);
    setSel(passoId ?? null);
    /* clicar num ANDAR com o painel aberto tem que TROCAR o andar do painel.
       Zerar sempre fazia o painel fechar no clique — parecia que não atualizava.
       Clicar no prédio (sem andar) continua fechando. */
    setAberto((ab) => (passoId ? ab : false));
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const m = criarObra(svgRef.current, PASSOS, { onPredio, onPasso });
    motorRef.current = m;
    m.render({ feitos: {}, foco: 0, sel: null }, true);
    return () => { m.destruir(); motorRef.current = null; };
  }, [onPredio, onPasso]);

  /* Trocar de tela não reconstrói o desenho: `navegar` mexe só no que mudou de
     estado e anima o resto. `render` (que reconstrói) fica pro que altera a
     geometria — marcar ou pular andar, que muda a altura da torre. */
  const feitosRef = useRef(feitos);
  useEffect(() => {
    const m = motorRef.current;
    if (!m) return;
    if (feitosRef.current !== feitos) { feitosRef.current = feitos; m.render(estado); }
    else m.navegar(estado);
  }, [estado, feitos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {              // Esc volta uma camada por vez
        if (aberto) setAberto(false);
        else { setFoco(0); setSel(null); }
      } else if (e.key >= "1" && e.key <= "5") {
        setFoco((Number(e.key) - 1) as 0 | 1 | 2 | 3 | 4);
        setSel(null);
        setAberto(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto]);

  const marcar = (id: string) => setFeitos((f) => ({ ...f, [id]: !f[id] }));

  const cfg = foco ? PREDIOS[foco] : null;
  const lista = foco ? passosDoPilar(foco) : [];
  const noPilar = lista.filter((p) => feitos[p.id]).length;
  const passoSel = sel ? lista.find((p) => p.id === sel) ?? null : null;

  // andar não marcado com marcado acima está PULADO: saiu da obra
  const ultimo = lista.reduce((acc, p, i) => (feitos[p.id] ? i : acc), -1);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden [contain:paint]">
      <svg ref={svgRef} data-obra="" className="pointer-events-auto absolute" />

      {/* a abertura: a regra do jogo antes de qualquer clique */}
      {!foco && (
        <div className="pointer-events-none absolute left-6 top-20 max-w-[380px]">
          <h1 className="font-mono text-[15px] font-bold uppercase tracking-[.06em] text-texto-1">
            Sua obra tem 4 prédios e 36 andares
          </h1>
          <p className="mt-2 text-[12px] leading-relaxed text-texto-2">
            Ninguém entrega no 3º andar de um prédio que parou no 1º.{" "}
            <b className="text-texto-1">Marcou, construiu.</b> Andar não marcado com
            marcado acima vira <b className="text-[#c98a2f]">pulado</b>: sai da obra e o
            prédio encurta na sua frente.
          </p>
          <p className="mt-2 font-mono text-[10px] leading-relaxed tracking-[.04em] text-texto-3">
            Clique num prédio pra entrar — ou use as teclas <b className="text-texto-2">1-5</b>.
          </p>
        </div>
      )}

      {/* checklist do pilar — apoio, não protagonista */}
      {cfg && (
        <aside className="pointer-events-none absolute bottom-6 left-6 top-20 flex w-[230px] flex-col">
          <span className="font-mono text-[10px] font-bold tracking-[.2em]" style={{ color: cfg.cor }}>
            PILAR {cfg.no} · {cfg.fase}
          </span>
          <h2 className="mt-2 font-mono text-[14px] font-bold uppercase leading-tight tracking-[.03em] text-texto-1">
            {cfg.titulo}
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-texto-2">{cfg.tese}</p>

          <div className="mt-auto pt-5">
            <div className="flex items-baseline gap-2">
              <b className="font-mono text-[30px] leading-none tracking-tight" style={{ color: cfg.cor }}>
                {noPilar}
              </b>
              <span className="font-mono text-[9.5px] tracking-[.14em] text-texto-3">
                DE {lista.length} ANDARES ERGUIDOS
              </span>
            </div>
            <p className="mt-2.5 text-[11.5px] leading-snug text-texto-3">
              {noPilar === lista.length
                ? "Torre erguida. Este pilar está de pé."
                : `Faltam ${lista.length - noPilar} andares pra esta torre ficar de pé. O sistema constrói ${cfg.sist}% — o resto é você.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setFoco(0); setSel(null); setAberto(false); }}
            className="pointer-events-auto mt-4 w-fit rounded-lg border border-fio px-3 py-[7px] font-mono text-[8.5px] font-bold tracking-[.12em] text-texto-3 hover:border-azul hover:text-white"
          >
            ← VOLTAR PRA OBRA
          </button>

        </aside>
      )}

      {/* os 3 nós do andar */}
      {cfg && passoSel && aberto && (
        <PainelNos
          passo={passoSel}
          cor={cfg.cor}
          feito={!!feitos[passoSel.id]}
          pulado={!feitos[passoSel.id] && lista.findIndex((x) => x.id === passoSel.id) < ultimo}
          onMarcar={() => marcar(passoSel.id)}
        />
      )}

      <BarraPilares
        foco={foco}
        feitos={feitos}
        onIr={(n) => { setFoco(n); setSel(null); setAberto(false); }}
      />
    </div>
  );
}

/**
 * O menu de checkpoint: onde você está e pra onde dá pra ir.
 * Mesma posição e formato da barra de vistas do app — vista não troca de
 * página, só re-enquadra dentro dela (BLUEPRINT-PAGINAS.md §4). Cada pilar
 * mostra o quanto já subiu, então serve de bússola pra quem se perdeu.
 */
function BarraPilares({
  foco, feitos, onIr,
}: {
  foco: 0 | 1 | 2 | 3 | 4;
  feitos: Record<string, boolean>;
  onIr: (n: 0 | 1 | 2 | 3 | 4) => void;
}) {
  const alvos = [
    { n: 0 as const, label: "A obra", cor: "#9aa7be" },
    ...ORDEM.map((n) => ({ n, label: `Pilar ${PREDIOS[n].no}`, cor: PREDIOS[n].cor })),
  ];
  return (
    <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-fio bg-[rgba(13,18,29,.96)] px-2.5 py-[7px] shadow-[0_16px_44px_rgba(0,0,0,.55)]">
      {alvos.map(({ n, label, cor }, i) => {
        const lst = n ? passosDoPilar(n) : PASSOS;
        const f = lst.filter((p) => feitos[p.id]).length;
        const on = foco === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onIr(n)}
            className={clsx(
              "flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 text-[12.5px] font-semibold",
              on ? "bg-white/[.10] text-white" : "text-texto-2 hover:bg-white/[.06] hover:text-white",
            )}
          >
            <kbd className="text-[10px] opacity-50">{i + 1}</kbd>
            <i className="h-1.5 w-1.5 rounded-full" style={{ background: cor, boxShadow: on ? `0 0 8px ${cor}` : undefined }} />
            {label}
            <span className={clsx("font-mono text-[10px]", on ? "text-texto-2" : "text-texto-3")}>
              {f}/{lst.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* cada vaga responde uma pergunta diferente — o rótulo sozinho não dizia
   por que existem três, nem em que ordem se usa */
const VAGAS: { k: "aula" | "ferram" | "ia"; rot: string; papel: string; ico: string; cor: string }[] = [
  { k: "aula", rot: "AULA", papel: "aprenda a fazer", ico: "▶", cor: "#2b8cff" },
  { k: "ferram", rot: "FERRAMENTA", papel: "onde você executa", ico: "⚙", cor: "#54c98a" },
  { k: "ia", rot: "IA DE APOIO", papel: "o que acelera", ico: "✦", cor: "#9e6cf2" },
];

function PainelNos({
  passo, cor, feito, pulado, onMarcar,
}: {
  passo: Passo; cor: string; feito: boolean; pulado: boolean;
  onMarcar: () => void;
}) {
  return (
    <section className="absolute right-5 top-1/2 w-[330px] -translate-y-1/2 rounded-[15px] border border-fio bg-[#0a0f19] p-4 shadow-[0_30px_70px_-24px_#000]">
      <div className="flex items-start gap-2">
        <span className="flex-1 font-mono text-[13px] font-bold tracking-[.1em]" style={{ color: cor }}>
          {String(passo.ordem).padStart(2, "0")} · {passo.titulo.toUpperCase()}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {passo.e8020 && (
          <span className="rounded bg-[rgba(46,196,166,.14)] px-1.5 py-1 font-mono text-[8px] font-bold tracking-[.14em] text-[#2ec4a6]">
            8020 · ESTE É DE VIGA
          </span>
        )}
        {passo.unha && (
          <span className="rounded bg-[rgba(232,161,60,.14)] px-1.5 py-1 font-mono text-[8px] font-bold tracking-[.14em] text-[#e8a13c]">
            NA UNHA · SEM FERRAMENTA
          </span>
        )}
      </div>

      {passo.sub && <p className="mt-3 text-[12px] leading-relaxed text-texto-2">{passo.sub}</p>}

      {/* o que está em jogo neste andar — a mecânica dita o texto, não o contrário */}
      {pulado ? (
        <p className="mt-3 rounded-lg border border-[rgba(201,138,47,.4)] bg-[rgba(201,138,47,.08)] p-2.5 text-[11.5px] leading-snug text-[#e8b06a]">
          <b>Você pulou este andar.</b> O prédio subiu sem ele e encurtou — o
          andar de cima está apoiado no vazio. Construa aqui pra ele voltar pra obra.
        </p>
      ) : passo.e8020 ? (
        <p className="mt-3 text-[11.5px] leading-snug text-texto-3">
          <b className="text-[#2ec4a6]">Este é dos que seguram o prédio.</b> Dá pra
          pular — e o prédio sobe do mesmo jeito, mais baixo e sem viga. É aqui que
          o resultado vem ou não vem.
        </p>
      ) : (
        <p className="mt-3 text-[11.5px] leading-snug text-texto-3">
          Acabamento: não segura o prédio sozinho, mas é o que separa entrega
          barata de entrega cara.
        </p>
      )}

      <p className="mt-4 font-mono text-[8px] font-bold tracking-[.18em] text-texto-3">
        O QUE VOCÊ TEM PRA CONSTRUIR ESTE ANDAR
      </p>
      <div className="mt-1 border-t border-fio pt-1">
        {VAGAS.map(({ k, rot, papel, ico, cor: c }) => {
          const v = passo[k] as Vaga | undefined;
          return v ? (
            <a
              key={k} href={v.url ?? undefined} target={v.url ? "_blank" : undefined} rel="noopener"
              className={clsx(
                "mt-2 flex items-center gap-3 rounded-xl border border-white/[.08] bg-white/[.02] p-2.5",
                v.url && "hover:border-white/20 hover:bg-white/[.06]",
              )}
            >
              <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px] border text-[15px]"
                    style={{ color: c, borderColor: c + "55", background: c + "1f" }}>{ico}</span>
              <span className="min-w-0 flex-1">
                <b className="block font-mono text-[8px] tracking-[.16em]" style={{ color: c }}>
                  {rot}{v.plat ? ` · ${v.plat}` : ""} <span className="opacity-60">· {papel}</span>
                </b>
                <strong className="mt-1 block text-[12.5px] font-medium leading-snug text-texto-1">{v.label}</strong>
              </span>
              {v.url && <span className="flex-none text-texto-3">↗</span>}
            </a>
          ) : (
            <div key={k} className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-white/[.12] p-2.5">
              <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px] border border-dashed border-white/[.18] text-[15px] text-texto-3">{ico}</span>
              <span className="min-w-0 flex-1">
                <b className="block font-mono text-[8px] tracking-[.16em] text-texto-3">{rot}</b>
                <strong className="mt-1 block text-[12px] font-medium leading-snug text-texto-3">
                  {passo.unha
                    ? "Este andar não tem atalho — é você, na unha."
                    : "Vaga reservada: o atalho existe, o link entra aqui."}
                </strong>
              </span>
            </div>
          );
        })}
      </div>

      <button
        type="button" onClick={onMarcar}
        className={clsx(
          "mt-4 w-full rounded-xl px-3 py-2.5 text-left",
          feito ? "border border-white/[.16] hover:bg-white/5" : "",
        )}
        style={feito ? undefined : { background: cor }}
      >
        <b className={clsx("block font-mono text-[10px] font-extrabold tracking-[.16em]", feito ? "text-texto-2" : "text-[#04070d]")}>
          {feito ? "DESMARCAR ANDAR" : "CONSTRUIR ANDAR"}
        </b>
        <span className={clsx("mt-0.5 block text-[10.5px] leading-snug", feito ? "text-texto-3" : "text-[#04070d] opacity-70")}>
          {feito ? "tira o andar da obra e o prédio encurta" : "só marque depois de fazer — o prédio sobe um andar"}
        </span>
      </button>
    </section>
  );
}
