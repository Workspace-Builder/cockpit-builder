"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import clsx from "clsx";
import { ArrowUpRight, Check, CirclePlus, HelpCircle, Link2, PenLine, Plus, Trash2, X, type LucideIcon } from "lucide-react";
import { alternarOitentaVinteAction, excluirEntregavelAction, salvarEntregavelAction } from "@/app/actions";
import { PODE_EDITAR } from "@/lib/modo";
import { PASSOS, passosDoPilar } from "@/lib/passos";
import { TETO_8020, type ChaveVaga, type LinkExtra, type Oitenta, type Passo, type Vaga } from "@/lib/model";
import { PREDIOS, ORDEM } from "./pilares";
import { criarObra, type EstadoObra } from "./motor";
import { ENTREGAVEIS } from "./entregaveis";
import { ASIDE, FOLHA, PAINEL } from "./layout";
import { useRetrato } from "./useRetrato";
import ModalAbertura, {
  assinarAbertura,
  criarPersistenciaLocal,
  jaViuAbertura,
  jaViuNoServidor,
  marcarAberturaVista,
  useFocusTrap,
} from "./ModalAbertura";

// ---------------------------------------------------------------------------
// A OBRA — o quarteirão dos 4 pilares
// ---------------------------------------------------------------------------
// Uma tela só. Clicar num prédio não abre outra página: a câmera fecha nele e
// o checklist do pilar aparece. Clicar num passo do checklist abre os nós
// daquele andar. Esc volta uma camada.
//
// O desenho é SVG imperativo (`motor.ts`); aqui ficam o estado e a UI.
//
// O 80/20 mora no ENTREGÁVEL, não no andar (migration 009). Os 36 andares são
// obrigatórios; o que se escolhe é por qual dos três caminhos entrar. Marcar
// isso é o modo de edição do painel — dado do banco, não constante.
// ---------------------------------------------------------------------------

/** Progresso é do aluno, não do banco — como `jaViuAbertura` em ModalAbertura.
    A build publicada (`build:aluno`) é estática (`output: "export"`) e troca
    as Server Actions por no-op: não existe servidor pra gravar isso pra
    ninguém. `localStorage` é o único lugar que sobrevive ao F5 nesse modo, e
    é aceitável não sincronizar entre aparelhos — cada aluno usa o dele.

    A fábrica é `criarPersistenciaLocal`, em ModalAbertura.tsx: mesmo desenho
    de `jaViuAbertura` (cache de referência + Set de ouvintes + contrato
    useSyncExternalStore), só que pra objeto em vez de boolean. */
const SEM_FEITOS: Record<string, boolean> = {};
const persistFeitos = criarPersistenciaLocal<Record<string, boolean>>(
  "cockpit:obra:feitos:v1",
  SEM_FEITOS,
);
const assinarFeitos = persistFeitos.assinar;
const lerFeitos = persistFeitos.ler;
const lerFeitosNoServidor = persistFeitos.lerNoServidor;

/** Marca/desmarca um andar e grava. Quem lê via `useSyncExternalStore` é
    avisado no mesmo tique — sem storage o clique some no F5, mas continua
    reagindo na tela. */
function alternarFeito(id: string) {
  persistFeitos.escrever((atual) => ({ ...atual, [id]: !atual[id] }));
}

