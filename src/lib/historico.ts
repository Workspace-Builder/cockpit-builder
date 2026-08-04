import "server-only";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// O Ctrl+Z — uma cópia do arquivo antes de cada gravação
// ---------------------------------------------------------------------------
// POR QUE ASSIM, E NÃO "CADA AÇÃO SABE SE DESFAZER": porque uma página É um
// arquivo. Desde que os dados saíram do Postgres (2026-08-03), o estado inteiro
// de uma tela cabe num JSON só — então "como estava antes" é literalmente a
// cópia anterior desse arquivo, sem inverso pra escrever e sem operação nova
// pra ensinar. As 37 gravações de `queries.ts` passam todas por `gravar()`, e
// é lá que isto engancha: uma linha cobre criar, colar, excluir, estilo,
// gaveta e o que for inventado depois.
//
// A alternativa (um inverso por ação) exigiria acertar ~35 opostos, e cada um
// errado é um jeito novo de corromper dado — num app cuja recuperação hoje
// depende de eu ter deixado um dump antigo de pé.
//
// O QUE ISTO NÃO É: backup. Vive em `dados/.historico/`, fora do git, na mesma
// máquina e no mesmo disco. Protege do clique errado de agora; não protege de
// perder a máquina nem do erro percebido daqui a três dias. Essa é outra
// conversa, e a resposta dela é commitar `dados/`.
// ---------------------------------------------------------------------------

const RAIZ = resolve(process.cwd(), "dados");
const PASTA = resolve(RAIZ, ".historico");

/** Quantos passos por arquivo. Além disto, o mais antigo cai. */
const TETO = 30;

/**
 * Gravações mais próximas que isto viram UM passo só.
 *
 * Sem a janela, arrastar e soltar dez vezes seguidas gastaria dez dos trinta
 * passos com micro-ajustes, e o Ctrl+Z voltaria de 2px em 2px. Manter o
 * snapshot mais ANTIGO do intervalo é o que faz um passo corresponder a um
 * gesto — que é o que a pessoa lembra de ter feito.
 */
const JANELA_MS = 500;

/** `paginas/obra.json` → `paginas__obra.json`, pra virar nome de pasta. */
const chave = (relativo: string) => relativo.replace(/[\\/]/g, "__");

const pastaDe = (relativo: string) => resolve(PASTA, chave(relativo));

/**
 * Lista os snapshots de um arquivo, do mais ANTIGO pro mais novo.
 *
 * O nome é o milissegundo da cópia, com 14 dígitos: largura fixa é o que
 * deixa a ordem alfabética ser a ordem cronológica sem precisar converter
 * nada. Sem o `padStart`, `9999...` viria depois de `10000...`.
 */
function snapshots(relativo: string): string[] {
  const dir = pastaDe(relativo);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
}

/**
 * Guarda o estado ATUAL do arquivo antes de ele ser sobrescrito.
 *
 * Chamada de dentro de `gravar()`, então vale pra toda escrita. Arquivo que
 * ainda não existe não gera passo: não há estado anterior pra onde voltar, e
 * um snapshot vazio faria o Ctrl+Z "desfazer" a criação da página inteira.
 */
export function registrar(relativo: string): void {
  const origem = resolve(RAIZ, relativo);
  if (!existsSync(origem)) return;

  const dir = pastaDe(relativo);
  mkdirSync(dir, { recursive: true });

  const atuais = snapshots(relativo);
  const ultimo = atuais[atuais.length - 1];
  if (ultimo) {
    const quando = statSync(resolve(dir, ultimo)).mtimeMs;
    if (Date.now() - quando < JANELA_MS) return; // mesmo gesto
  }

  copyFileSync(origem, resolve(dir, `${String(Date.now()).padStart(14, "0")}.json`));

  // Poda pela frente: o mais antigo é o primeiro a sair.
  const depois = snapshots(relativo);
  for (const velho of depois.slice(0, Math.max(0, depois.length - TETO))) {
    try {
      unlinkSync(resolve(dir, velho));
    } catch {
      // Corrida com outra gravação apagando o mesmo arquivo. Não é erro:
      // o objetivo (o arquivo não existir mais) já foi alcançado.
    }
  }
}

/**
 * Volta o arquivo pro snapshot mais recente e CONSOME esse passo.
 *
 * `renameSync` em vez de copiar-e-apagar: mover é atômico no mesmo volume,
 * então não existe instante em que o snapshot já foi consumido mas o arquivo
 * ainda não chegou. Um Ctrl+Z interrompido no meio não deixa a página vazia.
 *
 * Devolve `false` quando não há o que desfazer — a tela usa isso pra não
 * revalidar à toa.
 */
export function desfazer(relativo: string): boolean {
  const lista = snapshots(relativo);
  const ultimo = lista[lista.length - 1];
  if (!ultimo) return false;

  const destino = resolve(RAIZ, relativo);
  mkdirSync(resolve(destino, ".."), { recursive: true });
  renameSync(resolve(pastaDe(relativo), ultimo), destino);
  return true;
}

/** Quantos Ctrl+Z ainda cabem neste arquivo. */
export function passos(relativo: string): number {
  return snapshots(relativo).length;
}
