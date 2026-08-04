import { GraduationCap, Sparkles, Wrench, type LucideIcon } from "lucide-react";
import type { ChaveVaga } from "@/lib/model";

// ---------------------------------------------------------------------------
// Os três caminhos de um andar — definidos UMA vez
// ---------------------------------------------------------------------------
// Rótulo, papel, ícone e cor aparecem na abertura e no painel do andar. Como
// duas listas separadas, a segunda edição desencontra as duas: a abertura
// prometeria uma cor e o painel entregaria outra. É a mesma regra que vale pros
// 36 passos (AGENTS.md) — uma lista, N vistas.
//
// A ORDEM É A DE USO, não a de importância: você aprende, executa, e só então
// acelera. Trocar aqui troca nos dois lugares, que é o ponto.
//
// `Ico` é o COMPONENTE, não um elemento pronto: os dois lugares desenham em
// tamanhos diferentes, e um elemento com `size` embutido obrigaria a lista a
// escolher um tamanho pelos dois.
// ---------------------------------------------------------------------------

export type Entregavel = {
  k: ChaveVaga;
  rot: string;
  /** por que existem três, e o que este responde */
  papel: string;
  Ico: LucideIcon;
  cor: string;
};

export const ENTREGAVEIS: Entregavel[] = [
  { k: "aula", rot: "AULA", papel: "ensina a fazer", Ico: GraduationCap, cor: "#2b8cff" },
  { k: "ferram", rot: "FERRAMENTA", papel: "onde você executa", Ico: Wrench, cor: "#54c98a" },
  { k: "ia", rot: "IA DE APOIO", papel: "o que acelera", Ico: Sparkles, cor: "#9e6cf2" },
];
