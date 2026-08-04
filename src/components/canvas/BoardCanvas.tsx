"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  ReactFlow,
  SelectionMode,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
  type NodeChange,
  type OnSelectionChangeParams,
  type XYPosition,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import NoDoBoard from "./NoDoBoard";
import { marcarMovimento } from "./movimentoDoBoard";
import Guias from "./Guias";
import { MALHA, MALHA_FORTE, useGuias } from "./useGuias";
import {
  alinhar,
  distribuir,
  type Alinhamento,
  type Distribuicao,
} from "./alinhar";
import BarraDeEdicao, { type Ferramenta } from "./BarraDeEdicao";
import GavetaDoNo from "./GavetaDoNo";
import { caixaDoNo, imagemDoEvento, prepararImagem } from "./colarImagem";
import * as recorte from "./areaTransferencia";
import {
  colarNoCanvasAction,
  colarNosAction,
  criarArestaAction,
  criarNoAction,
  desfazerAction,
  excluirArestaAction,
  excluirNoAction,
  garantirAbasAction,
  moverNosAction,
  tamanhoNoAction,
} from "@/app/actions";
import type { ArestaBoard, GavetasDaPagina, NoBoard } from "@/lib/model";

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
  gavetas,
}: {
  nos: NoBoard[];
  arestas: ArestaBoard[];
  editando: boolean;
  paginaId: string;
  ferramenta: Ferramenta;
  onFerramenta: (f: Ferramenta) => void;
  itemSel: string | null;
  onItem: (id: string | null) => void;
  gavetas: GavetasDaPagina;
}) {
  const { fitView, setViewport, getViewport, screenToFlowPosition, getNodes } =
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
  const [tamanhos, setTamanhos] = useState<Record<string, { w: number; h: number }>>({});
  /** Overlay do arrasto de redimensionar EM CURSO — ver `aoMudarNos`. */
  const [dimensoes, setDimensoes] = useState<Record<string, { w: number; h: number }>>({});

  // O encaixe mora no hook: ele devolve o `onNodesChange` com a posição já
  // corrigida (grudou no vizinho, ou caiu na malha), as guias a desenhar e o
  // Ctrl+Z. Aqui continua só o registro de quem se mexeu.
  const { guias, onNodesChange, onNodeDragStop } = useGuias({
    nos,
    editando,
    setMovidos,
  });


  /** Uma seleção, duas superfícies: propriedades na barra, conteúdo na gaveta. */
  const noSel = useMemo(() => {
    const no = nos.find((n) => n.id === itemSel);
    if (!no) return null;
    const tamanho = tamanhos[no.id];
    return tamanho ? { ...no, w: tamanho.w, h: tamanho.h } : no;
  }, [nos, itemSel, tamanhos]);

  const redimensionarNo = useCallback(
    (id: string, largura: number, altura: number, x?: number, y?: number) => {
      const w = Math.max(40, Math.round(largura));
      const h = Math.max(28, Math.round(altura));
      setTamanhos((atuais) => ({ ...atuais, [id]: { w, h } }));
      // O overlay do arrasto em curso não serve mais — `tamanhos` já assumiu.
      setDimensoes((atuais) => {
        if (!(id in atuais)) return atuais;
        const { [id]: _fora, ...resto } = atuais;
        return resto;
      });
      void tamanhoNoAction(id, w, h);
      if (x != null && y != null) {
        void moverNosAction(paginaId, [{ id, x, y }]);
      }
    },
    [paginaId],
  );

  /* Conector selecionado. Estado separado do nó de propósito: os dois nunca
     estão selecionados ao mesmo tempo, e um estado só obrigaria a carregar
     "que espécie é este id" em todo lugar que lê. */
  const [arestaSel, setArestaSel] = useState<string | null>(null);
  const arestaAtual = useMemo(
    () => arestas.find((a) => a.id === arestaSel) ?? null,
    [arestas, arestaSel],
  );

  /**
   * TODOS os nós selecionados agora — inclusive quando é um só.
   *
   * Vem da caixa de seleção (arrastar no palco, editando) ou do clique com
   * Shift. Quem lê: o Ctrl+C, e a barra de alinhar através de `varios`.
   */
  const [selecionados, setSelecionados] = useState<string[]>([]);
  /** quantos itens o último Ctrl+C guardou — só pro aviso, zera sozinho */
  const [copiados, setCopiados] = useState(0);

  /**
   * Precisa ser estável, e precisa comparar antes de gravar.
   *
   * O React Flow re-assina `onSelectionChange` a cada identidade nova do
   * handler — um arrow inline aqui refaz a assinatura em todo render, o
   * handler dispara de novo, e um `[]` recém-criado é sempre "mudou" pro
   * React. Os dois juntos fechavam um laço infinito: com quatro nós e nada
   * selecionado o board já cuspia "Maximum update depth exceeded" sem parar.
   */
  const aoSelecionar = useCallback(({ nodes: sel }: OnSelectionChangeParams) => {
    const ids = sel.map((n) => n.id);
    setSelecionados((atual) =>
      atual.length === ids.length && atual.every((id, i) => id === ids[i])
        ? atual
        : ids,
    );
  }, []);

  /**
   * A barra de alinhar/distribuir só faz sentido a partir de DOIS — alinhar um
   * nó com ele mesmo não é operação.
   *
   * Isto já foi o corte feito lá em cima, no `aoSelecionar`, e era cedo demais:
   * o estado passava a não saber quem estava selecionado quando era um só, e o
   * Ctrl+C — que precisa saber — não copiava nada, calado. Agora o estado
   * guarda a verdade e o corte é DERIVADO, no ponto onde ele vale.
   */
  const varios = useMemo(
    () => (selecionados.length > 1 ? selecionados : []),
    [selecionados],
  );

  /**
   * Alinhar e distribuir. A conta mora em `alinhar.ts`; o que é daqui é a
   * MEDIDA — só `getNodes()` sabe o tamanho real depois de renderizado, e
   * alinhar pela largura declarada erra em todo nó que cresceu com o texto.
   *
   * Grava nos dois lugares: `movidos` move a tela agora, a action persiste.
   * Sem o primeiro, o clique não faria nada visível até o F5.
   */
  const arrumar = useCallback(
    (op: { tipo: "alinhar"; como: Alinhamento } | { tipo: "distribuir"; eixo: Distribuicao }) => {
      const caixas = getNodes()
        .filter((n) => varios.includes(n.id))
        .map((n) => ({
          id: n.id,
          x: n.position.x,
          y: n.position.y,
          w: n.measured?.width ?? 0,
          h: n.measured?.height ?? 0,
        }));
      const novas =
        op.tipo === "alinhar" ? alinhar(caixas, op.como) : distribuir(caixas, op.eixo);
      if (!novas.length) return;
      setMovidos((antes) => {
        const novo = { ...antes };
        for (const p of novas) novo[p.id] = { x: p.x, y: p.y };
        return novo;
      });
      void moverNosAction(paginaId, novas);
    },
    [getNodes, varios, paginaId],
  );

  /**
   * A base: tudo que só muda com edição, conteúdo ou tamanho — não com
   * arrasto nem seleção. `movidos` mexe a cada quadro do mouse e `itemSel`/
   * `varios` a cada clique; deixar os dois fora daqui é o que evita recriar
   * (e, com `NoDoBoard` memoizado, re-renderizar) os 137 nós a cada um dos
   * dois. A posição de repouso e `selected: false` são o placeholder que a
   * camada de baixo sobrescreve só em quem precisa.
   */
  const nodesBase = useMemo<Node[]>(
    () =>
      nos.map((n) => {
        const tamanho = tamanhos[n.id];
        return {
          id: n.id,
          type: "board",
          position: { x: n.x, y: n.y },
          width: tamanho?.w ?? n.w ?? undefined,
          height: tamanho?.h ?? n.h ?? undefined,
          selected: false,
          selectable: !FUNDO.has(n.tipo),
          draggable: editando && !FUNDO.has(n.tipo),
          zIndex: FUNDO.has(n.tipo) ? 0 : (n.z ?? 1),
          // `aoRedimensionar` é o `redimensionarNo` memoizado direto — a MESMA
          // referência pros 137 nós — em vez de uma arrow fechada por nó, que
          // quebraria a estabilidade de `data` a cada render.
          data: {
            no: tamanho ? { ...n, w: tamanho.w, h: tamanho.h } : n,
            editando,
            temConteudo: gavetas[n.id]?.some((a) => a.itens.length) ?? false,
            aoRedimensionar: redimensionarNo,
          },
        };
      }),
    [nos, editando, gavetas, tamanhos, redimensionarNo],
  );

  /**
   * Sobrepõe posição e seleção por cima da base — SEM clonar quem não
   * mudou. Isto roda a cada quadro de arrasto e a cada clique (é o que
   * precisa ser rápido), mas devolve a MESMA referência de `nodesBase` pros
   * nós que não são o alvo daquele momento. Com `NoDoBoard` memoizado, só o(s)
   * nó(s) afetado(s) re-renderiza(m) — não os 137.
   */
  const nodes = useMemo<Node[]>(() => {
    const temMovimento = Object.keys(movidos).length > 0;
    const temResize = Object.keys(dimensoes).length > 0;
    if (!temMovimento && !temResize && itemSel === null && varios.length === 0)
      return nodesBase;

    /* `varios` também entra aqui — não só `itemSel`. Alinhar e distribuir
       MUDAM `movidos` na hora, e sem `varios` aqui o recálculo apagava a
       seleção de caixa no mesmo clique que acabou de usá-la — o segundo
       botão (distribuir, depois de alinhar) não tinha mais seleção nenhuma
       pra agir. */
    const selecionados = new Set(varios.length ? varios : itemSel ? [itemSel] : []);

    return nodesBase.map((node) => {
      const posicao = movidos[node.id];
      // Tamanho do quadro em curso: o mesmo truque de `posicao`, mas pra
      // dimensão — é o que faz a alça arrastar junto em vez de só saltar
      // pro tamanho final quando solta (ver `aoMudarNos`).
      const dimensao = dimensoes[node.id];
      const selecionado = selecionados.has(node.id);
      if (!posicao && !dimensao && node.selected === selecionado) return node;
      return {
        ...node,
        position: posicao ?? node.position,
        width: dimensao?.w ?? node.width,
        height: dimensao?.h ?? node.height,
        selected: selecionado,
      };
    });
  }, [nodesBase, movidos, dimensoes, itemSel, varios]);

  /**
   * O React Flow é controlado: ignorar `dimensions` aqui faz o nó voltar ao
   * tamanho vindo do banco no próximo render. O hook de guias continua dono
   * das mudanças de posição; este complemento cuida só do redimensionamento.
   *
   * `resizing: true` é o ResizeObserver disparando A CADA QUADRO enquanto a
   * alça está sendo arrastada — não só no final. Antes isto era ignorado de
   * propósito e só o `onResizeEnd` gravava (em `tamanhos`, que alimenta os
   * 137 nós de `nodesBase`): comitar a cada quadro ali recalcularia os 137,
   * o main thread engasgava, e a alça não parecia arrastar — o nó ficava
   * parado até soltar e só então saltava pro tamanho final.
   *
   * Agora o quadro em curso vai pro overlay `dimensoes` (o mesmo truque de
   * `movidos` pra posição): sobrescreve SÓ o nó que está sendo arrastado, na
   * mesma passada do `nodes` memo — os outros 136 continuam com a mesma
   * referência. O commit definitivo em `tamanhos` continua só no fim
   * (`onResizeEnd` → `aoRedimensionar`).
   *
   * E COMPARAR ANTES DE GRAVAR não é zelo, é o que fecha um laço infinito.
   * `{...atuais, [id]: {w, h}}` devolve objeto novo mesmo quando a medida é
   * idêntica — estado novo pro React, logo re-render. Como `tamanhos` alimenta
   * `nodesBase`, isso reconstruía os 178 nós, reescrevia o DOM, e o
   * ResizeObserver do próprio React Flow disparava de novo: o board girava
   * sozinho, PARADO, sem ninguém tocar em nada. Medido com MutationObserver:
   * 178 mutações a cada ~25ms, em build de produção. Era daí que vinha o
   * "tudo lagado" e o cursor piscando — o DOM era reescrito 40×/s embaixo do
   * mouse.
   */
  const aoMudarNos = useCallback(
    (mudancas: NodeChange<Node>[]) => {
      onNodesChange(mudancas);
      for (const mudanca of mudancas) {
        if (mudanca.type !== "dimensions" || !mudanca.dimensions) continue;
        const largura = mudanca.dimensions.width;
        const altura = mudanca.dimensions.height;
        if (largura == null || altura == null) continue;
        if (mudanca.resizing) {
          setDimensoes((atuais) => {
            const antes = atuais[mudanca.id];
            if (antes && antes.w === largura && antes.h === altura) return atuais;
            return { ...atuais, [mudanca.id]: { w: largura, h: altura } };
          });
          continue;
        }
        setTamanhos((atuais) => {
          const antes = atuais[mudanca.id];
          if (antes && antes.w === largura && antes.h === altura) return atuais;
          return { ...atuais, [mudanca.id]: { w: largura, h: altura } };
        });
      }
    },
    [onNodesChange],
  );

  const edges = useMemo<Edge[]>(
    () =>
      arestas.map((a) => ({
        id: a.id,
        source: a.de,
        target: a.para,
        // Um handle só por lado agora (ver NoDoBoard) — o id é o lado puro,
        // sem prefixo `t-`/`s-`.
        sourceHandle: a.ladoDe ?? "b",
        targetHandle: a.ladoPara ?? "t",
        label: a.rotulo ?? undefined,
        type: "default",
        /* Conector selecionado engrossa e fica azul. Sem sinal nenhum, clicar
           numa seta abriria a barra do conector sem que desse pra saber QUAL
           seta está sendo editada — com 40 delas no board, isso é adivinhação. */
        selected: a.id === arestaSel,
        style: {
          stroke:
            a.id === arestaSel
              ? "var(--azul)"
              : a.falha
                ? "rgba(226,61,61,.7)"
                : "var(--texto-3)",
          strokeWidth: a.id === arestaSel ? 3.4 : 2.4,
          strokeDasharray: a.tracejada ? "7 6" : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: a.falha ? "rgba(226,61,61,.7)" : "var(--texto-3)",
        },
      })),
    [arestas, arestaSel],
  );

  // O enquadramento NÃO mora mais aqui: quem manda é o AppShell, que chama
  // setViewport direto do clique/tecla. Com dois donos, o efeito daqui
  // disparava no re-render e refazia a animação que o clique já tinha
  // começado — era isso que deixava o dock travado.

  /**
   * Ctrl+V no palco: a print vira um nó `shot`.
   *
   * DIVISÃO COM A GAVETA: quando ela está aberta, o colar é dela — o mesmo
   * gesto lá dentro vira item IMAGEM da aba. A condição aqui é a MESMA que
   * monta o `<GavetaDoNo>` lá embaixo, então os dois nunca respondem ao mesmo
   * evento; mudar uma sem a outra faria a print nascer em dois lugares.
   *
   * `domNode` do store em vez de assinar `transform`: o nó nasce no centro do
   * que se está vendo, e para isso basta o retângulo do palco — lido dentro do
   * handler, não no render. Assinar o transform aqui re-renderizaria o canvas
   * a cada quadro de pan, que é justamente o laço que acabou de sair daqui.
   */
  const palco = useStore((s) => s.domNode);
  const gavetaAberta = !!noSel && !!gavetas[noSel.id]?.length;

  useEffect(() => {
    if (!editando || gavetaAberta || !palco) return;

    async function aoColar(e: ClipboardEvent) {
      const alvo = e.target as HTMLElement | null;
      // Colar dentro de um campo é colar TEXTO, sempre — inclusive quando o
      // que está na área de transferência é imagem.
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      if (alvo?.isContentEditable) return;

      /* DOIS COLARES NO MESMO GESTO, e o desempate tem duas vias porque a
         primeira falha calada.

         1ª — o CARIMBO. O Ctrl+C tenta escrever `MARCA` no clipboard do
              sistema; achado ele, a decisão é certa e ainda apaga a imagem que
              estivesse lá.
         2ª — a HORA. Medido em 03/08: `clipboard.writeText` resolve como
              sucesso e não grava nada (permissão/foco/política, varia por
              navegador). Sem rede de segurança, o Ctrl+V não achava carimbo,
              caía no ramo da imagem e colava uma print velha no lugar dos nós
              — foi exatamente o defeito relatado. Então recorte copiado há
              menos de 5 minutos também ganha.

         Fora dessas duas, imagem ganha: recorte de uma hora atrás não pode
         sequestrar o Ctrl+V de quem acabou de tirar um print.

         Os dois moram no MESMO listener de propósito: em handlers separados,
         um `keydown` de Ctrl+V e um `paste` disparariam os dois pro mesmo
         toque, e a print nasceria junto com os nós. */
      const carimbo = e.clipboardData?.getData("text/plain")?.trim();
      const naGaveta = recorte.ler();
      const guardado =
        carimbo === recorte.MARCA || recorte.recente(naGaveta) ? naGaveta : null;

      const blob = guardado ? null : imagemDoEvento(e);
      if (!blob) {
        if (!guardado) return;
        e.preventDefault();

        // O bloco chega CENTRADO no que se está vendo. `colarNos` ancora pelo
        // canto superior esquerdo, então a metade do tamanho do recorte é
        // descontada aqui — senão colar joga tudo pra baixo e pra direita do
        // centro, e some da tela quando o recorte é grande.
        const xs = guardado.nos.map((n) => n.x);
        const ys = guardado.nos.map((n) => n.y);
        const larg = Math.max(...guardado.nos.map((n) => n.x + (n.w ?? 180))) - Math.min(...xs);
        const alt = Math.max(...guardado.nos.map((n) => n.y + (n.h ?? 64))) - Math.min(...ys);

        const r = palco!.getBoundingClientRect();
        const centro = screenToFlowPosition({
          x: r.x + r.width / 2,
          y: r.y + r.height / 2,
        });
        await colarNosAction(paginaId, guardado, {
          x: centro.x - larg / 2,
          y: centro.y - alt / 2,
        });
        return;
      }
      e.preventDefault();

      try {
        const { dataUrl, largura, altura } = await prepararImagem(blob);
        const { w, h } = caixaDoNo(largura, altura);
        const r = palco!.getBoundingClientRect();
        const p = screenToFlowPosition({
          x: r.x + r.width / 2,
          y: r.y + r.height / 2,
        });
        await colarNoCanvasAction(paginaId, dataUrl, p.x, p.y, w, h);
      } catch (erro) {
        // Sem toast no app: o console é onde os outros erros de gravação já
        // aparecem (ver `useGuias.gravar`), e inventar um só pra este seria
        // uma superfície nova por um caminho que quase não falha.
        console.error("não colou a imagem", erro);
      }
    }

    window.addEventListener("paste", aoColar);
    return () => window.removeEventListener("paste", aoColar);
  }, [editando, gavetaAberta, palco, paginaId, screenToFlowPosition]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      if (alvo?.isContentEditable) return;

      /* Ctrl+Z só existe editando: fora do modo não há o que desfazer, e
         roubar o atalho do navegador à toa irrita.

         QUEM DESFAZ É O SERVIDOR (`lib/historico.ts`), restaurando a cópia
         anterior do JSON da página. A versão antiga desfazia só POSIÇÃO, em
         memória — não cobria colar, criar, excluir nem gaveta, e morria ao
         trocar de página. Custou caro em 03/08: 42 nós alinhados por engano e
         42 colados depois, os dois sem volta pela tela.

         Os overlays locais são zerados ANTES: `movidos`, `tamanhos` e
         `dimensoes` guardam ajustes por cima do que veio do servidor, e sem a
         limpeza eles voltariam a aplicar em cima do estado restaurado — a
         página desfaria no arquivo e continuaria torta na tela. */
      if (editando && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setMovidos({});
        setTamanhos({});
        setDimensoes({});
        void desfazerAction(paginaId);
        return;
      }

      /* Ctrl+C guarda a seleção.
         Quem responde "o que está selecionado" é o React Flow, não `varios`:
         aquele estado só é preenchido a partir de DOIS nós (ver `aoSelecionar`,
         que existe pra barra de alinhar), então pegar a caixa em cima de um nó
         só não copiava nada — e não copiava em silêncio, que é pior.
         `itemSel` entra como reserva pro nó aberto por clique, que nem sempre
         conta como "selecionado" pro React Flow.

         Não chama `preventDefault` quando não há nada: aí o Ctrl+C volta a ser
         o do navegador, copiando o texto que a pessoa marcou. */
      if (editando && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        const ids = selecionados.length
          ? selecionados
          : itemSel
            ? [itemSel]
            : [];
        const r = recorte.recortarDaSelecao(ids, nos, arestas, gavetas, paginaId);
        if (!r) return;
        e.preventDefault();
        recorte.copiar(r);
        /* Carimba o clipboard DO SISTEMA. É o que faz o Ctrl+V saber que o
           gesto mais recente foi copiar nós — e, principalmente, o que APAGA
           de lá uma print antiga que senão seria colada no lugar deles. */
        void navigator.clipboard?.writeText(recorte.MARCA).catch(() => {});
        setCopiados(r.nos.length);
        return;
      }
      if (e.key !== "Escape" || !antes.current) return;
      void setViewport(antes.current, { duration: 380 });
      antes.current = null;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setViewport, editando, selecionados, itemSel, nos, arestas, gavetas, paginaId]);

  /* O aviso do Ctrl+C some sozinho. Ele existe porque colar em OUTRA tela é o
     ponto do recurso, e sem confirmação a pessoa navega achando que não copiou
     — a seleção fica pra trás junto com a página. */
  useEffect(() => {
    if (!copiados) return;
    const t = setTimeout(() => setCopiados(0), 2600);
    return () => clearTimeout(t);
  }, [copiados]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      // Só pra escopar o hover-reveal das âncoras de conexão (globals.css) ao
      // modo de edição — elas continuam existindo fora dele (edges precisam),
      // só não acendem no hover porque não fazem nada ali.
      className={editando ? "a-editar" : undefined}
      /* O sinal de "está se movendo" nasce aqui, num lugar só: `onMove` dispara
         a cada quadro de pan/zoom/scroll. Quem assinasse o transform lá embaixo
         re-renderizaria 60×/s — e são 8 peças fazendo isso ao mesmo tempo. */
      onMove={() => marcarMovimento()}
      onMoveEnd={() => marcarMovimento(60)}
      onNodesChange={aoMudarNos}
      onEdgeClick={(_, e) => {
        onItem(null);
        setSelecionados([]);
        setArestaSel((atual) => (atual === e.id ? null : e.id));
      }}
      /* Delete/Backspace apagam conector também. Antes era impossível: sem
         handler, uma seta ligada errada ficava pra sempre e só saía por SQL. */
      onEdgesDelete={(apagadas) => {
        for (const a of apagadas) void excluirArestaAction(a.id);
        setArestaSel(null);
      }}
      onSelectionChange={aoSelecionar}
      onNodeClick={(e, n) => {
        setArestaSel(null);
        /* `onSelectionChange` não é confiável pra isto: ele nasceu pra
           seguir arrasto de caixa, e um clique simples em cima de um nó nem
           sempre dispara mudança de seleção — a caixa antiga ficava presa,
           com "N ITENS SELECIONADOS" na barra, mesmo depois de escolher UM
           nó só. Por isso a limpeza é explícita, igual `arestaSel` já era.

           SÓ NO CLIQUE LIMPO, e essa ressalva custou caro: com a limpeza
           incondicional, Ctrl+clique somava o nó pelo React Flow e esta linha
           zerava logo em seguida — a seleção múltipla por clique simplesmente
           não existia, e o Ctrl+C copiava um item só. Com modificador
           pressionado o gesto é "somar", então quem manda é o React Flow. */
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) setSelecionados([]);
        const fechando = n.id === itemSel;
        onItem(fechando ? null : n.id);
        // Gaveta nasce no primeiro nó que alguém abre pra editar, não na
        // migração: criar as duas abas pros 99 nós de uma vez encheria o banco
        // de gaveta vazia, e quem lê veria aba de depoimento em nó que nunca
        // vai ter nenhum.
        if (!fechando && editando && !gavetas[n.id]?.length) {
          void garantirAbasAction(n.id);
        }
      }}
      // 2× clique aproxima no item; Esc devolve de onde veio. Era o que o dock
      // do board legado anunciava, e agora é verdade.
      onNodeDoubleClick={(_, n) => {
        antes.current = getViewport();
        void fitView({ nodes: [{ id: n.id }], padding: 0.35, duration: 380 });
      }}
      onPaneClick={(e) => {
        onItem(null);
        setArestaSel(null);
        setSelecionados([]);
        if (!editando || !ferramenta) return;
        // Converte pixel de tela em coordenada de board — sem isso o nó nasce
        // onde o mouse estaria se o canvas nunca tivesse sido movido.
        const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        void criarNoAction(paginaId, ferramenta, p.x, p.y);
        // Volta pra seleção: manter a forma armada faria o próximo clique
        // criar outra que ninguém pediu.
        onFerramenta(null);
      }}
      /* Cada lado do nó tem UM handle só (ver NoDoBoard), do tipo "source" —
         não existe handle "target" no board inteiro. Em modo Strict (o
         padrão) uma conexão só é válida se ela terminar num handle "target";
         como não há nenhum, TODA conexão seria rejeitada. Loose libera
         qualquer handle nas duas pontas (a única regra é não ser o mesmo de
         onde a seta partiu), que é o que deixa um lado servir de origem OU
         destino sem precisar de dois elementos empilhados no mesmo pixel —
         era isso que fazia a seta "cair" na âncora errada e gravar lixo em
         `ladoPara` (o id inteiro do handle, não só a letra do lado). */
      connectionMode={ConnectionMode.Loose}
      /* ---- A CAIXA DE SELEÇÃO LIVRE (gramática do Figma) -------------------
         EDITANDO, arrastar no vazio DESENHA A CAIXA e o pan sai pro botão do
         meio, pro botão direito ou pra barra de espaço. LENDO, arrastar volta
         a mover o board — quem só está lendo não tem o que selecionar, e um
         retângulo azul aparecendo ao tentar navegar seria só estranho.

         `Partial` e não `Full`: a caixa pega quem ela ENCOSTA, não só quem ela
         contém inteiro. Num board com nós de 500px de largura, exigir cobrir a
         peça toda obriga a enquadrar metade da tela pra pegar dois vizinhos.

         O `ferramenta` na conta é o que evita o conflito com inserir forma:
         com uma primitiva armada, o arrastar volta a ser pan, e o clique
         continua sendo "põe a forma aqui" (ver `onPaneClick`). Sem isto,
         escolher um retângulo e arrastar desenhava seleção em vez de criar. */
      selectionOnDrag={editando && !ferramenta}
      selectionMode={SelectionMode.Partial}
      panOnDrag={editando && !ferramenta ? [1, 2] : true}
      panActivationKeyCode="Space"
      /* SOMAR À SELEÇÃO: Ctrl, Cmd ou Shift. Declarado, não herdado — o padrão
         do React Flow é uma tecla só e varia por sistema operacional, e o
         resultado era clique com Ctrl TROCANDO a seleção em vez de somar.
         Aceitar as três também alinha com o Figma, onde Shift+clique soma. */
      multiSelectionKeyCode={["Control", "Meta", "Shift"]}
      minZoom={0.05}
      maxZoom={3}
      fitView
      fitViewOptions={{ padding: 0.12 }}
      nodesDraggable={editando}
      // Grava onde largou. A gravação sai em lote e sem revalidar: o canvas já
      // está certo, e recarregar 99 nós a cada arrasto faria a tela piscar no
      // meio da edição. O passo do Ctrl+Z nasce sozinho, no servidor, porque a
      // gravação passa por `gravar()` (ver `lib/historico.ts`).
      onNodeDragStop={onNodeDragStop}
      nodesConnectable={editando}
      onConnect={(c) => {
        if (!c.source || !c.target) return;
        // O id do handle já É o lado (t/b/l/r) — um handle só por lado agora,
        // sem prefixo pra tirar (ver NoDoBoard).
        void criarArestaAction(paginaId, c.source, c.target, c.sourceHandle ?? null, c.targetHandle ?? null);
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

      {/* Confirmação do Ctrl+C. Fica no alto e no meio porque o rodapé é do
          dock e a esquerda é dos controles de zoom — e some sozinha, que é o
          contrato de um aviso: ele não pede nada de volta.

          O texto diz OUTRA TELA de propósito. Colar na mesma página é o que
          qualquer um tenta primeiro; que o recorte atravessa a navegação é
          justamente o que ninguém adivinha sem alguém dizer. */}
      {copiados > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-[80] -translate-x-1/2 rounded-full border border-[rgba(78,125,246,.5)] bg-[rgba(13,18,29,.96)] px-4 py-2 text-[12.5px] font-semibold text-texto shadow-[0_12px_36px_rgba(0,0,0,.5)] backdrop-blur-md">
          {copiados} {copiados > 1 ? "itens copiados" : "item copiado"} ·{" "}
          <span className="text-texto-3">
            Ctrl+V cola aqui ou em outra tela
          </span>
        </div>
      )}
      {/* A barra vive DENTRO do ReactFlow pra ficar sobre o palco, mas fora do
          viewport transformado — senão ela encolheria junto com o zoom. */}
      {editando && (
        <BarraDeEdicao
          ativa={ferramenta}
          onEscolher={onFerramenta}
          no={noSel}
          aresta={arestaAtual}
          onRedimensionar={redimensionarNo}
          selecao={varios.length}
          onArrumar={arrumar}
          onLargar={() => {
            onItem(null);
            setArestaSel(null);
          }}
        />
      )}

      {/* A gaveta é irmã do palco, não filha do nó: dentro do viewport ela
          encolheria com o zoom e a 20% ninguém leria uma linha. */}
      {noSel && gavetaAberta && (
        <GavetaDoNo
          /* `key` no id: trocar de nó monta uma gaveta nova, já na primeira
             aba. Sem isso seria um effect de reset a cada seleção. */
          key={noSel.id}
          no={noSel}
          abas={gavetas[noSel.id]}
          editando={editando}
          vizinhos={nos.filter((n) => n.id !== noSel.id && !FUNDO.has(n.tipo))}
          /* 246 = a barra de propriedades (232) + a folga dela na borda.
             86 = o dock, que nesta página sempre existe. */
          insets={{ esq: editando ? 246 : 0, baixo: 86 }}
          onFechar={() => onItem(null)}
        />
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
