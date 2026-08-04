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

  /**
   * Gaveta da árvore aberta — só existe abaixo de `lg`.
   *
   * Acima de 1024px a barra volta a ser coluna do flex e este estado é
   * ignorado pelo CSS. Nasce FECHADA: em 375px a árvore aberta é o índice
   * cobrindo o mapa, que é exatamente o que estamos consertando.
   */
  gaveta: boolean;
  setGaveta: (b: boolean) => void;

  /**
   * Coluna recolhida — só existe a partir de `lg` (abaixo disso a barra é a
   * `gaveta` acima, e recolher não faz sentido pra quem já vê ela como
   * drawer). Vira um trilho estreito, só com o logo; árvore, busca e rodapé
   * somem. Não persiste, igual ao resto daqui: é preferência da sessão, não
   * do aluno.
   */
  recolhida: boolean;
  alternarRecolhida: () => void;

  /**
   * Modo de edição ligado. MORA AQUI, e não no `AppShell`, por um motivo
   * concreto: a casca tem `key={id}` na rota, então ela remonta a cada troca
   * de página e todo `useState` dela volta ao padrão.
   *
   * Enquanto isso valia só pro botão "Editar", era irrelevante — chegar numa
   * tela em modo leitura é até o certo. Deixou de ser quando o recorte passou
   * a atravessar telas: copiar na página A, navegar pra B e apertar Ctrl+V
   * não colava NADA, porque o modo tinha desligado na troca e o handler do
   * colar sai na primeira linha quando não se está editando. Silencioso, que
   * é o pior tipo de "não funciona".
   *
   * Edição é preferência de quem está trabalhando, não estado do documento —
   * a mesma natureza de `recolhida` e da `gaveta`, que já moram aqui. Quem
   * está organizando o board continua organizando depois de mudar de tela.
   */
  editando: boolean;
  setEditando: (b: boolean) => void;
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

  gaveta: false,
  setGaveta: (gaveta) => set({ gaveta }),

  recolhida: false,
  alternarRecolhida: () => set((s) => ({ recolhida: !s.recolhida })),

  editando: false,
  setEditando: (editando) => set({ editando }),
}));
