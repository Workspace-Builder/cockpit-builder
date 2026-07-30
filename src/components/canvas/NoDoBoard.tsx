"use client";

import clsx from "clsx";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { tamanhoNoAction } from "@/app/actions";
import type { NoBoard } from "@/lib/model";
import { ANIMACOES } from "./animacoes";
import PortaoDeAnimacao from "./PortaoDeAnimacao";

// ---------------------------------------------------------------------------
// Um nó do board
// ---------------------------------------------------------------------------
// Nó do React Flow é `div`. É por isso que ele foi o motor escolhido: iframe
// vivo e `<canvas>` animado continuam funcionando dentro do nó — o requisito
// que eliminou Excalidraw e canvas 2D na avaliação (BLUEPRINT.md §8).
//
// Um componente só, N formas: o vocabulário é CSS (`globals.css`), então
// acrescentar uma forma é acrescentar uma classe, não um componente.
// ---------------------------------------------------------------------------

const LADOS = [
  ["t", Position.Top],
  ["b", Position.Bottom],
  ["l", Position.Left],
  ["r", Position.Right],
] as const;

/** Formas do fluxograma: rótulo curto dentro da forma. */
const FORMAS = new Set([
  "term",
  "act",
  "doc",
  "reg",
  "in",
  "dec",
  "db",
  "copy",
]);

export type DadosNo = { no: NoBoard; editando?: boolean };

export default function NoDoBoard({ data, selected }: NodeProps) {
  const { no, editando } = data as unknown as DadosNo;

  return (
    <>
      {/* Alças de redimensionar: só editando e só no nó selecionado, senão o
          board vira um campo de quadradinhos. O tamanho vai pro banco quando a
          alça é solta — não a cada pixel. */}
      <NodeResizer
        isVisible={!!editando && !!selected}
        minWidth={40}
        minHeight={28}
        lineClassName="!border-azul"
        handleClassName="!h-2 !w-2 !rounded-sm !border-azul !bg-fundo"
        onResizeEnd={(_, p) => void tamanhoNoAction(no.id, p.width, p.height)}
      />

      {/* Uma âncora de cada tipo por lado. O legado já escolhia lado em vários
          conectores pra a linha não deitar sobre outra — jogar isso fora faria
          o desenho mudar de cara. */}
      {LADOS.map(([lado, pos]) => (
        <div key={lado}>
          <Handle
            type="target"
            id={`t-${lado}`}
            position={pos}
            className="!h-1 !w-1 !border-0 !bg-transparent"
          />
          <Handle
            type="source"
            id={`s-${lado}`}
            position={pos}
            className="!h-1 !w-1 !border-0 !bg-transparent"
          />
        </div>
      ))}

      <Corpo no={no} selecionado={!!selected} />
    </>
  );
}

function Corpo({ no, selecionado }: { no: NoBoard; selecionado: boolean }) {
  const anel = selecionado ? "outline outline-2 outline-azul" : "";

  if (FORMAS.has(no.tipo)) {
    const conteudo = (
      // `whitespace-pre-line`: o rótulo do Figma quebra em duas linhas, e a
      // quebra veio do legado como \n. Sem isto as palavras grudam.
      <span className="whitespace-pre-line">{no.txt}</span>
    );
    const classe = clsx("fx", `fx-${no.tipo}`, !no.url && "todo", anel);

    // Estilo do inspetor (migration 007).
    //
    // Campo nulo vira `undefined`, não uma propriedade CSS vazia — é isso que
    // faz quem nunca foi editado continuar herdando o vocabulário `fx-*`
    // inteiro. Gravar `null` no inspetor é, literalmente, voltar ao padrão.
    const estilo: React.CSSProperties = {
      background: no.cor ?? undefined,
      color: no.corTxt ?? undefined,
      fontSize: no.fs ? `${no.fs}px` : undefined,
      fontWeight: no.fw ?? undefined,
      textAlign: no.ta ?? undefined,
      outline:
        no.contorno === "nenhum"
          ? "none"
          : no.contorno
            ? `1.5px ${no.contorno === "tracejado" ? "dashed" : "solid"} currentColor`
            : undefined,
      outlineOffset:
        no.contorno && no.contorno !== "nenhum" ? "2px" : undefined,
    };

    return no.url ? (
      <a
        href={no.url}
        target="_blank"
        rel="noreferrer"
        className={classe}
        style={estilo}
        data-go="1"
        title={no.url}
      >
        {conteudo}
        <span className="go">↗</span>
      </a>
    ) : (
      <div className={classe} style={estilo} title="link ainda não mapeado">
        {conteudo}
      </div>
    );
  }

  if (no.tipo === "lane") {
    return (
      <div className={clsx("fx fx-lane", anel)}>
        <span className="ll">{no.txt}</span>
      </div>
    );
  }

  if (no.tipo === "anim") {
    const Anim = no.comp ? ANIMACOES[no.comp] : undefined;
    if (!Anim) return <Reservado nome={no.comp ?? "animação"} />;
    // Nunca renderize a animação direto: são 8 no board, cada uma com o próprio
    // requestAnimationFrame. O portão desmonta as que não estão sendo vistas.
    return (
      <PortaoDeAnimacao
        Anim={Anim}
        largura={no.w ?? 400}
        altura={no.h ?? 300}
        nome={no.comp ?? "animação"}
      />
    );
  }

  if (no.tipo === "shot") {
    return (
      <figure className={clsx("fxshot m-0 flex h-full w-full flex-col", anel)}>
        {no.txt && (
          <span className="flex-none border-b border-fio px-2.5 py-1.5 text-[10px] font-semibold text-texto-2">
            {no.txt}
          </span>
        )}
        {no.img && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={no.img}
            alt={no.txt ?? ""}
            loading="lazy"
            className="min-h-0 flex-1 object-cover object-top"
          />
        )}
        {/* A legenda diz o que o print prova — é conteúdo, não rodapé. */}
        {no.legenda && (
          <figcaption className="flex-none border-t border-fio px-2.5 py-1.5 font-mono text-[9px] leading-snug text-texto-3">
            {no.legenda}
          </figcaption>
        )}
      </figure>
    );
  }

  if (no.tipo === "iframe" || no.tipo === "video") {
    // O conteúdo veio do legado já montado (janela, barra, proporção). Ver
    // nota sobre `html` na migration 003.
    return (
      <div
        className={clsx("h-full w-full", anel)}
        dangerouslySetInnerHTML={{ __html: no.html ?? "" }}
      />
    );
  }

  // texto
  return (
    <div
      className={clsx("h-full w-full", anel)}
      dangerouslySetInnerHTML={{ __html: no.html ?? no.txt ?? "" }}
    />
  );
}

/** Nó animado ainda não portado — aparece tracejado, como todo espaço reservado. */
function Reservado({ nome }: { nome: string }) {
  return (
    <div className="grid h-full w-full place-items-center rounded-xl border border-dashed border-fio-2 bg-painel/40 px-4 text-center">
      <span>
        <b className="block text-[12px] font-bold text-texto-2">{nome}</b>
        <span className="text-[10.5px] text-texto-3">animação a portar</span>
      </span>
    </div>
  );
}
