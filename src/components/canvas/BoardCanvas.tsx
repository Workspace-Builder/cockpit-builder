"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
  type XYPosition,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import NoDoBoard from "./NoDoBoard";
import { marcarMovimento } from "./movimentoDoBoard";
import Guias from "./Guias";
import { MALHA, MALHA_FORTE, useGuias } from "./useGuias";
import BarraFerramentas, { type Ferramenta } from "./BarraFerramentas";
import {
  criarArestaAction,
  criarNoAction,
  excluirNoAction,
} from "@/app/actions";
import type { ArestaBoard, NoBoard } from "@/lib/model";

// ---------------------------------------------------------------------------
// O canvas
// ---------------------------------------------------------------------------
// Troca ~600 linhas de motor artesanal (pan, zoom, seleção, arrastar,
// conectores, enquadramento) por biblioteca mantida. Precedente na casa: o
// designbuilder2.0 usa @xyflow/react no pipeline-viewer do admin.
//
// As posições vêm do board legado — extraídas do DOM com o motor antigo já
// tendo calculado tudo, não adivinhadas do código. Por isso o desenho nasce
// idêntico, sem recolocar nó na mão.
// ---------------------------------------------------------------------------

const nodeTypes: NodeTypes = { board: NoDoBoard };

/** Swimlane é fundo: fica atrás e não intercepta clique. */
const FUNDO = new Set(["lane"]);

