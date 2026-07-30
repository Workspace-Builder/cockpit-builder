// ---------------------------------------------------------------------------
// O modelo — tipos que sustentam tudo
// ---------------------------------------------------------------------------
// Referência: BLUEPRINT.md §9 (modelo de dados) + BLUEPRINT-PAGINAS.md §7
// ("uma lista, N vistas"). O board de hoje não tem modelo: tem DOM, e o que
// persiste é `outerHTML`. Por isso não dá pra criar página em runtime, nem
// trocar cor, nem ter camada — e é isso que esta estrutura resolve.
//
// Regra que não pode ser quebrada: conteúdo mora em `Passo`. Página é VISTA
// sobre a lista, nunca cópia dela. Duas cópias desincronizam na segunda edição.
// ---------------------------------------------------------------------------

// --- a árvore da barra lateral ---------------------------------------------

export type Pasta = {
  id: string;
  nome: string;
  ordem: number;
};

/**
 * A árvore como a barra lateral precisa dela. Montada em `lib/queries.ts`.
 *
 * Pasta fechada NÃO está aqui: é preferência de quem está olhando, não dado
 * compartilhado. Se fosse pro banco, fechar uma pasta fecharia pra todo mundo.
 */
export type GrupoArvore = {
  pasta: Pasta;
  paginas: Pagina[];
};

/**
 * Um checkpoint: a tela salva. É o segundo nível de navegação
 * (BLUEPRINT-PAGINAS.md §4) — não troca a página, troca para onde você olha.
 *
 * `x`, `y` e `zoom` são o enquadramento do canvas. Nulos = enquadra a página
 * inteira. O link `/p/<id>?v=<n>` abre direto nele, então mandar um checkpoint
 * pra alguém é mandar a URL.
 */
export type Vista = {
  id: string;
  label: string;
  x: number | null;
  y: number | null;
  zoom: number | null;
};

export type Pagina = {
  id: string;
  nome: string;
  pastaId: string;
  ordem: number;
  /** Uma frase: o que esta tela é e o que o aluno faz aqui. */
  resumo?: string;
  vistas: Vista[];
};

// --- o canvas: nós e conectores --------------------------------------------

/**
 * Vocabulário visual do fluxograma (BLUEPRINT.md §3) + os tipos de mídia que o
 * Método 10k usa. As cores saíram de amostragem de pixel nos PNGs do Figma,
 * não a olho — estão em `globals.css`, não aqui.
 */
export type TipoNo =
  | "term" // pílula cinza — entrada/saída de fase
  | "act" // retângulo roxo — ação operacional
  | "doc" // retângulo rosa — documento/artefato
  | "reg" // paralelogramo rosa — lançamento em registro
  | "in" // paralelogramo verde — input, alguém preenche
  | "dec" // losango verde — decisão binária
  | "db" // cilindro amarelo — repositório
  | "copy" // retângulo amarelo — ação da trilha paralela
  | "lane" // bloco translúcido — swimlane
  | "texto" // corpo de texto rico
  | "shot" // print, com o olho que alterna pro documento vivo
  | "iframe" // conteúdo de terceiro embutido
  | "video"
  | "anim"; // `<canvas>` animado — timeline e as 6 esquetes

export type Lado = "t" | "b" | "l" | "r";

export type NoBoard = {
  id: string;
  paginaId: string;
  tipo: TipoNo;
  x: number;
  y: number;
  w: number | null;
  h: number | null;
  z: number | null;
  txt: string | null;
  /** o que o print prova — nos nós `shot` */
  legenda: string | null;
  /** corpo rico; só nos tipos de texto/mídia */
  html: string | null;
  url: string | null;
  img: string | null;
  /** nome do componente React, nos nós `anim` */
  comp: string | null;

  // --- estilo (migration 007). Nulo = usa o padrão do tipo (vocabulário fx-*).
  cor: string | null;
  corTxt: string | null;
  contorno: "solido" | "tracejado" | "nenhum" | null;
  fs: number | null;
  fw: number | null;
  ta: "left" | "center" | "right" | null;
};

export type ArestaBoard = {
  id: string;
  paginaId: string;
  de: string;
  para: string;
  ladoDe: Lado | null;
  ladoPara: Lado | null;
  /** fluxo secundário / retorno */
  tracejada: boolean;
  /** caminho de reprovação — vermelho */
  falha: boolean;
  rotulo: string | null;
};

// --- o conteúdo, que entra depois ------------------------------------------

/** Em qual plataforma a ferramenta do passo vive. BLUEPRINT-PAGINAS.md §6. */
export type Plataforma = "EB" | "DB" | "AB";

/** Uma das 3 vagas fixas do painel: aula → IA → ferramenta. */
export type Vaga = {
  label: string;
  url?: string;
  /** Só na vaga `ferram`. Sem URL o selo não linka (Decisão 5). */
  plat?: Plataforma;
};

/**
 * Um dos 36 passos. Registro único — Obra, Trilho e vista 8020 são filtros
 * sobre esta lista.
 */
export type Passo = {
  id: string;
  paginaId: string;
  /** Qual andar do prédio: 1..4 */
  pilar: 1 | 2 | 3 | 4;
  /** Posição dentro do andar */
  ordem: number;
  titulo: string;
  sub?: string;
  /** Estrutura (viga/laje) — não pode pular. Decisão 4. */
  e8020: boolean;
  /** Posição no ciclo; `null` = não cicla (mentalidade). Decisão 3. */
  cicloPos: number | null;
  /** `true` = não tem ferramenta nem IA, é na mão. */
  unha: boolean;
  aula?: Vaga;
  ia?: Vaga;
  ferram?: Vaga;
};

/** Um pilar = um andar do prédio. BLUEPRINT-PAGINAS.md §2. */
export type Pilar = {
  n: 1 | 2 | 3 | 4;
  fase: string;
  titulo: string;
  andar: string;
  cor: string;
};
