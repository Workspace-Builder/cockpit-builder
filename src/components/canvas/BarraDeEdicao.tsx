"use client";

import { useTransition } from "react";
import clsx from "clsx";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceAround,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BringToFront,
  Circle,
  Copy,
  Diamond,
  FileText,
  Image as Imagem,
  Minus,
  MousePointer2,
  Play,
  RotateCcw,
  SendToBack,
  Square,
  SquareDashed,
  Trash2,
  Type,
} from "lucide-react";
import {
  camadaNoAction,
  duplicarNoAction,
  editarArestaAction,
  estiloNoAction,
  excluirArestaAction,
  excluirNoAction,
  textoNoAction,
} from "@/app/actions";
import type { ArestaBoard, NoBoard } from "@/lib/model";
import type { Alinhamento, Distribuicao } from "./alinhar";
import { useBoardMovendo } from "./movimentoDoBoard";

// ---------------------------------------------------------------------------
// A barra de edição — uma peça, dois trabalhos
// ---------------------------------------------------------------------------
// Sem nada selecionado ela é a PALETA: escolha uma forma e clique no palco.
// Com um nó selecionado ela vira as PROPRIEDADES daquele nó. É a convenção do
// Figma e do Miro, e resolve o que antes eram duas superfícies — a paleta aqui
// e um painel de 296px na direita, que morreu junto com esta mudança.
//
// Por que aqui e não na gaveta: isto é ferramenta de quem EDITA. A gaveta é
// conteúdo, e o aluno vê a gaveta na página publicada — onde esta barra não
// existe. Misturar as duas colocaria propriedade de desenho na frente de quem
// só quer ler o mapa.
//
// O estilo é o mesmo `material` da gaveta de propósito: uma linguagem, duas
// superfícies. Se cada uma tivesse acabamento próprio, o board teria dois
// idiomas.
// ---------------------------------------------------------------------------

/** `null` = ferramenta de seleção (o repouso). */
export type Ferramenta = null | string;

const GRUPOS: {
  tipo: Ferramenta;
  icone: React.ReactNode;
  nome: string;
  tecla: string;
}[][] = [
  [{ tipo: null, icone: <MousePointer2 size={16} />, nome: "Selecionar", tecla: "V" }],
  [
    { tipo: "act", icone: <Square size={16} />, nome: "Ação", tecla: "R" },
    { tipo: "dec", icone: <Diamond size={16} />, nome: "Decisão", tecla: "D" },
    { tipo: "term", icone: <Circle size={16} />, nome: "Início / fim", tecla: "O" },
    { tipo: "doc", icone: <FileText size={16} />, nome: "Documento", tecla: "F" },
    { tipo: "texto", icone: <Type size={16} />, nome: "Texto", tecla: "T" },
    { tipo: "lane", icone: <SquareDashed size={16} />, nome: "Área", tecla: "A" },
  ],
  [
    { tipo: "shot", icone: <Imagem size={16} />, nome: "Imagem", tecla: "I" },
    { tipo: "video", icone: <Play size={16} />, nome: "Vídeo", tecla: "" },
    { tipo: "iframe", icone: <Minus size={16} />, nome: "Janela / iframe", tecla: "" },
  ],
];

/** As mesmas cores do vocabulário do Figma, não uma paleta nova. */
const CORES = [
  { valor: "#9747FF", nome: "roxo · ação" },
  { valor: "#FFC7C2", nome: "rosa · documento" },
  { valor: "#14AE5C", nome: "verde · entrada" },
  { valor: "#FFCD29", nome: "amarelo · copy" },
  { valor: "#757575", nome: "cinza · terminal" },
  { valor: "#4e7df6", nome: "azul" },
];
const CORES_TXT = ["#1e1e1e", "#eef2fb", "#9aa7be"];

export type Arrumar =
  | { tipo: "alinhar"; como: Alinhamento }
  | { tipo: "distribuir"; eixo: Distribuicao };

