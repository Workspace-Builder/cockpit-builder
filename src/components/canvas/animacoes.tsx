"use client";

import type { ComponentType } from "react";
import Timeline from "./animacoes/Timeline";
import Flywheel from "./animacoes/Flywheel";
import Furadeira from "./animacoes/Furadeira";
import BaldeFurado from "./animacoes/BaldeFurado";
import DoisBalcoes from "./animacoes/DoisBalcoes";
import OitentaVinte from "./animacoes/OitentaVinte";
import DozeMeses from "./animacoes/DozeMeses";
import ServicoSolucao from "./animacoes/ServicoSolucao";

// ---------------------------------------------------------------------------
// Os nós que TÊM COMPORTAMENTO
// ---------------------------------------------------------------------------
// O board legado tem 12 nós interativos. Portar marcação e CSS deixa todos eles
// com a cara certa e mortos por dentro — foi o que aconteceu na primeira
// passada, e é um erro que não aparece em screenshot.
//
// Cada um entra aqui conforme for portado; a chave é o `no.comp` do banco.
// Enquanto não estiver, o nó aparece tracejado dizendo o que falta.
//
// PORTADOS — as 8 animações do canvas:
//   Timeline       · o gráfico de faturamento no tempo
//   Flywheel       · a roda de 6 fases com o arsenal por setor
//   Furadeira      · os dois clientes: quem compra a ferramenta × quem compra o quadro
//   BaldeFurado    · oceano, filtro e os furos da operação
//   DoisBalcoes    · vender o meio × vender o fim
//   OitentaVinte   · a pirâmide de esforço, e a inversão dela
//   DozeMeses      · o ano em 12 colunas: partida, mix e retenção
//   ServicoSolucao · a régua de commodity a premium, com e sem IA
//
// FALTAM (3 widgets menores, nenhum é animação de canvas):
//   abas da busca SEO · carrossel do Instagram · conta do 10k
//   · olho ◎ que alterna print ⇄ documento vivo
//
// CONVENÇÃO QUE VALE PRA TODAS: todo controle interativo leva `nodrag`. Sem
// isso, no modo de edição o React Flow entende o gesto como arrastar o NÓ e o
// slider nunca se move — o nó é que sai andando.
// ---------------------------------------------------------------------------

export type PropsAnimacao = { largura: number; altura: number };

export const ANIMACOES: Record<string, ComponentType<PropsAnimacao>> = {
  Timeline,
  Flywheel,
  Furadeira,
  BaldeFurado,
  DoisBalcoes,
  OitentaVinte,
  DozeMeses,
  ServicoSolucao,
};