// O ReactFlowProvider subiu pro AppShell: o dock precisa do mesmo contexto pra
// ler e escrever o enquadramento, e ele vive fora do palco.
export default function BoardCanvas({
  nos,
  arestas,
  editando,
  paginaId,
  ferramenta,
  onFerramenta,
  itemSel,
  onItem,
}: {
  nos: NoBoard[];
  arestas: ArestaBoard[];
  editando: boolean;
  paginaId: string;
  ferramenta: Ferramenta;
  onFerramenta: (f: Ferramenta) => void;
  itemSel: string | null;
  onItem: (id: string | null) => void;
}) {
  const { fitView, setViewport, getViewport, screenToFlowPosition } =
    useReactFlow();

  /** de onde o 2× clique partiu, pro Esc saber pra onde voltar */
  const antes = useRef<{ x: number; y: number; zoom: number } | null>(null);

  // Posição de quem foi arrastado nesta sessão.
  //
  // O React Flow trata a prop `nodes` como CONTROLADA: sem `onNodesChange` ele
  // não move nada, por mais que `nodesDraggable` esteja ligado — era esse o
  // motivo de arrastar não funcionar. Guardar só o override (em vez de copiar
  // os 99 nós pro estado) mantém o banco como fonte da verdade e evita ter de
  // ressincronizar por effect a cada revalidação.
  const [movidos, setMovidos] = useState<Record<string, XYPosition>>({});

  // O encaixe mora no hook: ele devolve o `onNodesChange` com a posição já
  // corrigida (grudou no vizinho, ou caiu na malha), as guias a desenhar e o
  // Ctrl+Z. Aqui continua só o registro de quem se mexeu.
  const { guias, onNodesChange, onNodeDragStart, onNodeDragStop, desfazer } =
    useGuias({ nos, editando, movidos, setMovidos });


  const nodes = useMemo<Node[]>(
    () =>
      nos.map((n) => ({
        id: n.id,
        type: "board",
        position: movidos[n.id] ?? { x: n.x, y: n.y },
        width: n.w ?? undefined,
        height: n.h ?? undefined,
        selected: n.id === itemSel,
        selectable: !FUNDO.has(n.tipo),
        draggable: editando && !FUNDO.has(n.tipo),
        zIndex: FUNDO.has(n.tipo) ? 0 : (n.z ?? 1),
        data: { no: n, editando },
      })),
    [nos, itemSel, editando, movidos],
  );

  const edges = useMemo<Edge[]>(
    () =>
      arestas.map((a) => ({
        id: a.id,
        source: a.de,
        target: a.para,
        sourceHandle: `s-${a.ladoDe ?? "b"}`,
        targetHandle: `t-${a.ladoPara ?? "t"}`,
        label: a.rotulo ?? undefined,
        type: "default",
        style: {
          stroke: a.falha ? "rgba(226,61,61,.7)" : "var(--texto-3)",
          strokeWidth: 2.4,
          strokeDasharray: a.tracejada ? "7 6" : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: a.falha ? "rgba(226,61,61,.7)" : "var(--texto-3)",
        },
      })),
    [arestas],
  );

  // O enquadramento NÃO mora mais aqui: quem manda é o AppShell, que chama
  // setViewport direto do clique/tecla. Com dois donos, o efeito daqui
  // disparava no re-render e refazia a animação que o clique já tinha
  // começado — era isso que deixava o dock travado.

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      if (alvo?.isContentEditable) return;

      // Ctrl+Z só existe editando: fora do modo não há o que desfazer, e
      // roubar o atalho do navegador à toa irrita.
      if (editando && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        desfazer();
        return;
      }
      if (e.key !== "Escape" || !antes.current) return;
      void setViewport(antes.current, { duration: 380 });
      antes.current = null;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setViewport, editando, desfazer]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      /* O sinal de "está se movendo" nasce aqui, num lugar só: `onMove` dispara
         a cada quadro de pan/zoom/scroll. Quem assinasse o transform lá embaixo
         re-renderizaria 60×/s — e são 8 peças fazendo isso ao mesmo tempo. */
      onMove={() => marcarMovimento()}
      onMoveEnd={() => marcarMovimento(60)}
      onNodesChange={onNodesChange}
      onNodeClick={(_, n) => onItem(n.id === itemSel ? null : n.id)}
      // 2× clique aproxima no item; Esc devolve de onde veio. Era o que o dock
      // do board legado anunciava, e agora é verdade.
      onNodeDoubleClick={(_, n) => {
        antes.current = getViewport();
        void fitView({ nodes: [{ id: n.id }], padding: 0.35, duration: 380 });
      }}
      onPaneClick={(e) => {
        onItem(null);
        if (!editando || !ferramenta) return;
        // Converte pixel de tela em coordenada de board — sem isso o nó nasce
        // onde o mouse estaria se o canvas nunca tivesse sido movido.
        const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        void criarNoAction(paginaId, ferramenta, p.x, p.y);
        // Volta pra seleção: manter a forma armada faria o próximo clique
        // criar outra que ninguém pediu.
        onFerramenta(null);
      }}
      minZoom={0.05}
      maxZoom={3}
      fitView
      fitViewOptions={{ padding: 0.12 }}
      nodesDraggable={editando}
      // Guarda de onde saiu (pro Ctrl+Z) e grava onde largou. A gravação sai
      // em lote e sem revalidar: o canvas já está certo, e recarregar 99 nós a
      // cada arrasto faria a tela piscar no meio da edição.
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      nodesConnectable={editando}
      onConnect={(c) => {
        if (!c.source || !c.target) return;
        void criarArestaAction(
          paginaId,
          c.source,
          c.target,
          c.sourceHandle?.replace(/^s-/, "") ?? null,
          c.targetHandle?.replace(/^t-/, "") ?? null,
        );
      }}
      // Delete/Backspace apagam, e SÓ editando: fora do modo, apertar Delete
      // lendo o board não pode sumir com um nó pra sempre.
      deleteKeyCode={editando ? ["Delete", "Backspace"] : null}
      onNodesDelete={(apagados) => {
        for (const n of apagados) void excluirNoAction(n.id);
      }}
      elementsSelectable
      /* Sem isto o board mantém os 99 nós no DOM o tempo todo — com todo o
         conteúdo dentro. Medido: 13.979 nós, 186 layouts e 665ms de layout em
         quatro trocas de vista. Renderizando só quem está na viewport, o custo
         passa a acompanhar o que se vê, não o tamanho do documento. */
      onlyRenderVisibleElements
      proOptions={{ hideAttribution: true }}
    >
      {/* O grid só aparece editando — e aí aparece de verdade.
          Fora do modo, o board é pra ler: malha visível ali é ruído sobre o
          desenho. Editando ela inverte de papel e vira o "onde eu estou".

          São duas: a fina dá a unidade em que a caixa para (o mesmo passo do
          encaixe, MALHA); a forte, a cada 5 células, é a que o olho usa pra se
          localizar quando o board está grande. Uma malha só não faz as duas
          coisas — fina demais some, grossa demais não serve de referência. */}
      <Malhas editando={editando} />

      <Guias linhas={guias.linhas} cotas={guias.cotas} />
      <Controls showInteractive={false} className="!bottom-24 !left-3" />
      {/* A barra vive DENTRO do ReactFlow pra ficar sobre o palco, mas fora do
          viewport transformado — senão ela encolheria junto com o zoom. */}
      {editando && (
        <BarraFerramentas ativa={ferramenta} onEscolher={onFerramenta} />
      )}

      {/* Página em branco não pode ser um vazio mudo.
          Antes daqui havia uma maquete tracejada que dizia o que ia ficar em
          cada lugar; virou canvas livre, e o preço foi este: quem cria uma
          página nova não tem como saber que a paleta existe atrás do botão
          Editar. A dica é o que devolve o caminho — e some no primeiro nó. */}
      {nos.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-[46%] z-30 max-w-[42ch] -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-sm font-bold text-texto-2">Página em branco</div>
          <div className="mt-1.5 text-[12.5px] leading-relaxed text-texto-3">
            {editando
              ? "Escolha uma forma na barra à esquerda e clique aqui pra colocar."
              : "Clique em Editar, na barra de baixo, pra abrir as ferramentas."}
          </div>
        </div>
      )}
    </ReactFlow>
  );
}

/**
 * As malhas, isoladas num componente próprio.
 *
 * O grid fino some com o board afastado — e essa decisão depende do zoom, que
 * muda a CADA QUADRO de pan e de scroll. Enquanto ela morava no BoardCanvas,
 * o componente inteiro re-renderizava 60×/s durante todo o movimento, e com
 * ele os 99 nós do board: era daí que vinha o segundo e meio de script em
 * quatro trocas de vista.
 *
 * Aqui o mesmo zoom re-renderiza um componente que devolve duas linhas.
 */
function Malhas({ editando }: { editando: boolean }) {
  const zoom = useStore((s) => s.transform[2]);
  if (!editando)
    return (
      <Background variant={BackgroundVariant.Lines} gap={38} color="rgba(255,255,255,.021)" />
    );
  return (
    <>
      {zoom > 0.5 && (
        <Background
          id="malha-fina"
          variant={BackgroundVariant.Lines}
          gap={MALHA}
          color="rgba(255,255,255,.035)"
        />
      )}
      <Background
        id="malha-forte"
        variant={BackgroundVariant.Lines}
        gap={MALHA * MALHA_FORTE}
        color="rgba(255,255,255,.08)"
      />
    </>
  );
}
