"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import { useInternalNode, useStore } from "@xyflow/react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  colarNaGavetaAction,
  criarAbaAction,
  criarItemAction,
  editarItemAction,
  excluirAbaAction,
  excluirItemAction,
  marcarItemAction,
  renomearAbaAction,
} from "@/app/actions";
import {
  TETO_MARCA,
  type AbaDoNo,
  type ChaveMarca,
  type ItemDoNo,
  type NoBoard,
} from "@/lib/model";
import { COMPONENTES, componente } from "./itensDaGaveta";
import { candidato, encaixar, melhorLado, type Ret } from "./ondeAbre";
import { useBoardMovendo } from "./movimentoDoBoard";
import { imagemDoEvento, prepararImagem } from "./colarImagem";

// ---------------------------------------------------------------------------
// A gaveta do nó — a subtarefa #5, agora ancorada
// ---------------------------------------------------------------------------
// Substitui o painel de 296px na direita. O motivo não é estética: o kit de uma
// etapa a 900px dela não é contexto, é referência cruzada. Aqui ele nasce
// colado no nó que o pediu.
//
// ELA VIVE FORA DO VIEWPORT TRANSFORMADO. É a decisão que sustenta o resto:
// como filha do nó, ela encolheria junto com o zoom e a 20% ninguém leria uma
// linha. Como irmã do palco, fica em pixels de tela e SEGUE o nó — por isso
// este componente assina o transform do React Flow, que muda a cada quadro de
// pan. É o único que assina; a `Malhas` foi separada pelo mesmo motivo.
//
// Fora do modo de edição ela é só leitura: sem `+`, sem `×`, sem campo. É o que
// o aluno vê na página publicada, e lá não existe barra de edição nenhuma.
// ---------------------------------------------------------------------------

const LARG = 328;

