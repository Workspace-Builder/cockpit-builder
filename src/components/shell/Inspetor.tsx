"use client";

import { useTransition } from "react";
import clsx from "clsx";
import { RotateCcw } from "lucide-react";
import { estiloNoAction, textoNoAction } from "@/app/actions";
import type { NoBoard } from "@/lib/model";

// ---------------------------------------------------------------------------
// Inspetor — editar o nó, não só olhar
// ---------------------------------------------------------------------------
// É o que a migration 007 destravou: antes, cor e fonte não tinham onde ser
// gravadas (o legado guardava isso dentro do HTML serializado, que é a razão
// de o board velho não poder ter editor — BLUEPRINT.md §9).
//
// NULO = herda o padrão do tipo. O vocabulário `fx-*` continua mandando em
// quem ninguém tocou, e "voltar ao padrão" é gravar `null` — não precisa de
// coluna dizendo "foi editado".
// ---------------------------------------------------------------------------

/** As mesmas cores do vocabulário do Figma, não uma paleta nova. */
const CORES = [
  { valor: "#9747FF", nome: "roxo · ação" },
  { valor: "#FFC7C2", nome: "rosa · documento" },
  { valor: "#14AE5C", nome: "verde · entrada" },
  { valor: "#FFCD29", nome: "amarelo · copy" },
  { valor: "#757575", nome: "cinza · terminal" },
  { valor: "#4e7df6", nome: "azul" },
];

const CORES_TXT = ["#1e1e1e", "#eef2fb", "#9aa7be"];

