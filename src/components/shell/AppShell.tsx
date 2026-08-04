"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import BarraLateral from "./BarraLateral";
import TopoPagina from "./TopoPagina";
import Dock from "./Dock";
import Palco from "@/components/palco/Palco";
import { useUiStore } from "@/stores/useUiStore";
import { ID_OBRA, ID_MOTOR } from "@/lib/passos";
import { useParametroDaUrl } from "@/lib/useParametroDaUrl";
import { PODE_EDITAR } from "@/lib/modo";
import type {
  ArestaBoard,
  GavetasDaPagina,
  GrupoArvore,
  NoBoard,
  Oitenta,
  Pagina,
  Pasta,
  Passo,
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
  /** Vazio fora da Obra — é a única página que desenha entregável. */
  oitentaVinte: Oitenta;
  passos: Passo[];
  /** As abas e itens de cada nó, por id de nó. */
  gavetas: GavetasDaPagina;
};

/** O provider fica fora pra o miolo poder usar `useReactFlow()`. */
export default function AppShell(props: Props) {
  return (
    <ReactFlowProvider>
      <Miolo {...props} />
    </ReactFlowProvider>
  );
}

function Miolo({
  arvore,
  pagina,
  pasta,
  nos,
  arestas,
  oitentaVinte,
  passos,
  gavetas,
}: Props) {
  // `?v=` e `?andar=` vinham resolvidos do servidor até 2026-08-03. Agora são
  // lidos aqui: na build estática não existe requisição pra ler query, então a
  // única leitura possível é a do navegador. Ver `lib/usarQuery.ts`.
  const vDaUrl = useParametroDaUrl("v");
  const andarInicial = useParametroDaUrl("andar") ?? undefined;
  const recolhida = useUiStore((s) => s.recolhida);

  const [vista, setVista] = useState(0);
  const [itemSel, setItemSel] = useState<string | null>(null);
  /* No store, não aqui: esta casca remonta a cada troca de página (`key={id}`
     na rota), e um `useState` desligaria a edição no meio do trabalho — o que
     fazia colar em outra tela não funcionar, calado. Ver `useUiStore`. */
  const querEditar = useUiStore((s) => s.editando);
  const setQuerEditar = useUiStore((s) => s.setEditando);
  const [ferramenta, setFerramenta] =
    useState<import("@/components/canvas/BarraDeEdicao").Ferramenta>(null);

  /**
   * O modo de edição, travado na ORIGEM.
   *
   * Não basta esconder o botão que liga: enquanto `editando` fosse o estado
   * cru, qualquer caminho que o ligasse (uma tecla nova, um componente que
   * chame `onEditando`, um `setState` de outro lugar amanhã) devolveria a
   * barra de ferramentas pro aluno. Com o `&&` aqui, TODO consumidor —
   * canvas, dock, gaveta — recebe `false` na build publicada, e o bundler
   * ainda poda o ramo por ser constante de build.
   */
  const editando = PODE_EDITAR && querEditar;
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

  /* O `?v=` chega DEPOIS da hidratação — antes dela `usarQuery` devolve null,
     porque o HTML foi assado no build e não conhece a query de ninguém. Este é
     o "ajustar estado quando a entrada muda" da documentação do React, feito no
     RENDER e não num effect: effect com setState renderiza duas vezes e o lint
     da casa barra. Mesmo padrão do `faseDosAbertos` no Motor de Tijolos.

     O guarda é `aplicado !== vDaUrl`, não `vista !== n`: sem ele, trocar de
     checkpoint pelo dock seria desfeito no render seguinte, porque a URL ainda
     carregaria o valor antigo por um instante. Comparar o que JÁ FOI APLICADO
     deixa o clique do dock mandar mais que a query. */
  const [vAplicado, setVAplicado] = useState<string | null>(null);
  if (vAplicado !== vDaUrl) {
    setVAplicado(vDaUrl);
    const n = Number(vDaUrl);
    if (Number.isInteger(n) && n > 0 && n < pagina.vistas.length) setVista(n);
  }

  // Teclas 1-9 vão pro checkpoint · Esc fecha a gaveta, depois larga o item.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      // `contentEditable` também é campo. Sem esta linha, digitar um dígito no
      // nome de um item da gaveta pulava pro checkpoint daquele número — o
      // BoardCanvas já filtrava, este handler não.
      if (alvo?.isContentEditable) return;
      if (e.key === "Escape") {
        // Uma camada por vez, da mais externa pra dentro: com a gaveta aberta
        // por cima, Esc que largasse a seleção lá atrás não teria efeito visível.
        if (useUiStore.getState().gaveta) {
          return useUiStore.getState().setGaveta(false);
        }
        return setItemSel(null);
      }
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
    // `h-dvh`, não `h-screen`: 100vh no celular ignora a barra de endereço, que
    // aparece e some com o scroll — e o dock, ancorado no rodapé, passava parte
    // do tempo atrás dela. `w-full` porque `w-screen` inclui a barra de rolagem
    // e gera vazamento horizontal de alguns px por conta própria.
    <div
      className="flex h-dvh w-full overflow-hidden"
      // `--w-lateral-atual` é a largura REAL da coluna no desktop — o Dock lê
      // ela pro próprio max-width (Dock.tsx). `--w-lateral` (sem "-atual")
      // continua fixa em 288px: é o que a gaveta do celular usa, e ela abre
      // cheia mesmo com a coluna recolhida — recolher é conceito só de lg+.
      style={{ ["--w-lateral-atual" as string]: recolhida ? "64px" : "288px" }}
    >
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
          oitentaVinte={oitentaVinte}
          passos={passos}
          gavetas={gavetas}
          andarInicial={andarInicial}
        />
      </div>

      {/* O dock não entra na Obra. Ele fala de canvas — checkpoint de
          enquadramento, modo de arrastar item, "2× clique: zoom no item" — e a
          Obra não tem canvas: tem câmera própria, comandada pela barra dos
          pilares no alto da tela. Ficava por cima das placas dos prédios
          prometendo um zoom que não existe ali. */}
      {pagina.id !== ID_OBRA && pagina.id !== ID_MOTOR && (
        <Dock
          pagina={pagina}
          vista={vista}
          onVista={irParaVista}
          editando={editando}
          onEditando={setQuerEditar}
        />
      )}
    </div>
  );
}
