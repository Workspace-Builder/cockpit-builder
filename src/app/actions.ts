"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as db from "@/lib/queries";
import { removerImagemColada, salvarImagemColada } from "@/lib/imagens";
import type { ChaveMarca, ChaveVaga, KindAba, TipoItem, Vaga } from "@/lib/model";

// ---------------------------------------------------------------------------
// As ações de escrita
// ---------------------------------------------------------------------------
// Server Actions em vez de rotas de API: o cliente chama a função, o Next faz
// o POST. Uma camada a menos pra manter, e o SQL nunca chega perto do bundle.
//
// SEM AUTENTICAÇÃO POR ORA — decisão consciente, não esquecimento: quem tem o
// link cria, renomeia e apaga página de todo mundo. Enquanto o app for interno
// e não publicado, o custo disso é baixo; no dia em que o aluno receber a URL,
// isto aqui vira a primeira coisa a fechar.
//
// `revalidatePath("/", "layout")` invalida a árvore inteira: ela aparece na
// barra lateral de TODAS as rotas, não só na que mudou.
// ---------------------------------------------------------------------------

function atualizarArvore() {
  revalidatePath("/", "layout");
}

export async function criarPaginaAction(pastaId: string) {
  const id = await db.criarPagina(pastaId);
  atualizarArvore();
  redirect(`/p/${id}`);
}

export async function criarPastaAction() {
  await db.criarPasta();
  atualizarArvore();
}

export async function duplicarPaginaAction(id: string) {
  const novo = await db.duplicarPagina(id);
  atualizarArvore();
  if (novo) redirect(`/p/${novo}`);
}

export async function renomearPaginaAction(id: string, nome: string) {
  const limpo = nome.trim();
  if (!limpo) return; // nome vazio deixaria a página anônima na árvore
  await db.renomearPagina(id, limpo);
  atualizarArvore();
}

export async function renomearPastaAction(id: string, nome: string) {
  const limpo = nome.trim();
  if (!limpo) return;
  await db.renomearPasta(id, limpo);
  atualizarArvore();
}

export async function excluirPaginaAction(id: string) {
  await db.excluirPagina(id);
  atualizarArvore();
  const proxima = await db.primeiraPagina();
  redirect(proxima ? `/p/${proxima.id}` : "/");
}

// --- checkpoints ------------------------------------------------------------
// Salvar a tela é escrita como qualquer outra: vai pro banco e vale pra todo
// mundo que abrir o link. Não há "meu checkpoint" e "o dela" — não há login.

export async function salvarCheckpointAction(
  paginaId: string,
  label: string,
  x: number,
  y: number,
  zoom: number,
) {
  const limpo = label.trim() || "Sem nome";
  await db.salvarCheckpoint(paginaId, limpo, x, y, zoom);
  atualizarArvore();
}

export async function regravarCheckpointAction(
  id: string,
  x: number,
  y: number,
  zoom: number,
) {
  await db.regravarCheckpoint(id, x, y, zoom);
  atualizarArvore();
}

export async function renomearCheckpointAction(id: string, label: string) {
  const limpo = label.trim();
  if (!limpo) return;
  await db.renomearCheckpoint(id, limpo);
  atualizarArvore();
}

export async function excluirCheckpointAction(id: string) {
  await db.excluirCheckpoint(id);
  atualizarArvore();
}

export async function excluirPastaAction(id: string) {
  await db.excluirPasta(id);
  atualizarArvore();
  const proxima = await db.primeiraPagina();
  redirect(proxima ? `/p/${proxima.id}` : "/");
}

// --- posição dos nós --------------------------------------------------------

/**
 * A única escrita aqui que NÃO revalida — e é de propósito.
 *
 * Quem arrastou já está vendo o nó no lugar certo: o canvas mantém a posição
 * em estado local e só depois avisa o servidor. Revalidar devolveria a mesma
 * posição pelo caminho longo, com um re-render no meio — ou seja, uma piscada
 * a cada nó solto, em troca de nada.
 *
 * A conta muda no dia em que houver duas pessoas no mesmo board. Hoje não há:
 * não existe login, e o board tem um autor só.
 */
export async function moverNosAction(
  paginaId: string,
  movidos: { id: string; x: number; y: number }[],
) {
  await db.moverNos(paginaId, movidos);
}

// --- estilo do nó -----------------------------------------------------------

