import { redirect } from "next/navigation";
import { primeiraPagina } from "@/lib/queries";

/**
 * Sem isto o Next prerenderiza a raiz no build e assa o destino do redirect.
 * Quem apagasse a primeira página depois cairia num id morto: `/` mandaria
 * pra uma página que não existe mais.
 */
export const dynamic = "force-dynamic";

/**
 * A raiz não tem tela própria: manda pra primeira página da árvore.
 * Agora que a árvore mora no banco, isso é resolvido no servidor — antes
 * dependia do localStorage e só dava pra decidir depois de hidratar.
 */
export default async function Inicio() {
  const p = await primeiraPagina();
  redirect(p ? `/p/${p.id}` : "/p/nenhuma");
}
