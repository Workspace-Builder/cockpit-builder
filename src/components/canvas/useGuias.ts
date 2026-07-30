"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
  movidos,
  setMovidos,
}: {
  nos: NoBoard[];
  editando: boolean;
  movidos: Record<string, XYPosition>;
  setMovidos: (
    f: (antes: Record<string, XYPosition>) => Record<string, XYPosition>,
  ) => void;
}) {
  const { getNodes } = useReactFlow();
  const [guias, setGuias] = useState<Guias>(SEM_GUIAS);
  const zoom = useStore((s) => s.transform[2]);

  /** o `movidos` de antes de cada arrasto — a pilha do Ctrl+Z */
  const historico = useRef<Record<string, XYPosition>[]>([]);

  // Onde cada nó estava quando a página carregou. É o que o desfazer precisa
  // pra nó que sai do override: `movidos` guarda só quem se mexeu, então sem
  // isto não haveria como saber pra onde ele volta.
  const origem = useMemo(
    () => new Map(nos.map((n) => [n.id, { x: n.x, y: n.y }])),
    [nos],
  );

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

      setMovidos((antes) => {
        const novo = { ...antes };
        for (const p of posicoes) {
          if (p.type === "position" && p.position) novo[p.id] = p.position;
        }
        return novo;
      });
    },
    [editando, getNodes, zoom, guias, setMovidos],
  );

  /** Antes de mover, guarda de onde saiu — senão não há pra onde voltar. */
  const onNodeDragStart = useCallback(() => {
    historico.current.push({ ...movidos });
    // 50 passos: fundo suficiente pra uma sessão de organização, e raso o
    // bastante pra não segurar cópia do board sem limite na memória.
    if (historico.current.length > 50) historico.current.shift();
  }, [movidos]);

  /** Soltou: some com as guias e grava. `arrastados` traz a seleção inteira. */
  const onNodeDragStop = useCallback(
    (_e: unknown, no: Node, arrastados: Node[]) => {
      setGuias(SEM_GUIAS);
      const lista = arrastados.length ? arrastados : [no];
      gravar(lista.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y })));
    },
    [gravar],
  );

  /**
   * Ctrl+Z: volta o `movidos` pro estado anterior ao último arrasto e regrava.
   *
   * Regrava DUAS listas, e a segunda é a que não é óbvia: o nó que sai do
   * override volta na tela pra posição da carga, mas no banco continua a
   * posição arrastada. Sem gravar a volta dele, o desfazer sumiria no F5.
   */
  const desfazer = useCallback(() => {
    const anterior = historico.current.pop();
    if (!anterior) return;

    const saindo = Object.keys(movidos).filter((id) => !(id in anterior));
    setMovidos(() => anterior);

    gravar([
      ...Object.entries(anterior).map(([id, p]) => ({ id, x: p.x, y: p.y })),
      ...saindo.flatMap((id) => {
        const o = origem.get(id);
        return o ? [{ id, x: o.x, y: o.y }] : [];
      }),
    ]);
  }, [movidos, origem, gravar, setMovidos]);

  return { guias, onNodesChange, onNodeDragStart, onNodeDragStop, desfazer };
}
