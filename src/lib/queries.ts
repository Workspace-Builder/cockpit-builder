import "server-only";
import { cache } from "react";
import { gravar, idsComCanvas, ler, remover } from "./dados";
import { desfazer as desfazerArquivo, passos as passosDe } from "./historico";
import { novoId } from "./ids";
import { TETO_8020, TETO_MARCA, type ChaveVaga, type Passo, type Plataforma, type Vaga } from "./model";
import { PASSOS } from "./passos";
import type {
  ArestaBoard,
  ChaveMarca,
  GavetasDaPagina,
  GrupoArvore,
  KindAba,
  NoBoard,
  Oitenta,
  Pagina,
  TipoItem,
  Vista,
} from "./model";

// ---------------------------------------------------------------------------
// Acesso a dados — o único lugar que lê e grava em `dados/`
// ---------------------------------------------------------------------------
// Era "o único lugar com SQL"; o banco virou arquivo (2026-08-03), a regra
// continua a mesma. Componente não abre `dados/` na mão — se apareceu
// `readFileSync` fora deste arquivo (e de `lib/dados.ts`), é aqui que
// deveria estar.
//
// `cache()` deduplica por request, como antes: a árvore é lida pelo layout e
// pela página no mesmo render, e sem isso seriam duas leituras de disco pelo
// mesmo dado.
// ---------------------------------------------------------------------------

type CanvasArquivo = {
  nos: NoBoard[];
  arestas: ArestaBoard[];
  gavetas: GavetasDaPagina;
};

/**
 * O canvas de uma página que ainda não tem arquivo.
 *
 * É FUNÇÃO, e isso não é estilo — é correção. Enquanto foi uma constante de
 * módulo (`const CANVAS_VAZIO = {...}`), toda página sem arquivo recebia A
 * MESMA INSTÂNCIA, e as escritas mutam o objeto lido (`canvas.nos.push(...)`
 * em `criarNo` e `colarNos`). Resultado: colar numa página nova sujava o
 * objeto compartilhado, que vive enquanto o processo do Node viver — e a
 * PRÓXIMA página criada nascia mostrando o conteúdo da anterior. Apagar não
 * adiantava: sem arquivo, ela voltava a ler o mesmo objeto sujo.
 *
 * Foi relatado como "crio uma página e ela vem igual a outra, e não consigo
 * apagar a antiga". Uma instância nova por leitura mata as duas metades.
 */
const canvasVazio = (): CanvasArquivo => ({ nos: [], arestas: [], gavetas: {} });

const arquivoDaPagina = (id: string) => `paginas/${id}.json`;

const lerCanvas = (id: string): CanvasArquivo =>
  ler(arquivoDaPagina(id), canvasVazio());
const gravarCanvas = (id: string, dado: CanvasArquivo) => gravar(arquivoDaPagina(id), dado);

/** Próxima posição de uma lista ordenada — o `COALESCE(MAX(ordem)+1,0)` de antes. */
const proximaOrdem = (itens: { ordem: number }[]): number =>
  itens.reduce((max, x) => Math.max(max, x.ordem + 1), 0);

/**
 * Próximo `z` de um canvas — o `COALESCE(MAX(z)+1,1)` de antes: ignora nós
 * sem `z` (nunca ganharam camada) e começa em 1 quando nenhum nó tem `z` ainda.
 */
const proximoZ = (nos: NoBoard[]): number => {
  const zs = nos.map((n) => n.z).filter((z): z is number => z !== null);
  return zs.length ? Math.max(...zs) + 1 : 1;
};

/**
 * Todas as páginas que têm canvas gravado. Usado pra achar em qual página
 * mora um nó/aresta/aba/item quando a função só recebe o id dele — o SQL
 * achava isso de graça (chave primária é global); em arquivo por página,
 * quem pergunta tem que procurar. São no máximo algumas páginas: varrer
 * todas é mais barato que manter um índice separado sincronizado.
 */
const todosOsCanvas = (): { paginaId: string; dado: CanvasArquivo }[] =>
  idsComCanvas().map((paginaId) => ({ paginaId, dado: lerCanvas(paginaId) }));

const acharPaginaDoNo = (noId: string) =>
  todosOsCanvas().find((c) => c.dado.nos.some((n) => n.id === noId)) ?? null;

const acharPaginaDaAresta = (arestaId: string) =>
  todosOsCanvas().find((c) => c.dado.arestas.some((a) => a.id === arestaId)) ?? null;

