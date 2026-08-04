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
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  criarPaginaAction,
  criarPastaAction,
  excluirPastaAction,
  renomearPastaAction,
} from "@/app/actions";
import { useUiStore } from "@/stores/useUiStore";
import type { GrupoArvore } from "@/lib/model";
import { PODE_EDITAR } from "@/lib/modo";

// ---------------------------------------------------------------------------
// A árvore de páginas — pasta › página
// ---------------------------------------------------------------------------
// Os dados vêm do servidor por prop; as ações são Server Actions. Criar página
// aqui não toca em arquivo nenhum — é o oposto do board legado, onde a página
// nascia de um bloco <script> novo e de duas listas paralelas.
//
// A busca filtra no cliente de propósito: são dezenas de páginas, e ida ao
// banco a cada tecla digitada seria pior em toda métrica.
//
// Abaixo de `lg` ela é GAVETA, não coluna. Os 288px são constantes, e numa tela
// de 375px isso é 77% dela: o aluno abria o mapa e recebia um índice de pastas
// com uma tira de 87px do produto ao lado. A conta que define o corte: com
// --w-lateral (288) + --w-direita (296), o palco só fica com metade da tela a
// partir de 576px sem painel e 1168px com painel aberto. Três colunas não
// cabem em 375px em configuração nenhuma — daí virar gaveta, não encolher.
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
  const gaveta = useUiStore((s) => s.gaveta);
  const setGaveta = useUiStore((s) => s.setGaveta);
  const recolhida = useUiStore((s) => s.recolhida);
  const alternarRecolhida = useUiStore((s) => s.alternarRecolhida);

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
    <>
      {/* Véu: fecha a gaveta e impede toque no mapa atrás dela. Não existe no
          desktop, onde a barra é coluna e não cobre nada. */}
      {gaveta && (
        <div
          aria-hidden
          onClick={() => setGaveta(false)}
          className="fixed inset-0 z-[940] bg-black/55 lg:hidden"
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-[950] flex w-[var(--w-lateral)] max-w-[86vw] flex-none flex-col border-r border-fio bg-[rgba(16,22,34,.98)] transition-transform duration-200",
          // acima de lg volta a ser coluna do flex e o estado da gaveta some.
          // A largura vira `--w-lateral-atual` (o AppShell escreve 288 ou 64
          // conforme `recolhida`) — só a partir daqui, porque no celular a
          // gaveta continua abrindo cheia (288, `--w-lateral` sem "-atual").
          "lg:static lg:z-auto lg:w-[var(--w-lateral-atual)] lg:max-w-none lg:translate-x-0 lg:bg-[rgba(16,22,34,.96)] lg:shadow-none lg:transition-[width] lg:duration-200",
          gaveta
            ? "translate-x-0 shadow-[0_0_60px_rgba(0,0,0,.6)]"
            : "-translate-x-full",
        )}
      >
        <div
          className={clsx(
            "flex items-center gap-3 border-b border-fio p-[18px]",
            recolhida && "lg:justify-center lg:gap-0 lg:p-3.5",
          )}
        >
          <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-[linear-gradient(140deg,#4e7df6,#9e6cf2)] text-sm">
            🏗
          </span>
          <span className={clsx("min-w-0", recolhida && "lg:hidden")}>
            <b className="block text-[13.5px] font-bold tracking-tight">
              Cockpit Builder
            </b>
            <i className="mt-0.5 block text-[10.5px] not-italic text-texto-3">
              Obra 10k
            </i>
          </span>
          {/* Sai junto com a gaveta: no desktop não há o que fechar. */}
          <button
            type="button"
            onClick={() => setGaveta(false)}
            aria-label="Fechar páginas"
            className="ml-auto grid h-11 w-11 flex-none place-items-center rounded-lg text-texto-3 hover:bg-white/[.08] hover:text-texto lg:hidden"
          >
            <X size={17} />
          </button>
          {/* Recolher só existe a partir de `lg`: abaixo disso a coluna já é a
              gaveta acima, que se fecha sozinha — um segundo jeito de
              "esconder" ali seria redundante e confuso. */}
          <button
            type="button"
            onClick={alternarRecolhida}
            aria-label={recolhida ? "Expandir páginas" : "Recolher páginas"}
            title={recolhida ? "Expandir" : "Recolher"}
            className={clsx(
              "hidden flex-none rounded-lg p-1.5 text-texto-3 hover:bg-white/[.08] hover:text-texto lg:grid lg:place-items-center",
              !recolhida && "ml-auto",
            )}
          >
            {recolhida ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <label
          className={clsx(
            "mx-3.5 mb-1 mt-3.5 flex items-center gap-2 rounded-[9px] border border-fio bg-white/[.04] px-[11px] py-2",
            recolhida && "lg:hidden",
          )}
        >
          <Search size={13} className="flex-none text-texto-3" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar página"
            className="w-full bg-transparent py-1.5 text-[12.5px] text-texto outline-none placeholder:text-texto-3"
          />
        </label>

        <div className={clsx("titulinho px-[15px] pb-1.5 pt-3", recolhida && "lg:hidden")}>
          Páginas
        </div>

        <nav
          className={clsx(
            "min-h-[90px] flex-1 overflow-auto px-2.5 pb-3 pt-0.5",
            recolhida && "lg:hidden",
          )}
        >
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

                  {editando === pasta.id && PODE_EDITAR ? (
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

                  {/* Aparecer no hover é um comando que não existe no dedo:
                      touch não tem hover, e no celular estes três botões eram
                      invisíveis e inalcançáveis. Ficam à vista onde não há
                      cursor; o esconde-esconde continua valendo no desktop.

                      Os três são escrita — não existem pro aluno. */}
                  {PODE_EDITAR && (
                  <span className="flex flex-none gap-0.5 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label={`Nova página em ${pasta.nome}`}
                      disabled={salvando}
                      onClick={() => novaPagina(pasta.id)}
                      className="grid h-8 w-8 place-items-center rounded-md text-texto-3 hover:bg-white/[.13] hover:text-texto disabled:opacity-40 lg:h-[23px] lg:w-[23px]"
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Renomear ${pasta.nome}`}
                      onClick={() => setEditando(pasta.id)}
                      className="grid h-8 w-8 place-items-center rounded-md text-texto-3 hover:bg-white/[.13] hover:text-texto lg:h-[23px] lg:w-[23px]"
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
                        "grid h-8 place-items-center rounded-md disabled:opacity-40 lg:h-[23px]",
                        confirmando === pasta.id
                          ? "w-auto bg-[rgba(229,72,77,.18)] px-1.5 text-[9px] font-bold uppercase text-[#ffd9da]"
                          : "w-8 text-texto-3 hover:bg-white/[.13] hover:text-texto lg:w-[23px]",
                      )}
                    >
                      {confirmando === pasta.id ? (
                        "com as páginas?"
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </span>
                  )}
                </div>

                {!fechada && (
                  <div className="ml-[11px] border-l border-fio pl-2.5">
                    {paginas.map((p) => (
                      <Link
                        key={p.id}
                        href={`/p/${p.id}`}
                        // Escolher página fecha a gaveta: ela cobre o mapa, e
                        // ficar aberta em cima do que você acabou de abrir é o
                        // problema original de volta.
                        onClick={() => setGaveta(false)}
                        className={clsx(
                          "flex items-center gap-2 rounded-lg py-2.5 pl-2.5 pr-2",
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

        {PODE_EDITAR && (
        <div
          className={clsx(
            "flex flex-col gap-[7px] border-t border-fio px-3.5 pb-3.5 pt-3",
            recolhida && "lg:hidden",
          )}
        >
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
        )}
      </aside>
    </>
  );
}
