import { notFound } from "next/navigation";
import AppShell from "@/components/shell/AppShell";
import { getCanvas, getPagina, listarArvore } from "@/lib/queries";

/**
 * A página aberta é a rota. Com a árvore no banco, o servidor consegue
 * validar o id — link pra página que não existe dá 404 de verdade, em vez do
 * "não encontrada" client-side que o localStorage obrigava.
 *
 * `key={id}` remonta a casca a cada troca de página: é o que zera a vista e o
 * item selecionado sem precisar de effect de limpeza.
 */
export default async function PaginaDoCockpit({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const [{ id }, { v }] = await Promise.all([params, searchParams]);
  const [arvore, achado, canvas] = await Promise.all([
    listarArvore(),
    getPagina(id),
    getCanvas(id),
  ]);
  if (!achado) notFound();

  // O checkpoint vem da URL, resolvido no servidor: assim `?v=3` já renderiza
  // com o botão certo aceso, sem effect nem piscada.
  const n = Number(v);
  const vistaInicial =
    Number.isInteger(n) && n > 0 && n < achado.pagina.vistas.length ? n : 0;

  return (
    <AppShell
      key={id}
      arvore={arvore}
      pagina={achado.pagina}
      pasta={achado.pasta}
      nos={canvas.nos}
      arestas={canvas.arestas}
      vistaInicial={vistaInicial}
    />
  );
}