export default function GavetaDoNo({
  no,
  abas,
  editando,
  vizinhos,
  insets,
  onFechar,
}: {
  no: NoBoard;
  abas: AbaDoNo[];
  editando: boolean;
  /** os outros nós, em coordenada de board — pra gaveta não pousar em cima */
  vizinhos: NoBoard[];
  /** faixas de tela já ocupadas pela casca (barra de edição, dock) */
  insets: { esq: number; baixo: number };
  onFechar: () => void;
}) {
  const interno = useInternalNode(no.id);
  const transform = useStore((s) => s.transform);
  // Dois seletores escalares, não um que devolve `[w, h]`: array novo a cada
  // chamada quebra a comparação do store e vira aviso de snapshot instável.
  const larguraTela = useStore((s) => s.width);
  const alturaTela = useStore((s) => s.height);
  // Ver `.material-em-movimento` em globals.css: a gaveta já re-renderiza a
  // cada quadro de pan (segue o nó na tela), então o blur pesava em dobro.
  const movendo = useBoardMovendo();

  const caixa = useRef<HTMLDivElement>(null);
  const [alt, setAlt] = useState(240);
  const [iAba, setIAba] = useState(0);
  const [iFoto, setIFoto] = useState(0);
  const [criando, setCriando] = useState<null | "item" | "aba">(null);
  const [pendente, iniciar] = useTransition();

  // A altura decide qual lado cabe, e ela muda por fora do React: trocar de
  // aba, item novo, e principalmente IMAGEM QUE TERMINA DE CARREGAR. Um effect
  // medindo no fim do render perderia esse último — a foto chega depois, o
  // popover cresce, e a conta do lado fica com a altura velha.
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAlt(e.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Aba que sumiu (removida) não pode deixar o índice no vazio. Trocar de NÓ
  // não precisa de reset: o BoardCanvas monta esta gaveta com `key` no id, e
  // componente com key nova nasce zerado.
  const aba: AbaDoNo | undefined = abas[Math.min(iAba, abas.length - 1)];

  /**
   * Ctrl+V com a gaveta aberta: a print vira item IMAGEM da aba atual.
   *
   * Fica no `window` e não num `onPaste` da caixa porque o evento de colar só
   * chega em elemento com foco, e a gaveta é um popover que ninguém foca —
   * exigir um clique antes tornaria o gesto pior do que digitar a URL na mão,
   * que é o que ele veio substituir.
   *
   * Enquanto esta gaveta existe, o colar é DELA: o BoardCanvas desliga o dele
   * pela mesma condição que monta este componente.
   */
  const abaId = aba?.id;
  useEffect(() => {
    if (!editando || !abaId) return;

    async function aoColar(e: ClipboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      if (alvo?.isContentEditable) return;

      const blob = imagemDoEvento(e);
      if (!blob) return;
      e.preventDefault();

      try {
        const { dataUrl } = await prepararImagem(blob);
        await colarNaGavetaAction(no.paginaId, abaId!, dataUrl);
      } catch (erro) {
        console.error("não colou a imagem na gaveta", erro);
      }
    }

    window.addEventListener("paste", aoColar);
    return () => window.removeEventListener("paste", aoColar);
  }, [editando, abaId, no.paginaId]);

  if (!interno || !aba) return null;

  const [tx, ty, zoom] = transform;
  const pos = interno.internals.positionAbsolute;
  const alvo: Ret = {
    x: pos.x * zoom + tx,
    y: pos.y * zoom + ty,
    w: (interno.measured.width ?? no.w ?? 180) * zoom,
    h: (interno.measured.height ?? no.h ?? 64) * zoom,
  };
  // A tela útil não é a janela: a barra de edição come a esquerda e o dock come
  // o rodapé. Sem descontar, a gaveta escolhia o lado "livre" que estava
  // debaixo da própria barra de propriedades que ela mesma acabara de abrir.
  const tela: Ret = {
    x: insets.esq,
    y: 0,
    w: Math.max(360, larguraTela - insets.esq),
    h: Math.max(300, alturaTela - insets.baixo),
  };
  const outros: Ret[] = vizinhos.map((v) => ({
    x: v.x * zoom + tx,
    y: v.y * zoom + ty,
    w: (v.w ?? 180) * zoom,
    h: (v.h ?? 64) * zoom,
  }));

  const lado = melhorLado(alvo, LARG, alt, tela, outros);
  const bruto = candidato(alvo, lado, LARG, alt);
  const { x, y } = encaixar(bruto, LARG, alt, tela);

  const marcados = (m: ChaveMarca) => aba.itens.filter((i) => i[m]).length;

  return (
    <div
      ref={caixa}
      className={clsx(
        "nowheel nodrag nopan absolute z-[60] w-[328px] overflow-hidden rounded-[13px]",
        movendo ? "material-em-movimento" : "material",
      )}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={`Gaveta de ${no.txt ?? "item"}`}
    >
      <Bico lado={lado} alvo={alvo} caixa={{ x, y, w: LARG, h: alt }} />

      {/* Cabeçalho: o painel VESTE a forma do nó. A gramática do fluxograma
          continua aqui dentro, então dá pra saber de onde a gaveta saiu sem
          olhar pro mapa — e com quatro abertas em sequência isso importa. */}
      <div className="flex items-center gap-2.5 px-3 pb-2 pt-2.5">
        <SeloDaForma tipo={no.tipo} />
        <b className="min-w-0 flex-1 truncate text-[13.5px] font-semibold tracking-[-.012em]">
          {no.txt?.replace(/\n/g, " ") || "sem título"}
        </b>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="grid h-6 w-6 flex-none place-items-center rounded-full bg-white/[.09] text-texto-2 hover:bg-white/20 hover:text-texto"
        >
          <X size={12} />
        </button>
      </div>

      <BarraDeAbas
        abas={abas}
        atual={aba.id}
        editando={editando}
        pendente={pendente}
        onTrocar={(i) => {
          setIAba(i);
          setIFoto(0);
          setCriando(null);
        }}
        onNova={() => setCriando(criando === "aba" ? null : "aba")}
        onRenomear={(id, nome) => iniciar(() => renomearAbaAction(id, nome))}
        onExcluir={(id) =>
          iniciar(async () => {
            await excluirAbaAction(id);
            setIAba(0);
          })
        }
      />

      <div className="border-t border-white/[.09] p-2.5">
        {criando === "aba" ? (
          <EscolherEspecie
            onEscolher={(kind) => {
              iniciar(async () => {
                await criarAbaAction(
                  no.id,
                  kind === "lista" ? "Nova lista" : "Nova galeria",
                  kind,
                );
                setIAba(abas.length);
              });
              setCriando(null);
            }}
          />
        ) : aba.kind === "galeria" ? (
          <Galeria
            aba={aba}
            i={iFoto}
            onI={setIFoto}
            editando={editando}
            pendente={pendente}
            iniciar={iniciar}
          />
        ) : (
          <Lista
            aba={aba}
            editando={editando}
            pendente={pendente}
            criando={criando === "item"}
            onCriando={(v) => setCriando(v ? "item" : null)}
            marcados={marcados}
            iniciar={iniciar}
          />
        )}
      </div>
    </div>
  );
}

/**
 * O selo: a gaveta veste a forma do nó que abriu.
 *
 * Só pras formas do fluxograma — texto, print e animação não têm forma no
 * vocabulário, e um `fx-texto` inexistente sairia como retângulo sem cor
 * fingindo ser alguma coisa. Esses ganham uma placa neutra, que é honesta.
 */
const FORMAS = new Set(["term", "act", "doc", "reg", "in", "dec", "db", "copy"]);

function SeloDaForma({ tipo }: { tipo: NoBoard["tipo"] }) {
  return (
    <span className="grid h-5 w-[30px] flex-none place-items-center">
      {FORMAS.has(tipo) ? (
        <span
          aria-hidden
          className={clsx(
            "fx",
            `fx-${tipo}`,
            "!h-5 !w-[30px] !rounded !p-0 !text-[0px] !shadow-none",
          )}
        />
      ) : (
        <span
          aria-hidden
          className="fio-meio h-5 w-[30px] rounded-[5px] bg-white/10"
        />
      )}
    </span>
  );
}

/**
 * O bico do popover.
 *
 * Não é enfeite: quando a gaveta é empurrada pra caber na tela, ela deixa de
 * estar centrada no nó — e aí só o bico diz de quem ela é. Ele anda junto com
 * o empurrão, por isso a posição vem por conta e não de uma classe por lado.
 */
function Bico({
  lado,
  alvo,
  caixa,
}: {
  lado: "b" | "t" | "r" | "l";
  alvo: Ret;
  caixa: Ret;
}) {
  const cx = alvo.x + alvo.w / 2;
  const cy = alvo.y + alvo.h / 2;
  const vertical = lado === "b" || lado === "t";
  const dentro = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min + 14), max - 14);

  const estilo: React.CSSProperties = vertical
    ? {
        left: dentro(cx, caixa.x, caixa.x + caixa.w) - caixa.x - 9,
        [lado === "b" ? "top" : "bottom"]: -9,
        width: 18,
        height: 9,
        clipPath:
          lado === "b" ? "polygon(50% 0,100% 100%,0 100%)" : "polygon(50% 100%,100% 0,0 0)",
      }
    : {
        top: dentro(cy, caixa.y, caixa.y + caixa.h) - caixa.y - 9,
        [lado === "r" ? "left" : "right"]: -9,
        width: 9,
        height: 18,
        clipPath:
          lado === "r" ? "polygon(0 50%,100% 100%,100% 0)" : "polygon(100% 50%,0 100%,0 0)",
      };

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bg-[rgba(46,49,55,.94)]"
      style={estilo}
    />
  );
}