export default function BarraDeEdicao({
  ativa,
  onEscolher,
  no,
  aresta,
  selecao,
  onArrumar,
  onLargar,
  onRedimensionar,
}: {
  ativa: Ferramenta;
  onEscolher: (f: Ferramenta) => void;
  /** o nó selecionado — decide qual cara a barra tem */
  no: NoBoard | null;
  /** o conector selecionado. Nunca vem junto com `no`. */
  aresta: ArestaBoard | null;
  /** quantos nós na seleção de caixa; 0 ou 1 não é seleção múltipla */
  selecao: number;
  onArrumar: (op: Arrumar) => void;
  onLargar: () => void;
  onRedimensionar: (id: string, largura: number, altura: number) => void;
}) {
  // A ordem importa: seleção múltipla ganha da individual, porque quem acabou
  // de arrastar uma caixa sobre cinco nós quer alinhar, não pintar um deles.
  const largo = selecao > 1 || !!no || !!aresta;

  // Ver `.material-em-movimento` em globals.css: sem isto, o blur da barra —
  // SEMPRE visível editando — reamostrava o board a 60fps durante todo pan.
  const movendo = useBoardMovendo();

  return (
    <div
      className={clsx(
        "nowheel nodrag nopan absolute left-3.5 top-1/2 z-40 max-h-[calc(100%-32px)] -translate-y-1/2 overflow-y-auto rounded-[14px] transition-[width]",
        movendo ? "material-em-movimento" : "material",
        largo ? "w-[232px] p-2.5" : "w-[52px] p-1.5",
      )}
    >
      {selecao > 1 ? (
        <Selecao quantos={selecao} onArrumar={onArrumar} />
      ) : aresta ? (
        <Conector aresta={aresta} onLargar={onLargar} />
      ) : no ? (
        <Propriedades no={no} onLargar={onLargar} onRedimensionar={onRedimensionar} />
      ) : (
        <Paleta ativa={ativa} onEscolher={onEscolher} />
      )}
    </div>
  );
}

// --- seleção múltipla -------------------------------------------------------

const ALINHAR: [Alinhamento, string, React.ReactNode][] = [
  ["esq", "Alinhar à esquerda", <AlignStartVertical key="a" size={15} />],
  ["centroH", "Centralizar na horizontal", <AlignCenterVertical key="b" size={15} />],
  ["dir", "Alinhar à direita", <AlignEndVertical key="c" size={15} />],
  ["topo", "Alinhar ao topo", <AlignStartHorizontal key="d" size={15} />],
  ["centroV", "Centralizar na vertical", <AlignCenterHorizontal key="e" size={15} />],
  ["base", "Alinhar à base", <AlignEndHorizontal key="f" size={15} />],
];