export default function Obra({
  passos,
  oitentaVinte,
  andarInicial,
}: {
  passos: Passo[];
  oitentaVinte: Oitenta;
  /**
   * Andar que a Obra já abre selecionado, vindo de `?andar=<id>` na URL.
   *
   * É como o Motor de Tijolos aterrissa aqui: lá o tijolo sabe a vaga
   * (`ref: "design:ferram"`), clica, e a Obra abre no andar Design com o painel
   * das 3 vagas na tela — o mesmo entregável, visto pelo outro eixo.
   *
   * Chega como PROP, mas não veio mais resolvido do servidor desde
   * 2026-08-03 (`AppShell` lê `useParametroDaUrl`, que devolve `undefined` na
   * hidratação e só resolve pro valor real DEPOIS, na build estática). Por
   * isso não dá mais pra usar como valor inicial de `useState` — na hora em
   * que o parâmetro chega, o `useState` já tinha fixado térreo/fechado.
   */
  andarInicial?: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const motorRef = useRef<ReturnType<typeof criarObra> | null>(null);

  const doLink = andarInicial
    ? (passos.find((p) => p.id === andarInicial) ?? null)
    : null;

  /** retrato = celular em pé. Fonte única pro que muda de forma nesta tela. */
  const retrato = useRetrato();

  const feitos = useSyncExternalStore(assinarFeitos, lerFeitos, lerFeitosNoServidor);
  const [foco, setFoco] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [sel, setSel] = useState<string | null>(null);
  /* "andar em destaque" e "painel dos nós aberto" são estados diferentes:
     clicar no prédio leva a câmera e abre o CHECKLIST; só o checklist abre os nós. */
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(false);

  /* Aplica o `?andar=` assim que ele chega — que pode ser só no render
     seguinte ao primeiro, já que `andarInicial` nasce `undefined` na
     hidratação da build estática (ver `useParametroDaUrl`). Comparar com o
     último valor já aplicado, e aplicar NO RENDER (não em effect), é o mesmo
     padrão do `vAplicado` no AppShell e do `faseDosAbertos` no Motor de
     Tijolos: aplica exatamente uma vez por link, sem depender de o
     `useState` acertar de primeira, e sem brigar com o clique — depois de
     aplicado, `andarInicial` não muda mais sozinho, então quem manda depois
     volta a ser o clique. */
  const [andarAplicado, setAndarAplicado] = useState<string | undefined>(undefined);
  if (andarInicial && andarInicial !== andarAplicado) {
    setAndarAplicado(andarInicial);
    if (doLink) {
      setFoco(doLink.pilar);
      setSel(doLink.id);
      setAberto(true);
    }
  }

  /* A abertura tem duas origens e uma saída só. Ela aparece sozinha pra quem
     nunca entrou (o localStorage responde isso, via store externo) e sob
     demanda pelo `?`. Fechar sempre grava a visita — inclusive quando veio do
     `?`, senão reler a regra faria a abertura voltar na próxima visita. */
  const jaViu = useSyncExternalStore(assinarAbertura, jaViuAbertura, jaViuNoServidor);
  const [reaberta, setReaberta] = useState(false);
  const abertura = reaberta || !jaViu;
  const fecharAbertura = useCallback(() => {
    setReaberta(false);
    marcarAberturaVista();
  }, []);

  /* A marcação aparece no clique e só depois volta do banco. Sem isso, cada
     estrela esperaria o `revalidatePath` inteiro — meio segundo olhando pra um
     botão que não reagiu é tempo suficiente pra clicar de novo. */
  const [marcas, aplicarMarca] = useOptimistic(
    oitentaVinte,
    (atual: Oitenta, alvo: { passoId: string; k: ChaveVaga }) => {
      const lista = atual[alvo.passoId] ?? [];
      const dentro = lista.includes(alvo.k);
      return {
        ...atual,
        [alvo.passoId]: dentro
          ? lista.filter((x) => x !== alvo.k)
          : lista.length >= TETO_8020
            ? lista
            : [...lista, alvo.k],
      };
    },
  );
  const [, iniciar] = useTransition();
  const alternar = useCallback(
    (passoId: string, k: ChaveVaga) => {
      iniciar(async () => {
        aplicarMarca({ passoId, k });
        await alternarOitentaVinteAction(passoId, k);
      });
    },
    [aplicarMarca],
  );

  /* `painel` e `aside` entram no estado da CÂMERA porque são o que cobre a
     cena: a obra se afasta pra caber na faixa que sobra (layout.ts). Abrir o
     painel deixou de ser só um card aparecendo — é um movimento da obra. */
  const estado: EstadoObra = useMemo(
    () => ({
      feitos,
      foco,
      sel,
      painel: foco !== 0 && !!sel && aberto,
      aside: foco !== 0,
    }),
    [feitos, foco, sel, aberto],
  );

  const onPasso = useCallback((n: 1 | 2 | 3 | 4, passoId: string) => {
    setFoco(n); setSel(passoId); setAberto(true);
  }, []);
  const onPredio = useCallback((n: 1 | 2 | 3 | 4, passoId?: string) => {
    setFoco(n);
    setSel(passoId ?? null);
    /* clicar num ANDAR com o painel aberto tem que TROCAR o andar do painel.
       Zerar sempre fazia o painel fechar no clique — parecia que não atualizava.
       Clicar no prédio (sem andar) continua fechando. */
    setAberto((ab) => (passoId ? ab : false));
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const m = criarObra(svgRef.current, passos, { onPredio, onPasso });
    motorRef.current = m;
    /* `feitos` aqui, não `{}` fixo: o localStorage já resolveu (via
       `useSyncExternalStore`, síncrono no primeiro render do cliente) antes
       deste efeito rodar. Desenhar vazio e confiar no efeito de baixo pra
       "corrigir" depois não funciona — aquele efeito só redesenha quando
       `feitos` MUDA (`feitosRef.current !== feitos`), e no mount o ref já
       nasce apontando pro mesmo `feitos` já carregado: a comparação dá igual,
       ele cai no `navegar` (que não mexe em geometria) e a torre fica curta
       pra sempre, mesmo com andar marcado — só o contador (que lê `feitos`
       direto no JSX) mostrava o progresso certo. */
    m.render({ feitos, foco: 0, sel: null, painel: false, aside: false }, true);
    return () => { m.destruir(); motorRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só a 1ª pintura: mudanças de `feitos` depois do mount passam pelo efeito de baixo (`feitosRef`), que já sabe reconstruir a geometria.
  }, [onPredio, onPasso, passos]);

  /* ---- O ÍMÃ DO RETRATO ---------------------------------------------------
     Em pilha, os quatro prédios ocupam ~2.500px de altura. Enquadrar todos de
     uma vez faz a câmera afastar até cada torre ficar com ~110px — MENOS que
     os ~215px que a fileira dava. Medido: empilhar sem isto aqui piora.

     A pilha só paga quando se vê UM prédio por vez, e é isso que este gesto
     faz: arrastar pra cima leva ao prédio de baixo, um por vez. Não acumula
     velocidade — um arrasto longo anda um degrau, igual a `scroll-snap-stop:
     always`, que é o comportamento que o CSS daria se aqui houvesse um
     container rolável. Não há: quem se move é a CÂMERA, e ela já é discreta
     por natureza (`foco` é 1..4), então o encaixe vem de graça.

     Só existe em retrato. Na cabine o quarteirão inteiro cabe e é a tela que
     dá a visão do conjunto — trocar isso por navegação seria perder o mapa. */
  useEffect(() => {
    if (!retrato) return;
    const alvo = svgRef.current?.parentElement;
    if (!alvo) return;

    /* Com o painel do andar aberto, o arraste é DELE: a folha rola por dentro,
       e roubar esse gesto pra trocar de prédio tiraria o conteúdo debaixo do
       dedo de quem está lendo. */
    if (aberto) return;

    let travado = false;
    const passar = (dir: 1 | -1) => {
      if (travado) return;
      travado = true;
      // 620ms é o voo da câmera: soltar o passo antes faz dois degraus num
      // arrasto só, que é exatamente o "acumulou velocidade" que não queremos.
      setTimeout(() => { travado = false; }, 640);
      /* Chega até 0 — "A obra", o quarteirão inteiro. Ele é o primeiro ponto do
         trilho, e travar o gesto em 1 deixaria um ponto que nunca acende. É
         também o que devolve a visão do conjunto no celular: em pilha ela fica
         acima do Pilar 01, como a capa ficava no wireframe. */
      setFoco((f) => {
        const prox = f + dir;
        return prox < 0 || prox > 4 ? f : (prox as 0 | 1 | 2 | 3 | 4);
      });
      setSel(null);
    };

    let y0 = 0;
    const onStart = (e: TouchEvent) => { y0 = e.touches[0].clientY; };
    const onMove = (e: TouchEvent) => {
      const d = y0 - e.touches[0].clientY;
      if (Math.abs(d) < 48) return;           // abaixo disso é toque tremido
      passar(d > 0 ? 1 : -1);
      y0 = e.touches[0].clientY;
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 12) return;
      passar(e.deltaY > 0 ? 1 : -1);
    };

    alvo.addEventListener("touchstart", onStart, { passive: true });
    alvo.addEventListener("touchmove", onMove, { passive: true });
    alvo.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      alvo.removeEventListener("touchstart", onStart);
      alvo.removeEventListener("touchmove", onMove);
      alvo.removeEventListener("wheel", onWheel);
    };
  }, [aberto, retrato]);

  /* Em retrato a obra entra JÁ num prédio: o quarteirão empilhado e enquadrado
     inteiro é a pior das duas telas (ver o gesto acima). Ele continua a um
     arrasto pra cima, e é o primeiro ponto do trilho.

     NO RENDER, não em effect — mesmo padrão de `andarAplicado` acima e do
     `vAplicado` no AppShell: setState dentro de effect renderiza duas vezes e
     o lint da casa barra. `typeof window` porque no servidor não há largura
     pra perguntar, e lá isto não tem o que decidir. */
  const [entrouRetrato, setEntrouRetrato] = useState(false);
  if (!entrouRetrato && !abertura && retrato) {
    setEntrouRetrato(true);
    if (foco === 0) setFoco(1);
  }

  /* Trocar de tela não reconstrói o desenho: `navegar` mexe só no que mudou de
     estado e anima o resto. `render` (que reconstrói) fica pro que altera a
     geometria — marcar ou pular andar, que muda a altura da torre. */
  const feitosRef = useRef(feitos);
  useEffect(() => {
    const m = motorRef.current;
    if (!m) return;
    if (feitosRef.current !== feitos) { feitosRef.current = feitos; m.render(estado); }
    else m.navegar(estado);
  }, [estado, feitos]);

  /* ---- o teclado: percorrer a obra inteira sem tocar no mouse --------------
     ← →  troca de prédio, e o ciclo FECHA na obra: depois do Pilar 04 vem o
          quarteirão inteiro, que é a mesma ordem da barra de cima.
     ↑ ↓  sobe e desce andar. Pra cima é pra cima de verdade — o andar de
          ordem maior, que é o que está mais alto na torre e no checklist.
          Nas pontas PARA, não dá a volta: circular entre andares faz o térreo
          e a cobertura ficarem colados, e aí ninguém sabe mais onde está.
     Entrar num prédio sem andar escolhido cai no PRIMEIRO NÃO CONSTRUÍDO —
     "onde a obra está", não onde ela começou. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (abertura) return;                  // com a abertura na tela, o teclado é dela
      /* com o Editor de Entregáveis aberto, o teclado é DELE — sem isto, ↑/↓
         trocavam "sel" (o andar) por baixo do formulário sem ele remontar
         (foco num <button> do próprio modal escapa do filtro de tag abaixo),
         e o texto digitado ia salvo no andar errado (bug B1). */
      if (editando) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;

      if (e.key === "Escape") {              // Esc volta uma camada por vez
        if (aberto) setAberto(false);
        else { setFoco(0); setSel(null); }
        return;
      }
      if (e.key >= "1" && e.key <= "5") {
        setFoco((Number(e.key) - 1) as 0 | 1 | 2 | 3 | 4);
        setSel(null);
        setAberto(false);
        return;
      }

      const lado = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (lado) {
        e.preventDefault();
        setFoco((f) => (((f + lado) % 5) + 5) % 5 as 0 | 1 | 2 | 3 | 4);
        setSel(null);
        setAberto(false);
        return;
      }

      const degrau = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
      if (degrau) {
        e.preventDefault();
        if (!foco) return;                   // no quarteirão não há andar pra subir
        const lst = passos.filter((p) => p.pilar === foco).sort((a, b) => a.ordem - b.ordem);
        setSel((atual) => {
          const i = atual ? lst.findIndex((p) => p.id === atual) : -1;
          if (i < 0) {
            const j = lst.findIndex((p) => !feitos[p.id]);
            return lst[j < 0 ? lst.length - 1 : j].id;
          }
          const prox = i + degrau;
          return prox < 0 || prox >= lst.length ? atual : lst[prox].id;
        });
        setAberto(true);                     // navegar por andar É abrir o entregável
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, abertura, editando, foco, feitos, passos]);

  const marcar = (id: string) => alternarFeito(id);

  const cfg = foco ? PREDIOS[foco] : null;
  const lista = foco ? passos.filter((p) => p.pilar === foco).sort((a, b) => a.ordem - b.ordem) : [];
  const noPilar = lista.filter((p) => feitos[p.id]).length;
  const passoSel = sel ? lista.find((p) => p.id === sel) ?? null : null;

  // andar não marcado com marcado acima está PULADO: saiu da obra
  const ultimo = lista.reduce((acc, p, i) => (feitos[p.id] ? i : acc), -1);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden [contain:paint]">
      <svg ref={svgRef} data-obra="" className="pointer-events-auto absolute" />

      {/* A CORTINA. O painel não fica aceso clareando: fica aceso porque o
          vizinho apaga. É gradiente e não véu chapado de propósito — o lado
          direito, atrás do painel, cai quase pro preto; o esquerdo fica intacto
          porque é lá que estão as etiquetas dos andares, que continuam sendo
          como se troca de andar. `pointer-events-none` pra que clicar num outro
          andar através dela siga funcionando. */}
      {cfg && passoSel && aberto && (
        <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-[rgba(4,7,13,.86)] via-[rgba(4,7,13,.40)] to-transparent lg:bg-gradient-to-l" />
      )}

      {/* A UI DO ALTO — barra dos pilares e, sob ela, a faixa do pilar em foco.
          Em retrato as duas viram um bloco em FLUXO: a faixa cai naturalmente
          embaixo da barra, sem ninguém calcular `top`, e é a altura DESTE
          bloco que a câmera mede pra saber onde a obra começa (layout.ts).
          Em paisagem o `lg:contents` dissolve o wrapper e cada uma volta a se
          posicionar sozinha, exatamente como antes. */}
      <div
        data-ui-topo
        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center gap-2 px-3 pt-3 lg:contents"
      >
        <BarraPilares
          foco={foco}
          feitos={feitos}
          onIr={(n) => { setFoco(n); setSel(null); setAberto(false); }}
        />

        {/* Checklist do pilar — apoio, não protagonista. Em retrato deixa de
            ser coluna à esquerda: a obra precisa da largura inteira, que é a
            dimensão em que ela menos cabe. A tese fica, em duas linhas —
            cortá-la tiraria o que faz o desenho significar alguma coisa. */}
        {cfg && (
          <aside
            className={clsx(
              "flex w-full rounded-2xl border border-fio bg-[rgba(13,18,29,.92)] px-4",
              // com o andar aberto a faixa deita em UMA linha: título e voltar
              // lado a lado. Empilhada ela custava ~110px de altura, e altura
              // aqui sai direto da obra — é o que a câmera desconta.
              aberto
                ? "items-center justify-between gap-3 py-2"
                : "flex-col py-3",
              "lg:absolute lg:bottom-6 lg:top-20 lg:w-[var(--aside-larg)] lg:flex-col lg:items-stretch lg:justify-start lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0",
              "lg:left-[var(--aside-marg)] lg:z-10",
            )}
            style={{
              ["--aside-larg" as string]: `${ASIDE.largura}px`,
              ["--aside-marg" as string]: `${ASIDE.margem}px`,
            }}
          >
            {/* o rótulo do pilar sai na linha única: a cor do número do andar,
                na folha, já diz de qual torre ele é */}
            <span
              className={clsx(
                "font-mono text-[10px] font-bold tracking-[.2em]",
                aberto && "hidden lg:block",
              )}
              style={{ color: cfg.cor }}
            >
              PILAR {cfg.no} · {cfg.fase}
            </span>
            <h2
              className={clsx(
                "min-w-0 truncate font-mono text-[13px] font-bold uppercase leading-tight tracking-[.03em] text-texto lg:mt-2 lg:whitespace-normal lg:text-[14px]",
                !aberto && "mt-1.5",
              )}
            >
              {cfg.titulo}
            </h2>
            {/* A TESE NÃO EXISTE EM RETRATO — antes ela só sumia com o andar
                aberto; agora sai sempre. Desde que a placa saiu do desenho
                (ver `cena` em motor.ts), esta faixa é o ÚNICO lugar que nomeia
                o pilar, e o que ela precisa dizer é o nome, não o parágrafo:
                são duas linhas cobrando ~50px da altura em que a torre é
                desenhada. No desktop há espaço pros dois, e a tese é o que dá
                contexto antes de escolher o prédio. */}
            <p className="mt-2 hidden line-clamp-2 text-[12px] leading-snug text-texto-2 lg:mt-3 lg:line-clamp-none lg:block lg:text-[13px] lg:leading-relaxed">
              {cfg.tese}
            </p>

            {/* Em retrato o contador e o voltar deitam na mesma linha; em
                paisagem voltam a ser rodapé da coluna, empurrados pelo mt-auto. */}
            <div
              className={clsx(
                "flex items-end justify-between gap-3 lg:mt-auto lg:block lg:pt-5",
                aberto ? "flex-none" : "mt-2.5",
              )}
            >
              <div className="min-w-0">
                {/* mesmo motivo da tese: com o andar aberto, o contador vira
                    linha que custa altura e não muda decisão nenhuma */}
                <div className={clsx("flex items-baseline gap-2", aberto && "hidden lg:flex")}>
                  <b className="font-mono text-[22px] leading-none tracking-tight lg:text-[30px]" style={{ color: cfg.cor }}>
                    {noPilar}
                  </b>
                  <span className="font-mono text-[9.5px] tracking-[.14em] text-texto-3">
                    DE {lista.length} ANDARES ERGUIDOS
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setFoco(0); setSel(null); setAberto(false); }}
                className="pointer-events-auto h-11 flex-none rounded-lg border border-fio px-3 font-mono text-[8.5px] font-bold tracking-[.12em] text-texto-3 hover:border-azul hover:text-white lg:mt-4 lg:h-auto lg:w-fit lg:py-[7px]"
              >
                ← VOLTAR
                <span className="hidden lg:inline"> PRA OBRA</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* os 3 nós do andar */}
      {cfg && passoSel && aberto && (
        <PainelNos
          passo={passoSel}
          cor={cfg.cor}
          feito={!!feitos[passoSel.id]}
          pulado={!feitos[passoSel.id] && lista.findIndex((x) => x.id === passoSel.id) < ultimo}
          onMarcar={() => marcar(passoSel.id)}
          onFechar={() => setAberto(false)}
          marcas={marcas[passoSel.id] ?? []}
          onEditando={() => setEditando((v) => !v)}
        />
      )}

      {/* O editor de entregáveis grava (salvarEntregavel, excluirEntregavel,
          alternarOitentaVinte). Na build do aluno essas ações são no-op, então
          o modal abriria prometendo edição e não gravaria nada. */}
      {PODE_EDITAR && editando && passoSel && (
        <ModalEditorEntregaveis
          passo={passoSel}
          marcas={marcas[passoSel.id] ?? []}
          onAlternar={(k) => alternar(passoSel.id, k)}
          onFechar={() => setEditando(false)}
        />
      )}

      {/* A regra do jogo saiu do canto da tela e virou abertura. Este `?` é o
          caminho de volta — o único resto permanente dela, e por isso ele não
          some em retrato: muda de canto. Embaixo à esquerda é onde a folha do
          andar sobe; no alto à direita ele fica livre em qualquer estado.
          Fora do `[data-ui-topo]` de propósito — flutua, não empurra a obra.

          Em paisagem o `left` só abre mão do canto quando há motivo: a faixa
          do pilar (`aside`) deita o rodapé dela (voltar + contador,
          empurrados por `mt-auto`) nesse mesmo canto, mas só existe com um
          pilar em foco (`cfg`). No quarteirão não há aside — deslocar sempre
          deixava o `?` órfão do canto sem ninguém pra evitar. Com pilar em
          foco, 278px = ASIDE.margem×2 + ASIDE.largura (24+24+230): a mesma
          margem que a aside já usa dos dois lados dela, duplicada pra abrir
          espaço depois da coluna inteira em vez de inventar número. */}
      <div
        className={clsx(
          "pointer-events-none absolute right-3 top-3 z-40 flex items-center gap-2.5 lg:bottom-5 lg:right-auto lg:top-auto",
          cfg ? "lg:left-[278px]" : "lg:left-6",
        )}
      >
        <button
          type="button"
          onClick={() => setReaberta(true)}
          title="Como esta obra funciona"
          aria-label="Como esta obra funciona"
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-fio bg-[rgba(13,18,29,.9)] text-texto-3 hover:border-azul hover:text-white lg:h-9 lg:w-9"
        >
          <HelpCircle size={15} />
        </button>
        {/* Atalho que ninguém descobre é atalho que não existe. Fica no rodapé,
            discreto, e muda com onde você está: no quarteirão só as setas
            laterais fazem algo; dentro de um prédio, as quatro.
            Sai em retrato: legenda de teclado pra quem não tem teclado é ruído
            ocupando a tela que o desenho precisa. */}
        <span className="hidden items-center gap-2 font-mono text-[10px] tracking-[.06em] text-texto-3 lg:flex">
          {foco > 0 && (
            <>
              <Tecla>↑</Tecla>
              <Tecla>↓</Tecla>
              andares
              <i className="h-2.5 w-px bg-fio" />
            </>
          )}
          <Tecla>←</Tecla>
          <Tecla>→</Tecla>
          prédios
          <i className="h-2.5 w-px bg-fio" />
          <Tecla>1-5</Tecla>
          direto
        </span>
      </div>

      {abertura && <ModalAbertura onFechar={fecharAbertura} />}
    </div>
  );
}