const acharPaginaDaAba = (abaId: string) =>
  todosOsCanvas().find((c) =>
    Object.values(c.dado.gavetas).some((abas) => abas.some((a) => a.id === abaId)),
  ) ?? null;

function acharPaginaDoItem(itemId: string) {
  for (const c of todosOsCanvas()) {
    for (const abas of Object.values(c.dado.gavetas)) {
      const aba = abas.find((a) => a.itens.some((i) => i.id === itemId));
      if (aba) return { paginaId: c.paginaId, dado: c.dado, aba };
    }
  }
  return null;
}

// --- a árvore da barra lateral ----------------------------------------------

const lerArvore = () => ler<GrupoArvore[]>("arvore.json", []);
const gravarArvore = (arvore: GrupoArvore[]) => gravar("arvore.json", arvore);

function acharPagina(arvore: GrupoArvore[], paginaId: string): Pagina | null {
  for (const g of arvore) {
    const p = g.paginas.find((x) => x.id === paginaId);
    if (p) return p;
  }
  return null;
}

function acharPaginaDaVista(arvore: GrupoArvore[], vistaId: string): Pagina | null {
  for (const g of arvore) {
    const p = g.paginas.find((x) => x.vistas.some((v) => v.id === vistaId));
    if (p) return p;
  }
  return null;
}

/**
 * A árvore inteira. Ordenada por `ordem` NA LEITURA, não confiada à ordem do
 * array no arquivo — assim criar/renomear não precisa manter a lista
 * perfeitamente ordenada a cada escrita.
 */
export const listarArvore = cache(async (): Promise<GrupoArvore[]> => {
  return lerArvore()
    .slice()
    .sort((a, b) => a.pasta.ordem - b.pasta.ordem)
    .map((g) => ({
      pasta: g.pasta,
      paginas: g.paginas.slice().sort((a, b) => a.ordem - b.ordem),
    }));
});

export const getPagina = cache(async (id: string) => {
  for (const g of await listarArvore()) {
    const p = g.paginas.find((x) => x.id === id);
    if (p) return { pagina: p, pasta: g.pasta };
  }
  return null;
});

/**
 * O conteúdo do canvas de uma página. Vem separado da árvore de propósito: a
 * árvore é lida em toda rota (barra lateral), o canvas só na página aberta.
 */
export const getCanvas = cache(async (paginaId: string) => {
  const c = lerCanvas(paginaId);
  return {
    nos: c.nos
      .slice()
      .sort((a, b) => (a.z ?? -Infinity) - (b.z ?? -Infinity) || a.id.localeCompare(b.id)),
    arestas: c.arestas.slice().sort((a, b) => a.id.localeCompare(b.id)),
  };
});

/** Destino do `/` e da exclusão da página aberta. */
export async function primeiraPagina(): Promise<Pagina | null> {
  for (const g of await listarArvore()) if (g.paginas[0]) return g.paginas[0];
  return null;
}

/**
 * Quais páginas viram HTML na build do aluno — a lista de `dados/publicadas.json`.
 *
 * É AQUI que mora a publicação seletiva, e é de propósito que ela seja uma
 * lista explícita em vez de "tudo que existe na árvore": página nova nasce
 * rascunho, e rascunho não deve ir pro ar por ter sido criado. Publicar é um
 * gesto — escrever o id nesta lista.
 *
 * Ids que não existem mais na árvore são descartados em silêncio: apagar a
 * página pela interface não pode quebrar o build de quem esqueceu de tirá-la
 * daqui.
 */
export const listarPublicadas = cache(async (): Promise<string[]> => {
  const pedidas = ler<string[]>("publicadas.json", []);
  const arvore = await listarArvore();
  const existentes = new Set(arvore.flatMap((g) => g.paginas.map((p) => p.id)));
  return pedidas.filter((id) => existentes.has(id));
});

// --- o 80/20 do entregável ---------------------------------------------------

/** Quais entregáveis estão marcados como 80/20, por passo. */
export const listarOitentaVinte = cache(async (): Promise<Oitenta> => {
  return ler<Oitenta>("oitenta-vinte.json", {});
});

type EntregavelSalvo = {
  label: string;
  url: string | null;
  plat: Plataforma | null;
  dentro: string[];
  ativo: boolean;
};
type PassoEntregavelArquivo = Record<string, Partial<Record<ChaveVaga, EntregavelSalvo>>>;

