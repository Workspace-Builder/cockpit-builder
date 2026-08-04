import Link from "next/link";
import { listarArvore, listarPublicadas } from "@/lib/queries";
import { PODE_EDITAR } from "@/lib/modo";

// ---------------------------------------------------------------------------
// A raiz — o índice
// ---------------------------------------------------------------------------
// Era `force-dynamic` + `redirect()` pra primeira página. Deixou de ser em
// 2026-08-03, e a troca resolve dois problemas de uma vez:
//
// 1. `redirect()` é decisão de servidor em tempo de requisição, e na build
//    estática não há requisição — a rota nunca viraria arquivo.
// 2. O `force-dynamic` existia justamente pra o destino do redirect não ser
//    assado no build ("quem apagasse a primeira página cairia num id morto").
//    Um índice não tem esse problema: ele lista o que existe, e página apagada
//    some da lista em vez de virar link quebrado.
//
// E pro aluno é melhor que um redirect cego: ele chega numa porta que diz o
// que há dentro, em vez de ser jogado numa tela sem saber por quê.
// ---------------------------------------------------------------------------

export default async function Inicio() {
  const arvore = await listarArvore();
  // No modo aluno a raiz só pode oferecer o que virou arquivo — linkar uma
  // página fora da whitelist daria 404 pro aluno, que é a pior forma de
  // descobrir que ela não foi publicada.
  const publicadas = new Set(await listarPublicadas());
  const grupos = PODE_EDITAR
    ? arvore
    : arvore
        .map((g) => ({ ...g, paginas: g.paginas.filter((p) => publicadas.has(p.id)) }))
        .filter((g) => g.paginas.length > 0);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <header className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          🏗
        </span>
        <div>
          <h1 className="text-xl font-semibold text-texto">Cockpit Builder</h1>
          <p className="text-[13px] text-texto-2">
            O mapa executável da Obra 10k e do Setup Agência 6D.
          </p>
        </div>
      </header>

      {grupos.length === 0 ? (
        <p className="text-[13px] text-texto-3">
          Nenhuma página publicada ainda.
        </p>
      ) : (
        grupos.map((g) => (
          <section key={g.pasta.id} className="flex flex-col gap-2">
            <h2 className="titulinho">{g.pasta.nome}</h2>
            <ul className="flex flex-col gap-1.5">
              {g.paginas.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/p/${p.id}`}
                    className="flex flex-col gap-0.5 rounded-xl border border-fio px-4 py-3 hover:border-azul hover:bg-white/[.03]"
                  >
                    <span className="text-[14px] font-semibold text-texto">
                      {p.nome}
                    </span>
                    {p.resumo && (
                      <span className="text-[12.5px] text-texto-2">{p.resumo}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