function Tecla({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/15 bg-white/[.05] px-1.5 py-[2px] text-[10px] text-texto-2">
      {children}
    </kbd>
  );
}

/**
 * O menu de checkpoint: onde você está e pra onde dá pra ir.
 * Mesma posição e formato da barra de vistas do app — vista não troca de
 * página, só re-enquadra dentro dela (BLUEPRINT-PAGINAS.md §4). Cada pilar
 * mostra o quanto já subiu, então serve de bússola pra quem se perdeu.
 *
 * É também a ÚNICA barra desta tela: o dock de baixo não entra na Obra
 * (AppShell), porque ele comanda canvas e aqui a câmera é esta.
 */
function BarraPilares({
  foco, feitos, onIr,
}: {
  foco: 0 | 1 | 2 | 3 | 4;
  feitos: Record<string, boolean>;
  onIr: (n: 0 | 1 | 2 | 3 | 4) => void;
}) {
  const alvos = [
    { n: 0 as const, label: "A obra", cor: "#9aa7be" },
    ...ORDEM.map((n) => ({ n, label: `Pilar ${PREDIOS[n].no}`, cor: PREDIOS[n].cor })),
  ];
  return (
    /* `flex-wrap` em vez de largura fixa: os cinco alvos quebram sozinhos na
       linha de baixo quando não cabem, e voltam pra uma linha só assim que há
       espaço. Antes eram cinco botões numa linha rígida que, em 375px,
       terminava 119px além da tela — sem scroll pra alcançar, porque a Obra é
       `overflow-hidden`. Os pilares 3, 4 e 5 simplesmente não existiam.
       A altura daqui é medida pela câmera (data-ui-topo no pai), então quebrar
       em duas linhas empurra a obra pra baixo em vez de tapá-la. */
    <>
    {/* ---- RETRATO: o trilho ------------------------------------------------
        A barra abaixo tem cinco alvos com rótulo e contador. Em 375px eles
        quebram em duas linhas e comem 97px — 14% da tela, num layout em que a
        obra já disputava altura com a folha do andar.

        Aqui viram cinco pontos, 22px no total. E são PASSIVOS de propósito:
        quem troca de prédio é o arrasto (o ímã, em Obra), então o trilho só
        responde "onde estou". Fosse também controle, seriam dois donos do
        mesmo estado — e um ponto de 6px é alvo de toque que o dedo erra
        sempre, o que obrigaria a devolver os 44px de altura que ele veio
        economizar.

        O ativo vira TRAÇO em vez de só acender: no meio de cinco pontos da
        mesma família, diferença de cor sozinha é fraca demais pra dizer
        "aqui" de relance. */}
    <div className="pointer-events-none flex items-center justify-center gap-[7px] py-2 lg:hidden">
      {alvos.map(({ n, cor }) => {
        const on = foco === n;
        return (
          <i
            key={n}
            aria-hidden
            className={clsx(
              "block h-1.5 rounded-full transition-all duration-200",
              on ? "w-[22px]" : "w-1.5 bg-fio-2",
            )}
            style={on ? { background: cor } : undefined}
          />
        );
      })}
    </div>

    <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-fio bg-[rgba(13,18,29,.96)] px-2 py-[7px] shadow-[0_16px_44px_rgba(0,0,0,.55)] max-lg:hidden lg:absolute lg:left-1/2 lg:top-4 lg:z-30 lg:max-w-none lg:-translate-x-1/2 lg:flex-nowrap lg:px-2.5">
      {alvos.map(({ n, label, cor }, i) => {
        const lst = n ? passosDoPilar(n) : PASSOS;
        const f = lst.filter((p) => feitos[p.id]).length;
        const on = foco === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onIr(n)}
            className={clsx(
              "flex h-11 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-2.5 text-[12.5px] font-semibold lg:h-10 lg:gap-2 lg:px-3.5",
              on ? "bg-white/[.10] text-white" : "text-texto-2 hover:bg-white/[.06] hover:text-white",
            )}
          >
            {/* o número é atalho de teclado: no dedo não serve pra nada */}
            <kbd className="hidden text-[10px] opacity-50 lg:inline">{i + 1}</kbd>
            <i className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: cor, boxShadow: on ? `0 0 8px ${cor}` : undefined }} />
            {label}
            <span className={clsx("font-mono text-[10px]", on ? "text-texto-2" : "text-texto-3")}>
              {f}/{lst.length}
            </span>
          </button>
        );
      })}
    </div>
    </>
  );
}