const lerPassoEntregaveis = () => ler<PassoEntregavelArquivo>("passo-entregaveis.json", {});
const gravarPassoEntregaveis = (dado: PassoEntregavelArquivo) =>
  gravar("passo-entregaveis.json", dado);

/** Mescla a referência dos 36 passos com as edições feitas na Obra. */
export const listarPassosDaObra = cache(async (): Promise<Passo[]> => {
  const alteracoes = lerPassoEntregaveis();
  return PASSOS.map((passo) => {
    const atualizado = { ...passo };
    const linha = alteracoes[passo.id];
    if (!linha) return atualizado;
    for (const vaga of ["aula", "ia", "ferram"] as ChaveVaga[]) {
      const l = linha[vaga];
      if (!l) continue;
      atualizado[vaga] =
        l.ativo && l.label
          ? { label: l.label, url: l.url ?? undefined, plat: l.plat ?? undefined, dentro: l.dentro }
          : undefined;
    }
    return atualizado;
  });
});

export async function salvarEntregavel(passoId: string, vaga: ChaveVaga, valor: Vaga) {
  const dado = lerPassoEntregaveis();
  const doPasso = (dado[passoId] ??= {});
  doPasso[vaga] = {
    label: valor.label,
    url: valor.url ?? null,
    plat: valor.plat ?? null,
    dentro: valor.dentro ?? [],
    ativo: true,
  };
  gravarPassoEntregaveis(dado);
}

/** Tombstone: `ativo=false` pra excluir um entregável não fazer a referência reaparecer. */
export async function excluirEntregavel(passoId: string, vaga: ChaveVaga) {
  const dado = lerPassoEntregaveis();
  const doPasso = (dado[passoId] ??= {});
  doPasso[vaga] = {
    label: doPasso[vaga]?.label ?? "",
    url: doPasso[vaga]?.url ?? null,
    plat: doPasso[vaga]?.plat ?? null,
    dentro: doPasso[vaga]?.dentro ?? [],
    ativo: false,
  };
  gravarPassoEntregaveis(dado);
}

/**
 * Liga ou desliga a marcação de uma vaga — o mesmo clique faz os dois.
 *
 * Estourar o teto não é erro: é um clique num botão que a UI já mostra
 * desabilitado. Sai em silêncio em vez de explodir uma Server Action.
 */
export async function alternarOitentaVinte(passoId: string, vaga: ChaveVaga): Promise<void> {
  const mapa = ler<Oitenta>("oitenta-vinte.json", {});
  const atuais = mapa[passoId] ?? [];
  if (atuais.includes(vaga)) {
    const restantes = atuais.filter((v) => v !== vaga);
    if (restantes.length) mapa[passoId] = restantes;
    else delete mapa[passoId];
    gravar("oitenta-vinte.json", mapa);
    return;
  }
  if (atuais.length >= TETO_8020) return;
  mapa[passoId] = [...atuais, vaga];
  gravar("oitenta-vinte.json", mapa);
}

// --- escrita ---------------------------------------------------------------

/** Página nova nasce SEM checkpoint — barra cheia de botão morto ninguém pediu. */
export async function criarPagina(pastaId: string): Promise<string> {
  const id = novoId("pag");
  const arvore = lerArvore();
  const grupo = arvore.find((g) => g.pasta.id === pastaId);
  if (!grupo) throw new Error(`Pasta ${pastaId} não existe.`);
  grupo.paginas.push({
    id,
    nome: "Página sem nome",
    pastaId,
    ordem: proximaOrdem(grupo.paginas),
    vistas: [],
  });
  gravarArvore(arvore);
  return id;
}

// --- checkpoints ------------------------------------------------------------

/** Salva a tela atual como checkpoint no fim da barra. */
export async function salvarCheckpoint(
  paginaId: string,
  label: string,
  x: number,
  y: number,
  zoom: number,
) {
  const arvore = lerArvore();
  const pagina = acharPagina(arvore, paginaId);
  if (!pagina) return;
  pagina.vistas.push({ id: novoId("v"), label, x, y, zoom });
  gravarArvore(arvore);
}

/** Regrava o enquadramento de um checkpoint que já existe. */
export async function regravarCheckpoint(id: string, x: number, y: number, zoom: number) {
  const arvore = lerArvore();
  const vista = acharPaginaDaVista(arvore, id)?.vistas.find((v) => v.id === id);
  if (!vista) return;
  vista.x = x;
  vista.y = y;
  vista.zoom = zoom;
  gravarArvore(arvore);
}

