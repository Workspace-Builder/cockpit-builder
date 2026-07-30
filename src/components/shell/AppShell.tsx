"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import BarraLateral from "./BarraLateral";
import TopoPagina from "./TopoPagina";
import PainelDetalhes from "./PainelDetalhes";
import Dock from "./Dock";
import Palco from "@/components/palco/Palco";
import type {
  ArestaBoard,
  GrupoArvore,
  NoBoard,
  Pagina,
  Pasta,
} from "@/lib/model";

// ---------------------------------------------------------------------------
// A casca
// ---------------------------------------------------------------------------
// A barra lateral saiu: a navegação inteira mora na barra flutuante de baixo,
// que carrega os dois níveis — página (popover da árvore) e tela (checkpoints).
// A regra que sobrou é a mesma: qual página está aberta vem da ROTA, então
// deep-link e o ← do navegador funcionam sem estado duplicado.
//
// `vista` nasce da query `?v=<n>`, lida no servidor. Trocar de checkpoint
// reescreve a URL com replaceState — a tela entra no link, não no histórico:
// senão o ← viraria "desfazer zoom" em vez de "voltar pra página anterior".
// ---------------------------------------------------------------------------

type Props = {
  arvore: GrupoArvore[];
  pagina: Pagina;
  pasta: Pasta;
  nos: NoBoard[];
  arestas: ArestaBoard[];
  vistaInicial: number;
};

/** O provider fica fora pra o miolo poder usar `useReactFlow()`. */
export default function AppShell(props: Props) {
  return (
    <ReactFlowProvider>
      <Miolo {...props} />
    </ReactFlowProvider>
  );
}

function Miolo({ arvore, pagina, pasta, nos, arestas, vistaInicial }: Props) {
  const [vista, setVista] = useState(vistaInicial);
  const [itemSel, setItemSel] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [ferramenta, setFerramenta] =
    useState<import("@/components/canvas/BarraFerramentas").Ferramenta>(null);
  const { setViewport, fitView } = useReactFlow();

  /** quando o último enquadramento começou — detecta tecla repetida */
  const ultimo = useRef(0);

  /**
   * Leva a tela até o checkpoint na hora, sem passar por render.
   *
   * É o `animateView` do board legado (index.html §1436), que fazia três
   * coisas: interrompia a animação anterior, partia de ONDE A TELA ESTÁ, e não
   * passava por render nenhum. O `setViewport` do React Flow já cobre as duas
   * primeiras — a transição do d3 interrompe a anterior e parte do transform
   * atual. O que faltava era a terceira: isto corria por
   * `setState → re-render → effect`, e era essa ida e volta que travava o
   * teclado quando você apertava várias teclas seguidas.
   *
   * Apertar de novo no meio da animação encurta a próxima — spam de tecla vira
   * navegação instantânea, como no HTML.
   */
  const enquadrar = useCallback(
    (i: number) => {
      const agora = performance.now();
      const seguido = agora - ultimo.current < 450;
      ultimo.current = agora;
      const duration = seguido ? 130 : 600;

      const v = pagina.vistas[i];
      if (v && v.x !== null && v.y !== null && v.zoom !== null) {
        void setViewport({ x: v.x, y: v.y, zoom: v.zoom }, { duration });
      } else {
        void fitView({ padding: 0.12, duration });
      }
    },
    [pagina.vistas, setViewport, fitView],
  );

  const irParaVista = useCallback(
    (i: number) => {
      if (i < 0 || i >= pagina.vistas.length) return;
      // A tela anda PRIMEIRO; o estado (destaque do botão e URL) vem depois e
      // não segura a animação.
      enquadrar(i);
      setVista(i);
      const url = new URL(window.location.href);
      if (i > 0) url.searchParams.set("v", String(i));
      else url.searchParams.delete("v");
      window.history.replaceState(null, "", url.pathname + url.search);
    },
    [pagina.vistas.length, enquadrar],
  );

  // Teclas 1-9 vão pro checkpoint · Esc larga o item selecionado.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      if (e.key === "Escape") return setItemSel(null);
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= pagina.vistas.length) {
        irParaVista(n - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pagina.vistas.length, irParaVista]);

  return (
    // O provider sobe até aqui: o dock precisa ler e escrever o enquadramento
    // do canvas (getViewport/setViewport) e vive fora do palco.
    <div className="flex h-screen w-screen overflow-hidden">
      <BarraLateral arvore={arvore} ativaId={pagina.id} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopoPagina pagina={pagina} pasta={pasta} />
        <Palco
          pagina={pagina}
          nos={nos}
          arestas={arestas}
          editando={editando}
          ferramenta={ferramenta}
          onFerramenta={setFerramenta}
          itemSel={itemSel}
          onItem={setItemSel}
        />
      </div>

      {/* O painel lê o nó de verdade, não um placeholder fixo. */}
      <PainelDetalhes no={nos.find((n) => n.id === itemSel) ?? null} />

      <Dock
        pagina={pagina}
        vista={vista}
        onVista={irParaVista}
        editando={editando}
        onEditando={setEditando}
      />
    </div>
  );
}
