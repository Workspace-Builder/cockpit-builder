import "server-only";
import { cache } from "react";
import { query, transacao } from "./db";
import { novoId } from "./ids";
import type {
  ArestaBoard,
  GrupoArvore,
  Lado,
  NoBoard,
  Pagina,
  Pasta,
  TipoNo,
  Vista,
} from "./model";

// ---------------------------------------------------------------------------
// Acesso ao banco — o único lugar com SQL
// ---------------------------------------------------------------------------
// Componente não escreve SQL. Se apareceu `SELECT` fora deste arquivo, é aqui
// que deveria estar.
//
// `cache()` deduplica por request: a árvore é lida pelo layout e pela página no
// mesmo render, e sem isso seriam duas idas ao banco pelo mesmo dado.
// ---------------------------------------------------------------------------

type LinhaPasta = { id: string; nome: string; ordem: number };
type LinhaPagina = {
  id: string;
  pasta_id: string;
  nome: string;
  resumo: string | null;
  ordem: number;
};
type LinhaVista = {
  id: string;
  pagina_id: string;
  rotulo: string;
  x: number | null;
  y: number | null;
  zoom: number | null;
};

/**
 * A árvore inteira em 3 consultas — não em 1 + N.
 * São dezenas de linhas no total; montar em JS sai mais barato (e mais legível)
 * do que um JOIN com agregação aninhada.
 */