export async function renomearCheckpoint(id: string, label: string) {
  const arvore = lerArvore();
  const vista = acharPaginaDaVista(arvore, id)?.vistas.find((v) => v.id === id);
  if (!vista) return;
  vista.label = label;
  gravarArvore(arvore);
}

export async function excluirCheckpoint(id: string) {
  const arvore = lerArvore();
  const pagina = acharPaginaDaVista(arvore, id);
  if (!pagina) return;
  pagina.vistas = pagina.vistas.filter((v) => v.id !== id);
  gravarArvore(arvore);
}

export async function criarPasta(): Promise<string> {
  const id = novoId("pasta");
  const arvore = lerArvore();
  arvore.push({
    pasta: { id, nome: "Pasta sem nome", ordem: proximaOrdem(arvore.map((g) => g.pasta)) },
    paginas: [],
  });
  gravarArvore(arvore);
  return id;
}

/**
 * Duplica a página e as vistas dela. Nós virão junto quando existirem.
 *
 * Só rótulo e ordem viajam pro checkpoint duplicado — x/y/zoom NÃO, igual ao
 * SQL original: enquadramento é da tela de origem, a cópia nasce sem câmera.
 */
export async function duplicarPagina(id: string): Promise<string | null> {
  const arvore = lerArvore();
  for (const g of arvore) {
    const original = g.paginas.find((p) => p.id === id);
    if (!original) continue;
    const novo = novoId("pag");
    g.paginas.push({
      id: novo,
      nome: `${original.nome} (cópia)`,
      pastaId: g.pasta.id,
      ordem: proximaOrdem(g.paginas),
      resumo: original.resumo,
      vistas: original.vistas.map((v) => ({
        id: novoId("v"),
        label: v.label,
        x: null,
        y: null,
        zoom: null,
      })),
    });
    gravarArvore(arvore);
    return novo;
  }
  return null;
}

export async function renomearPagina(id: string, nome: string) {
  const arvore = lerArvore();
  const pagina = acharPagina(arvore, id);
  if (!pagina) return;
  pagina.nome = nome;
  gravarArvore(arvore);
}

export async function renomearPasta(id: string, nome: string) {
  const arvore = lerArvore();
  const grupo = arvore.find((g) => g.pasta.id === id);
  if (!grupo) return;
  grupo.pasta.nome = nome;
  gravarArvore(arvore);
}

export async function excluirPagina(id: string) {
  const arvore = lerArvore();
  for (const g of arvore) g.paginas = g.paginas.filter((p) => p.id !== id);
  gravarArvore(arvore);
  remover(arquivoDaPagina(id));
}

/**
 * Excluir pasta leva as páginas junto (era `ON DELETE CASCADE` no schema).
 * Pasta sem página e página sem pasta seriam dois estados inválidos.
 */
export async function excluirPasta(id: string) {
  const arvore = lerArvore();
  const grupo = arvore.find((g) => g.pasta.id === id);
  for (const p of grupo?.paginas ?? []) remover(arquivoDaPagina(p.id));
  gravarArvore(arvore.filter((g) => g.pasta.id !== id));
}

// --- posição dos nós --------------------------------------------------------

/** Grava a posição de N nós de uma vez — arrastar uma seleção não é N escritas. */
export async function moverNos(
  paginaId: string,
  movidos: { id: string; x: number; y: number }[],
) {
  if (!movidos.length) return;
  const canvas = lerCanvas(paginaId);
  const porId = new Map(movidos.map((m) => [m.id, m]));
  canvas.nos = canvas.nos.map((n) => {
    const m = porId.get(n.id);
    return m ? { ...n, x: Math.round(m.x), y: Math.round(m.y) } : n;
  });
  gravarCanvas(paginaId, canvas);
}

/**
 * Grava o estilo de um nó. Só o que veio no `patch` é tocado: o spread só
 * sobrescreve as chaves presentes no objeto, então mexer na cor não zera a
 * fonte que alguém acabou de escolher. Campo com `null` explícito volta ao
 * padrão do tipo — é assim que o botão "voltar ao padrão" funciona.
 */
export async function estiloNo(
  id: string,
  patch: Partial<
    Pick<NoBoard, "cor" | "corTxt" | "contorno" | "fs" | "fw" | "ta" | "raio" | "opacidade">
  >,
) {
  const achado = acharPaginaDoNo(id);
  if (!achado) return;
  const { paginaId, dado } = achado;
  dado.nos = dado.nos.map((n) => (n.id === id ? { ...n, ...patch } : n));
  gravarCanvas(paginaId, dado);
}

