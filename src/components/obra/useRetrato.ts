"use client";

import { useSyncExternalStore } from "react";
import { LIMIAR_RETRATO } from "./layout";

// ---------------------------------------------------------------------------
// "Estou em retrato?" — respondido sem quebrar a hidratação
// ---------------------------------------------------------------------------
// A resposta ingênua — `ehRetrato(window.innerWidth)` no meio do render —
// derruba a página com "Hydration failed": o HTML foi assado no build, onde
// não existe janela nem largura, e o cliente responde outra coisa no primeiro
// render. Foi exatamente o que aconteceu quando a Obra passou a entrar num
// prédio no celular.
//
// `useSyncExternalStore` existe pra este caso e é o que o app já usa em
// `jaViuAbertura` (localStorage tem o mesmo problema): o terceiro argumento é
// a resposta DO SERVIDOR, e o React sabe que ela vai divergir — troca depois
// da hidratação, sem acusar erro.
//
// A resposta do servidor é `false` de propósito: na dúvida, cabine. O retrato
// é o caso especial, e assumi-lo por padrão faria a build estática nascer com
// a Obra já focada num prédio pra quem vai abrir no desktop.
// ---------------------------------------------------------------------------

const consulta = () =>
  window.matchMedia(`(max-width: ${LIMIAR_RETRATO - 1}px)`);

function assinar(avisar: () => void) {
  const mq = consulta();
  mq.addEventListener("change", avisar);
  return () => mq.removeEventListener("change", avisar);
}

export function useRetrato(): boolean {
  return useSyncExternalStore(
    assinar,
    () => consulta().matches,
    () => false,
  );
}
