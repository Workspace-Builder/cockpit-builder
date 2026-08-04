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
  /** raio do canto em px — SUBSTITUI o do tipo, não soma (migration 012) */
  raio: number | null;
  /** 0.1 a 1. Zero seria nó invisível que continua clicável. */
  opacidade: number | null;
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

// --- a gaveta do nó (migration 010) ----------------------------------------

/**
 * Duas espécies de aba, e só duas — cada uma tem uma renderização própria.
 * Abrir isto a texto livre criaria `kind` que a tela não sabe desenhar.
 */
export type KindAba = "lista" | "galeria";

/** Os cinco componentes que cabem numa aba de lista. */
export type TipoItem = "aula" | "ia" | "ferram" | "link" | "img";

/**
 * Um item da gaveta.
 *
 * `nome` serve às duas espécies: na lista é o rótulo do entregável, na galeria
 * é a legenda do print. `src` é URL pública — nunca base64, porque a página vai
 * virar HTML publicado e não pode depender deste servidor pra mostrar imagem.
 */
export type ItemDoNo = {
  id: string;
  abaId: string;
  tipo: TipoItem;
  nome: string | null;
  url: string | null;
  src: string | null;
  /** o caminho que traz o resultado — teto de 2 por aba */
  oitenta: boolean;
  /** o imprescindível antes de começar — teto de 1 por aba */
  pre: boolean;
  ordem: number;
};

export type AbaDoNo = {
  id: string;
  noId: string;
  nome: string;
  kind: KindAba;
  ordem: number;
  itens: ItemDoNo[];
};

/** As abas de uma página, por id de nó. Nó sem gaveta não aparece no mapa. */
export type GavetasDaPagina = Record<string, AbaDoNo[]>;

/**
 * Quantas marcações cabem numa aba.
 *
 * Mesma razão do `TETO_8020`: marca que cobre tudo não escolhe nada. O
 * imprescindível para em 1 porque "por onde começar" é um só — dois seria a
 * pergunta de volta.
 *
 * Mora aqui, e não em `queries.ts`, porque as duas pontas precisam da regra: a
 * gaveta desabilita o botão antes do clique, o servidor recusa a gravação.
 */
export const TETO_MARCA: Record<"oitenta" | "pre", number> = {
  oitenta: 2,
  pre: 1,
};

export type ChaveMarca = keyof typeof TETO_MARCA;

// --- o conteúdo, que entra depois ------------------------------------------

/** Em qual plataforma a ferramenta do passo vive. BLUEPRINT-PAGINAS.md §6. */
export type Plataforma = "EB" | "DB" | "AB";

/** Uma das 3 vagas fixas do painel: aula → IA → ferramenta. */
export type Vaga = {
  label: string;
  url?: string;
  /** Só na vaga `ferram`. Sem URL o selo não linka (Decisão 5). */
  plat?: Plataforma;
  /**
   * O que existe DENTRO deste entregável — sem link próprio, porque o destino
   * é o mesmo da vaga.
   *
   * Nasceu de um caso concreto: "Acessar mentes que construíram" entrega uma
   * trilha de mentorias, e quem está nela (Lucas Neves, Luan Shimoda, Lorenzi)
   * é metade do valor — mas os três abrem a MESMA trilha. Como três vagas
   * seriam três links iguais, e o painel só tem três vagas no total, eles
   * simplesmente sumiam.
   *
   * Não use pra entregável que leva a outro lugar: aí é vaga, não conteúdo.
   * Um nome aqui promete o destino da vaga que o contém.
   */
  dentro?: string[];
};

/**
 * Qual das 3 vagas. É a chave do próprio `Passo`, não um enum paralelo: quem
 * escrever `"ferramenta"` em vez de `"ferram"` não compila.
 */
export type ChaveVaga = "aula" | "ferram" | "ia";

/**
 * O 80/20 do entregável (migration 009): por passo, qual caminho traz o
 * resultado. Até dois — três não escolhe nada.
 *
 * Mapa e não lista porque quem consome é o painel de UM andar: `[passo.id]`
 * responde direto, sem varrer 36 registros a cada clique.
 */
export type Oitenta = Record<string, ChaveVaga[]>;

/**
 * Teto de marcações por andar. Mora aqui, e não em `queries.ts`, porque as duas
 * pontas precisam da mesma regra: o painel desabilita o terceiro botão antes do
 * clique, o servidor recusa a terceira gravação. `queries.ts` é `server-only` —
 * importar de lá quebraria o build do componente.
 *
 * Por que existe: marcar os três é o mesmo que não marcar nenhum.
 */
export const TETO_8020 = 2;

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
  /**
   * Relevo estrutural no DESENHO da torre — laje mais grossa, e nada além.
   *
   * Já foi o 80/20; não é mais. O 80/20 desceu pro entregável (migration 009,
   * tipo `Oitenta`) e o selo saiu do painel e da etiqueta: hierarquia entre
   * andares ensinava que metade da obra dava pra deixar pra depois, quando os
   * 36 são obrigatórios. O que sobrou aqui é textura de prédio, sem nome na
   * tela.
   */
  e8020: boolean;
  /** Posição no ciclo; `null` = não cicla (mentalidade). Decisão 3. */
  cicloPos: number | null;
  /** `true` = não tem ferramenta nem IA, é na mão. */
  unha: boolean;
  aula?: Vaga;
  ia?: Vaga;
  ferram?: Vaga;
};

/** Alterações persistidas sobre as vagas da lista única de passos. */
export type EntregavelEditavel = {
  passoId: string;
  vaga: ChaveVaga;
  valor: Vaga | null;
};

/** Um pilar = um andar do prédio. BLUEPRINT-PAGINAS.md §2. */
export type Pilar = {
  n: 1 | 2 | 3 | 4;
  fase: string;
  titulo: string;
  andar: string;
  cor: string;
};