export async function reordenarCheckpoints(paginaId: string, ids: string[]) {
  const arvore = lerArvore();
  const pagina = acharPagina(arvore, paginaId);
  if (!pagina) return;
  const porId = new Map(pagina.vistas.map((v) => [v.id, v]));
  pagina.vistas = ids.map((i) => porId.get(i)).filter((v): v is Vista => Boolean(v));
  gravarArvore(arvore);
}

// --- criar e conectar -------------------------------------------------------

/** Tamanho inicial por primitivo — o que cabe o rótulo sem ficar apertado. */
const TAMANHO_PADRAO: Record<string, { w: number; h: number; txt: string }> = {
  act: { w: 180, h: 64, txt: "Ação" },
  dec: { w: 170, h: 110, txt: "Decisão?" },
  term: { w: 150, h: 56, txt: "Início" },
  doc: { w: 180, h: 64, txt: "Documento" },
  in: { w: 190, h: 64, txt: "Entrada" },
  reg: { w: 190, h: 64, txt: "Registro" },
  db: { w: 160, h: 110, txt: "Repositório" },
  copy: { w: 180, h: 64, txt: "Copy" },
  texto: { w: 240, h: 40, txt: "Texto" },
  lane: { w: 520, h: 300, txt: "ÁREA" },
};

/**
 * Cria um nó no ponto onde a pessoa clicou. Nasce com o tamanho e o rótulo do
 * tipo — nó de 0×0 sem texto é invisível.
 */
export async function criarNo(
  paginaId: string,
  tipo: string,
  x: number,
  y: number,
  /* Sobrescreve o padrão do tipo. Existe pela print colada: ela chega com
     imagem e com PROPORÇÃO própria, e um `shot` no tamanho genérico nasceria
     esticado até alguém puxar a alça. Ver `colarNoCanvasAction`. */
  campos: { img?: string; w?: number; h?: number; txt?: string | null } = {},
): Promise<string> {
  const id = novoId("no");
  const padrao = TAMANHO_PADRAO[tipo] ?? { w: 180, h: 64, txt: "Novo" };
  const d = {
    w: campos.w ?? padrao.w,
    h: campos.h ?? padrao.h,
    txt: campos.txt !== undefined ? campos.txt : padrao.txt,
  };
  const canvas = lerCanvas(paginaId);
  canvas.nos.push({
    id,
    paginaId,
    tipo: tipo as NoBoard["tipo"],
    x: Math.round(x - d.w / 2),
    y: Math.round(y - d.h / 2),
    w: d.w,
    h: d.h,
    z: proximoZ(canvas.nos),
    txt: d.txt,
    legenda: null,
    html: null,
    url: null,
    img: campos.img ?? null,
    comp: null,
    cor: null,
    corTxt: null,
    contorno: null,
    fs: null,
    fw: null,
    ta: null,
    raio: null,
    opacidade: null,
  });
  gravarCanvas(paginaId, canvas);
  return id;
}

/** Cascata manual: sem CASCADE de banco, aresta e gaveta do nó excluído ficariam órfãs. */
export async function excluirNo(id: string) {
  const achado = acharPaginaDoNo(id);
  if (!achado) return;
  const { paginaId, dado } = achado;
  dado.nos = dado.nos.filter((n) => n.id !== id);
  dado.arestas = dado.arestas.filter((a) => a.de !== id && a.para !== id);
  delete dado.gavetas[id];
  gravarCanvas(paginaId, dado);
}

/** Conecta dois nós. Os lados vêm da âncora que o React Flow usou. */
export async function criarAresta(
  paginaId: string,
  de: string,
  para: string,
  ladoDe: string | null,
  ladoPara: string | null,
) {
  const canvas = lerCanvas(paginaId);
  canvas.arestas.push({
    id: novoId("aresta"),
    paginaId,
    de,
    para,
    ladoDe: ladoDe as ArestaBoard["ladoDe"],
    ladoPara: ladoPara as ArestaBoard["ladoPara"],
    tracejada: false,
    falha: false,
    rotulo: null,
  });
  gravarCanvas(paginaId, canvas);
}