/**
 * O painel do andar — o que o aluno recebe pra construir aquele passo.
 *
 * É o ENTREGÁVEL da página, e por isso é a coisa mais acesa da tela. Três
 * coisas fazem isso junto, e nenhuma sozinha resolvia:
 *
 * 1. o painel clareia (era #0a0f19, mais escuro que a própria Obra — parecia
 *    rodapé do desenho; agora é o degrau mais claro da tela);
 * 2. a obra atrás apaga (a cortina, lá em cima) — contraste é relação, não
 *    valor absoluto: card claro sobre fundo claro continua sumindo;
 * 3. tudo cresce 1,5×, com folga maior até a borda da tela.
 *
 * O que NÃO foi feito, e por quê: card branco de verdade. As sete cores que
 * identificam pilar e vaga ficam entre 2:1 e 3,6:1 de contraste sobre branco
 * — todas abaixo do legível. Daria pra escurecer as sete só aqui, mas aí o
 * verde do selo FERRAMENTA deixaria de ser o mesmo verde do Pilar 02 no
 * desenho, e a cor perde o trabalho que ela faz neste app: amarrar as duas
 * telas.
 */
function PainelNos({
  passo, cor, feito, pulado, onMarcar, onFechar, marcas, onEditando,
}: {
  passo: Passo; cor: string; feito: boolean; pulado: boolean;
  onMarcar: () => void;
  onFechar: () => void;
  marcas: ChaveVaga[];
  onEditando: () => void;
}) {
  return (
    /* Largura e margem saem de `layout.ts`, que é de onde a CÂMERA também lê a
       reserva. Escritas aqui como classe Tailwind, a primeira mudança de
       largura deixaria a obra desalinhada em silêncio.
       Em retrato vira FOLHA DE BAIXO: largura toda, ancorada no rodapé, com
       rolagem interna. É onde o polegar já está — o entregável é a coisa que
       mais se toca nesta tela, e mandá-lo pro alto obrigaria a mão a atravessar
       o aparelho a cada andar. */
    <section
      /* `p-3.5` no retrato contra `p-6` na cabine: a folha divide a altura com
         a torre, e cada 6px de respiro aqui é 6px que o desenho perde. Na
         cabine o painel tem coluna própria e a folga é o que o separa da obra. */
      className="absolute inset-x-0 bottom-0 z-20 max-h-[var(--folha-h)] overflow-y-auto rounded-t-[22px] border border-white/[.14] bg-gradient-to-b from-[#222d45] to-[#161e30] p-3.5 pb-[max(.875rem,env(safe-area-inset-bottom))] lg:inset-x-auto lg:bottom-auto lg:right-[var(--painel-r)] lg:top-1/2 lg:max-h-none lg:w-[var(--painel-w)] lg:-translate-y-1/2 lg:overflow-visible lg:rounded-[22px] lg:p-6"
      style={{
        boxShadow: `0 0 0 1px ${cor}33, 0 44px 100px -28px #000`,
        ["--painel-r" as string]: `${PAINEL.margem}px`,
        ["--painel-w" as string]: `min(${PAINEL.max}px, ${PAINEL.vw * 100}vw)`,
        ["--folha-h" as string]: `min(${FOLHA.max}px, ${FOLHA.fracao * 100}dvh)`,
      }}
    >
      <div className="flex items-start gap-3">
        <span className="flex-1 font-mono text-[19px] font-bold leading-tight tracking-[.08em]" style={{ color: cor }}>
          {String(passo.ordem).padStart(2, "0")} · {passo.titulo.toUpperCase()}
        </span>
        {/* Some pro aluno: abre o editor de entregáveis, que é escrita. */}
        {PODE_EDITAR && (
          <button
            type="button"
            onClick={onEditando}
            title="Editar entregáveis e escolha 80/20"
            aria-label="Editar entregáveis e escolha 80/20"
            /* Editar entregável é trabalho de mesa — mexe em três campos e um
               seletor de plataforma. Fora da cabine ele não some por gosto:
               some porque ocupa a linha do título numa folha que precisa dela,
               e porque ninguém edita catálogo no celular. */
            className="-mr-1.5 -mt-1.5 hidden h-10 flex-none items-center gap-2 rounded-xl px-2.5 text-texto-3 hover:bg-white/[.08] hover:text-texto lg:inline-flex"
          >
            <PenLine size={17} />
            <span className="font-mono text-[10px] font-bold tracking-[.12em]">EDITAR</span>
          </button>
        )}
        {/* No toque a folha cobre metade da tela e a cortina atrás dela é
            `pointer-events-none` (deixa clicar noutro andar "através" dela) —
            sem este botão a única saída era Esc, que não existe em
            touchscreen. "← VOLTAR" na faixa do topo continua existindo, mas
            aquele sai do PILAR inteiro; este fecha só a folha, sem perder o
            checklist. */}
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          title="Fechar"
          className="-mr-1.5 -mt-1.5 grid h-11 w-11 flex-none place-items-center rounded-xl text-texto-3 hover:bg-white/[.08] hover:text-texto lg:h-9 lg:w-9"
        >
          <X size={18} />
        </button>
      </div>

      {passo.unha && (
        <span className="mt-3 inline-block rounded-md bg-[rgba(232,161,60,.16)] px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-[.14em] text-[#e8a13c]">
          NA UNHA · SEM FERRAMENTA
        </span>
      )}

      {/* A TESE SAI NO RETRATO. Medido: com ela, a folha batia no teto de 50%
          da altura e AINDA cortava — a terceira vaga aparecia pela metade e o
          CONSTRUIR ANDAR, que é o objetivo da tela, nascia abaixo da dobra.
          São duas linhas a 17px, e quem tocou no andar já decidiu entrar nele;
          o que falta ali é agir, não ler. Na cabine ela fica: lá sobra altura
          e a tese é o que dá contexto antes do clique. */}
      {passo.sub && <p className="mt-4 hidden text-[17px] leading-relaxed text-texto-2 lg:block">{passo.sub}</p>}

      {pulado && (
        <p className="mt-4 rounded-xl border border-[rgba(201,138,47,.45)] bg-[rgba(201,138,47,.1)] p-4 text-[16px] leading-snug text-[#e8b06a]">
          <b>Você pulou este andar.</b> O prédio subiu sem ele e encurtou.
        </p>
      )}

      {/* O rótulo de seção também sai no retrato: a folha INTEIRA é isso, e
          dizer o nome do que se está olhando custa uma linha que o CONSTRUIR
          precisava. Na cabine, onde o painel divide a tela com a obra, ele
          continua sendo o que separa o entregável do resto. */}
      <div className="mt-6 hidden items-baseline gap-2 lg:flex">
        <p className="flex-1 font-mono text-[11.5px] font-bold tracking-[.18em] text-texto-3">O QUE VOCÊ TEM PRA CONSTRUIR ESTE ANDAR</p>
      </div>

      <div className="mt-4 border-t border-white/[.1] pt-1 lg:mt-2">
        {ENTREGAVEIS.map(({ k, rot, papel, Ico, cor: c }) => (
          <LinhaVaga
            key={k}
            vaga={passo[k] as Vaga | undefined}
            rot={rot}
            papel={papel}
            Ico={Ico}
            cor={c}
            unha={passo.unha}
            oitenta={marcas.includes(k)}
          />
        ))}
      </div>

      {/* No retrato o botão é UMA LINHA, centrada: o subtítulo abaixo some.
          "só marque depois de fazer" é instrução de primeira vez, e paga com
          duas linhas de 15px numa folha que disputa altura com a torre — a
          cada andar, pra sempre. Na cabine ele fica: lá a altura sobra e a
          frase é o que segura o clique apressado. */}
      <button
        type="button" onClick={onMarcar}
        className={clsx(
          "mt-3 w-full rounded-2xl px-5 py-3 text-center lg:mt-6 lg:py-4 lg:text-left",
          feito ? "border border-white/[.16] hover:bg-white/5" : "hover:brightness-110",
        )}
        style={feito ? undefined : { background: cor, boxShadow: `0 14px 34px -14px ${cor}` }}
      >
        <b className={clsx("block font-mono text-[14.5px] font-extrabold tracking-[.16em]", feito ? "text-texto-2" : "text-[#04070d]")}>
          {feito ? "DESMARCAR ANDAR" : "CONSTRUIR ANDAR"}
        </b>
        <span className={clsx("mt-1 hidden text-[15px] leading-snug lg:block", feito ? "text-texto-3" : "text-[#04070d] opacity-70")}>
          {feito ? "o prédio encurta" : "só marque depois de fazer"}
        </span>
      </button>
    </section>
  );
}