function Selecao({
  quantos,
  onArrumar,
}: {
  quantos: number;
  onArrumar: (op: Arrumar) => void;
}) {
  return (
    <div>
      <span className="mb-2.5 block font-mono text-[8.5px] font-bold tracking-[.2em] text-texto-3">
        {quantos} ITENS SELECIONADOS
      </span>

      <div className="grid grid-cols-3 gap-1">
        {ALINHAR.map(([como, titulo, icone]) => (
          <button
            key={como}
            type="button"
            title={titulo}
            aria-label={titulo}
            onClick={() => onArrumar({ tipo: "alinhar", como })}
            className="fio-meio grid h-9 place-items-center rounded-[7px] text-texto-2 hover:bg-white/[.09] hover:text-white"
          >
            {icone}
          </button>
        ))}
      </div>

      {/* Distribuir precisa de três: com dois, "espaço igual entre eles" é o
          espaço que já existe. O botão some em vez de não fazer nada. */}
      {quantos > 2 && (
        <div className="mt-1 grid grid-cols-2 gap-1">
          <button
            type="button"
            title="Espaço igual na horizontal"
            aria-label="Espaço igual na horizontal"
            onClick={() => onArrumar({ tipo: "distribuir", eixo: "horizontal" })}
            className="fio-meio grid h-9 place-items-center rounded-[7px] text-texto-2 hover:bg-white/[.09] hover:text-white"
          >
            <AlignHorizontalSpaceAround size={15} />
          </button>
          <button
            type="button"
            title="Espaço igual na vertical"
            aria-label="Espaço igual na vertical"
            onClick={() => onArrumar({ tipo: "distribuir", eixo: "vertical" })}
            className="fio-meio grid h-9 place-items-center rounded-[7px] text-texto-2 hover:bg-white/[.09] hover:text-white"
          >
            <AlignVerticalSpaceAround size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

// --- conector ---------------------------------------------------------------

/**
 * O que a migration 003 tinha no banco e nunca teve na tela.
 *
 * `rotulo`, `tracejada` e `falha` são desenhados desde o primeiro dia, mas só
 * os conectores importados do legado os tinham — não havia caminho de escrita.
 */
function Conector({
  aresta,
  onLargar,
}: {
  aresta: ArestaBoard;
  onLargar: () => void;
}) {
  const [salvando, iniciar] = useTransition();

  return (
    <div>
      <span className="mb-2.5 block font-mono text-[8.5px] font-bold tracking-[.2em] text-texto-3">
        CONECTOR
      </span>

      <input
        key={aresta.id + (aresta.rotulo ?? "")}
        defaultValue={aresta.rotulo ?? ""}
        placeholder="sem rótulo"
        disabled={salvando}
        aria-label="Rótulo do conector"
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v !== (aresta.rotulo ?? "")) {
            iniciar(() => editarArestaAction(aresta.id, { rotulo: v || null }));
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="fio-meio w-full rounded-[7px] bg-black/25 px-2.5 py-[7px] text-[12.5px] text-texto outline-none focus:shadow-[0_0_0_2px_rgba(78,125,246,.5)]"
      />

      <Linha rotulo="Traço">
        <Segmentado
          opcoes={[
            ["cheio", "Cheio"],
            ["tracejado", "Tracejado"],
          ]}
          valor={aresta.tracejada ? "tracejado" : "cheio"}
          onEscolher={(v) =>
            iniciar(() =>
              editarArestaAction(aresta.id, { tracejada: v === "tracejado" }),
            )
          }
          desabilitado={salvando}
        />
      </Linha>

      <Linha rotulo="Caminho">
        <Segmentado
          opcoes={[
            ["normal", "Normal"],
            ["falha", "Reprova"],
          ]}
          valor={aresta.falha ? "falha" : "normal"}
          onEscolher={(v) =>
            iniciar(() => editarArestaAction(aresta.id, { falha: v === "falha" }))
          }
          desabilitado={salvando}
        />
      </Linha>

      <button
        type="button"
        disabled={salvando}
        onClick={() =>
          iniciar(async () => {
            await excluirArestaAction(aresta.id);
            onLargar();
          })
        }
        className="fio-meio mt-2.5 flex h-[32px] w-full items-center justify-center gap-1.5 rounded-[8px] text-[12px] font-medium text-texto-2 transition hover:bg-vermelho/15 hover:text-[#ff9ba0] disabled:opacity-50"
      >
        <Trash2 size={12} /> Excluir conector
      </button>
    </div>
  );
}

// --- paleta -----------------------------------------------------------------

function Paleta({
  ativa,
  onEscolher,
}: {
  ativa: Ferramenta;
  onEscolher: (f: Ferramenta) => void;
}) {
  return (
    <div className="flex flex-col gap-[3px]">
      {GRUPOS.map((grupo, gi) => (
        <div key={gi} className="flex flex-col gap-[3px]">
          {gi > 0 && <span className="mx-1.5 my-1 h-px bg-white/10" />}
          {grupo.map((f) => (
            <button
              key={f.nome}
              type="button"
              onClick={() => onEscolher(f.tipo)}
              title={f.tecla ? `${f.nome} · ${f.tecla}` : f.nome}
              aria-label={f.nome}
              aria-pressed={ativa === f.tipo}
              className={clsx(
                "grid h-10 w-10 place-items-center rounded-[9px] transition",
                ativa === f.tipo
                  ? "bg-azul text-white shadow-[0_1px_3px_rgba(0,0,0,.45)]"
                  : "text-texto-2 hover:bg-white/[.09] hover:text-white",
              )}
            >
              {f.icone}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// --- propriedades -----------------------------------------------------------

function Propriedades({
  no,
  onLargar,
  onRedimensionar,
}: {
  no: NoBoard;
  onLargar: () => void;
  onRedimensionar: (id: string, largura: number, altura: number) => void;
}) {
  const [salvando, iniciar] = useTransition();
  const gravar = (patch: Parameters<typeof estiloNoAction>[1]) =>
    iniciar(() => estiloNoAction(no.id, patch));

  const editado =
    no.cor !== null ||
    no.corTxt !== null ||
    no.contorno !== null ||
    no.fs !== null ||
    no.fw !== null ||
    no.ta !== null;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[8.5px] font-bold tracking-[.2em] text-texto-3">
          ITEM SELECIONADO
        </span>
        {editado && (
          <button
            type="button"
            disabled={salvando}
            title="Voltar ao padrão do tipo"
            onClick={() =>
              gravar({ cor: null, corTxt: null, contorno: null, fs: null, fw: null, ta: null })
            }
            className="flex items-center gap-1 text-[10.5px] text-texto-3 hover:text-texto disabled:opacity-50"
          >
            <RotateCcw size={10} />
            padrão
          </button>
        )}
      </div>

      {/* O rótulo é a primeira coisa que se quer trocar num nó recém-criado —
          sem isto todo item nasce e morre dizendo "Ação". */}
      <input
        key={no.id + (no.txt ?? "")}
        defaultValue={no.txt ?? ""}
        placeholder="sem título"
        disabled={salvando}
        aria-label="Nome do item"
        onBlur={(e) => {
          if (e.target.value !== (no.txt ?? "")) {
            iniciar(() => textoNoAction(no.id, e.target.value));
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="fio-meio w-full rounded-[7px] bg-black/25 px-2.5 py-[7px] text-[12.5px] text-texto outline-none focus:shadow-[0_0_0_2px_rgba(78,125,246,.5)]"
      />

      <Linha rotulo="Tamanho">
        <Tamanho no={no} onMudar={onRedimensionar} desabilitado={salvando} />
      </Linha>

      <Linha rotulo="Cor">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {/* Cor livre além das 6 do vocabulário: elas são o padrão da casa,
              não uma cerca. */}
          <label
            title="Escolher qualquer cor"
            className="grid h-[19px] w-[19px] cursor-pointer place-items-center overflow-hidden rounded-[5px] border border-white/20 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]"
          >
            <input
              type="color"
              value={no.cor ?? "#9747FF"}
              disabled={salvando}
              onChange={(e) => gravar({ cor: e.target.value })}
              className="h-0 w-0 opacity-0"
            />
          </label>
          {CORES.map((c) => (
            <button
              key={c.valor}
              type="button"
              title={c.nome}
              aria-label={c.nome}
              disabled={salvando}
              onClick={() => gravar({ cor: no.cor === c.valor ? null : c.valor })}
              style={{ background: c.valor }}
              className={clsx(
                "h-[19px] w-[19px] rounded-[5px] border border-white/20",
                no.cor === c.valor && "outline outline-2 outline-white",
              )}
            />
          ))}
        </div>
      </Linha>

      <Linha rotulo="Contorno">
        <Segmentado
          opcoes={[
            ["solido", "Sólido"],
            ["tracejado", "Traço"],
            ["nenhum", "Nenhum"],
          ]}
          valor={no.contorno}
          onEscolher={(v) => gravar({ contorno: v as NoBoard["contorno"] })}
          desabilitado={salvando}
        />
      </Linha>

      {/* Raio SUBSTITUI o do tipo, não soma: o `term` é pílula por
          `border-radius: 999px`, e um raio de 8 nele tem que virar 8 mesmo. */}
      <Linha rotulo="Raio">
        <Numero
          valor={no.raio}
          padrao={raioPadrao(no.tipo)}
          passo={2}
          minimo={0}
          maximo={400}
          onMudar={(v) => gravar({ raio: v })}
          desabilitado={salvando}
        />
      </Linha>

      {/* Para em 10%: zero seria um nó invisível que continua clicável, e o
          autor fica com um buraco no board que responde ao mouse. */}
      <Linha rotulo="Opacidade">
        <Numero
          valor={no.opacidade === null ? null : Math.round(no.opacidade * 100)}
          padrao={100}
          passo={10}
          minimo={10}
          maximo={100}
          sufixo="%"
          onMudar={(v) => gravar({ opacidade: v === null ? null : v / 100 })}
          desabilitado={salvando}
        />
      </Linha>

      <Linha rotulo="Fonte">
        <Numero
          valor={no.fs}
          padrao={12.5}
          passo={0.5}
          minimo={1}
          maximo={999}
          onMudar={(v) => gravar({ fs: v })}
          desabilitado={salvando}
        />
      </Linha>

      <Linha rotulo="Peso">
        <Segmentado
          opcoes={[
            ["400", "Normal"],
            ["600", "Semi"],
            ["800", "Forte"],
          ]}
          valor={no.fw === null ? null : String(no.fw)}
          onEscolher={(v) => gravar({ fw: v === null ? null : Number(v) })}
          desabilitado={salvando}
        />
      </Linha>

      <Linha rotulo="Alinhamento">
        <Segmentado
          opcoes={[
            ["left", "⟵"],
            ["center", "↔"],
            ["right", "⟶"],
          ]}
          valor={no.ta}
          onEscolher={(v) => gravar({ ta: v as NoBoard["ta"] })}
          desabilitado={salvando}
        />
      </Linha>

      <Linha rotulo="Cor do texto">
        <div className="flex gap-1.5">
          {CORES_TXT.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Texto ${c}`}
              disabled={salvando}
              onClick={() => gravar({ corTxt: no.corTxt === c ? null : c })}
              style={{ background: c }}
              className={clsx(
                "h-[19px] w-[19px] rounded-[5px] border border-white/20",
                no.corTxt === c && "outline outline-2 outline-white",
              )}
            />
          ))}
        </div>
      </Linha>

      {/* Camada vai pro EXTREMO, não um degrau. Um degrau por clique obriga a
          contar quantos nós há em cima — que é justamente o que ninguém sabe.
          O gesto que se quer é "põe isso na frente de tudo". */}
      <div className="mt-2.5 grid grid-cols-3 gap-1">
        <Acao
          titulo="Trazer pra frente"
          icone={<BringToFront size={13} />}
          desabilitado={salvando}
          onClick={() => iniciar(() => camadaNoAction(no.id, "frente"))}
        />
        <Acao
          titulo="Mandar pra trás"
          icone={<SendToBack size={13} />}
          desabilitado={salvando}
          onClick={() => iniciar(() => camadaNoAction(no.id, "tras"))}
        />
        <Acao
          titulo="Duplicar"
          icone={<Copy size={13} />}
          desabilitado={salvando}
          onClick={() => iniciar(() => void duplicarNoAction(no.id))}
        />
      </div>

      <button
        type="button"
        disabled={salvando}
        onClick={() =>
          iniciar(async () => {
            await excluirNoAction(no.id);
            onLargar();
          })
        }
        className="fio-meio mt-1 flex h-[32px] w-full items-center justify-center gap-1.5 rounded-[8px] text-[12px] font-medium text-texto-2 transition hover:bg-vermelho/15 hover:text-[#ff9ba0] disabled:opacity-50"
      >
        <Trash2 size={12} /> Excluir item
      </button>
    </div>
  );
}

/**
 * Setas para quem não consegue acertar uma alça pequena no canvas. Cada clique
 * muda uma dimensão em 20px; o mesmo limite mínimo usado pelo NodeResizer vale
 * aqui, então os dois caminhos de edição nunca deixam o nó inválido.
 */
function Tamanho({
  no,
  onMudar,
  desabilitado,
}: {
  no: NoBoard;
  onMudar: (id: string, largura: number, altura: number) => void;
  desabilitado?: boolean;
}) {
  const largura = no.w ?? 180;
  const altura = no.h ?? 64;
  const passo = 20;

  return (
    <div className="trilho flex flex-none items-center gap-0.5 rounded-[7px] p-0.5">
      <SetaTamanho
        titulo="Diminuir largura"
        icone={<ArrowLeft size={12} />}
        desabilitado={desabilitado || largura <= 40}
        onClick={() => onMudar(no.id, Math.max(40, largura - passo), altura)}
      />
      <span className="min-w-[52px] text-center font-mono text-[10px] text-texto-2">
        {Math.round(largura)} × {Math.round(altura)}
      </span>
      <SetaTamanho
        titulo="Aumentar largura"
        icone={<ArrowRight size={12} />}
        desabilitado={desabilitado}
        onClick={() => onMudar(no.id, largura + passo, altura)}
      />
      <span className="mx-0.5 h-4 w-px bg-white/10" />
      <SetaTamanho
        titulo="Diminuir altura"
        icone={<ArrowUp size={12} />}
        desabilitado={desabilitado || altura <= 28}
        onClick={() => onMudar(no.id, largura, Math.max(28, altura - passo))}
      />
      <SetaTamanho
        titulo="Aumentar altura"
        icone={<ArrowDown size={12} />}
        desabilitado={desabilitado}
        onClick={() => onMudar(no.id, largura, altura + passo)}
      />
    </div>
  );
}

function SetaTamanho({
  titulo,
  icone,
  onClick,
  desabilitado,
}: {
  titulo: string;
  icone: React.ReactNode;
  onClick: () => void;
  desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      disabled={desabilitado}
      onClick={onClick}
      className="grid h-[24px] w-[22px] place-items-center rounded-[5px] text-texto-2 transition hover:bg-white/[.1] hover:text-white disabled:opacity-30"
    >
      {icone}
    </button>
  );
}

/**
 * O raio que o tipo já tem, pro campo mostrar de onde ele está partindo.
 *
 * Sem isto o controle nasceria em 0 e diria que uma pílula tem canto reto — o
 * primeiro clique no `+` a deixaria MENOS redonda, que é o oposto do gesto.
 * Os números vêm de `globals.css`; se lá mudar, aqui muda junto.
 */
function raioPadrao(tipo: NoBoard["tipo"]): number {
  if (tipo === "term") return 999;
  if (tipo === "act" || tipo === "doc" || tipo === "copy") return 9;
  if (tipo === "lane") return 14;
  return 0; // paralelogramo, losango e cilindro são recortes, não cantos
}

function Acao({
  titulo,
  icone,
  onClick,
  desabilitado,
}: {
  titulo: string;
  icone: React.ReactNode;
  onClick: () => void;
  desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      disabled={desabilitado}
      onClick={onClick}
      className="fio-meio grid h-[30px] place-items-center rounded-[7px] text-texto-2 transition hover:bg-white/[.09] hover:text-white disabled:opacity-50"
    >
      {icone}
    </button>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/[.07] py-2 last:border-none">
      <span className="flex-none text-[11.5px] text-texto-2">{rotulo}</span>
      {children}
    </div>
  );
}

/** Clicar na opção já ativa volta ao padrão — sem botão "limpar" por campo. */
function Segmentado({
  opcoes,
  valor,
  onEscolher,
  desabilitado,
}: {
  opcoes: [string, string][];
  valor: string | null;
  onEscolher: (v: string | null) => void;
  desabilitado?: boolean;
}) {
  return (
    <div className="trilho flex flex-none gap-0.5 rounded-[7px] p-0.5">
      {opcoes.map(([v, rotulo]) => (
        <button
          key={v}
          type="button"
          disabled={desabilitado}
          onClick={() => onEscolher(valor === v ? null : v)}
          className={clsx(
            "rounded-[5px] px-2 py-1 text-[10.5px] transition disabled:opacity-50",
            valor === v ? "pastilha text-white" : "text-texto-3 hover:text-texto",
          )}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}

function Numero({
  valor,
  padrao,
  passo,
  minimo = 6,
  maximo = 72,
  sufixo = "",
  onMudar,
  desabilitado,
}: {
  valor: number | null;
  padrao: number;
  passo: number;
  minimo?: number;
  maximo?: number;
  sufixo?: string;
  onMudar: (v: number | null) => void;
  desabilitado?: boolean;
}) {
  const atual = valor ?? padrao;
  return (
    <div className="trilho flex flex-none items-center rounded-[7px] p-0.5">
      <button
        type="button"
        disabled={desabilitado}
        aria-label="Diminuir"
        onClick={() => onMudar(Math.max(minimo, atual - passo))}
        className="h-[22px] w-[22px] rounded-[5px] text-texto-3 hover:text-texto disabled:opacity-50"
      >
        −
      </button>
      <input
        key={atual}
        type="number"
        defaultValue={atual}
        disabled={desabilitado}
        title={valor === null ? "padrão do tipo" : "editado"}
        onBlur={(e) => {
          const n = parseFloat(e.currentTarget.value);
          onMudar(Number.isNaN(n) ? padrao : Math.min(maximo, Math.max(minimo, n)));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={clsx(
          "w-[38px] bg-transparent text-center font-mono text-[11px] outline-none",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          valor === null ? "text-texto-3" : "text-texto",
        )}
      />
      {sufixo && (
        <span className="font-mono text-[11px] text-texto-3">{sufixo}</span>
      )}
      <button
        type="button"
        disabled={desabilitado}
        aria-label="Aumentar"
        onClick={() => onMudar(Math.min(maximo, atual + passo))}
        className="h-[22px] w-[22px] rounded-[5px] text-texto-3 hover:text-texto disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}