/**
 * Cola um recorte de outra tela (ou da mesma) — nós, os conectores entre eles
 * e as gavetas.
 *
 * A GEOMETRIA RELATIVA É PRESERVADA, e é isso que separa "colar" de "criar N
 * nós": o que se copiou foi um arranjo, não um punhado de caixas. O bloco
 * inteiro é transladado pelo canto superior esquerdo do próprio conteúdo até o
 * ponto de destino, então a distância entre as peças chega igual à de origem.
 *
 * TODO ID É NOVO — nó, aresta, aba e item. Reaproveitar id de outra página
 * criaria dois registros com a mesma chave em arquivos diferentes, e as funções
 * que procuram por id (`acharPaginaDoNo` e irmãs) passariam a devolver o
 * primeiro que encontrassem: editar um nó mexeria no gêmeo, em outra tela.
 *
 * As arestas são remapeadas pelo dicionário de ids; as que apontariam pra fora
 * do recorte já foram descartadas na cópia (ver `areaTransferencia.ts`), mas o
 * `if` continua aqui porque este arquivo não pode depender do que a tela filtrou.
 */
export async function colarNos(
  paginaId: string,
  recorte: { nos: NoBoard[]; arestas: ArestaBoard[]; gavetas: GavetasDaPagina },
  destino: { x: number; y: number },
): Promise<string[]> {
  if (!recorte.nos.length) return [];

  const canvas = lerCanvas(paginaId);
  const menorX = Math.min(...recorte.nos.map((n) => n.x));
  const menorY = Math.min(...recorte.nos.map((n) => n.y));
  const dx = Math.round(destino.x - menorX);
  const dy = Math.round(destino.y - menorY);

  /* O `z` sobe a partir do topo atual, mantendo a ordem RELATIVA de quem foi
     copiado: colar um bloco põe ele todo na frente, sem achatar as camadas que
     existiam dentro dele. */
  const base = proximoZ(canvas.nos);
  const porZ = [...recorte.nos].sort((a, b) => (a.z ?? 1) - (b.z ?? 1));
  const zNovo = new Map(porZ.map((n, i) => [n.id, base + i]));

  const idNovo = new Map<string, string>();
  for (const n of recorte.nos) idNovo.set(n.id, novoId("no"));

  for (const n of recorte.nos) {
    const novo = idNovo.get(n.id)!;
    canvas.nos.push({
      ...n,
      id: novo,
      paginaId,
      x: n.x + dx,
      y: n.y + dy,
      z: zNovo.get(n.id) ?? base,
    });

    const abas = recorte.gavetas[n.id] ?? [];
    if (abas.length) {
      canvas.gavetas[novo] = abas.map((aba) => {
        const novaAba = novoId("aba");
        return {
          id: novaAba,
          noId: novo,
          nome: aba.nome,
          kind: aba.kind,
          ordem: aba.ordem,
          itens: aba.itens.map((item) => ({
            ...item,
            id: novoId("item"),
            abaId: novaAba,
          })),
        };
      });
    }
  }

  for (const a of recorte.arestas) {
    const de = idNovo.get(a.de);
    const para = idNovo.get(a.para);
    if (!de || !para) continue;
    canvas.arestas.push({ ...a, id: novoId("aresta"), paginaId, de, para });
  }

  gravarCanvas(paginaId, canvas);
  return [...idNovo.values()];
}

/**
 * Ctrl+Z: devolve a página ao estado anterior à última gravação.
 *
 * ESCOPO É A PÁGINA, não o app. Desfazer no canvas do Onboarding não pode
 * mexer no Método nem na árvore — o gesto aconteceu numa tela, e é nela que a
 * volta tem que acontecer. Como cada página é um arquivo, esse escopo sai de
 * graça: basta desfazer o arquivo dela.
 *
 * Devolve `false` quando não há mais passo — a tela usa pra não revalidar à toa.
 */
export async function desfazerPagina(paginaId: string): Promise<boolean> {
  return desfazerArquivo(arquivoDaPagina(paginaId));
}

/** Quantos Ctrl+Z ainda cabem nesta página. */
export async function passosDesfazer(paginaId: string): Promise<number> {
  return passosDe(arquivoDaPagina(paginaId));
}

/** Troca o rótulo do nó. Sem isto todo nó criado morre dizendo "Ação". */
export async function textoNo(id: string, txt: string) {
  const achado = acharPaginaDoNo(id);
  if (!achado) return;
  const { paginaId, dado } = achado;
  dado.nos = dado.nos.map((n) => (n.id === id ? { ...n, txt } : n));
  gravarCanvas(paginaId, dado);
}

