"use client";

import { memo, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
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

export type DadosNo = {
  no: NoBoard;
  editando?: boolean;
  /** o nó tem algum item na gaveta — é o que decide o contorno tracejado */
  temConteudo?: boolean;
  /**
   * Persiste os tamanhos dos gestos feitos nas alças ou pelas setas.
   *
   * Recebe o `id` porque a função em si é a MESMA referência pros 137 nós —
   * é o `redimensionarNo` já memoizado do canvas, não uma arrow fechada por
   * nó. Fechar uma por nó (`() => redimensionarNo(n.id, ...)`) quebrava a
   * estabilidade de `data` a cada render e anulava qualquer memo.
   */
  aoRedimensionar?: (
    id: string,
    largura: number,
    altura: number,
    x?: number,
    y?: number,
  ) => void;
};

function NoDoBoardBase({ data, selected }: NodeProps) {
  const { no, editando, temConteudo, aoRedimensionar } = data as unknown as DadosNo;

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
        lineStyle={{ borderWidth: 2 }}
        handleClassName="!h-3 !w-3 !rounded-[4px] !border-2 !border-fundo !bg-azul shadow-[0_0_0_1px_rgba(78,125,246,.7)]"
        handleStyle={{ width: 12, height: 12 }}
        onResizeEnd={(_, p) => aoRedimensionar?.(no.id, p.width, p.height, p.x, p.y)}
      />

      {/* Uma âncora por lado — não duas. Chegou a ter uma `target` e uma
          `source` empilhadas no mesmo ponto (pro lado servir de origem OU
          destino), mas o React Flow escolhe o alvo de uma conexão pelo
          elemento que está por cima daquele pixel, e as duas ocupavam o
          MESMO pixel: a de cima vencia sempre, não importa qual o gesto
          precisava. Com `connectionMode="loose"` (BoardCanvas) um handle só,
          de qualquer tipo, serve pros dois sentidos — sem colisão porque só
          existe UM elemento ali. O `id` (t/b/l/r puro, sem prefixo) é o que
          vira `ladoDe`/`ladoPara` direto, sem precisar tirar `t-`/`s-` depois.

          SEMPRE existem, editando ou não — o React Flow lê a posição do
          handle no DOM pra desenhar a seta, então tirar o elemento fora do
          modo de edição derruba TODA seta da página (foi exatamente o que
          aconteceu ao gatear isto por `editando`: as 44 setas desta página
          sumiam fora do modo Editar, porque não havia em que ancorar).
          `nodesConnectable` no BoardCanvas já barra a interação fora do modo;
          o hover-reveal em `.react-flow__handle` no globals.css é que fica
          restrito a editando, pela classe no `<ReactFlow>`. */}
      {LADOS.map(([lado, pos]) => (
        <Handle key={lado} type="source" id={lado} position={pos} />
      ))}

      <Corpo no={no} selecionado={!!selected} temConteudo={!!temConteudo} />
    </>
  );
}

/**
 * Memoizado: são 137 instâncias no board da esteira, e sem isto qualquer
 * mudança de estado no canvas (arrastar UM nó, selecionar UM nó) re-renderiza
 * as 137. Só funciona porque `data` no BoardCanvas agora reaproveita o mesmo
 * objeto quando nada daquele nó específico mudou — ver o cache em
 * `BoardCanvas.tsx`.
 */
const NoDoBoard = memo(NoDoBoardBase);
export default NoDoBoard;

