"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ENTREGAVEIS } from "./entregaveis";

// ---------------------------------------------------------------------------
// A regra do jogo — uma vez, na entrada
// ---------------------------------------------------------------------------
// Era um bloco de texto fixo no canto superior esquerdo da Obra. Funcionava na
// primeira visita e virava ruído em todas as outras: quem já sabe a regra não
// desliga o parágrafo, ele só passa a competir com os prédios pela atenção.
//
// Aqui a regra chega uma vez, ocupando a tela inteira porque é o único momento
// em que ela é a coisa mais importante — e depois some. O `?` no canto traz de
// volta pra quem quiser reler, sem custo pra quem não quer.
//
// A visita fica no localStorage, não no banco: "já vi a abertura" é de quem
// está olhando, como pasta fechada na barra lateral. Se fosse pro Postgres, o
// primeiro aluno a abrir desligaria a abertura pra todos os outros.
// ---------------------------------------------------------------------------

const CHAVE = "cockpit:obra:abertura:v1";

/** Fábrica genérica de persistência local pra useSyncExternalStore.
    Nasceu daqui (era código ad-hoc só pra "já viu a abertura") porque
    Obra.tsx precisava do MESMO desenho pra "feitos" — cache de referência
    (getSnapshot precisa devolver a MESMA referência enquanto nada mudou,
    senão o React acha que mudou a cada render e entra em loop), Set<()=>void>
    de ouvintes, e try/catch em toda leitura/escrita porque navegação privada
    bloqueia storage. O cache de referência é inofensivo mesmo pra primitivo
    (boolean aqui, objeto em Obra.tsx), então uma fábrica só cobre os dois.

    `valorNoServidor` é separado de `valorPadrao` porque os dois usos
    divergem nisso: "feitos" começa vazio dos dois lados, mas a abertura
    finge "já visto" no servidor de propósito (ver comentário em
    `jaViuNoServidor` mais abaixo) — sem essa separação a fábrica não serviria
    pros dois casos. */
export function criarPersistenciaLocal<T>(
  chave: string,
  valorPadrao: T,
  valorNoServidor: T = valorPadrao,
) {
  let cache: T | null = null;
  const ouvintes = new Set<() => void>();

  function ler(): T {
    if (cache !== null) return cache;
    let lido = valorPadrao;
    try {
      const bruto = window.localStorage.getItem(chave);
      if (bruto !== null) lido = JSON.parse(bruto);
    } catch {
      // navegação privada com storage bloqueado — começa do zero
    }
    cache = lido;
    return lido;
  }

  /** Aceita o valor final ou um atualizador — "feitos" precisa do atual pra
      mesclar (toggle de um andar); a abertura só sobrescreve. */
  function escrever(valor: T | ((atual: T) => T)) {
    const novo = typeof valor === "function" ? (valor as (atual: T) => T)(ler()) : valor;
    cache = novo;
    try {
      window.localStorage.setItem(chave, JSON.stringify(novo));
    } catch {
      // sem storage a escrita continua reagindo na tela, só não sobrevive ao F5
    }
    for (const avisar of ouvintes) avisar();
  }

  function assinar(avisar: () => void) {
    ouvintes.add(avisar);
    return () => void ouvintes.delete(avisar);
  }

  return { ler, escrever, assinar, lerNoServidor: () => valorNoServidor };
}

const persistAbertura = criarPersistenciaLocal<boolean>(CHAVE, false, true);

export const assinarAbertura = persistAbertura.assinar;

/** Já viu a abertura alguma vez neste navegador? */
export const jaViuAbertura = persistAbertura.ler;

/**
 * No servidor a resposta é "já viu": o HTML sai sem o modal e ele aparece no
 * primeiro quadro do cliente, pra quem nunca entrou. O contrário — assumir que
 * ninguém viu — mandaria o modal no HTML e o arrancaria na hidratação, que é
 * exatamente a piscada que se quer evitar.
 */
export const jaViuNoServidor = persistAbertura.lerNoServidor;

export function marcarAberturaVista() {
  persistAbertura.escrever(true);
}

/* ---------------------------------------------------------------------
   Focus trap — compartilhado com ModalEditorEntregaveis (Obra.tsx). São só
   dois diálogos neste app, e os dois precisam do mesmo comportamento:
   focar o primeiro elemento focável ao montar (sem roubar de um `autoFocus`
   que já pousou em outro campo — é o caso deste modal, no botão ENTRAR NA
   OBRA), Tab/Shift+Tab só circulam DENTRO do diálogo, e o foco volta pra
   quem tinha foco antes de abrir.

   `anterior` é capturado no INICIALIZADOR PREGUIÇOSO do `useState`, não num
   `ref` lido em render (o lint `react-hooks/refs` barra isso — ler `.current`
   fora de effect/handler é undefined behavior sob Strict Mode) nem num
   effect (aí já seria tarde: `autoFocus` do React move o foco durante o
   commit, que roda antes de qualquer effect). O inicializador do `useState`
   roda uma vez só, ainda em render, antes do commit — mesmo timing que o
   `ref` tentava, pela via que o React sanciona pra ler algo impuro na
   primeira passada. --------------------------------------------------- */
