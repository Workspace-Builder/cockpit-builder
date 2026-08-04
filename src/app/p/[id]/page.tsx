import { notFound } from "next/navigation";
import AppShell from "@/components/shell/AppShell";
import {
  getCanvas,
  getGavetas,
  getPagina,
  listarArvore,
  listarOitentaVinte,
  listarPassosDaObra,
  listarPublicadas,
} from "@/lib/queries";
import { ID_OBRA } from "@/lib/passos";
import { PODE_EDITAR } from "@/lib/modo";

/**
 * Quais páginas viram arquivo na build do aluno (`MODO=aluno`).
 *
 * `output: "export"` exige esta função em rota dinâmica — sem ela o build nem
 * começa. Mas ela não é só burocracia: é o controle de publicação. A lista sai
 * de `dados/publicadas.json`, então liberar uma tela pro aluno é acrescentar
 * um id ali e buildar, sem tocar em código.
 *
 * VAZIA NO EDITOR, de propósito. Pré-gerar aqui assaria o HTML da página no
 * build e quem editasse depois continuaria vendo a foto antiga — o editor lê
 * `dados/` a cada requisição justamente pra isso não acontecer. Devolver `[]`
 * mantém tudo sob demanda, como era antes desta função existir.
 */
export async function generateStaticParams() {
  if (PODE_EDITAR) return [];
  return (await listarPublicadas()).map((id) => ({ id }));
}

/**
 * A página aberta é a rota. Com a árvore em `dados/`, o servidor consegue
 * validar o id — link pra página que não existe dá 404 de verdade, em vez do
 * "não encontrada" client-side que o localStorage obrigava.
 *
 * `key={id}` remonta a casca a cada troca de página: é o que zera a vista e o
 * item selecionado sem precisar de effect de limpeza.
 *
 * `?v=` e `?andar=` NÃO são lidos aqui, e isso mudou em 2026-08-03. Ler
 * `searchParams` num Server Component força render por requisição — o que é
 * incompatível com a build estática, onde não existe requisição: a página é
 * escrita uma vez, no build, e a query só existe depois, no navegador de quem
 * abriu o link. As duas passaram a ser lidas no cliente (ver `AppShell`).
 */
export default async function PaginaDoCockpit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // O 80/20 só é lido na Obra: é a única página que desenha os entregáveis, e
  // uma ida ao disco em TODA rota pra um dado que ninguém mais usa é o tipo de
  // custo que ninguém percebe até a árvore crescer.
  //
  // As gavetas vêm junto com o canvas, não uma por clique: são dezenas de
  // linhas no total, e a gaveta abrir instantânea vale mais que a leitura
  // economizada em quem nunca clica.
  const [arvore, achado, canvas, oitentaVinte, gavetas, passos, publicadas] =
    await Promise.all([
      listarArvore(),
      getPagina(id),
      getCanvas(id),
      id === ID_OBRA ? listarOitentaVinte() : Promise.resolve({}),
      getGavetas(id),
      id === ID_OBRA ? listarPassosDaObra() : Promise.resolve([]),
      listarPublicadas(),
    ]);
  if (!achado) notFound();

  /* A barra lateral do aluno só pode listar o que virou arquivo. Sem este
     filtro ela mostraria a árvore inteira e cada página não publicada seria um
     404 esperando — a pior forma de o aluno descobrir que a tela não existe
     pra ele. No editor a árvore continua inteira. */
  const publicaveis = new Set(publicadas);
  const arvoreVisivel = PODE_EDITAR
    ? arvore
    : arvore
        .map((g) => ({
          ...g,
          paginas: g.paginas.filter((p) => publicaveis.has(p.id)),
        }))
        .filter((g) => g.paginas.length > 0);

  return (
    <AppShell
      key={id}
      arvore={arvoreVisivel}
      pagina={achado.pagina}
      pasta={achado.pasta}
      nos={canvas.nos}
      arestas={canvas.arestas}
      oitentaVinte={oitentaVinte}
      passos={passos}
      gavetas={gavetas}
    />
  );
}