// --- abas -------------------------------------------------------------------

function BarraDeAbas({
  abas,
  atual,
  editando,
  pendente,
  onTrocar,
  onNova,
  onRenomear,
  onExcluir,
}: {
  abas: AbaDoNo[];
  atual: string;
  editando: boolean;
  pendente: boolean;
  onTrocar: (i: number) => void;
  onNova: () => void;
  onRenomear: (id: string, nome: string) => void;
  onExcluir: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-[3px] overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {abas.map((a, i) => {
        const ativa = a.id === atual;
        return (
          <div
            key={a.id}
            className={clsx(
              "flex h-[27px] flex-none items-center gap-1.5 rounded-[7px] px-2.5 text-[12.5px] transition",
              ativa
                ? "pastilha font-semibold text-texto"
                : "font-medium text-texto-2 hover:bg-white/[.06] hover:text-texto",
            )}
          >
            <button
              type="button"
              onClick={() => onTrocar(i)}
              /* Renomear é DUPLO clique, como aba de navegador: o clique
                 simples é pra trocar, e é o gesto de todo mundo. */
              onDoubleClick={(e) => {
                if (!editando) return;
                const alvo = e.currentTarget;
                alvo.contentEditable = "true";
                alvo.focus();
                getSelection()?.selectAllChildren(alvo);
              }}
              onBlur={(e) => {
                if (e.currentTarget.contentEditable !== "true") return;
                e.currentTarget.contentEditable = "false";
                const novo = e.currentTarget.textContent?.trim() ?? "";
                if (novo && novo !== a.nome) onRenomear(a.id, novo);
                else e.currentTarget.textContent = a.nome;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              suppressContentEditableWarning
              className="whitespace-nowrap outline-none"
              title={editando ? "Dois cliques renomeia" : undefined}
            >
              {a.nome}
            </button>
            <span className="font-mono text-[9px] text-texto-3">
              {a.itens.length}
            </span>
            {editando && ativa && abas.length > 1 && (
              <button
                type="button"
                disabled={pendente}
                onClick={() => onExcluir(a.id)}
                aria-label={`Remover aba ${a.nome}`}
                className="grid h-[15px] w-[15px] place-items-center rounded-full text-texto-3 hover:bg-white/20 hover:text-texto"
              >
                <X size={9} />
              </button>
            )}
          </div>
        );
      })}
      {editando && (
        <button
          type="button"
          onClick={onNova}
          aria-label="Nova aba"
          className="grid h-[27px] w-[27px] flex-none place-items-center rounded-[7px] text-texto-3 hover:bg-white/[.08] hover:text-texto"
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}

/** Duas espécies, e só duas — cada uma tem desenho próprio (migration 010). */
function EscolherEspecie({
  onEscolher,
}: {
  onEscolher: (k: "lista" | "galeria") => void;
}) {
  return (
    <div className="flex gap-1.5 rounded-[9px] border border-dashed border-azul/70 bg-azul/[.06] p-1.5">
      {(
        [
          ["lista", "Lista"],
          ["galeria", "Galeria"],
        ] as const
      ).map(([k, rot]) => (
        <button
          key={k}
          type="button"
          onClick={() => onEscolher(k)}
          className="fio-meio flex-1 rounded-[7px] py-2 text-[12.5px] font-medium text-texto-2 hover:bg-white/[.09] hover:text-texto"
        >
          {rot}
        </button>
      ))}
    </div>
  );
}

// --- aba de lista -----------------------------------------------------------

function Lista({
  aba,
  editando,
  pendente,
  criando,
  onCriando,
  marcados,
  iniciar,
}: {
  aba: AbaDoNo;
  editando: boolean;
  pendente: boolean;
  criando: boolean;
  onCriando: (v: boolean) => void;
  marcados: (m: ChaveMarca) => number;
  iniciar: (fn: () => void) => void;
}) {
  if (!aba.itens.length && !editando)
    return <Vazio>Nada mapeado nesta etapa ainda.</Vazio>;

  return (
    <div className="flex flex-col gap-1">
      {aba.itens.map((it) => (
        <LinhaItem
          key={it.id}
          item={it}
          editando={editando}
          pendente={pendente}
          marcados={marcados}
          iniciar={iniciar}
        />
      ))}

      {editando &&
        (criando ? (
          <div className="flex gap-1.5 rounded-[9px] border border-dashed border-azul/70 bg-azul/[.06] p-1.5">
            {COMPONENTES.map(({ k, rot, Ico, cor }) => (
              <button
                key={k}
                type="button"
                title={rot}
                aria-label={rot}
                onClick={() => {
                  iniciar(() => criarItemAction(aba.id, k));
                  onCriando(false);
                }}
                className="fio-meio grid h-[38px] flex-1 place-items-center rounded-[7px] hover:bg-white/[.09]"
                style={{ color: cor }}
              >
                <Ico size={16} />
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onCriando(true)}
            className="fio-meio flex h-[34px] items-center justify-center gap-1.5 rounded-[9px] text-[12.5px] font-medium text-texto-2 hover:bg-white/[.06] hover:text-texto"
          >
            <Plus size={13} /> Adicionar
          </button>
        ))}
    </div>
  );
}

function LinhaItem({
  item,
  editando,
  pendente,
  marcados,
  iniciar,
}: {
  item: ItemDoNo;
  editando: boolean;
  pendente: boolean;
  marcados: (m: ChaveMarca) => number;
  iniciar: (fn: () => void) => void;
}) {
  const { rot, Ico, cor } = componente(item.tipo);
  // Defesa em profundidade: a validação de protocolo em actions.ts só barra
  // escritas novas — item.url pode ser dado salvo antes dela existir.
  const urlSegura =
    item.url && /^https?:\/\//i.test(item.url) ? item.url : undefined;
  const linkavel = !editando && urlSegura;

  const miolo = (
    <>
      {/* Tingido, não chapado. Três blocos saturados empilhados viram parede,
          e aí não sobra contraste pra marca dizer alguma coisa. */}
      <span
        className="grid h-[28px] w-[28px] flex-none place-items-center rounded-[8px]"
        style={{
          color: cor,
          background: `color-mix(in srgb, ${cor} 15%, transparent)`,
          boxShadow: `inset 0 0 0 .5px color-mix(in srgb, ${cor} 40%, transparent)`,
        }}
      >
        <Ico size={14} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="mb-0.5 flex items-center gap-1.5">
          <b className="font-mono text-[8.5px] font-bold tracking-[.16em] text-texto-3">
            {rot}
          </b>
          {item.oitenta && <Selo cor="#54c98a" texto="80/20" />}
          {item.pre && <Selo cor="#f5b23f" texto="COMECE AQUI" />}
        </span>

        <Campo
          valor={item.nome}
          vazio="Nome do entregável"
          editando={editando}
          classe={clsx(
            "block text-[13px] leading-[1.3] tracking-[-.008em]",
            item.oitenta ? "font-semibold text-white" : "font-medium text-texto-2",
          )}
          onGravar={(v) => iniciar(() => editarItemAction(item.id, { nome: v }))}
        />

        {item.tipo === "img" && item.src ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.src}
            alt={item.nome ?? ""}
            loading="lazy"
            className="mt-1.5 w-full rounded-md border border-fio"
          />
        ) : null}

        <Campo
          valor={item.tipo === "img" ? item.src : item.url}
          vazio={item.tipo === "img" ? "endereço da imagem" : "link"}
          editando={editando}
          classe="mt-0.5 block break-all font-mono text-[10px] leading-[1.4] text-texto-3"
          onGravar={(v) =>
            iniciar(() =>
              editarItemAction(
                item.id,
                item.tipo === "img" ? { src: v } : { url: v },
              ),
            )
          }
        />
      </span>
    </>
  );

  return (
    <div
      className={clsx(
        "group relative flex gap-2.5 rounded-[9px] bg-white/[.04] px-2.5 py-2 transition",
        item.pre && "pl-[15px]",
        item.oitenta
          ? "bg-[rgba(84,201,138,.07)] shadow-[inset_0_0_0_1px_rgba(84,201,138,.5)]"
          : "fio-meio opacity-[.72] hover:opacity-100 hover:bg-white/[.075]",
      )}
    >
      {/* O imprescindível é trilho na lateral, não anel: as duas marcas dizem
          coisas diferentes (qual traz resultado × por onde começar) e precisam
          de eixos visuais diferentes, senão viram a mesma coisa em duas cores. */}
      {item.pre && (
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-[3px] rounded-r-[3px] bg-ambar"
        />
      )}

      {linkavel ? (
        <a
          href={urlSegura}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 flex-1 gap-2.5"
        >
          {miolo}
        </a>
      ) : (
        miolo
      )}

      {editando && (
        <span className="absolute right-1.5 top-1.5 flex gap-[3px] opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <BotaoMarca
            item={item}
            marca="oitenta"
            texto="80"
            cor="#54c98a"
            marcados={marcados}
            pendente={pendente}
            iniciar={iniciar}
          />
          <BotaoMarca
            item={item}
            marca="pre"
            texto="!"
            cor="#f5b23f"
            marcados={marcados}
            pendente={pendente}
            iniciar={iniciar}
          />
          <button
            type="button"
            disabled={pendente}
            aria-label="Remover item"
            onClick={() => iniciar(() => excluirItemAction(item.id))}
            className="fio-meio grid h-[22px] w-[23px] place-items-center rounded-md bg-[rgba(60,63,70,.9)] text-texto-2 hover:bg-vermelho hover:text-white"
          >
            <Trash2 size={11} />
          </button>
        </span>
      )}
    </div>
  );
}

function BotaoMarca({
  item,
  marca,
  texto,
  cor,
  marcados,
  pendente,
  iniciar,
}: {
  item: ItemDoNo;
  marca: ChaveMarca;
  texto: string;
  cor: string;
  marcados: (m: ChaveMarca) => number;
  pendente: boolean;
  iniciar: (fn: () => void) => void;
}) {
  const ligada = item[marca];
  const noTeto = !ligada && marcados(marca) >= TETO_MARCA[marca];

  return (
    <button
      type="button"
      disabled={pendente || noTeto}
      aria-pressed={ligada}
      title={
        noTeto
          ? `Já são ${TETO_MARCA[marca]}. Desmarque uma pra trocar.`
          : marca === "oitenta"
            ? "O caminho que traz o resultado"
            : "O imprescindível antes de começar"
      }
      onClick={() => iniciar(() => marcarItemAction(item.id, marca))}
      className={clsx(
        "fio-meio grid h-[22px] w-[23px] place-items-center rounded-md font-mono text-[9px] font-bold",
        ligada ? "text-[#0b1710]" : "bg-[rgba(60,63,70,.9)] text-texto-2 hover:text-white",
        noTeto && "opacity-30",
      )}
      style={ligada ? { background: cor } : undefined}
    >
      {texto}
    </button>
  );
}

// --- aba de galeria ---------------------------------------------------------

function Galeria({
  aba,
  i,
  onI,
  editando,
  pendente,
  iniciar,
}: {
  aba: AbaDoNo;
  i: number;
  onI: (n: number) => void;
  editando: boolean;
  pendente: boolean;
  iniciar: (fn: () => void) => void;
}) {
  const fotos = aba.itens;
  const atual = fotos[Math.min(i, fotos.length - 1)];

  // ← → passam o carrossel. Só quando há o que passar, pra não roubar a seta
  // de quem está navegando o board.
  useEffect(() => {
    if (fotos.length < 2) return;
    function onKey(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (alvo?.isContentEditable) return;
      if (e.key === "ArrowRight") onI((i + 1) % fotos.length);
      if (e.key === "ArrowLeft") onI((i - 1 + fotos.length) % fotos.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fotos.length, i, onI]);

  if (!fotos.length && !editando)
    return <Vazio>Nenhum depoimento nesta etapa ainda.</Vazio>;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="fio-meio group relative grid h-[206px] place-items-center overflow-hidden rounded-[9px] bg-black/30">
        {atual?.src ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={atual.src}
            alt={atual.nome ?? ""}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="px-7 text-center text-[12px] leading-relaxed text-texto-3">
            {editando
              ? "Cole o endereço de uma imagem no campo abaixo."
              : "Sem imagem."}
          </span>
        )}

        {fotos.length > 1 && (
          <>
            <Seta lado="ant" onClick={() => onI((i - 1 + fotos.length) % fotos.length)} />
            <Seta lado="prox" onClick={() => onI((i + 1) % fotos.length)} />
          </>
        )}

        {editando && atual && (
          <button
            type="button"
            disabled={pendente}
            aria-label="Remover este print"
            onClick={() =>
              iniciar(async () => {
                await excluirItemAction(atual.id);
                onI(Math.max(0, i - 1));
              })
            }
            className="absolute right-2 top-2 grid h-[26px] w-[26px] place-items-center rounded-full bg-[rgba(20,21,24,.72)] text-white opacity-0 shadow-[0_0_0_.5px_rgba(255,255,255,.2),0_2px_8px_rgba(0,0,0,.5)] backdrop-blur transition group-hover:opacity-100 hover:!bg-vermelho"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {fotos.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {fotos.map((f, j) => (
            <button
              key={f.id}
              type="button"
              aria-label={`Depoimento ${j + 1}`}
              onClick={() => onI(j)}
              className={clsx(
                "h-1.5 w-1.5 rounded-full transition",
                j === i ? "scale-110 bg-texto" : "bg-white/25 hover:bg-white/50",
              )}
            />
          ))}
        </div>
      )}

      {atual && (
        <>
          <Campo
            valor={atual.nome}
            vazio="Quem falou, e o que provou"
            editando={editando}
            classe="block px-0.5 text-[12.5px] font-medium leading-[1.4] tracking-[-.008em]"
            onGravar={(v) => iniciar(() => editarItemAction(atual.id, { nome: v }))}
          />
          {editando && (
            <Campo
              valor={atual.src}
              vazio="endereço da imagem"
              editando
              classe="block break-all px-0.5 font-mono text-[10px] leading-[1.4] text-texto-3"
              onGravar={(v) => iniciar(() => editarItemAction(atual.id, { src: v }))}
            />
          )}
        </>
      )}

      {editando && (
        <button
          type="button"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              await criarItemAction(aba.id, "img");
              onI(fotos.length);
            })
          }
          className="fio-meio flex h-[34px] items-center justify-center gap-1.5 rounded-[9px] text-[12.5px] font-medium text-texto-2 hover:bg-white/[.06] hover:text-texto"
        >
          <Plus size={13} /> Adicionar print
        </button>
      )}
    </div>
  );
}

function Seta({ lado, onClick }: { lado: "ant" | "prox"; onClick: () => void }) {
  const Ico = lado === "ant" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === "ant" ? "Anterior" : "Próximo"}
      className={clsx(
        "absolute top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-[rgba(20,21,24,.72)] text-white opacity-0 shadow-[0_0_0_.5px_rgba(255,255,255,.2),0_2px_8px_rgba(0,0,0,.5)] backdrop-blur transition group-hover:opacity-100 focus-visible:opacity-100",
        lado === "ant" ? "left-2" : "right-2",
      )}
    >
      <Ico size={15} />
    </button>
  );
}

// --- peças pequenas ---------------------------------------------------------

function Selo({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span
      className="rounded-[3px] px-[4px] py-px font-mono text-[8px] font-bold tracking-[.08em]"
      style={{
        color: cor,
        background: `color-mix(in srgb, ${cor} 16%, transparent)`,
        boxShadow: `inset 0 0 0 .5px color-mix(in srgb, ${cor} 45%, transparent)`,
      }}
    >
      {texto}
    </span>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 py-2 text-center text-[12px] leading-relaxed text-texto-3">
      {children}
    </p>
  );
}

/**
 * Campo que só é editável no modo de edição — fora dele é texto.
 *
 * Grava no BLUR, não a cada tecla: cada gravação revalida a árvore, e por letra
 * digitada isso seria uma requisição por caractere. É a mesma escolha do
 * inspetor de estilo.
 */
function Campo({
  valor,
  vazio,
  editando,
  classe,
  onGravar,
}: {
  valor: string | null;
  vazio: string;
  editando: boolean;
  classe: string;
  onGravar: (v: string) => void;
}) {
  if (!editando)
    return valor ? <span className={classe}>{valor}</span> : null;

  return (
    <span
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-vazio={vazio}
      onBlur={(e) => {
        const novo = e.currentTarget.textContent?.trim() ?? "";
        if (novo !== (valor ?? "")) onGravar(novo);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") e.currentTarget.blur();
      }}
      className={clsx(
        classe,
        "outline-none empty:before:text-texto-3 empty:before:content-[attr(data-vazio)] focus:text-white",
      )}
    >
      {valor ?? ""}
    </span>
  );
}
