"use client";

import { ViewportPortal, useStore } from "@xyflow/react";
import type { Cota, LinhaGuia } from "./alinhamento";

// ---------------------------------------------------------------------------
// O desenho das guias
// ---------------------------------------------------------------------------
// `ViewportPortal` põe os filhos DENTRO do viewport transformado: aqui se
// escreve em coordenadas de fluxo e o pan/zoom vem de graça, sem converter
// nada na mão.
//
// O preço disso é que o zoom escala tudo junto — e linha de guia com 4px de
// espessura porque o board está ampliado não é guia, é borrão. Por isso todo
// tamanho de traço e de texto aqui é dividido pelo zoom: na tela, a espessura
// fica constante, que é como Figma e Canva se comportam.
//
// Vermelho = alinhamento (com quem você encostou). Azul = medida (o vão).
// ---------------------------------------------------------------------------

export default function Guias({
  linhas,
  cotas,
}: {
  linhas: LinhaGuia[];
  cotas: Cota[];
}) {
  const zoom = useStore((s) => s.transform[2]);
  if (!linhas.length && !cotas.length) return null;

  /** 1px de tela, em coordenadas de fluxo */
  const px = 1 / zoom;

  return (
    <ViewportPortal>
      <div className="pointer-events-none absolute left-0 top-0">
        {linhas.map((l) => (
          <div
            key={`${l.eixo}-${l.pos}-${l.de}`}
            className="absolute bg-vermelho"
            style={
              l.eixo === "v"
                ? {
                    left: l.pos,
                    top: l.de,
                    width: px,
                    height: l.ate - l.de,
                    // a linha nasce centrada na posição, não ao lado dela
                    transform: `translateX(${-px / 2}px)`,
                  }
                : {
                    left: l.de,
                    top: l.pos,
                    height: px,
                    width: l.ate - l.de,
                    transform: `translateY(${-px / 2}px)`,
                  }
            }
          />
        ))}

        {cotas.map((c) => (
          <Medida key={`${c.eixo}-${c.de}-${c.transversal}`} cota={c} px={px} zoom={zoom} />
        ))}
      </div>
    </ViewportPortal>
  );
}

/**
 * Uma cota: o traço do vão, os dois ferrolhos nas pontas e o número.
 *
 * O número é o que o pedido chamava de "mostrar quanto é a distância", então
 * ele não pode encolher com o zoom — daí o `scale(1/zoom)` e o tamanho em
 * coordenadas de fluxo. `Math.round`: vão de 47,3128px não ajuda ninguém.
 */
function Medida({ cota, px, zoom }: { cota: Cota; px: number; zoom: number }) {
  const vertical = cota.eixo === "v";
  const meio = (cota.de + cota.ate) / 2;
  /** metade do ferrolho — o risquinho que fecha a cota nas pontas */
  const orelha = 3 * px;

  return (
    <>
      <div
        className="absolute bg-azul"
        style={
          vertical
            ? { left: cota.transversal, top: cota.de, width: px, height: cota.ate - cota.de }
            : { left: cota.de, top: cota.transversal, height: px, width: cota.ate - cota.de }
        }
      />
      {[cota.de, cota.ate].map((ponta) => (
        <div
          key={ponta}
          className="absolute bg-azul"
          style={
            vertical
              ? {
                  left: cota.transversal - orelha,
                  top: ponta,
                  width: orelha * 2,
                  height: px,
                }
              : {
                  left: ponta,
                  top: cota.transversal - orelha,
                  height: orelha * 2,
                  width: px,
                }
          }
        />
      ))}
      <div
        className="absolute rounded-[3px] bg-azul px-[5px] py-[1px] font-mono text-[11px] font-semibold leading-[15px] text-white"
        style={{
          left: vertical ? cota.transversal : meio,
          top: vertical ? meio : cota.transversal,
          transform: `translate(-50%, -50%) scale(${1 / zoom})`,
        }}
      >
        {Math.round(cota.ate - cota.de)}
      </div>
    </>
  );
}
