"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as db from "@/lib/queries";

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
