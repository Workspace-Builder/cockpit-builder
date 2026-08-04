"use client";

import type { AbaDoNo, ArestaBoard, NoBoard } from "@/lib/model";

// ---------------------------------------------------------------------------
// A área de transferência do board — copiar de uma tela, colar em outra
// ---------------------------------------------------------------------------
// POR QUE NÃO A ÁREA DE TRANSFERÊNCIA DO SISTEMA: o que se copia aqui é um
// pedaço do MODELO (nós com estilo, os conectores entre eles e as gavetas
// inteiras), não texto nem imagem. Serializar isso pro clipboard do sistema
// significaria escolher um formato que só este app lê, e ainda assim disputar
// espaço com o que a pessoa tinha copiado antes de outro lugar.
//
// `localStorage` e não uma variável de módulo: colar em OUTRA TELA é o ponto
// do recurso, e a troca de página remonta a casca inteira (`key={id}` na rota).
// Uma variável sobreviveria a isso — mas não sobrevive a um F5, e "copiei,
// recarreguei sem querer, perdi" é o tipo de perda silenciosa que esta gaveta
// existe pra evitar.
//
// JÁ FOI `sessionStorage`, e estava errado: aquilo é por ABA, então copiar numa
// aba e colar noutra — que é exatamente como se trabalha com duas telas lado a
// lado — devolvia nada, sem erro nenhum. `localStorage` é por origem, e é o
// escopo que corresponde ao gesto.
// ---------------------------------------------------------------------------

const CHAVE = "cockpit:recorte";

/**
 * Por quanto tempo o recorte tem prioridade sobre uma imagem no clipboard.
 *
 * Existe porque o carimbo abaixo NÃO É CONFIÁVEL: medido em 03/08,
 * `navigator.clipboard.writeText` resolve como sucesso e o clipboard continua
 * vazio (permissão, foco, política do navegador — varia). Quando isso
 * acontece, o Ctrl+V não acha o carimbo e cairia no ramo da imagem — colando
 * uma print tirada de manhã no lugar dos nós copiados agora. Era o defeito.
 *
 * A janela resolve sem depender do clipboard: quem copiou nós há menos de
 * cinco minutos quase certamente quer colar OS NÓS. Passado isso, uma imagem
 * no clipboard volta a ganhar — recorte de uma hora atrás não pode sequestrar
 * o Ctrl+V de quem acabou de tirar um print.
 */
export const JANELA_PRIORIDADE_MS = 5 * 60 * 1000;

/**
 * O carimbo que vai pra área de transferência DO SISTEMA no Ctrl+C.
 *
 * POR QUE ESCREVER NO CLIPBOARD DO SISTEMA se o recorte mora aqui: pra o Ctrl+V
 * saber QUAL DOS DOIS colares é o certo. O evento `paste` só conta o que está
 * no clipboard do sistema, e print de tela fica lá por horas — sem este
 * carimbo, quem tirasse um print de manhã e copiasse nós à tarde colaria o
 * print, porque a imagem continua presente e "mais concreta" que a nossa
 * gaveta. Escrever aqui SUBSTITUI a imagem, e o último gesto passa a ser o que
 * manda, que é o que qualquer editor faz.
 *
 * O texto é legível de propósito: se alguém colar isto num campo de texto por
 * engano, aparece uma frase que explica, não um blob.
 */
export const MARCA = "[Cockpit Builder] itens copiados do board";

/**
 * O que viaja entre telas.
 *
 * As ARESTAS entram, e isso é uma diferença deliberada em relação a
 * `duplicarNo` (que não copia conector nenhum). O motivo é o gesto: duplicar UM
 * nó não pode duplicar a relação dele com outro — ligaria a cópia ao mesmo
 * destino, o que quase nunca é o que se quer. Já copiar uma SELEÇÃO é copiar
 * uma composição: as setas entre os nós escolhidos fazem parte do que se
 * escolheu. As que saem da seleção pra fora ficam de lado, porque o destino
 * delas não vem junto.
 */
export type Recorte = {
  nos: NoBoard[];
  arestas: ArestaBoard[];
  /** As abas de cada nó copiado, por id de nó de ORIGEM. */
  gavetas: Record<string, AbaDoNo[]>;
  /** De onde veio — só pra mensagem na tela ("3 itens de O Método 10k"). */
  origem: string;
  /** Quando foi copiado. É o que decide a disputa com a imagem no Ctrl+V. */
  quando: number;
};

export function copiar(recorte: Omit<Recorte, "quando">): void {
  try {
    localStorage.setItem(
      CHAVE,
      JSON.stringify({ ...recorte, quando: Date.now() } satisfies Recorte),
    );
  } catch {
    // Cota estourada (uma seleção com muitas prints em base64 chega lá).
    // Silencioso de propósito: quem copiou tenta colar, não cola, e tenta de
    // novo com menos — melhor que um erro no meio de uma edição.
  }
}

export function ler(): Recorte | null {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return null;
    const r = JSON.parse(cru) as Recorte;
    return Array.isArray(r?.nos) && r.nos.length ? r : null;
  } catch {
    return null;
  }
}

/** Copiado agora há pouco — tem prioridade sobre imagem. Ver `JANELA_PRIORIDADE_MS`. */
export const recente = (r: Recorte | null): boolean =>
  !!r && Date.now() - (r.quando ?? 0) < JANELA_PRIORIDADE_MS;

/**
 * Monta o recorte a partir do que está selecionado.
 *
 * `Set` e não `includes` no filtro das arestas: a seleção pode ter dezenas de
 * nós e a página, centenas de conectores — o produto dos dois é o único lugar
 * aqui que cresceria feio.
 */
export function recortarDaSelecao(
  ids: string[],
  nos: NoBoard[],
  arestas: ArestaBoard[],
  gavetas: Record<string, AbaDoNo[]>,
  origem: string,
): Omit<Recorte, "quando"> | null {
  const escolhidos = new Set(ids);
  const nosEscolhidos = nos.filter((n) => escolhidos.has(n.id));
  if (!nosEscolhidos.length) return null;

  return {
    nos: nosEscolhidos,
    arestas: arestas.filter(
      (a) => escolhidos.has(a.de) && escolhidos.has(a.para),
    ),
    gavetas: Object.fromEntries(
      Object.entries(gavetas).filter(([noId]) => escolhidos.has(noId)),
    ),
    origem,
  };
}