function Corpo({
  no,
  selecionado,
  temConteudo,
}: {
  no: NoBoard;
  selecionado: boolean;
  temConteudo: boolean;
}) {
  const anel = selecionado ? "outline outline-2 outline-azul" : "";

  /**
   * Som do vídeo — estado do React, não só um `.muted = false` na hora do
   * clique. O conteúdo do vídeo é HTML cru (`dangerouslySetInnerHTML`), e
   * qualquer re-render deste nó (por exemplo, selecionar/desselecionar, que
   * já muda a classe do `anel`) faz o React recriar aquele pedaço do DOM —
   * o `<video>` some e entra outro no lugar, sempre com o `muted` do HTML
   * original. Guardar em `useState` e reaplicar em todo render (`useEffect`
   * sem lista de dependências) é o que faz o som permanecer ligado depois
   * do clique, não só até o próximo re-render.
   */
  const somRef = useRef<HTMLDivElement>(null);
  const [comSom, setComSom] = useState(false);
  useEffect(() => {
    if (no.tipo !== "video") return;
    const raiz = somRef.current;
    if (!raiz) return;
    const video = raiz.querySelector("video");
    if (!video) return;
    video.muted = !comSom;
    if (comSom) void video.play().catch(() => {});
    const icone = raiz.querySelector(".rmute");
    if (icone) icone.textContent = comSom ? "🔊" : "🔇";
  });

  if (FORMAS.has(no.tipo)) {
    const conteudo = (
      // `whitespace-pre-line`: o rótulo do Figma quebra em duas linhas, e a
      // quebra veio do legado como \n. Sem isto as palavras grudam.
      <span className="whitespace-pre-line">{no.txt}</span>
    );
    // Tracejado = buraco conhecido. Antes olhava `no.url`; agora olha a gaveta,
    // que é onde o destino passou a morar — senão um nó com três entregáveis
    // continuaria desenhado como vazio.
    const classe = clsx("fx", `fx-${no.tipo}`, !temConteudo && "todo", anel);

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
      // Raio SUBSTITUI o do tipo (migration 012). O `term` é pílula por
      // `border-radius: 999px`; sem o `!important` do inline, um raio de 8
      // gravado nele não teria efeito nenhum e pareceria botão quebrado.
      borderRadius: no.raio === null ? undefined : `${no.raio}px`,
      opacity: no.opacidade ?? undefined,
    };

    // O nó NÃO é mais âncora. Clicar nele abre a gaveta, e o destino virou
    // item dela (migration 010). Enquanto era `<a target="_blank">`, clicar
    // levava embora — ou seja, metade dos nós nunca abriria.
    return (
      <div
        className={classe}
        style={estilo}
        title={temConteudo ? undefined : "nada mapeado nesta etapa ainda"}
      >
        {conteudo}
      </div>
    );
  }

  if (no.tipo === "lane") {
    // A faixa também obedece ao estilo do nó (migration 007). O board oficial
    // usa duas espécies de raia: a de APROVAÇÃO, amarela, e a que emoldura um
    // bloco inteiro da esteira, neutra. Sem isto as duas sairiam amarelas — e a
    // do bloco, que é enorme, engoliria a tela de amarelo.
    const estilo: React.CSSProperties = {
      ...(no.cor
        ? { background: no.cor, borderColor: no.cor, color: no.corTxt ?? undefined }
        : {}),
      borderRadius: no.raio === null ? undefined : `${no.raio}px`,
      opacity: no.opacidade ?? undefined,
    };
    return (
      <div className={clsx("fx fx-lane", anel)} style={estilo}>
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
    //
    // Mudo por padrão (o dado já vem `muted`) — sem isso são vários vídeos
    // com `autoplay` na mesma tela, cada um tocando o próprio áudio ao entrar
    // na página. Clique em qualquer ponto do nó liga o som DESTE vídeo; quem
    // aplica de fato é o `useEffect` lá em cima — aqui só marca a intenção.
    return (
      <div
        ref={somRef}
        className={clsx("h-full w-full", anel)}
        dangerouslySetInnerHTML={{ __html: no.html ?? "" }}
        onClick={no.tipo === "video" ? () => setComSom(true) : undefined}
      />
    );
  }

  // texto
  return (
    <div
      className={clsx("h-full w-full", anel)}
      style={{
        color: no.corTxt ?? undefined,
        fontSize: no.fs ? `${no.fs}px` : undefined,
        fontWeight: no.fw ?? undefined,
        textAlign: no.ta ?? undefined,
        opacity: no.opacidade ?? undefined,
      }}
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
