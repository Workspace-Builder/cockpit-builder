"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { useStore } from "@xyflow/react";
import { useBoardMovendo } from "./movimentoDoBoard";
import type { PropsAnimacao } from "./animacoes";

// ---------------------------------------------------------------------------
// Portão de animação — só desenha quem está sendo visto
// ---------------------------------------------------------------------------
// São 8 peças com `<canvas>` e `requestAnimationFrame` próprio (timeline, roda
// e as 6 esquetes). Sem portão, as 8 redesenham a 60fps o tempo todo —
// inclusive fora da tela e inclusive enquanto o board inteiro está sendo
// transformado por uma animação de enquadramento.
//
// O resultado era o "2fps" ao pular de um checkpoint pro outro: o navegador
// tentava compor 99 nós em movimento E rodar 8 simulações no mesmo quadro.
//
// É exatamente a dívida que o BLUEPRINT.md §11 aponta no board legado —
// "8 loops permanentes, sem IntersectionObserver nem gate de visibilidade".
// Ela veio junto no port. Aqui ela morre, e num lugar só: como o portão
// DESMONTA a animação, o `cancelAnimationFrame` do cleanup de cada uma faz o
// trabalho — nenhuma das 8 precisou ser tocada.
//
// Dois cortes:
//   1. fora da tela  — IntersectionObserver, com margem pra já estar rodando
//                      quando entra;
//   2. pequena demais — abaixo de um punhado de pixels a peça é um selo, e
//                      gastar 60fps nisso é desperdício.
//
// Custo assumido: reaproximar remonta a peça, e ela recomeça do início. Numa
// simulação de 9 segundos isso é aceitável; o contrário — travar o board
// inteiro — não é.
// ---------------------------------------------------------------------------

/**
 * O corte é PIXEL NA TELA, não zoom.
 *
 * Era `zoom >= 0.35`, e o número errou por medir a coisa errada. Zoom não diz
 * tamanho aparente: as 8 peças vão de 400×411 a 1180×415 em coordenada de
 * board, então o mesmo zoom deixa uma legível e outra em borrão. O que o olho
 * recebe é `lado × zoom` — é nisso que o corte tem que cair.
 *
 * E o 0.35 caía bem em cima do uso normal: o board é lido com uma faixa
 * inteira na tela, que dá ~0.3 de zoom. Ou seja, o jeito natural de olhar era
 * exatamente o que desligava as 8 — todas paradas pedindo "aproxime", que foi
 * o defeito relatado.
 *
 * 110px no lado menor: abaixo disso nem forma nem movimento saem. Acima, o
 * desenho se lê mesmo sem dar pra ler rótulo — que é o que se pede de uma
 * animação vista de longe.
 */
const LADO_MINIMO_PX = 110;

export default function PortaoDeAnimacao({
  Anim,
  largura,
  altura,
  nome,
}: {
  Anim: ComponentType<PropsAnimacao>;
  largura: number;
  altura: number;
  nome: string;
}) {
  const caixaRef = useRef<HTMLDivElement>(null);
  const [naTela, setNaTela] = useState(false);
  const zoom = useStore((s) => s.transform[2]);

  useEffect(() => {
    const el = caixaRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setNaTela(e.isIntersecting),
      // 200px de folga: começa a rodar um pouco antes de aparecer, pra não
      // "acender" na cara de quem está navegando.
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* TERCEIRO CORTE: enquanto o board se move, ninguém desenha.
     Os dois cortes acima decidem quem roda com o board PARADO. Só que o
     travamento aparece justamente no movimento: trocar de checkpoint compõe
     99 nós enquanto as peças visíveis seguem simulando a 60fps — o quadro não
     fecha e o board anda aos pulos.
     Congelar durante o voo devolve o quadro inteiro pro enquadramento; as
     peças voltam a rodar 180ms depois que ele para. */
  const movendo = useBoardMovendo();

  // O lado MENOR: uma peça larga e baixa (Timeline, 1180×415) fica ilegível
  // pela altura muito antes de a largura acabar.
  const rodando =
    naTela && !movendo && Math.min(largura, altura) * zoom >= LADO_MINIMO_PX;

  return (
    <div ref={caixaRef} style={{ width: largura, height: altura }}>
      {rodando ? (
        <Anim largura={largura} altura={altura} />
      ) : (
        <div className="grid h-full w-full place-items-center rounded-xl border border-fio bg-painel/60 px-4 text-center">
          <span>
            <b className="block text-[12px] font-bold text-texto-2">{nome}</b>
            {/* no meio do voo não se pede pra aproximar: a peça só está em
                pausa. O texto trocando a cada pan piscaria na cara de quem
                está navegando. */}
            {!movendo && (
              <span className="text-[10.5px] text-texto-3">
                aproxime para ver rodando
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
