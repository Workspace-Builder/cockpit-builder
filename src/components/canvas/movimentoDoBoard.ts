"use client";

import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// "O board está se movendo?" — um sinal só, para todo mundo
// ---------------------------------------------------------------------------
// As 8 peças precisam saber disso pra parar de desenhar durante o
// enquadramento. A forma óbvia — cada uma assinar `transform` do React Flow —
// é uma armadilha: o pan muda o transform a cada quadro, então as 8
// re-renderizariam 60×/s durante todo o movimento, que é exatamente quando
// não há quadro sobrando.
//
// Aqui um sensor único assina o transform e escreve neste store. Quem consome
// só é notificado quando a RESPOSTA muda (parado → movendo → parado): dois
// renders por navegação em vez de sessenta por segundo.
// ---------------------------------------------------------------------------

let movendo = false;
let timer = 0;
const ouvintes = new Set<() => void>();

const avisar = () => ouvintes.forEach((f) => f());

/** chamado pelo sensor a cada mudança de enquadramento */
export function marcarMovimento(ms = 180) {
  if (!movendo) {
    movendo = true;
    avisar();
  }
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    movendo = false;
    avisar();
  }, ms);
}

export function useBoardMovendo() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => movendo,
    () => false, // no servidor, nada se move
  );
}
