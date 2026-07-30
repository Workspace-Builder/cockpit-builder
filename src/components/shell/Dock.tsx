"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { useReactFlow } from "@xyflow/react";
import {
  Bookmark,
  Check,
  Link2,
  Move,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  excluirCheckpointAction,
  reordenarCheckpointsAction,
  regravarCheckpointAction,
  renomearCheckpointAction,
  salvarCheckpointAction,
} from "@/app/actions";
import type { Pagina } from "@/lib/model";

// ---------------------------------------------------------------------------
// A barra de baixo — checkpoints de tela, e o menu de edição
// ---------------------------------------------------------------------------
// Mesmo papel do dock do board legado ("1 ⌂ Tudo · 2 Atração · 3 Conversa…"),
// com a diferença que faltava: os enquadramentos são SALVOS por quem usa, não
// escritos no código.
//
// A barra fica só com o que se usa navegando; salvar, renomear, regravar e
// mover moram no ⋮. Dois modos, como o wireframe de navegação previa:
//   LEITURA — só navega. É o que o aluno vê.
//   MOVER   — arrasta item. Sem essa separação, um clique errado no meio de uma
//             apresentação empurra um nó pra sempre: não há login nem desfazer.
// ---------------------------------------------------------------------------

export default function Dock({
  pagina,
  vista,
  onVista,
  editando,
  onEditando,
}: {
  pagina: Pagina;
  vista: number;
  onVista: (i: number) => void;
  editando: boolean;
  onEditando: (v: boolean) => void;
}) {
  const [salvando, iniciar] = useTransition();
  const [menu, setMenu] = useState(false);
  const [nomeNovo, setNomeNovo] = useState<string | null>(null);
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [puxando, setPuxando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const { getViewport } = useReactFlow();

  // O dock aparece em TODA página. Antes ele sumia quando a página não tinha
  // nó — regra que fazia sentido enquanto tela vazia era maquete, e nenhuma
  // enquanto ela é canvas: era justamente a página em branco que ficava sem o
  // botão de entrar no modo de edição.
  const atual = pagina.vistas[vista];

  function salvar(nome: string) {
    // Congela a tela ANTES do await: se o canvas se mexer enquanto a ação
    // corre, o checkpoint gravaria um enquadramento que ninguém escolheu.
    const { x, y, zoom } = getViewport();
    setNomeNovo(null);
    iniciar(() => salvarCheckpointAction(pagina.id, nome, x, y, zoom));
  }

  function limparArrasto() {
    setPuxando(null);
    setAlvo(null);
  }

  /** Tira de onde estava, encaixa antes do destino, e regrava a ordem inteira. */
  function soltarEm(idDestino: string) {
    if (!puxando || puxando === idDestino) return limparArrasto();
    const ids = pagina.vistas.map((v) => v.id);
    const de = ids.indexOf(puxando);
    const para = ids.indexOf(idDestino);
    limparArrasto();
    if (de < 0 || para < 0) return;
    ids.splice(para, 0, ids.splice(de, 1)[0]);
    iniciar(() => reordenarCheckpointsAction(pagina.id, ids));
  }

  function copiarLink() {
    const url = new URL(window.location.href);
    if (vista > 0) url.searchParams.set("v", String(vista));
    else url.searchParams.delete("v");
    void navigator.clipboard.writeText(url.toString());
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1600);
  }

  return (
    <>
      {menu && (
        <div className="fixed inset-0 z-[899]" onClick={() => setMenu(false)} />
      )}

      <div
        className={clsx(
          "fixed bottom-[22px] left-1/2 z-[900] flex -translate-x-1/2 items-center gap-1",
          "max-w-[calc(100vw-var(--w-lateral)-var(--w-direita)-40px)] rounded-2xl border",
          "bg-[rgba(13,18,29,.96)] px-2.5 py-[7px] shadow-[0_16px_44px_rgba(0,0,0,.55)] backdrop-blur-md",
          editando ? "border-[rgba(245,178,63,.55)]" : "border-fio",
        )}
      >
        {/* Estava escondido no ⋮ e ninguém achava. Botão de modo é estado da
            tela, não comando de menu: fica à vista, dizendo em qual modo você está. */}
        <button
          type="button"
          onClick={() => onEditando(!editando)}
          title={editando ? "Sair da edição" : "Editar esta página"}
          className={clsx(
            "flex h-10 flex-none items-center gap-2 rounded-[10px] px-3 text-[12.5px] font-semibold",
            editando
              ? "bg-[rgba(245,178,63,.18)] text-ambar"
              : "text-texto-2 hover:bg-white/[.09] hover:text-white",
          )}
        >
          <Move size={13} />
          {editando ? "Movendo itens" : "Editar"}
        </button>
        <span className="mx-1 h-6 w-px flex-none bg-fio" />

        <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {pagina.vistas.length === 0 && (
            <span className="whitespace-nowrap px-3 text-[11.5px] text-texto-3">
              nenhuma tela salva — use o ⋮
            </span>
          )}

          {pagina.vistas.map((v, i) =>
            renomeando === v.id ? (
              <input
                key={v.id}
                autoFocus
                defaultValue={v.label}
                onBlur={(e) => {
                  const nome = e.target.value;
                  setRenomeando(null);
                  if (nome.trim() && nome !== v.label) {
                    iniciar(() => renomearCheckpointAction(v.id, nome));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") setRenomeando(null);
                }}
                className="h-10 w-[150px] flex-none rounded-[10px] border border-azul bg-transparent px-3 text-[12.5px] text-texto outline-none"
              />
            ) : (
              <button
                key={v.id}
                type="button"
                // Arrasto nativo do HTML, sem dependência nova. É o mesmo
                // recurso que o wireframe-navegacao.html usava pra reordenar
                // camadas — e aqui a lista tem meia dúzia de itens, não mil.
                draggable
                onDragStart={() => setPuxando(v.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (puxando && puxando !== v.id) setAlvo(v.id);
                }}
                onDragLeave={() => setAlvo((a) => (a === v.id ? null : a))}
                onDrop={(e) => {
                  e.preventDefault();
                  soltarEm(v.id);
                }}
                onDragEnd={limparArrasto}
                onClick={() => onVista(i)}
                onDoubleClick={() => setRenomeando(v.id)}
                title="Arraste pra reordenar · duplo clique renomeia"
                className={clsx(
                  "flex h-10 flex-none items-center gap-2 whitespace-nowrap rounded-[10px] px-3 text-[12.5px] font-semibold",
                  i === vista
                    ? "bg-[rgba(78,125,246,.26)] text-white"
                    : "text-texto-2 hover:bg-white/[.09] hover:text-white",
                  puxando === v.id && "opacity-40",
                  // barra âmbar à esquerda: onde o item vai encaixar
                  alvo === v.id && "shadow-[inset_3px_0_0_0_var(--ambar)]",
                )}
              >
                {i < 9 && (
                  <kbd className="rounded border border-white/20 px-1 py-0.5 text-[9px] text-texto-3">
                    {i + 1}
                  </kbd>
                )}
                {v.label}
              </button>
            ),
          )}
        </div>

        {nomeNovo !== null && (
          <div className="ml-1 flex h-10 flex-none items-center gap-1 rounded-[10px] border border-azul bg-[rgba(78,125,246,.12)] px-2">
            <input
              autoFocus
              value={nomeNovo}
              placeholder="nome da tela"
              onChange={(e) => setNomeNovo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") salvar(e.currentTarget.value);
                if (e.key === "Escape") setNomeNovo(null);
              }}
              className="w-[150px] bg-transparent text-[12.5px] text-texto outline-none placeholder:text-texto-3"
            />
            <button
              type="button"
              aria-label="Salvar"
              onClick={() => salvar(nomeNovo)}
              className="rounded p-1 text-texto-2 hover:text-white"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              aria-label="Cancelar"
              onClick={() => setNomeNovo(null)}
              className="rounded p-1 text-texto-3 hover:text-texto"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <span className="mx-1 h-6 w-px flex-none bg-fio" />

        <button
          type="button"
          onClick={copiarLink}
          title="Copiar link desta tela"
          aria-label="Copiar link desta tela"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] text-texto-2 hover:bg-white/[.09] hover:text-white"
        >
          {copiado ? (
            <Check size={14} className="text-verde" />
          ) : (
            <Link2 size={14} />
          )}
        </button>

        <div className="relative flex-none">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-label="Mais opções"
            className={clsx(
              "flex h-10 w-10 items-center justify-center rounded-[10px]",
              menu
                ? "bg-white/[.12] text-white"
                : "text-texto-2 hover:bg-white/[.09] hover:text-white",
            )}
          >
            <MoreVertical size={16} />
          </button>

          {menu && (
            <div className="absolute bottom-[52px] right-0 z-[901] w-[248px] overflow-hidden rounded-xl border border-fio bg-[rgba(13,18,29,.98)] py-1.5 shadow-[0_24px_60px_rgba(0,0,0,.6)]">
              <Item
                icone={<Bookmark size={14} />}
                onClick={() => {
                  setMenu(false);
                  setNomeNovo("");
                }}
              >
                Salvar esta tela
              </Item>

              {atual && (
                <>
                  <div className="my-1.5 h-px bg-fio" />
                  <div className="titulinho px-3 pb-1 pt-1">{atual.label}</div>
                  <Item
                    icone={<Bookmark size={14} />}
                    onClick={() => {
                      const { x, y, zoom } = getViewport();
                      setMenu(false);
                      iniciar(() =>
                        regravarCheckpointAction(atual.id, x, y, zoom),
                      );
                    }}
                  >
                    Regravar na tela de agora
                  </Item>
                  <Item
                    icone={<Pencil size={14} />}
                    onClick={() => {
                      setMenu(false);
                      setRenomeando(atual.id);
                    }}
                  >
                    Renomear
                  </Item>
                  <Item
                    icone={<Trash2 size={14} />}
                    perigo
                    disabled={salvando}
                    onClick={() => {
                      setMenu(false);
                      iniciar(() => excluirCheckpointAction(atual.id));
                    }}
                  >
                    Excluir esta tela
                  </Item>
                </>
              )}
            </div>
          )}
        </div>

        <span className="hidden whitespace-nowrap px-2 text-[11px] text-texto-3 xl:block">
          {editando
            ? "arraste os itens · ⋮ pra sair"
            : "2× clique: zoom no item · Esc: volta"}
        </span>
      </div>
    </>
  );
}

function Item({
  icone,
  children,
  onClick,
  marcado,
  perigo,
  disabled,
}: {
  icone: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  marcado?: boolean;
  perigo?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] font-semibold disabled:opacity-50",
        perigo
          ? "text-[#ff9ba0] hover:bg-[rgba(229,72,77,.14)]"
          : "text-texto hover:bg-white/[.07]",
      )}
    >
      <span className="flex-none text-texto-3">{icone}</span>
      <span className="flex-1">{children}</span>
      {marcado && <Check size={13} className="flex-none text-ambar" />}
    </button>
  );
}
