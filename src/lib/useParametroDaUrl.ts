"use client";

import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Um parâmetro da query, lido no cliente
// ---------------------------------------------------------------------------
// `?v=` (o checkpoint) e `?andar=` (o deeplink do Motor pra Obra) eram
// resolvidos no servidor. Deixaram de ser em 2026-08-03: ler `searchParams`
// num Server Component força render por requisição, e na build estática não
// existe requisição — a página é escrita uma vez, no build, e a query só
// aparece depois, no navegador de quem abriu o link.
//
// POR QUE `useSyncExternalStore` E NÃO effect + setState: a URL é fonte externa
// e mutável, que é exatamente o caso de uso deste hook. Ele resolve de graça o
// problema que o effect criaria — hidratação. O `getServerSnapshot` devolve o
// que o HTML assado contém (nada), o React hidrata com esse valor sem
// divergência, e só então troca pelo valor do cliente. Effect + setState daria
// o mesmo resultado passando por um estado a mais e esbarrando na regra
// `react-hooks/set-state-in-effect`, que o lint da casa barra.
//
// Mesmo padrão de `usePrefereMenosMovimento` no Motor de Tijolos — inclusive no
// nome: `use` em inglês porque o lint do React impõe (a regra
// `react-hooks/rules-of-hooks` não reconhece `usar`), o resto em português como
// manda a casa.
//
// O `popstate` no assinante não é zelo: o Dock reescreve a URL com
// `replaceState` ao trocar de checkpoint, e sem ouvir o histórico o ← do
// navegador deixaria a leitura velha na tela.
// ---------------------------------------------------------------------------

function assinar(avisar: () => void) {
  window.addEventListener("popstate", avisar);
  return () => window.removeEventListener("popstate", avisar);
}

/**
 * `null` durante a hidratação e quando ausente — quem chama trata os dois
 * igual, que é o comportamento certo: "não pediram nada" e "ainda não sei"
 * levam à mesma tela.
 */
export function useParametroDaUrl(chave: string): string | null {
  return useSyncExternalStore(
    assinar,
    () => new URLSearchParams(window.location.search).get(chave),
    () => null,
  );
}