/**
 * O inspetor grava aqui. Revalida (ao contrário de `moverNosAction`): cor e
 * fonte mudam o desenho, e o canvas não tem cópia local disso pra mostrar
 * enquanto o servidor não responde.
 */
export async function estiloNoAction(
  id: string,
  patch: Parameters<typeof db.estiloNo>[1],
) {
  await db.estiloNo(id, patch);
  atualizarArvore();
}

export async function reordenarCheckpointsAction(
  paginaId: string,
  ids: string[],
) {
  await db.reordenarCheckpoints(paginaId, ids);
  atualizarArvore();
}

// --- criar e conectar -------------------------------------------------------

export async function criarNoAction(
  paginaId: string,
  tipo: string,
  x: number,
  y: number,
) {
  await db.criarNo(paginaId, tipo, x, y);
  atualizarArvore();
}

export async function excluirNoAction(id: string) {
  await db.excluirNo(id);
  atualizarArvore();
}

// --- colar print (Ctrl+V) ---------------------------------------------------
// Duas ações e não uma "salvar imagem" genérica: gravar o arquivo e registrar
// onde ele aparece é UM gesto do ponto de vista de quem cola, e uma ida só ao
// servidor.
//
// SÃO DOIS PASSOS, E O ARQUIVO VAI PRIMEIRO — o registro precisa do caminho.
// Por isso o `catch` que apaga: sem ele, um erro no segundo passo deixa um
// `.webp` que página nenhuma menciona, e como o repositório é o banco esse
// órfão é commitado e fica pra sempre. Não é hipótese — aconteceu enquanto
// isto estava sendo escrito: seis arquivos numa página que ficou com zero nós.
//
// A imagem chega já reduzida e em WebP — quem encolhe é o navegador
// (`canvas/colarImagem.ts`), pelo motivo explicado em `lib/imagens.ts`.

/** Print colada no palco: vira arquivo e um nó `shot` na proporção da imagem. */
export async function colarNoCanvasAction(
  paginaId: string,
  dataUrl: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const img = salvarImagemColada(paginaId, dataUrl);
  try {
    // `txt: null` porque o título vira a barra da janela do `shot`, e "Novo"
    // escrito ali é ruído em cima de uma print que já se explica.
    await db.criarNo(paginaId, "shot", x, y, { img, w, h, txt: null });
  } catch (erro) {
    removerImagemColada(img);
    throw erro;
  }
  atualizarArvore();
}

/** Print colada na gaveta: vira arquivo e um item IMAGEM na aba aberta. */
export async function colarNaGavetaAction(
  paginaId: string,
  abaId: string,
  dataUrl: string,
) {
  const src = salvarImagemColada(paginaId, dataUrl);
  let id: string;
  try {
    id = await db.criarItem(abaId, "img", { src });
  } catch (erro) {
    removerImagemColada(src);
    throw erro;
  }
  atualizarArvore();
  return id;
}

export async function criarArestaAction(
  paginaId: string,
  de: string,
  para: string,
  ladoDe: string | null,
  ladoPara: string | null,
) {
  await db.criarAresta(paginaId, de, para, ladoDe, ladoPara);
  atualizarArvore();
}

/**
 * Cola o recorte copiado de outra tela. Revalida, ao contrário de mover e
 * redimensionar: os nós colados não existem no canvas ainda, então não há
 * cópia local pra mostrar enquanto o servidor não responde.
 */
export async function colarNosAction(
  paginaId: string,
  recorte: Parameters<typeof db.colarNos>[1],
  destino: { x: number; y: number },
) {
  const criados = await db.colarNos(paginaId, recorte, destino);
  atualizarArvore();
  return criados;
}

/**
 * Ctrl+Z da página. Revalida SEMPRE que desfez — ao contrário de mover, que
 * não revalida de propósito: aqui a tela não tem como saber sozinha o que
 * voltou (pode ter sido um nó que renasceu, uma gaveta, uma cor), então o
 * único jeito honesto é reler do servidor.
 */
export async function desfazerAction(paginaId: string): Promise<boolean> {
  const desfez = await db.desfazerPagina(paginaId);
  if (desfez) atualizarArvore();
  return desfez;
}

export async function textoNoAction(id: string, txt: string) {
  await db.textoNo(id, txt.trim());
  atualizarArvore();
}

