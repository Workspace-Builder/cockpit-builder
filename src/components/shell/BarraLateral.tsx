"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderPlus,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  criarPaginaAction,
  criarPastaAction,
  excluirPastaAction,
  renomearPastaAction,
} from "@/app/actions";
import { useUiStore } from "@/stores/useUiStore";
import type { GrupoArvore } from "@/lib/model";

// ---------------------------------------------------------------------------
// A árvore de páginas — pasta › página
// ---------------------------------------------------------------------------
// Os dados vêm do servidor por prop; as ações são Server Actions. Criar página
// aqui não toca em arquivo nenhum — é o oposto do board legado, onde a página
// nascia de um bloco <script> novo e de duas listas paralelas.
//
// A busca filtra no cliente de propósito: são dezenas de páginas, e ida ao
// banco a cada tecla digitada seria pior em toda métrica.
// ---------------------------------------------------------------------------

export default function BarraLateral({
  arvore,
  ativaId,
}: {
  arvore: GrupoArvore[];
  ativaId: string;
}) {
  const busca = useUiStore((s) => s.busca);
  const setBusca = useUiStore((s) => s.setBusca);
  const fechadas = useUiStore((s) => s.fechadas);
  const alternarPasta = useUiStore((s) => s.alternarPasta);

  const [salvando, iniciar] = useTransition();
  /** id da pasta em edição de nome — `null` = ninguém editando */
  const [editando, setEditando] = useState<string | null>(null);
  /** id da pasta esperando confirmação de exclusão */
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const filtrada = useMemo(() => {
    const f = busca.trim().toLowerCase();
    if (!f) return arvore;
    return arvore.map((g) => ({
      ...g,
      paginas: g.paginas.filter((p) => p.nome.toLowerCase().includes(f)),
    }));
  }, [arvore, busca]);

  const pastaAtual =
    arvore.find((g) => g.paginas.some((p) => p.id === ativaId))?.pasta.id ??
    arvore[0]?.pasta.id;

  function novaPagina(pastaId?: string) {
    const alvo = pastaId ?? pastaAtual;
    if (!alvo) return;
    iniciar(() => criarPaginaAction(alvo));
  }

  return (
    <aside className="flex w-[var(--w-lateral)] flex-none flex-col border-r border-fio bg-[rgba(16,22,34,.96)]">
      <div className="flex items-center gap-3 border-b border-fio p-[18px]">
        <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-[linear-gradient(140deg,#4e7df6,#9e6cf2)] text-sm">
          🏗
        </span>
        <span className="min-w-0">
          <b className="block text-[13.5px] font-bold tracking-tight">
            Cockpit Builder
          </b>
          <i className="mt-0.5 block text-[10.5px] not-italic text-texto-3">
            Obra 10k
          </i>
        </span>
      </div>

      <label className="mx-3.5 mb-1 mt-3.5 flex items-center gap-2 rounded-[9px] border border-fio bg-white/[.04] px-[11px] py-2">
        <Search size={13} className="flex-none text-texto-3" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar página"
          className="w-full bg-transparent text-[12.5px] text-texto outline-none placeholder:text-texto-3"
        />
      </label>

      <div className="titulinho px-[15px] pb-1.5 pt-3">Páginas</div>

      <nav className="min-h-[90px] flex-1 overflow-auto px-2.5 pb-3 pt-0.5">
        {filtrada.map(({ pasta, paginas }) => {
          const fechada = fechadas.includes(pasta.id);
          return (
            <div key={pasta.id}>
              <div className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/[.06]">
                <button
                  type="button"
                  onClick={() => alternarPasta(pasta.id)}
                  aria-label={fechada ? "Abrir pasta" : "Fechar pasta"}
                  className="flex flex-none items-center text-texto-3"
                >
                  {fechada ? (
                    <ChevronRight size={12} />
                  ) : (
                    <ChevronDown size={12} />
                  )}
                </button>
                <Folder size={15} className="flex-none text-texto-2" />

                {editando === pasta.id ? (
                  <input
                    autoFocus
                    defaultValue={pasta.nome}
                    onBlur={(e) => {
                      const nome = e.target.value;
                      setEditando(null);
                      if (nome.trim() && nome !== pasta.nome) {
                        iniciar(() => renomearPastaAction(pasta.id, nome));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setEditando(null);
                    }}
                    className="min-w-0 flex-1 rounded border border-azul bg-transparent px-1 text-[11px] font-bold uppercase tracking-wide outline-none"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-wide text-texto-2">
                    {pasta.nome}
                  </span>
                )}

                <span className="flex flex-none gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    aria-label={`Nova página em ${pasta.nome}`}
                    disabled={salvando}
                    onClick={() => novaPagina(pasta.id)}
                    className="grid h-[23px] w-[23px] place-items-center rounded-md text-texto-3 hover:bg-white/[.13] hover:text-texto disabled:opacity-40"
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Renomear ${pasta.nome}`}
                    onClick={() => setEditando(pasta.id)}
                    className="grid h-[23px] w-[23px] place-items-center rounded-md text-texto-3 hover:bg-white/[.13] hover:text-texto"
                  >
                    <Pencil size={13} />
                  </button>
                  {/* Dois toques, igual ao Excluir do topo. Apagar pasta leva as
                      páginas dela junto — e some pra todo mundo. */}
                  <button
                    type="button"
                    aria-label={
                      confirmando === pasta.id
                        ? `Confirmar exclusão de ${pasta.nome} e suas páginas`
                        : `Excluir ${pasta.nome}`
                    }
                    disabled={salvando}
                    onBlur={() => setConfirmando(null)}
                    onClick={() => {
                      if (confirmando !== pasta.id) {
                        return setConfirmando(pasta.id);
                      }
                      iniciar(() => excluirPastaAction(pasta.id));
                    }}
                    className={clsx(
                      "grid h-[23px] place-items-center rounded-md disabled:opacity-40",
                      confirmando === pasta.id
                        ? "w-auto bg-[rgba(229,72,77,.18)] px-1.5 text-[9px] font-bold uppercase text-[#ffd9da]"
                        : "w-[23px] text-texto-3 hover:bg-white/[.13] hover:text-texto",
                    )}
                  >
                    {confirmando === pasta.id ? (
                      "com as páginas?"
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                </span>
              </div>

              {!fechada && (
                <div className="ml-[11px] border-l border-fio pl-2.5">
                  {paginas.map((p) => (
                    <Link
                      key={p.id}
                      href={`/p/${p.id}`}
                      className={clsx(
                        "flex items-center gap-2 rounded-lg py-2 pl-2.5 pr-2",
                        p.id === ativaId
                          ? "bg-[rgba(78,125,246,.2)]"
                          : "hover:bg-white/[.06]",
                      )}
                    >
                      <FileText
                        size={15}
                        className={clsx(
                          "flex-none",
                          p.id === ativaId ? "text-azul" : "text-texto-2",
                        )}
                      />
                      <span
                        className={clsx(
                          "min-w-0 flex-1 truncate text-[13px] font-semibold",
                          p.id === ativaId ? "text-white" : "text-texto",
                        )}
                      >
                        {p.nome}
                      </span>
                    </Link>
                  ))}
                  {paginas.length === 0 && (
                    <div className="px-2.5 py-2 text-[11.5px] text-texto-3">
                      {busca ? "nada com esse nome" : "pasta vazia"}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex flex-col gap-[7px] border-t border-fio px-3.5 pb-3.5 pt-3">
        <button
          type="button"
          disabled={salvando}
          onClick={() => novaPagina()}
          className="flex w-full items-center gap-2.5 rounded-[9px] border border-[rgba(78,125,246,.42)] bg-[rgba(78,125,246,.16)] px-[11px] py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
        >
          <Plus size={14} />
          Criar página
        </button>
        <button
          type="button"
          disabled={salvando}
          onClick={() => iniciar(() => criarPastaAction())}
          className="flex w-full items-center gap-2.5 rounded-[9px] border border-dashed border-fio-2 px-[11px] py-2.5 text-[12.5px] font-semibold text-texto-2 hover:border-azul hover:text-texto disabled:opacity-50"
        >
          <FolderPlus size={14} />
          Criar pasta
        </button>
      </div>
    </aside>
  );
}