/** Grava o tamanho depois do redimensionamento. */
export async function tamanhoNo(id: string, w: number, h: number) {
  const achado = acharPaginaDoNo(id);
  if (!achado) return;
  const { paginaId, dado } = achado;
  const wArred = Math.max(40, Math.round(w));
  const hArred = Math.max(28, Math.round(h));
  dado.nos = dado.nos.map((n) => (n.id === id ? { ...n, w: wArred, h: hArred } : n));
  gravarCanvas(paginaId, dado);
}

// --- a gaveta do nó ----------------------------------------------------------

/** As abas e itens de uma página, ordenados — mesma regra de antes. */
export const getGavetas = cache(async (paginaId: string): Promise<GavetasDaPagina> => {
  const canvas = lerCanvas(paginaId);
  const saida: GavetasDaPagina = {};
  for (const [noId, abas] of Object.entries(canvas.gavetas)) {
    saida[noId] = abas
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((a) => ({ ...a, itens: a.itens.slice().sort((x, y) => x.ordem - y.ordem) }));
  }
  return saida;
});

/** As duas abas que toda gaveta nasce tendo. */
const ABAS_PADRAO: { nome: string; kind: KindAba }[] = [
  { nome: "Ferramentas", kind: "lista" },
  { nome: "Depoimentos", kind: "galeria" },
];

/**
 * Garante que o nó tenha gaveta. Chamada só ao abrir EDITANDO — criar as duas
 * abas pros nós todos de uma vez encheria o arquivo de gaveta vazia.
 */
export async function garantirAbas(noId: string): Promise<void> {
  const achado = acharPaginaDoNo(noId);
  if (!achado) return;
  const { paginaId, dado } = achado;
  if (dado.gavetas[noId]?.length) return;
  dado.gavetas[noId] = ABAS_PADRAO.map((a, i) => ({
    id: novoId("aba"),
    noId,
    nome: a.nome,
    kind: a.kind,
    ordem: i,
    itens: [],
  }));
  gravarCanvas(paginaId, dado);
}

export async function criarAba(noId: string, nome: string, kind: KindAba): Promise<string> {
  const achado = acharPaginaDoNo(noId);
  if (!achado) throw new Error(`Nó ${noId} não existe.`);
  const { paginaId, dado } = achado;
  const id = novoId("aba");
  const abas = (dado.gavetas[noId] ??= []);
  abas.push({ id, noId, nome, kind, ordem: proximaOrdem(abas), itens: [] });
  gravarCanvas(paginaId, dado);
  return id;
}

export async function renomearAba(id: string, nome: string) {
  const achado = acharPaginaDaAba(id);
  if (!achado) return;
  const { paginaId, dado } = achado;
  for (const abas of Object.values(dado.gavetas)) {
    const aba = abas.find((a) => a.id === id);
    if (aba) aba.nome = nome;
  }
  gravarCanvas(paginaId, dado);
}

/** Recusa a última: gaveta sem aba nenhuma não teria onde desenhar o `+`. */
export async function excluirAba(id: string): Promise<boolean> {
  const achado = acharPaginaDaAba(id);
  if (!achado) return false;
  const { paginaId, dado } = achado;
  for (const [noId, abas] of Object.entries(dado.gavetas)) {
    if (!abas.some((a) => a.id === id)) continue;
    if (abas.length <= 1) return false;
    dado.gavetas[noId] = abas.filter((a) => a.id !== id);
    gravarCanvas(paginaId, dado);
    return true;
  }
  return false;
}

export async function criarItem(
  abaId: string,
  tipo: TipoItem,
  campos: { nome?: string | null; url?: string | null; src?: string | null } = {},
): Promise<string> {
  const achado = acharPaginaDaAba(abaId);
  if (!achado) throw new Error(`Aba ${abaId} não existe.`);
  const { paginaId, dado } = achado;
  const id = novoId("item");
  for (const abas of Object.values(dado.gavetas)) {
    const aba = abas.find((a) => a.id === abaId);
    if (!aba) continue;
    aba.itens.push({
      id,
      abaId,
      tipo,
      nome: campos.nome ?? null,
      url: campos.url ?? null,
      src: campos.src ?? null,
      oitenta: false,
      pre: false,
      ordem: proximaOrdem(aba.itens),
    });
  }
  gravarCanvas(paginaId, dado);
  return id;
}

/** Campos editáveis do item. `undefined` não toca no campo. */
export async function editarItem(
  id: string,
  patch: { tipo?: TipoItem; nome?: string | null; url?: string | null; src?: string | null },
) {
  const achado = acharPaginaDoItem(id);
  if (!achado) return;
  const { paginaId, dado, aba } = achado;
  const item = aba.itens.find((i) => i.id === id);
  if (!item) return;
  Object.assign(item, patch);
  gravarCanvas(paginaId, dado);
}