/**
 * Uma das três vagas.
 *
 * As três aparecem sempre, cheias ou não: a grade fixa é que diz que o andar
 * tem três frentes possíveis, e a vazia mostra o próprio buraco em vez de
 * fingir que o andar só tinha aquela (BLUEPRINT-PAGINAS.md §6).
 *
 * Fora do modo de marcação, vaga com link é `<a>` e vaga vazia é `<div>` —
 * elemento que não leva a lugar nenhum não pode ser clicável. Dentro dele,
 * vira `<button>`: o clique agora escolhe, não navega.
 */
function LinhaVaga({
  vaga, rot, papel, Ico, cor, unha, oitenta,
}: {
  vaga: Vaga | undefined;
  rot: string; papel: string; Ico: LucideIcon; cor: string;
  unha: boolean; oitenta: boolean;
}) {
  // `items-center`/`items-stretch` entram no clsx de CADA retorno, não aqui:
  // as duas classes do Tailwind competem pela mesma propriedade, e juntar as
  // duas numa `clsx` só não garante qual vence — depende da ordem no CSS
  // gerado, não da ordem na string. Cada card só carrega UMA das duas.
  const caixa = clsx(
    // Três destes empilhados: cada 4px de padding vira 12px de folha.
    "mt-2 flex w-full gap-3 rounded-2xl border p-2.5 text-left lg:mt-3 lg:gap-4 lg:p-3.5",
    !vaga && "border-dashed",
  );
  /* Vaga cheia carrega um fio da própria cor mesmo sem ser 80/20: no painel
     claro, uma borda branca a 9% desaparecia e as três caixas viravam um bloco
     cinza só. O que separa "tem" de "está marcado" é a intensidade, não a
     presença da cor. */
  /* O glow do marcado é DIFUSO e negativo no spread: acende em volta da caixa
     sem engordar a borda nem vazar pras vizinhas. Só a cor da vaga brilha —
     nada de branco por cima, que é o que faz halo parecer erro de render. */
  const borda = oitenta
    ? {
        borderColor: cor + "cc",
        background: cor + "22",
        boxShadow: `0 0 0 1px ${cor}44, 0 0 30px -6px ${cor}, inset 0 0 18px -10px ${cor}`,
      }
    : vaga
      ? { borderColor: cor + "33", background: "rgba(255,255,255,.045)" }
      : { borderColor: "rgba(255,255,255,.13)" };

  const miolo = (
    <>
      <span
        className={clsx(
          "grid h-[50px] w-[50px] flex-none place-items-center rounded-xl border",
          !vaga && "border-dashed",
        )}
        style={
          vaga
            ? {
                color: cor,
                borderColor: oitenta ? cor + "aa" : cor + "66",
                background: cor + (oitenta ? "33" : "26"),
                // o ícone acende junto, mais fraco: dois focos de luz na mesma
                // caixa viram brilho chapado, um foco e um eco viram relevo
                boxShadow: oitenta ? `0 0 16px -5px ${cor}` : undefined,
              }
            : { color: "var(--texto-3)", borderColor: "rgba(255,255,255,.18)" }
        }
      >
        <Ico size={23} />
      </span>
      <span className="min-w-0 flex-1">
        {/* ESTA LINHA INTEIRA SAI NO RETRATO — e as quatro coisas que ela
            carrega saem pelo mesmo motivo: já estão ditas em outro lugar.

            · o rótulo (AULA · FERRAMENTA · IA DE APOIO) — o ícone e a cor já
              dizem, e são o vocabulário que a Obra e a gaveta compartilham;
            · o papel ("o que acelera") — descrição do TIPO, não do item, e o
              tipo acabou de ser dito pelo ícone;
            · o selo 80/20 — o card já ACENDE quando é 80/20: borda na cor,
              fundo, glow e o ícone com halo. Repetir em texto é dizer duas
              vezes o que a luz já disse;
            · a plataforma (EB/DB/AB) — nomenclatura interna, não do aluno.

            Sobra ícone + título, que é o que se toca. Na cabine tudo fica: lá
            há largura, e o rótulo é o que ensina o vocabulário. */}
        <b
          className="hidden flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[11.5px] tracking-[.16em] lg:flex"
          style={{ color: vaga ? cor : "var(--texto-3)" }}
        >
          {rot}
          {vaga?.plat ? ` · ${vaga.plat}` : ""}
          {vaga && <span className="opacity-60">· {papel}</span>}
          {oitenta && (
            <span
              className="rounded px-1.5 py-[2px] text-[11px] font-extrabold tracking-[.12em]"
              style={{ color: cor, background: cor + "2e" }}
            >
              80/20
            </span>
          )}
        </b>
        {/* sem a linha acima, o título não tem de onde se afastar: `mt-0` no
            retrato e ele fica centrado com o ícone, na altura do dedo */}
        <strong
          className={clsx(
            "block text-[16px] font-semibold leading-snug lg:mt-1.5 lg:text-[18px]",
            vaga ? "text-texto" : "text-texto-3",
          )}
        >
          {vaga
            ? vaga.label
            : unha
              ? "Sem atalho — é você, na unha."
              : "O link entra aqui."}
        </strong>
      </span>
    </>
  );

  if (!vaga) return <div className={clsx(caixa, "items-center")} style={borda}>{miolo}</div>;

  // Sem link extra: exatamente o card de sempre, um `<a>` só, um destino só.
  if (!vaga.dentro?.length) {
    return (
      <a
        href={vaga.url ?? undefined}
        target={vaga.url ? "_blank" : undefined}
        rel="noopener"
        className={clsx(caixa, "items-center", vaga.url && "hover:brightness-125")}
        style={borda}
      >
        {miolo}
        {vaga.url && <ArrowUpRight size={19} className="flex-none text-texto-3" />}
      </a>
    );
  }

  // Com link extra: o card não é mais UM destino, então não é mais `<a>` —
  // vira um agrupador, e cada destino (o principal + os de `dentro`) ganha a
  // própria linha, todas visíveis de cara (sem acordeão: pra 2 ou 3 linhas,
  // esconder custa mais clique do que economiza espaço). O empilhamento
  // escala sozinho pra quantos links a vaga tiver — não tem "modo com 2" e
  // "modo com 3", é sempre a mesma lista.
  return (
    <div className={clsx(caixa, "flex-col items-stretch")} style={borda}>
      <div className="flex items-center gap-3 lg:gap-4">{miolo}</div>
      <div className="mt-2.5 flex flex-col gap-1.5 pl-[62px] lg:pl-[66px]">
        {[{ label: vaga.label, url: vaga.url }, ...vaga.dentro].map((link, i) =>
          link.url ? (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener"
              className="flex items-center justify-between gap-2 rounded-lg py-1.5 pl-2.5 pr-2 text-[13px] text-texto-2 transition hover:bg-white/[.05] hover:text-texto"
              style={{ borderLeft: `2px solid ${cor}88` }}
            >
              {link.label}
              <ArrowUpRight size={14} className="flex-none text-texto-3" />
            </a>
          ) : (
            <span
              key={i}
              className="rounded-lg py-1.5 pl-2.5 pr-2 text-[13px] text-texto-3"
              style={{ borderLeft: "2px solid rgba(255,255,255,.18)" }}
            >
              {link.label}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function ModalEditorEntregaveis({
  passo,
  marcas,
  onAlternar,
  onFechar,
}: {
  passo: Passo;
  marcas: ChaveVaga[];
  onAlternar: (vaga: ChaveVaga) => void;
  onFechar: () => void;
}) {
  const [vagaKey, setVagaKey] = useState<ChaveVaga>("aula");
  const atual = ENTREGAVEIS.find((item) => item.k === vagaKey)!;
  const configurados = ENTREGAVEIS.filter(({ k }) => passo[k]).length;

  const dialogRef = useRef<HTMLElement | null>(null);
  useFocusTrap(dialogRef);

  // Esc fecha só ESTE modal. Fase de captura + stopPropagation, igual
  // ModalAbertura: sem isto o listener global de Obra (Esc = volta uma
  // camada de câmera) rodava pro MESMO evento e fechava o painel do andar
  // atrás junto (bug D1).
  useEffect(() => {
    const onKey = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      evento.stopPropagation();
      onFechar();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onFechar]);

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-[#070a11]/70 p-3 backdrop-blur-md sm:p-6" onMouseDown={onFechar}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Editar entregáveis de ${passo.titulo}`}
        onMouseDown={(evento) => evento.stopPropagation()}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[720px] flex-col overflow-hidden rounded-[20px] border border-white/[.14] bg-[#1d212b] shadow-[0_32px_120px_-24px_#000] sm:max-h-[min(760px,calc(100dvh-3rem))]"
      >
        <div className="flex h-11 flex-none items-center border-b border-white/[.09] bg-white/[.025] px-4">
          <div className="flex gap-1.5" aria-hidden>
            <i className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <i className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <i className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="flex-1 text-center font-mono text-[10px] font-semibold tracking-[.16em] text-texto-3">EDITOR DE ENTREGÁVEIS</span>
          <button type="button" onClick={onFechar} aria-label="Fechar edição" className="grid h-7 w-7 place-items-center rounded-md text-texto-3 transition hover:bg-white/[.08] hover:text-texto"><X size={16} /></button>
        </div>

        <header className="flex flex-none items-start justify-between gap-4 border-b border-white/[.09] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold tracking-[.18em]" style={{ color: atual.cor }}>OBRA 10K · PASSO {String(passo.ordem).padStart(2, "0")}</p>
            <h2 className="mt-1 truncate text-[22px] font-semibold tracking-[-.025em] text-texto">{passo.titulo}</h2>
            <p className="mt-1 text-[12px] text-texto-3">Defina o que ensina, onde executa e o que acelera este andar.</p>
          </div>
          <span className="hidden whitespace-nowrap rounded-full border border-white/[.1] bg-white/[.04] px-2.5 py-1 font-mono text-[9px] tracking-[.12em] text-texto-3 sm:block">{configurados}/3 CONFIGURADOS</span>
        </header>

        <section className="flex-none border-b border-white/[.09] bg-[rgba(245,178,63,.035)] px-5 py-4 sm:px-6" aria-label="Escolha 80/20">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[.16em] text-ambar">O QUE TRAZ O RESULTADO?</p>
              <p className="mt-1 text-[11px] text-texto-3">Marque até dois entregáveis que mais movem este andar.</p>
            </div>
            <span className="font-mono text-[10px] font-bold tracking-[.1em] text-ambar">{marcas.length}/{TETO_8020}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {ENTREGAVEIS.map(({ k, rot, Ico, cor }) => {
              const vaga = passo[k] as Vaga | undefined;
              const marcada = marcas.includes(k);
              const bloqueada = !vaga || (marcas.length >= TETO_8020 && !marcada);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onAlternar(k)}
                  disabled={bloqueada}
                  title={!vaga ? "Configure este entregável antes de marcá-lo" : bloqueada ? `Já são ${TETO_8020} escolhas` : marcada ? "Tirar da escolha 80/20" : "Marcar como 80/20"}
                  className={clsx(
                    "flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition",
                    marcada ? "shadow-[inset_0_1px_0_rgba(255,255,255,.1)]" : "border-white/[.09] bg-black/[.12] hover:bg-white/[.05]",
                    bloqueada && "cursor-not-allowed opacity-40",
                  )}
                  style={marcada ? { borderColor: cor + "aa", background: cor + "20" } : undefined}
                >
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-md" style={{ color: cor, background: cor + "18" }}><Ico size={13} /></span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[9px] font-bold tracking-[.1em]" style={{ color: marcada ? cor : "var(--texto-2)" }}>{rot === "IA DE APOIO" ? "IA" : rot}</span>
                  {marcada && <Check size={13} className="flex-none" style={{ color: cor }} />}
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav aria-label="Tipo de entregável" className="flex flex-none gap-1 border-b border-white/[.09] bg-black/[.12] p-2 sm:w-[218px] sm:flex-col sm:border-b-0 sm:border-r sm:p-3">
            {ENTREGAVEIS.map(({ k, rot, papel, Ico, cor }) => {
              const vaga = passo[k] as Vaga | undefined;
              const ativa = vagaKey === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setVagaKey(k)}
                  className={clsx(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2.5 text-left transition sm:flex-none",
                    ativa ? "bg-white/[.1] shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "hover:bg-white/[.045]",
                  )}
                >
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-lg border" style={{ color: cor, borderColor: cor + "55", background: cor + "1a" }}><Ico size={15} /></span>
                  <span className="min-w-0">
                    <b className="block truncate font-mono text-[9px] tracking-[.12em]" style={{ color: ativa ? cor : "var(--texto-2)" }}>{rot === "IA DE APOIO" ? "IA" : rot}</b>
                    <span className="hidden truncate text-[10px] text-texto-3 sm:block">{vaga ? vaga.label : `Sem ${papel}`}</span>
                  </span>
                  {vaga ? <Check size={13} className="ml-auto hidden text-[#54c98a] sm:block" aria-label="Configurado" /> : <CirclePlus size={13} className="ml-auto hidden text-texto-3 sm:block" aria-label="Ainda não configurado" />}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
            <FormularioEntregavel
              // inclui passo.id: sem isto, trocar de andar por teclado (setas)
              // com o foco fora de INPUT/TEXTAREA/SELECT não remontava o
              // formulário — o texto digitado ia salvo no andar errado (B1).
              key={`${passo.id}:${vagaKey}`}
              passoId={passo.id}
              vagaKey={vagaKey}
              vaga={passo[vagaKey] as Vaga | undefined}
              rot={atual.rot}
              cor={atual.cor}
              onConcluido={onFechar}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FormularioEntregavel({ passoId, vagaKey, vaga, rot, cor, onConcluido }: {
  passoId: string;
  vagaKey: ChaveVaga;
  vaga?: Vaga;
  rot: string;
  cor: string;
  onConcluido: () => void;
}) {
  const [label, setLabel] = useState(vaga?.label ?? "");
  const [url, setUrl] = useState(vaga?.url ?? "");
  const [plat, setPlat] = useState(vaga?.plat ?? "");
  /* Links extras — o Onboarding do Cliente é o caso concreto: Formulário de
     Briefing, Proposta e Contrato são 3 documentos, 3 destinos. Cada linha é
     um `LinkExtra` (nome + o PRÓPRIO link), "+" empurra uma linha vazia no
     fim, "-" tira pelo índice. Padrão pras 3 vagas — nada aqui é exclusivo de
     `ferram`, então nem essa checagem existe no formulário. */
  const [extras, setExtras] = useState<LinkExtra[]>(vaga?.dentro ?? []);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [salvando, iniciar] = useTransition();
  const salvar = () => iniciar(async () => {
    await salvarEntregavelAction(passoId, vagaKey, {
      label,
      url: url.trim() || undefined,
      plat: vagaKey === "ferram" ? (plat as Vaga["plat"]) : undefined,
      dentro: extras,
    });
    onConcluido();
  });
  const excluir = () => iniciar(async () => {
    await excluirEntregavelAction(passoId, vagaKey);
    onConcluido();
  });

  return (
    <form onSubmit={(evento) => { evento.preventDefault(); salvar(); }}>
      <div className="flex items-center gap-2">
        <i className="h-2 w-2 rounded-full" style={{ background: cor }} />
        <p className="font-mono text-[10px] font-bold tracking-[.16em]" style={{ color: cor }}>{vaga ? `EDITAR ${rot}` : `ADICIONAR ${rot}`}</p>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-texto-2">{vaga ? "Você está alterando o acesso que aparece para todos neste passo." : "Este caminho ainda está vazio. Preencha o essencial para colocá-lo na obra."}</p>

      <div className="mt-6 space-y-4">
        <Campo label="Nome que a pessoa vai ver" ajuda="Use o nome do curso, da ferramenta ou da IA — não uma instrução interna.">
          <input autoFocus value={label} onChange={(evento) => setLabel(evento.target.value)} placeholder={vagaKey === "aula" ? "Ex.: Design Easy" : vagaKey === "ferram" ? "Ex.: Template de briefing" : "Ex.: IA de direção criativa"} className="campo-edicao" />
        </Campo>
        <Campo label="Link de acesso" opcional ajuda="Se houver link, o cartão abre este destino em uma nova aba.">
          <span className="relative block"><Link2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" /><input value={url} onChange={(evento) => setUrl(evento.target.value)} placeholder="https://…" className="campo-edicao pl-9" /></span>
        </Campo>
        {vagaKey === "ferram" && (
          <Campo label="Onde esta ferramenta vive" ajuda="Mostrado como selo no cartão da ferramenta.">
            <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/[.1] bg-black/[.12] p-1">
              {["", "EB", "DB", "AB"].map((opcao) => (
                <button key={opcao || "nenhuma"} type="button" onClick={() => setPlat(opcao)} aria-pressed={plat === opcao} className={clsx("rounded-lg px-2 py-2 font-mono text-[10px] font-bold transition", plat === opcao ? "bg-white/[.12] text-texto shadow-sm" : "text-texto-3 hover:bg-white/[.05] hover:text-texto-2")}>{opcao || "SEM SELO"}</button>
              ))}
            </div>
          </Campo>
        )}
        <Campo label="Outros links dentro desta vaga" opcional ajuda="Use quando esta vaga reúne mais de um destino — cada linha abre o SEU próprio link, não o de cima.">
          <div className="flex flex-col gap-2">
            {extras.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={item.label}
                  onChange={(evento) =>
                    setExtras((v) => v.map((x, j) => (j === i ? { ...x, label: evento.target.value } : x)))
                  }
                  placeholder="Nome deste link"
                  className="campo-edicao flex-1"
                />
                <span className="relative block flex-1">
                  <Link2 size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-texto-3" />
                  <input
                    value={item.url ?? ""}
                    onChange={(evento) =>
                      setExtras((v) => v.map((x, j) => (j === i ? { ...x, url: evento.target.value } : x)))
                    }
                    placeholder="https://…"
                    className="campo-edicao pl-8"
                  />
                </span>
                <button
                  type="button"
                  onClick={() => setExtras((v) => v.filter((_, j) => j !== i))}
                  aria-label="Remover este link"
                  title="Remover este link"
                  className="grid h-9 w-9 flex-none place-items-center rounded-lg text-texto-3 hover:bg-red-400/[.12] hover:text-red-300"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setExtras((v) => [...v, { label: "", url: "" }])}
              className="flex items-center gap-1.5 self-start rounded-lg px-2.5 py-2 text-[11.5px] font-medium text-texto-2 hover:bg-white/[.06]"
            >
              <Plus size={14} /> Adicionar link
            </button>
          </div>
        </Campo>
      </div>

      <div className="mt-7 flex items-center justify-between gap-3 border-t border-white/[.09] pt-4">
        {vaga ? confirmandoExclusao ? (
          <div className="flex items-center gap-1.5">
            <span className="hidden text-[10px] text-red-200 sm:inline">Remover este entregável?</span>
            <button type="button" onClick={() => setConfirmandoExclusao(false)} disabled={salvando} className="rounded-lg px-2 py-2 text-[11px] text-texto-2 hover:bg-white/[.07]">Não</button>
            <button type="button" onClick={excluir} disabled={salvando} className="rounded-lg bg-red-400/[.16] px-2.5 py-2 text-[11px] font-medium text-red-200 hover:bg-red-400/[.24]">Sim, excluir</button>
          </div>
        ) : <button type="button" onClick={() => setConfirmandoExclusao(true)} disabled={salvando} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-medium text-red-300 transition hover:bg-red-400/[.1] disabled:opacity-50"><Trash2 size={14} /> Excluir</button> : <span />}
        <div className="flex gap-2">
          <button type="button" onClick={onConcluido} disabled={salvando} className="rounded-lg px-3 py-2 text-[11px] font-medium text-texto-2 hover:bg-white/[.07]">Cancelar</button>
          <button type="submit" disabled={salvando || !label.trim()} className="rounded-lg bg-azul px-3.5 py-2 font-mono text-[10px] font-bold tracking-[.1em] text-[#04070d] shadow-[0_8px_24px_-12px_#2b8cff] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">{salvando ? "SALVANDO…" : vaga ? "SALVAR ALTERAÇÕES" : "ADICIONAR À OBRA"}</button>
        </div>
      </div>
    </form>
  );
}

function Campo({ label, opcional, ajuda, children }: { label: string; opcional?: boolean; ajuda?: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-texto-2">{label}{opcional && <i className="font-normal text-texto-3">opcional</i>}</span>
      {children}
      {ajuda && <span className="mt-1.5 block text-[10px] leading-snug text-texto-3">{ajuda}</span>}
    </div>
  );
}
