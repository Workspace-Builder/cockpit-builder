"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Copy, Menu, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import {
  duplicarPaginaAction,
  excluirPaginaAction,
  renomearPaginaAction,
} from "@/app/actions";
import { useUiStore } from "@/stores/useUiStore";
import type { Pagina, Pasta } from "@/lib/model";
import { PODE_EDITAR } from "@/lib/modo";

/**
 * Caminho (pasta › página) + as três ações da página.
 *
 * Excluir é em dois toques em vez de `confirm()` nativo: o diálogo do
 * navegador trava a aba, não dá pra estilizar e some do fluxo de teste.
 * E agora apaga do banco — some pra todo mundo, não só pra quem clicou.
 *
 * Abaixo de `sm` os três botões viram só ícone. Com rótulo eles mediam 259px e
 * começavam em x=316 numa tela de 375 — 200px inteiros fora da tela, e sem
 * scroll pra alcançar, porque a raiz é `overflow-hidden`. Botão que não cabe
 * não é botão apertado: é botão que não existe.
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
  const setGaveta = useUiStore((s) => s.setGaveta);

  return (
    <header className="flex h-[var(--h-topo)] flex-none items-center gap-2 border-b border-fio bg-[rgba(16,22,34,.7)] px-3 sm:gap-3 sm:px-5">
      {/* A única porta pra árvore enquanto ela é gaveta. */}
      <button
        type="button"
        onClick={() => setGaveta(true)}
        aria-label="Abrir páginas"
        className="grid h-11 w-11 flex-none place-items-center rounded-lg text-texto-2 hover:bg-white/[.07] hover:text-texto lg:hidden"
      >
        <Menu size={18} />
      </button>

      <div className="flex min-w-0 items-center gap-2 text-[13px] text-texto-3">
        {/* O nome da pasta é o primeiro a sair: em 375px o que importa é qual
            PÁGINA está aberta, e a pasta já aparece na gaveta. */}
        <span className="hidden truncate sm:inline">{pasta.nome}</span>
        <ChevronRight size={13} className="hidden flex-none sm:block" />
        {editando && PODE_EDITAR ? (
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

      {/* Renomear, duplicar e excluir são as três escritas do topo — o aluno
          não tem nenhuma delas. Sem o gate, sobrariam três botões que não
          fazem nada, porque as ações viram no-op na build publicada. */}
      {PODE_EDITAR && (
      <div className="ml-auto flex flex-none items-center gap-1 sm:gap-1.5">
        <BotaoTopo
          icone={<Pencil size={13} />}
          rotulo="Renomear página"
          onClick={() => setEditando(true)}
        >
          Renomear
        </BotaoTopo>
        <BotaoTopo
          icone={<Copy size={13} />}
          rotulo="Duplicar página"
          disabled={salvando}
          onClick={() => iniciar(() => duplicarPaginaAction(pagina.id))}
        >
          Duplicar
        </BotaoTopo>
        <BotaoTopo
          icone={<Trash2 size={13} />}
          rotulo="Excluir página"
          // Confirmação SEMPRE com texto, inclusive em tela estreita: ícone
          // vermelho sozinho não diz que o próximo toque apaga de verdade.
          textoSempre={confirmando}
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
      )}
    </header>
  );
}

function BotaoTopo({
  icone,
  rotulo,
  children,
  onClick,
  onBlur,
  perigo,
  textoSempre,
  disabled,
}: {
  icone: React.ReactNode;
  /** nome por extenso pro leitor de tela — o texto some abaixo de `sm` */
  rotulo: string;
  children: React.ReactNode;
  onClick: () => void;
  onBlur?: () => void;
  perigo?: boolean;
  textoSempre?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onBlur={onBlur}
      disabled={disabled}
      aria-label={rotulo}
      className={clsx(
        "flex h-11 items-center gap-[7px] rounded-lg border px-2.5 text-xs font-semibold disabled:opacity-50 sm:h-auto sm:px-3 sm:py-[7px]",
        perigo
          ? "border-[rgba(229,72,77,.5)] bg-[rgba(229,72,77,.16)] text-[#ffd9da]"
          : "border-fio text-texto-2 hover:bg-white/[.06] hover:text-texto",
      )}
    >
      {icone}
      <span className={clsx(textoSempre ? "inline" : "hidden sm:inline")}>
        {children}
      </span>
    </button>
  );
}
