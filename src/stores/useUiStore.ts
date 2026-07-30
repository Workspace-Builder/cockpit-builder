import { create } from "zustand";

// ---------------------------------------------------------------------------
// Estado de tela — o que NÃO é dado
// ---------------------------------------------------------------------------
// Desde que a árvore foi pro Postgres, o store guarda só preferência de quem
// está olhando: o filtro da busca e quais pastas estão fechadas. Nada disso
// vai pro banco — fechar uma pasta fecharia pra todo mundo.
//
// Não é persistido: reabrir com o filtro de ontem confunde mais do que ajuda.
// ---------------------------------------------------------------------------

type UiState = {
  busca: string;
  setBusca: (s: string) => void;

  /** ids das pastas fechadas na árvore */
  fechadas: string[];
  alternarPasta: (id: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  busca: "",
  setBusca: (busca) => set({ busca }),

  fechadas: [],
  alternarPasta: (id) =>
    set((s) => ({
      fechadas: s.fechadas.includes(id)
        ? s.fechadas.filter((x) => x !== id)
        : [...s.fechadas, id],
    })),
}));
