import {
  GraduationCap,
  Image as Imagem,
  Link2,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { TipoItem } from "@/lib/model";

// ---------------------------------------------------------------------------
// Os cinco componentes que cabem numa gaveta — definidos UMA vez
// ---------------------------------------------------------------------------
// Mesma regra de `obra/entregaveis.ts`: rótulo, ícone e cor aparecem no item,
// no seletor de "adicionar" e no CHECK da migration 010. Como listas separadas,
// a segunda edição desencontra as três.
//
// Os três primeiros são os mesmos da Obra, com as mesmas cores de propósito:
// AULA é azul nos dois lugares. Quem aprendeu a ler o painel do andar lê a
// gaveta sem recomeçar.
//
// `link` e `img` não existem na Obra porque lá o vocabulário é fechado nos três
// caminhos do método. Aqui a página é um processo qualquer, e um modelo de
// e-mail não é aula nem ferramenta — é um link.
// ---------------------------------------------------------------------------

export type Componente = {
  k: TipoItem;
  rot: string;
  Ico: LucideIcon;
  cor: string;
};

export const COMPONENTES: Componente[] = [
  { k: "aula", rot: "AULA", Ico: GraduationCap, cor: "#2b8cff" },
  { k: "ia", rot: "IA", Ico: Sparkles, cor: "#9e6cf2" },
  { k: "ferram", rot: "FERRAMENTA", Ico: Wrench, cor: "#54c98a" },
  { k: "link", rot: "LINK", Ico: Link2, cor: "#f5b23f" },
  { k: "img", rot: "IMAGEM", Ico: Imagem, cor: "#33c6d6" },
];

export const componente = (k: TipoItem): Componente =>
  COMPONENTES.find((c) => c.k === k) ?? COMPONENTES[2];
