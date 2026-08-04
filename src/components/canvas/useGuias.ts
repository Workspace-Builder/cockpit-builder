"use client";

import { useCallback, useState } from "react";
import {
  useReactFlow,
  useStore,
  type Node,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import { moverNosAction } from "@/app/actions";
import {
  calcularAlinhamento,
  type Caixa,
  type Cota,
  type LinhaGuia,
} from "./alinhamento";
import type { NoBoard } from "@/lib/model";

// ---------------------------------------------------------------------------
// O encaixe durante o arrasto
// ---------------------------------------------------------------------------
// Este hook fica ENTRE o React Flow e o `movidos` do canvas: recebe as
// mudanças de posição cruas (onde o mouse está), corrige pra onde a caixa
// deve grudar e diz quais guias desenhar. Quem guarda a posição continua
// sendo o canvas — aqui não mora estado de board, só o de arrasto.
//
// Por que o snap a OBJETO vem antes do snap à MALHA: "centralizar com o de
// cima" é alinhar centro com centro, e o centro de outro nó quase nunca cai
// na malha. Com a ordem invertida, a malha venceria e o alinhamento que
// interessa nunca aconteceria.
//
// O QUE NÃO FAZ, pra não parecer esquecimento: arrastar vários nós de uma vez
// move e grava, mas sem guias. Com N caixas não existe "a" caixa de
// referência, e eleger uma dá um encaixe que mente sobre o que vai acontecer.
// ---------------------------------------------------------------------------

/** distância de encaixe, em PIXELS DE TELA — dividida pelo zoom no uso */
const TOLERANCIA = 6;

/**
 * O passo da malha. É o mesmo número que o `<Background>` desenha: se o grid
 * mostrasse 20 e a caixa parasse de 10 em 10, metade das paradas cairia fora
 * da linha visível — e um grid que mente sobre onde a coisa para é pior que
 * nenhum.
 */
export const MALHA = 20;

/** a cada quantas células vem a linha forte — a referência de "onde estou" */
export const MALHA_FORTE = 5;

type Guias = { linhas: LinhaGuia[]; cotas: Cota[] };
const SEM_GUIAS: Guias = { linhas: [], cotas: [] };

function caixaDe(n: Node): Caixa {
  return {
    id: n.id,
    x: n.position.x,
    y: n.position.y,
    // `measured` é o tamanho real depois de renderizado. Vem de `getNodes()`,
    // não do array montado no canvas: aquele é recriado a cada render e nasce
    // sem medição, o que daria caixa de altura 0 e alinhamento pelo topo só.
    w: n.measured?.width ?? (typeof n.width === "number" ? n.width : 0),
    h: n.measured?.height ?? (typeof n.height === "number" ? n.height : 0),
  };
}

export function useGuias({
  nos,
  editando,
  setMovidos,
}: {
  nos: NoBoard[];
  editando: boolean;
  setMovidos: (
    f: (antes: Record<string, XYPosition>) => Record<string, XYPosition>,
  ) => void;
}) {
  const { getNodes } = useReactFlow();
  const [guias, setGuias] = useState<Guias>(SEM_GUIAS);
  const zoom = useStore((s) => s.transform[2]);

  /* O Ctrl+Z SAIU DAQUI em 2026-08-03.
     Havia uma pilha de `movidos` neste hook, e ela desfazia só POSIÇÃO — não
     cobria colar, criar, excluir nem gaveta, e morria ao trocar de página
     (era `useRef`). Hoje quem desfaz é o servidor, restaurando a cópia
     anterior do JSON da página (`lib/historico.ts`): um mecanismo só, que
     cobre toda operação e sobrevive ao F5. Manter os dois seria ter duas
     verdades sobre "o que era antes". */

  // A página é a mesma pra todos os nós; ler do primeiro evita arrastar o id
  // por Palco e AppShell só pra chegar aqui.
  const paginaId = nos[0]?.paginaId ?? null;

  const gravar = useCallback(
    (posicoes: { id: string; x: number; y: number }[]) => {
      if (!paginaId || !posicoes.length) return;
      // Sem await: a tela já está certa e o retorno não muda nada nela. Se
      // falhar, o console diz — e o F5 mostra a verdade do banco.
      void moverNosAction(paginaId, posicoes).catch((e) =>
        console.error("não gravou a posição dos nós", e),
      );
    },
    [paginaId],
  );

  const onNodesChange = useCallback(
    (mudancas: NodeChange<Node>[]) => {
      const posicoes = mudancas.filter((m) => m.type === "position" && m.position);
      if (!posicoes.length) return;

      const m = posicoes[0];
      const arrastoSimples =
        editando && posicoes.length === 1 && m.type === "position" && m.dragging;

      if (arrastoSimples && m.type === "position" && m.position) {
        const todos = getNodes();
        const alvo = todos.find((n) => n.id === m.id);
        if (alvo) {
          const caixa = { ...caixaDe(alvo), x: m.position.x, y: m.position.y };
          const refs = todos.filter((n) => n.id !== m.id).map(caixaDe);
          const al = calcularAlinhamento(caixa, refs, TOLERANCIA / zoom);

          // Mutar a mudança ANTES de guardar é o que faz a caixa grudar: o
          // canvas registra a posição corrigida, não a do mouse.
          m.position.x = al.x ?? Math.round(m.position.x / MALHA) * MALHA;
          m.position.y = al.y ?? Math.round(m.position.y / MALHA) * MALHA;
          setGuias({ linhas: al.linhas, cotas: al.cotas });
        }
      } else if (guias.linhas.length || guias.cotas.length) {
        // Some com as guias em qualquer coisa que não seja arrasto de um nó só
        // — inclusive no `dragging: false` que fecha o arrasto.
        setGuias(SEM_GUIAS);
      }

      // Comparar antes de gravar: um objeto novo com os MESMOS números ainda é
      // estado novo pro React, e o `movidos` alimenta os nós do canvas. Sem
      // esta guarda, uma mudança de posição que não move nada (o React Flow
      // emite algumas) rebobinava o board inteiro à toa. Ver a nota longa em
      // `aoMudarNos` (BoardCanvas): é o mesmo laço, pela outra porta.
      setMovidos((antes) => {
        let mudou = false;
        const novo = { ...antes };
        for (const p of posicoes) {
          if (p.type !== "position" || !p.position) continue;
          const atual = antes[p.id];
          if (atual && atual.x === p.position.x && atual.y === p.position.y) continue;
          novo[p.id] = p.position;
          mudou = true;
        }
        return mudou ? novo : antes;
      });
    },
    [editando, getNodes, zoom, guias, setMovidos],
  );

  /** Soltou: some com as guias e grava. `arrastados` traz a seleção inteira. */
  const onNodeDragStop = useCallback(
    (_e: unknown, no: Node, arrastados: Node[]) => {
      setGuias(SEM_GUIAS);
      const lista = arrastados.length ? arrastados : [no];
      gravar(lista.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y })));
    },
    [gravar],
  );

  return { guias, onNodesChange, onNodeDragStop };
}