export async function excluirItem(id: string) {
  const achado = acharPaginaDoItem(id);
  if (!achado) return;
  const { paginaId, dado, aba } = achado;
  aba.itens = aba.itens.filter((i) => i.id !== id);
  gravarCanvas(paginaId, dado);
}

/**
 * Marca ou desmarca 80/20 / imprescindível, com o teto aplicado antes de
 * gravar. A UI já desabilita o botão no teto — isto é a segunda porta.
 * Devolve `false` quando recusou, pra tela poder voltar atrás do otimismo.
 */
export async function marcarItem(id: string, marca: ChaveMarca): Promise<boolean> {
  const achado = acharPaginaDoItem(id);
  if (!achado) return false;
  const { paginaId, dado, aba } = achado;
  const item = aba.itens.find((i) => i.id === id);
  if (!item) return false;
  const campo = marca === "oitenta" ? "oitenta" : "pre";
  if (!item[campo]) {
    const marcados = aba.itens.filter((i) => i[campo]).length;
    if (marcados >= TETO_MARCA[marca]) return false;
  }
  item[campo] = !item[campo];
  gravarCanvas(paginaId, dado);
  return true;
}

// --- desenho livre -----------------------------------------------------------

export async function editarAresta(
  id: string,
  patch: Partial<Pick<ArestaBoard, "rotulo" | "tracejada" | "falha">>,
) {
  const achado = acharPaginaDaAresta(id);
  if (!achado) return;
  const { paginaId, dado } = achado;
  dado.arestas = dado.arestas.map((a) => (a.id === id ? { ...a, ...patch } : a));
  gravarCanvas(paginaId, dado);
}

/** Sem isto, conector ligado errado ficava pra sempre — só saía editando arquivo na mão. */
export async function excluirAresta(id: string) {
  const achado = acharPaginaDaAresta(id);
  if (!achado) return;
  const { paginaId, dado } = achado;
  dado.arestas = dado.arestas.filter((a) => a.id !== id);
  gravarCanvas(paginaId, dado);
}

/**
 * Camada: pra frente ou pra trás, dentro da página. Vai pro EXTREMO, não um
 * degrau — "põe isso na frente de tudo", não "sobe um degrau".
 *
 * `zs.map(n => n.z ?? 1)` com `Math.max(...zs, 1)`: o `1` extra no fim do
 * `max`/`min` cobre tanto a página sem nó nenhum quanto a página onde todo nó
 * ainda não tem `z` — nos dois casos o resultado parte de 1, não de `-Infinity`.
 */
export async function camadaNo(id: string, direcao: "frente" | "tras") {
  const achado = acharPaginaDoNo(id);
  if (!achado) return;
  const { paginaId, dado } = achado;
  const zs = dado.nos.map((n) => n.z ?? 1);
  const novoZ = direcao === "frente" ? Math.max(...zs, 1) + 1 : Math.min(...zs, 1) - 1;
  dado.nos = dado.nos.map((n) => (n.id === id ? { ...n, z: novoZ } : n));
  gravarCanvas(paginaId, dado);
}

/**
 * Duplica o nó — com a gaveta junto. As arestas NÃO vêm: conector é relação
 * entre dois nós, e duplicar um deles não duplica a relação.
 */
export async function duplicarNo(id: string): Promise<string | null> {
  const achado = acharPaginaDoNo(id);
  if (!achado) return null;
  const { paginaId, dado } = achado;
  const original = dado.nos.find((n) => n.id === id);
  if (!original) return null;

  const novo = novoId("no");
  dado.nos.push({ ...original, id: novo, x: original.x + 24, y: original.y + 24, z: proximoZ(dado.nos) });

  const abasOriginais = dado.gavetas[id] ?? [];
  if (abasOriginais.length) {
    dado.gavetas[novo] = abasOriginais.map((aba) => {
      const novaAba = novoId("aba");
      return {
        id: novaAba,
        noId: novo,
        nome: aba.nome,
        kind: aba.kind,
        ordem: aba.ordem,
        itens: aba.itens.map((item) => ({ ...item, id: `${novaAba}-${item.ordem}`, abaId: novaAba })),
      };
    });
  }
  gravarCanvas(paginaId, dado);
  return novo;
}
