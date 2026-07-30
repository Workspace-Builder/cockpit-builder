"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Copy, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import {
  duplicarPaginaAction,
  excluirPaginaAction,
  renomearPaginaAction,
} from "@/app/actions";
import type { Pagina, Pasta } from "@/lib/model";

/**
 * Caminho (pasta › página) + as três ações da página.
 *
 * Excluir é em dois toques em vez de `confirm()` nativo: o diálogo do
 * navegador trava a aba, não dá pra estilizar e some do fluxo de teste.
 * E agora apaga do banco — some pra todo mundo, não só pra quem clicou.
 */
export default function TopoPagina({
  pagina,
  pasta,
}: {
  pagina: Pagina;
  pasta: Pasta;
}) {
  const [salvando, iniciar] = useTransition();
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  return (
    <header className="flex h-[var(--h-topo)] flex-none items-center gap-3 border-b border-fio bg-[rgba(16,22,34,.7)] px-5">
      <div className="flex min-w-0 items-center gap-2 text-[13px] text-texto-3">
        <span className="truncate">{pasta.nome}</span>
        <ChevronRight size={13} className="flex-none" />
        {editando ? (
          <input
            autoFocus
            defaultValue={pagina.nome}
            onBlur={(e) => {
              const nome = e.target.value;
              setEditando(false);
              if (nome.trim() && nome !== pagina.nome) {
                iniciar(() => renomearPaginaAction(pagina.id, nome));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditando(false);
            }}
            className="min-w-0 rounded border border-azul bg-transparent px-1.5 py-0.5 font-bold text-texto outline-none"
          />
        ) : (
          <b className="truncate font-bold text-texto">{pagina.nome}</b>
        )}
      </div>

      <div className="ml-auto flex flex-none items-center gap-1.5">
        <BotaoTopo
          icone={<Pencil size={13} />}
          onClick={() => setEditando(true)}
        >
          Renomear
        </BotaoTopo>
        <BotaoTopo
          icone={<Copy size={13} />}
          disabled={salvando}
          onClick={() => iniciar(() => duplicarPaginaAction(pagina.id))}
        >
          Duplicar
        </BotaoTopo>
        <BotaoTopo
          icone={<Trash2 size={13} />}
          perigo={confirmando}
          disabled={salvando}
          onBlur={() => setConfirmando(false)}
          onClick={() => {
            if (!confirmando) return setConfirmando(true);
            iniciar(() => excluirPaginaAction(pagina.id));
          }}
        >
          {confirmando ? "Confirmar?" : "Excluir"}
        </BotaoTopo>
      </div>
    </header>
  );
}

function BotaoTopo({
  icone,
  children,
  onClick,
  onBlur,
  perigo,
  disabled,
}: {
  icone: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  onBlur?: () => void;
  perigo?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onBlur={onBlur}
      disabled={disabled}
      className={clsx(
        "flex items-center gap-[7px] rounded-lg border px-3 py-[7px] text-xs font-semibold disabled:opacity-50",
        perigo
          ? "border-[rgba(229,72,77,.5)] bg-[rgba(229,72,77,.16)] text-[#ffd9da]"
          : "border-fio text-texto-2 hover:bg-white/[.06] hover:text-texto",
      )}
    >
      {icone}
      {children}
    </button>
  );
}