export default function Inspetor({ no }: { no: NoBoard }) {
  const [salvando, iniciar] = useTransition();

  const gravar = (patch: Parameters<typeof estiloNoAction>[1]) =>
    iniciar(() => estiloNoAction(no.id, patch));

  const editado =
    no.cor !== null ||
    no.corTxt !== null ||
    no.contorno !== null ||
    no.fs !== null ||
    no.fw !== null ||
    no.ta !== null;

  return (
    <div className="border-t border-fio px-[18px] py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="titulinho">Estilo</span>
        {editado && (
          <button
            type="button"
            disabled={salvando}
            title="Voltar ao padrão do tipo"
            onClick={() =>
              gravar({
                cor: null,
                corTxt: null,
                contorno: null,
                fs: null,
                fw: null,
                ta: null,
              })
            }
            className="flex items-center gap-1.5 text-[11px] text-texto-3 hover:text-texto disabled:opacity-50"
          >
            <RotateCcw size={11} />
            padrão
          </button>
        )}
      </div>

      {/* O rótulo é a primeira coisa que se quer trocar num nó recém-criado —
          sem isto todo item nasce e morre dizendo "Ação", e o board parece
          preenchido com dado de mentira. */}
      <div className="border-b border-fio py-2.5">
        <span className="mb-1.5 block text-[12px] text-texto-2">Texto</span>
        <input
          key={no.id + (no.txt ?? "")}
          defaultValue={no.txt ?? ""}
          placeholder="sem título"
          disabled={salvando}
          onBlur={(e) => {
            if (e.target.value !== (no.txt ?? "")) {
              iniciar(() => textoNoAction(no.id, e.target.value));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="w-full rounded-[7px] border border-fio bg-white/[.04] px-2.5 py-1.5 text-[12.5px] text-texto outline-none focus:border-azul"
        />
      </div>

      <Linha rotulo="Preenchimento">
        <div className="flex items-center gap-1.5">
          {/* Cor livre, além das 6 do vocabulário: elas são o padrão da casa,
              não uma cerca. */}
          <label
            title="Escolher qualquer cor"
            className="grid h-[19px] w-[19px] cursor-pointer place-items-center overflow-hidden rounded-[5px] border border-white/20 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]"
          >
            <input
              type="color"
              value={no.cor ?? "#9747FF"}
              disabled={salvando}
              onChange={(e) => gravar({ cor: e.target.value })}
              className="h-0 w-0 opacity-0"
            />
          </label>
          {CORES.map((c) => (
            <button
              key={c.valor}
              type="button"
              title={c.nome}
              disabled={salvando}
              onClick={() =>
                gravar({ cor: no.cor === c.valor ? null : c.valor })
              }
              style={{ background: c.valor }}
              className={clsx(
                "h-[19px] w-[19px] rounded-[5px] border border-white/20",
                no.cor === c.valor && "outline outline-2 outline-white",
              )}
            />
          ))}
        </div>
      </Linha>

      <Linha rotulo="Contorno">
        <Segmentado
          opcoes={[
            ["solido", "Sólido"],
            ["tracejado", "Tracejado"],
            ["nenhum", "Nenhum"],
          ]}
          valor={no.contorno}
          onEscolher={(v) => gravar({ contorno: v as NoBoard["contorno"] })}
          desabilitado={salvando}
        />
      </Linha>

      <Linha rotulo="Tamanho da fonte">
        <Numero
          valor={no.fs}
          padrao={12.5}
          passo={0.5}
          onMudar={(v) => gravar({ fs: v })}
          desabilitado={salvando}
        />
      </Linha>

      <Linha rotulo="Peso">
        <Segmentado
          opcoes={[
            ["400", "Normal"],
            ["600", "Semi"],
            ["800", "Forte"],
          ]}
          valor={no.fw === null ? null : String(no.fw)}
          onEscolher={(v) => gravar({ fw: v === null ? null : Number(v) })}
          desabilitado={salvando}
        />
      </Linha>

      <Linha rotulo="Alinhamento">
        <Segmentado
          opcoes={[
            ["left", "⟵"],
            ["center", "↔"],
            ["right", "⟶"],
          ]}
          valor={no.ta}
          onEscolher={(v) => gravar({ ta: v as NoBoard["ta"] })}
          desabilitado={salvando}
        />
      </Linha>

      <Linha rotulo="Cor do texto">
        <div className="flex gap-1.5">
          {CORES_TXT.map((c) => (
            <button
              key={c}
              type="button"
              disabled={salvando}
              onClick={() => gravar({ corTxt: no.corTxt === c ? null : c })}
              style={{ background: c }}
              className={clsx(
                "h-[19px] w-[19px] rounded-[5px] border border-white/20",
                no.corTxt === c && "outline outline-2 outline-white",
              )}
            />
          ))}
        </div>
      </Linha>
    </div>
  );
}

function Linha({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-fio py-2.5 last:border-none">
      <span className="text-[12px] text-texto-2">{rotulo}</span>
      {children}
    </div>
  );
}

/** Clicar na opção já ativa volta ao padrão — sem botão "limpar" por campo. */
function Segmentado({
  opcoes,
  valor,
  onEscolher,
  desabilitado,
}: {
  opcoes: [string, string][];
  valor: string | null;
  onEscolher: (v: string | null) => void;
  desabilitado?: boolean;
}) {
  return (
    <div className="flex overflow-hidden rounded-[7px] border border-fio">
      {opcoes.map(([v, rotulo]) => (
        <button
          key={v}
          type="button"
          disabled={desabilitado}
          onClick={() => onEscolher(valor === v ? null : v)}
          className={clsx(
            "border-r border-fio px-2.5 py-1.5 text-[10.5px] last:border-none disabled:opacity-50",
            valor === v
              ? "bg-[rgba(78,125,246,.24)] text-white"
              : "text-texto-3 hover:text-texto",
          )}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}

function Numero({
  valor,
  padrao,
  passo,
  onMudar,
  desabilitado,
}: {
  valor: number | null;
  padrao: number;
  passo: number;
  onMudar: (v: number | null) => void;
  desabilitado?: boolean;
}) {
  const atual = valor ?? padrao;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={desabilitado}
        onClick={() => onMudar(Math.max(6, atual - passo))}
        className="h-[26px] w-[22px] rounded-l-[7px] border border-fio text-texto-3 hover:text-texto disabled:opacity-50"
      >
        −
      </button>
      <span
        className={clsx(
          "min-w-[46px] border-y border-fio py-1 text-center text-[11.5px]",
          valor === null ? "text-texto-3" : "text-texto",
        )}
        title={valor === null ? "padrão do tipo" : "editado"}
      >
        {atual}
      </span>
      <button
        type="button"
        disabled={desabilitado}
        onClick={() => onMudar(Math.min(72, atual + passo))}
        className="h-[26px] w-[22px] rounded-r-[7px] border border-fio text-texto-3 hover:text-texto disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}
