"use client";

import BoardCanvas from "@/components/canvas/BoardCanvas";
import Obra from "@/components/obra/Obra";
import Motor from "@/components/motor/Motor";
import { ID_OBRA, ID_MOTOR } from "@/lib/passos";
import type {
  ArestaBoard,
  GavetasDaPagina,
  NoBoard,
  Oitenta,
  Pagina,
  Passo,
} from "@/lib/model";

// ---------------------------------------------------------------------------
// O palco — o canvas, sempre
// ---------------------------------------------------------------------------
// Página sem nó abre canvas EM BRANCO, não maquete.
//
// Até aqui havia um espaço reservado tracejado no lugar: título, oito caixas
// "Item" e uma barra de progresso, desenhando uma tela que ninguém tinha
// decidido ainda. O problema não era o desenho estar errado — era ele OCUPAR O
// LUGAR DO CANVAS. Página nova ganhava um mock que não dá pra editar, e o dock
// sumia junto (`temCanvas` era falso): a tela nascia morta.
//
// Agora é folha em branco. Tela nova é canvas de verdade desde o primeiro
// segundo, livre pra receber o fluxo que for. O que a página é continua dito
// na frase de resumo, no topo — texto de verdade, não caixa tracejada fingindo
// ser conteúdo.
// ---------------------------------------------------------------------------

export default function Palco({
  pagina,
  nos,
  arestas,
  editando,
  ferramenta,
  onFerramenta,
  itemSel,
  onItem,
  oitentaVinte,
  passos,
  gavetas,
  andarInicial,
}: {
  pagina: Pagina;
  nos: NoBoard[];
  arestas: ArestaBoard[];
  editando: boolean;
  ferramenta: import("@/components/canvas/BarraDeEdicao").Ferramenta;
  onFerramenta: (
    f: import("@/components/canvas/BarraDeEdicao").Ferramenta,
  ) => void;
  itemSel: string | null;
  onItem: (id: string | null) => void;
  oitentaVinte: Oitenta;
  passos: Passo[];
  gavetas: GavetasDaPagina;
  andarInicial?: string;
}) {
  // A Obra não é canvas de nós: é o quarteirão isométrico dos 4 pilares,
  // desenhado a partir da Ordem 0 (lib/passos.ts).
  if (pagina.id === ID_OBRA)
    return <Obra passos={passos} oitentaVinte={oitentaVinte} andarInicial={andarInicial} />;

  // O Trilho também não é canvas de nós: é a roda do funil anti-prospecção com
  // o arsenal por setor, desenhada a partir de lib/flywheel.ts.
  if (pagina.id === ID_MOTOR) return <Motor />;

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <BoardCanvas
        nos={nos}
        arestas={arestas}
        editando={editando}
        paginaId={pagina.id}
        ferramenta={ferramenta}
        onFerramenta={onFerramenta}
        itemSel={itemSel}
        onItem={onItem}
        gavetas={gavetas}
      />
    </div>
  );
}