const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref: RefObject<HTMLElement | null>) {
  const [anterior] = useState<Element | null>(() =>
    typeof document !== "undefined" ? document.activeElement : null,
  );

  useEffect(() => {
    const raiz = ref.current;
    if (!raiz) return;

    const focaveis = () =>
      Array.from(raiz.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)).filter(
        (el) => el.offsetParent !== null,
      );

    if (!raiz.contains(document.activeElement)) {
      focaveis()[0]?.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const lista = focaveis();
      if (!lista.length) return;
      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      const dentro = raiz.contains(document.activeElement);
      if (e.shiftKey) {
        if (!dentro || document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        }
      } else if (!dentro || document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    raiz.addEventListener("keydown", onKey);
    return () => {
      raiz.removeEventListener("keydown", onKey);
      if (anterior instanceof HTMLElement) anterior.focus();
    };
  }, [ref, anterior]);
}

export default function ModalAbertura({ onFechar }: { onFechar: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef);

  // Esc fecha. A Obra também escuta Esc pra voltar uma camada de câmera, e por
  // isso este handler para a propagação: com a abertura na tela, Esc é dela.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onFechar();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onFechar]);

  return (
    // ---------------------------------------------------------------------
    // EMBAIXO, não em cima. Por quê:
    //
    // 1. O único jeito de sair daqui é o botão ENTRAR NA OBRA. Num celular de
    //    667px, o alto da tela é justamente onde o polegar não chega sem
    //    reposicionar o aparelho na mão — e isso pra uma ação obrigatória.
    // 2. O alto é território de sistema: notificação, barra de URL, alerta que
    //    passa. Conteúdo que exige leitura e decisão chegando de lá é lido
    //    como aviso descartável, e some da atenção junto com os outros.
    // 3. Este conteúdo é alto (3 regras + 3 entregáveis + ação). Folha de
    //    baixo cresce pra cima com rolagem interna e mantém a ação ancorada no
    //    rodapé; folha de cima teria que rolar pra longe do polegar.
    //
    // Em `lg` volta a ser modal centrado: no desktop o ponteiro alcança tudo e
    // o centro é onde o olho já está.
    // ---------------------------------------------------------------------
    <div
      className="absolute inset-0 z-50 flex items-end justify-center bg-[rgba(5,8,14,.72)] p-0 backdrop-blur-md lg:items-center lg:p-6"
      onClick={onFechar}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Como esta obra funciona"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-[620px] flex-col overflow-y-auto rounded-t-[24px] border border-white/[.14] bg-[#171b24]/95 shadow-[0_36px_120px_-36px_#000] lg:max-h-none lg:overflow-visible lg:rounded-[18px]"
      >
        <div className="flex items-center gap-3 border-b border-white/[.08] px-5 py-3.5 lg:px-6">
          <div className="flex gap-1.5" aria-hidden>
            <i className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <i className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <i className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="flex-1 text-center font-mono text-[10px] font-semibold tracking-[.16em] text-texto-3">
            COCKPIT · OBRA 10K
          </span>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="grid h-7 w-7 place-items-center rounded-full text-lg leading-none text-texto-3 hover:bg-white/[.08] hover:text-texto">×</button>
        </div>

        <div className="px-5 pb-5 pt-6 lg:px-8 lg:pb-7 lg:pt-7">
          <span className="font-mono text-[10px] font-bold tracking-[.22em] text-azul">MAPA DO MÉTODO</span>
          <h1 className="mt-2 text-[25px] font-semibold leading-tight tracking-[-.03em] text-texto lg:text-[30px]">
            Quatro pilares. Uma obra.
          </h1>
          <p className="mt-2 max-w-[480px] text-[13px] leading-relaxed text-texto-2">
            Acesse cada andar pelo caminho que faz sentido para você: aprenda, acelere ou execute.
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <Regra n="01" titulo="Marcou, construiu." />
            <Regra n="02" titulo="Nenhum andar é opcional." />
            <Regra n="03" titulo="Escolha o caminho." />
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {ENTREGAVEIS.map(({ Ico, rot, papel, cor }) => (
            <span
              key={rot}
              className="flex min-w-0 flex-col gap-3 rounded-xl border p-3.5"
              style={{ borderColor: cor + "44", background: cor + "12" }}
            >
              <span
                className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg border"
                style={{ color: cor, borderColor: cor + "55", background: cor + "1f" }}
              >
                <Ico size={15} />
              </span>
              <span className="min-w-0">
                <b
                  className="block font-mono text-[8.5px] font-bold tracking-[.16em]"
                  style={{ color: cor }}
                >
                  {rot}
                </b>
                <span className="mt-1 block text-[11px] leading-tight text-texto-2">{papel.replace("onde você ", "")}</span>
              </span>
            </span>
          ))}
          </div>

        <div className="sticky bottom-0 -mx-5 mt-6 flex flex-col-reverse gap-3 border-t border-white/[.08] bg-[#171b24] px-5 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:flex-row lg:items-center lg:gap-4 lg:border-0 lg:bg-transparent lg:p-0">
          <button
            type="button"
            autoFocus
            onClick={onFechar}
            className="h-11 flex-none rounded-lg bg-azul px-5 font-mono text-[10px] font-extrabold tracking-[.14em] text-[#04070d] shadow-[0_8px_24px_-10px_#2b8cff] transition hover:brightness-110 lg:h-auto lg:py-3"
          >
            ENTRAR NA OBRA
          </button>
          <span className="text-[11.5px] leading-snug text-texto-3">
            Toque num prédio para começar.
            {/* legenda de teclado só onde existe teclado */}
            <span className="hidden lg:inline">
              {" "}
              Ou percorra tudo por ele:{" "}
              <b className="text-texto-2">← →</b> entre prédios ·{" "}
              <b className="text-texto-2">↑ ↓</b> entre andares ·{" "}
              <b className="text-texto-2">1-5</b> vai direto.
            </span>
          </span>
        </div>
      </div>
      </div>
    </div>
  );
}

function Regra({
  n,
  titulo,
}: {
  n: string;
  titulo: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/[.07] bg-white/[.025] px-2.5 py-2.5">
      <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-white/[.07] font-mono text-[9px] font-bold text-texto-2">
        {n}
      </span>
      <p className="text-[11px] font-medium leading-tight text-texto">{titulo}</p>
    </div>
  );
}