export const listarArvore = cache(async (): Promise<GrupoArvore[]> => {
  const [pastas, paginas, vistas] = await Promise.all([
    query<LinhaPasta>(
      "SELECT id, nome, ordem FROM cockpit.pasta ORDER BY ordem, criada_em",
    ),
    query<LinhaPagina>(
      "SELECT id, pasta_id, nome, resumo, ordem FROM cockpit.pagina ORDER BY ordem, criada_em",
    ),
    query<LinhaVista>(
      `SELECT id::text, pagina_id, rotulo, x, y, zoom
       FROM cockpit.vista ORDER BY ordem, id`,
    ),
  ]);

  const vistasDe = new Map<string, Vista[]>();
  for (const v of vistas) {
    const lista = vistasDe.get(v.pagina_id) ?? [];
    lista.push({ id: v.id, label: v.rotulo, x: v.x, y: v.y, zoom: v.zoom });
    vistasDe.set(v.pagina_id, lista);
  }

  const paginasDe = new Map<string, Pagina[]>();
  for (const p of paginas) {
    const lista = paginasDe.get(p.pasta_id) ?? [];
    lista.push({
      id: p.id,
      nome: p.nome,
      pastaId: p.pasta_id,
      ordem: p.ordem,
      resumo: p.resumo ?? undefined,
      vistas: vistasDe.get(p.id) ?? [],
    });
    paginasDe.set(p.pasta_id, lista);
  }

  return pastas.map((f: LinhaPasta) => ({
    pasta: { id: f.id, nome: f.nome, ordem: f.ordem } satisfies Pasta,
    paginas: paginasDe.get(f.id) ?? [],
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
  const [nos, arestas] = await Promise.all([
    query<{
      id: string;
      pagina_id: string;
      tipo: string;
      x: number;
      y: number;
      w: number | null;
      h: number | null;
      z: number | null;
      txt: string | null;
      legenda: string | null;
      html: string | null;
      url: string | null;
      img: string | null;
      comp: string | null;
      cor: string | null;
      cor_txt: string | null;
      contorno: string | null;
      fs: number | null;
      fw: number | null;
      ta: string | null;
    }>(
      `SELECT id, pagina_id, tipo, x, y, w, h, z, txt, legenda, html, url, img, comp,
              cor, cor_txt, contorno, fs, fw, ta
       FROM cockpit.no WHERE pagina_id = $1 ORDER BY z NULLS FIRST, id`,
      [paginaId],
    ),
    query<{
      id: string;
      pagina_id: string;
      de: string;
      para: string;
      lado_de: string | null;
      lado_para: string | null;
      tracejada: boolean;
      falha: boolean;
      rotulo: string | null;
    }>(
      `SELECT id::text, pagina_id, de, para, lado_de, lado_para, tracejada, falha, rotulo
       FROM cockpit.aresta WHERE pagina_id = $1 ORDER BY id`,
      [paginaId],
    ),
  ]);

  return {
    nos: nos.map(
      (n): NoBoard => ({
        id: n.id,
        paginaId: n.pagina_id,
        tipo: n.tipo as TipoNo,
        x: n.x,
        y: n.y,
        w: n.w,
        h: n.h,
        z: n.z,
        txt: n.txt,
        legenda: n.legenda,
        html: n.html,
        url: n.url,
        img: n.img,
        comp: n.comp,
        cor: n.cor,
        corTxt: n.cor_txt,
        contorno: n.contorno as NoBoard["contorno"],
        fs: n.fs,
        fw: n.fw,
        ta: n.ta as NoBoard["ta"],
      }),
    ),
    arestas: arestas.map(
      (a): ArestaBoard => ({
        id: a.id,
        paginaId: a.pagina_id,
        de: a.de,
        para: a.para,
        ladoDe: (a.lado_de as Lado) ?? null,
        ladoPara: (a.lado_para as Lado) ?? null,
        tracejada: a.tracejada,
        falha: a.falha,
        rotulo: a.rotulo,
      }),
    ),
  };
});

/** Destino do `/` e da exclusão da página aberta. */
export async function primeiraPagina(): Promise<Pagina | null> {
  for (const g of await listarArvore()) if (g.paginas[0]) return g.paginas[0];
  return null;
}

// --- escrita ---------------------------------------------------------------

/**
 * Página nova nasce SEM checkpoint. Antes ela vinha com quatro rótulos
 * genéricos ("Ver tudo", "Ver uma parte"…) que não enquadravam nada — barra
 * cheia de botão morto. Checkpoint agora só existe quando alguém salva um.
 */
export async function criarPagina(pastaId: string): Promise<string> {
  const id = novoId("pag");
  await query(
    `INSERT INTO cockpit.pagina (id, pasta_id, nome, ordem)
     VALUES ($1, $2, 'Página sem nome',
             (SELECT COALESCE(MAX(ordem) + 1, 0) FROM cockpit.pagina WHERE pasta_id = $2))`,
    [id, pastaId],
  );
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
  await query(
    `INSERT INTO cockpit.vista (pagina_id, rotulo, ordem, x, y, zoom)
     VALUES ($1, $2,
             (SELECT COALESCE(MAX(ordem) + 1, 0) FROM cockpit.vista WHERE pagina_id = $1),
             $3, $4, $5)`,
    [paginaId, label, x, y, zoom],
  );
}

/** Regrava o enquadramento de um checkpoint que já existe. */
export async function regravarCheckpoint(
  id: string,
  x: number,
  y: number,
  zoom: number,
) {
  await query("UPDATE cockpit.vista SET x=$2, y=$3, zoom=$4 WHERE id=$1", [
    id,
    x,
    y,
    zoom,
  ]);
}

export async function renomearCheckpoint(id: string, label: string) {
  await query("UPDATE cockpit.vista SET rotulo=$2 WHERE id=$1", [id, label]);
}

export async function excluirCheckpoint(id: string) {
  await query("DELETE FROM cockpit.vista WHERE id=$1", [id]);
}

export async function criarPasta(): Promise<string> {
  const id = novoId("pasta");
  await query(
    `INSERT INTO cockpit.pasta (id, nome, ordem)
     VALUES ($1, 'Pasta sem nome', (SELECT COALESCE(MAX(ordem) + 1, 0) FROM cockpit.pasta))`,
    [id],
  );
  return id;
}

/** Duplica a página e as vistas dela. Nós virão junto quando existirem. */
export async function duplicarPagina(id: string): Promise<string | null> {
  const novo = novoId("pag");
  const ok = await transacao(async (exec) => {
    const linhas = await exec(
      `INSERT INTO cockpit.pagina (id, pasta_id, nome, resumo, ordem)
       SELECT $1, pasta_id, nome || ' (cópia)', resumo,
              (SELECT COALESCE(MAX(ordem) + 1, 0) FROM cockpit.pagina p2 WHERE p2.pasta_id = p.pasta_id)
       FROM cockpit.pagina p WHERE p.id = $2
       RETURNING id`,
      [novo, id],
    );
    if (!linhas.length) return false;
    await exec(
      `INSERT INTO cockpit.vista (pagina_id, rotulo, ordem)
       SELECT $1, rotulo, ordem FROM cockpit.vista WHERE pagina_id = $2 ORDER BY ordem`,
      [novo, id],
    );
    return true;
  });
  return ok ? novo : null;
}

export async function renomearPagina(id: string, nome: string) {
  await query("UPDATE cockpit.pagina SET nome = $2 WHERE id = $1", [id, nome]);
}

export async function renomearPasta(id: string, nome: string) {
  await query("UPDATE cockpit.pasta SET nome = $2 WHERE id = $1", [id, nome]);
}

export async function excluirPagina(id: string) {
  await query("DELETE FROM cockpit.pagina WHERE id = $1", [id]);
}

/**
 * Excluir pasta leva as páginas junto (ON DELETE CASCADE no schema). Pasta sem
 * página e página sem pasta seriam dois estados inválidos pra sustentar depois.
 */
export async function excluirPasta(id: string) {
  await query("DELETE FROM cockpit.pasta WHERE id = $1", [id]);
}

// --- posição dos nós --------------------------------------------------------

/**
 * Grava a posição de N nós de uma vez.
 *
 * Um UPDATE só, não um por nó: arrastar uma seleção de doze nós não deve virar
 * doze idas ao banco, e em `unnest` ou grava tudo ou não grava nada — meia
 * gravação deixaria o desenho num estado que ninguém desenhou.
 *
 * `pagina_id = $4` não é redundância: é a tranca. Sem ela, um id vindo do
 * cliente moveria nó de qualquer outra página, e não há login pra impedir.
 */
export async function moverNos(
  paginaId: string,
  movidos: { id: string; x: number; y: number }[],
) {
  if (!movidos.length) return;
  await query(
    `UPDATE cockpit.no AS n
        SET x = v.x, y = v.y
       FROM unnest($1::text[], $2::int[], $3::int[]) AS v(id, x, y)
      WHERE n.id = v.id AND n.pagina_id = $4`,
    [
      movidos.map((m) => m.id),
      movidos.map((m) => Math.round(m.x)),
      movidos.map((m) => Math.round(m.y)),
      paginaId,
    ],
  );
}

/**
 * Grava o estilo de um nó (migration 007). Só o que veio no `patch` é tocado:
 * mexer na cor não pode zerar a fonte que alguém acabou de escolher.
 *
 * Campo com `null` explícito volta ao padrão do tipo — é assim que o botão
 * "voltar ao padrão" funciona sem precisar de coluna extra.
 */
export async function estiloNo(
  id: string,
  patch: Partial<
    Pick<NoBoard, "cor" | "corTxt" | "contorno" | "fs" | "fw" | "ta">
  >,
) {
  const COLUNA = {
    cor: "cor",
    corTxt: "cor_txt",
    contorno: "contorno",
    fs: "fs",
    fw: "fw",
    ta: "ta",
  } as const;

  const campos: string[] = [];
  const valores: unknown[] = [id];
  for (const [chave, coluna] of Object.entries(COLUNA)) {
    if (!(chave in patch)) continue;
    valores.push(patch[chave as keyof typeof COLUNA]);
    campos.push(`${coluna} = $${valores.length}`);
  }
  if (!campos.length) return;

  await query(
    `UPDATE cockpit.no SET ${campos.join(", ")} WHERE id = $1`,
    valores,
  );
}

/**
 * Reordena os checkpoints de uma página.
 *
 * Recebe os ids na ordem nova e regrava `ordem` pelo índice. Vai em transação
 * porque ordem pela metade é pior que ordem errada: a barra ficaria com dois
 * botões disputando a mesma posição até alguém salvar de novo.
 */
export async function reordenarCheckpoints(paginaId: string, ids: string[]) {
  await transacao(async (exec) => {
    for (let i = 0; i < ids.length; i++) {
      await exec(
        "UPDATE cockpit.vista SET ordem = $3 WHERE id = $1 AND pagina_id = $2",
        [ids[i], paginaId, i],
      );
    }
  });
}

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
 * Cria um nó no ponto onde a pessoa clicou.
 *
 * Nasce com o tamanho e o rótulo do tipo — nó de 0×0 sem texto é invisível, e
 * o primeiro gesto depois de inserir viraria "procurar o que acabei de criar".
 */
export async function criarNo(
  paginaId: string,
  tipo: string,
  x: number,
  y: number,
): Promise<string> {
  const id = novoId("no");
  const d = TAMANHO_PADRAO[tipo] ?? { w: 180, h: 64, txt: "Novo" };
  await query(
    `INSERT INTO cockpit.no (id, pagina_id, tipo, x, y, w, h, txt, z)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
             (SELECT COALESCE(MAX(z) + 1, 1) FROM cockpit.no WHERE pagina_id = $2))`,
    [id, paginaId, tipo, Math.round(x - d.w / 2), Math.round(y - d.h / 2), d.w, d.h, d.txt],
  );
  return id;
}

export async function excluirNo(id: string) {
  await query("DELETE FROM cockpit.no WHERE id = $1", [id]);
}

/** Conecta dois nós. Os lados vêm da âncora que o React Flow usou. */
export async function criarAresta(
  paginaId: string,
  de: string,
  para: string,
  ladoDe: string | null,
  ladoPara: string | null,
) {
  await query(
    `INSERT INTO cockpit.aresta (pagina_id, de, para, lado_de, lado_para)
     VALUES ($1,$2,$3,$4,$5)`,
    [paginaId, de, para, ladoDe, ladoPara],
  );
}

/** Troca o rótulo do nó. Sem isto todo nó criado morre dizendo "Ação". */
export async function textoNo(id: string, txt: string) {
  await query("UPDATE cockpit.no SET txt = $2 WHERE id = $1", [id, txt]);
}

/** Grava o tamanho depois do redimensionamento. */
export async function tamanhoNo(id: string, w: number, h: number) {
  await query("UPDATE cockpit.no SET w = $2, h = $3 WHERE id = $1", [
    id,
    Math.max(40, Math.round(w)),
    Math.max(28, Math.round(h)),
  ]);
}