/**
 * Não revalida: igual ao arrastar, quem redimensionou já está vendo o
 * resultado, e recarregar a página a cada alça solta faria a tela piscar.
 */
export async function tamanhoNoAction(id: string, w: number, h: number) {
  await db.tamanhoNo(id, w, h);
}

// --- o 80/20 do entregável --------------------------------------------------

/**
 * Marca ou desmarca qual dos três caminhos do andar é o que traz resultado.
 *
 * Revalida, ao contrário de mover e redimensionar: a escolha é do editor da
 * página mas o selo é pra quem estudar, então precisa valer pra todo mundo que
 * abrir o link — não é preferência de quem clicou. O painel já mostrou a
 * marcação na hora, por otimismo, então a revalidação chega sem piscada.
 */
export async function alternarOitentaVinteAction(
  passoId: string,
  vaga: ChaveVaga,
) {
  await db.alternarOitentaVinte(passoId, vaga);
  atualizarArvore();
}

// --- a gaveta do nó (migration 010) -----------------------------------------
// Todas revalidam, ao contrário de mover e redimensionar: o conteúdo da gaveta
// é o que o aluno vai ler na página publicada, não posição de desenho. E os
// campos de texto gravam no BLUR, não a cada tecla — senão seria uma
// revalidação por letra digitada.

export async function garantirAbasAction(noId: string) {
  await db.garantirAbas(noId);
  atualizarArvore();
}

export async function criarAbaAction(
  noId: string,
  nome: string,
  kind: KindAba,
) {
  await db.criarAba(noId, nome.trim() || "Sem nome", kind);
  atualizarArvore();
}

export async function renomearAbaAction(id: string, nome: string) {
  const limpo = nome.trim();
  if (!limpo) return; // aba anônima não dá pra achar de novo
  await db.renomearAba(id, limpo);
  atualizarArvore();
}

/** Devolve `false` quando era a última aba — a gaveta precisa de uma. */
export async function excluirAbaAction(id: string): Promise<boolean> {
  const ok = await db.excluirAba(id);
  if (ok) atualizarArvore();
  return ok;
}

export async function criarItemAction(
  abaId: string,
  tipo: TipoItem,
  campos?: { nome?: string | null; url?: string | null; src?: string | null },
) {
  const id = await db.criarItem(abaId, tipo, campos);
  atualizarArvore();
  return id;
}

export async function editarItemAction(
  id: string,
  patch: Parameters<typeof db.editarItem>[1],
) {
  await db.editarItem(id, patch);
  atualizarArvore();
}

export async function excluirItemAction(id: string) {
  await db.excluirItem(id);
  atualizarArvore();
}

/**
 * 80/20 e imprescindível. Devolve `false` quando o teto recusou — a tela marca
 * por otimismo e usa isto pra voltar atrás sem inventar um erro na cara.
 */
export async function marcarItemAction(
  id: string,
  marca: ChaveMarca,
): Promise<boolean> {
  const ok = await db.marcarItem(id, marca);
  if (ok) atualizarArvore();
  return ok;
}

// --- desenho livre (migration 012) ------------------------------------------

export async function editarArestaAction(
  id: string,
  patch: Parameters<typeof db.editarAresta>[1],
) {
  await db.editarAresta(id, patch);
  atualizarArvore();
}

export async function salvarEntregavelAction(
  passoId: string,
  vaga: ChaveVaga,
  valor: Vaga,
) {
  const label = valor.label.trim();
  if (!label) return;
  await db.salvarEntregavel(passoId, vaga, {
    label,
    url: valor.url?.trim() || undefined,
    plat: vaga === "ferram" ? valor.plat : undefined,
    dentro: valor.dentro?.map((item) => item.trim()).filter(Boolean),
  });
  atualizarArvore();
}

export async function excluirEntregavelAction(passoId: string, vaga: ChaveVaga) {
  await db.excluirEntregavel(passoId, vaga);
  atualizarArvore();
}

export async function excluirArestaAction(id: string) {
  await db.excluirAresta(id);
  atualizarArvore();
}

export async function camadaNoAction(id: string, direcao: "frente" | "tras") {
  await db.camadaNo(id, direcao);
  atualizarArvore();
}

export async function duplicarNoAction(id: string) {
  const novo = await db.duplicarNo(id);
  atualizarArvore();
  return novo;
}
