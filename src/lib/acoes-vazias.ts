import type * as Acoes from "@/app/actions";

// ---------------------------------------------------------------------------
// As ações, mudas — o que entra no lugar de `actions.ts` na build do aluno
// ---------------------------------------------------------------------------
// POR QUE ISTO EXISTE: `output: "export"` e Server Action não convivem. E não
// basta esconder o botão — o Next varre o manifesto de ações e ABORTA o export
// se existir UMA ação no grafo do cliente, mesmo que nenhuma seja chamada.
// `actions.ts` está importado no topo de 8 componentes, então o import basta
// pra matar o build. É preciso tirar o módulo do grafo, não esconder o gesto.
//
// Quem troca um pelo outro é o `resolveAlias` do next.config.ts, ligado só
// quando MODO=aluno. Em desenvolvimento e na build do editor nada disto é
// carregado — o app continua gravando em `dados/` como sempre.
//
// A SEGUNDA PORTA, e a razão de o arquivo ser tipado: `satisfies typeof Acoes`
// obriga este arquivo a ter TODAS as ações, com a mesma assinatura. Criar uma
// ação nova e esquecer daqui quebra o `npm run typecheck` — que já é gate — em
// vez de quebrar o build do aluno semanas depois, longe da causa.
//
// O `typeof import()` é tipo, apagado na compilação: o tsc resolve pelo
// `paths` do tsconfig e enxerga o arquivo real, então a conferência continua
// honesta mesmo na build em que o alias desvia o módulo.
//
// SILÊNCIO É O COMPORTAMENTO CERTO AQUI. Estas funções não podem explodir: a
// UI de escrita está gateada por `PODE_EDITAR` (lib/modo.ts) e não deveria
// chamar nenhuma delas. Se alguma for chamada, é gate que escapou — e derrubar
// a tela do aluno por causa disso seria trocar um botão morto por uma página
// morta. O silêncio é a rede, não a intenção.
// ---------------------------------------------------------------------------

const nada = async () => {};

export const criarPaginaAction = nada;
export const criarPastaAction = nada;
export const duplicarPaginaAction = nada;
export const renomearPaginaAction = nada;
export const renomearPastaAction = nada;
export const excluirPaginaAction = nada;
export const excluirPastaAction = nada;

export const salvarCheckpointAction = nada;
export const regravarCheckpointAction = nada;
export const renomearCheckpointAction = nada;
export const excluirCheckpointAction = nada;
export const reordenarCheckpointsAction = nada;

export const moverNosAction = nada;
export const estiloNoAction = nada;
export const criarNoAction = nada;
export const excluirNoAction = nada;
export const textoNoAction = nada;
export const tamanhoNoAction = nada;
export const camadaNoAction = nada;

export const criarArestaAction = nada;
export const editarArestaAction = nada;
export const excluirArestaAction = nada;

/* Colar print não existe pro aluno — nem poderia: `public/` é assado no
   `out/` em tempo de build, e não há servidor atrás pra receber arquivo. */
export const colarNoCanvasAction = nada;

/* Colar nós copiados: idem. Devolve lista vazia = "não criei nada", que é o
   que a tela já sabe desenhar (nada acontece). */
export const colarNosAction = async () => [];

/* Desfazer não existe pro aluno porque não existe fazer. `false` = "não havia
   passo", que é a verdade: a build publicada não grava nada. */
export const desfazerAction = async () => false;

export const alternarOitentaVinteAction = nada;
export const salvarEntregavelAction = nada;
export const excluirEntregavelAction = nada;

export const garantirAbasAction = nada;
export const criarAbaAction = nada;
export const renomearAbaAction = nada;
export const editarItemAction = nada;
export const excluirItemAction = nada;

/* As quatro que devolvem algo. O tipo de retorno é contrato com a tela, e
   devolver o valor errado é pior que não devolver: `excluirAba` e `marcarItem`
   respondem `false` = "recusei", que é o que a UI já sabe desenhar. `duplicarNo`
   devolve `null` = "não dupliquei". `criarItem` é o único sem resposta honesta
   possível — devolve id vazio, e quem chamou está gateado de qualquer forma. */
export const excluirAbaAction = async () => false;
export const marcarItemAction = async () => false;
export const duplicarNoAction = async () => null;
export const criarItemAction = async () => "";
/* Mesma razão de `criarItemAction`: devolve id de item, e quem chamaria já
   está gateado por `PODE_EDITAR`. */
export const colarNaGavetaAction = async () => "";

const _conferido = {
  criarPaginaAction,
  criarPastaAction,
  duplicarPaginaAction,
  renomearPaginaAction,
  renomearPastaAction,
  excluirPaginaAction,
  excluirPastaAction,
  salvarCheckpointAction,
  regravarCheckpointAction,
  renomearCheckpointAction,
  excluirCheckpointAction,
  reordenarCheckpointsAction,
  moverNosAction,
  estiloNoAction,
  criarNoAction,
  excluirNoAction,
  textoNoAction,
  tamanhoNoAction,
  camadaNoAction,
  criarArestaAction,
  editarArestaAction,
  excluirArestaAction,
  colarNosAction,
  desfazerAction,
  colarNoCanvasAction,
  colarNaGavetaAction,
  alternarOitentaVinteAction,
  salvarEntregavelAction,
  excluirEntregavelAction,
  garantirAbasAction,
  criarAbaAction,
  renomearAbaAction,
  criarItemAction,
  editarItemAction,
  excluirItemAction,
  excluirAbaAction,
  marcarItemAction,
  duplicarNoAction,
} satisfies typeof Acoes;

void _conferido;
