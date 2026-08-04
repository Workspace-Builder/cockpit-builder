import "server-only";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { registrar } from "./historico";

// ---------------------------------------------------------------------------
// O banco é o repositório
// ---------------------------------------------------------------------------
// `dados/` deixou de ser um export de conferência do Postgres (2026-08-03) e
// virou A FONTE DA VERDADE. Sem servidor de banco, sem migration, sem docker:
// quem edita roda `npm run dev` local, grava direto nestes arquivos, e
// commita — a mesma disciplina de qualquer mudança de código. "Como a equipe
// vê o que foi criado?" (BLUEPRINT.md §10.2) passa a ter resposta: git.
//
// Leitura e escrita são SÍNCRONAS de propósito. Node só tem uma thread de JS;
// `readFileSync`/`writeFileSync` não cedem o controle no meio de si mesmas.
// É o que substitui o `pg_advisory_xact_lock` de antes — a garantia de que
// duas requisições não leem o mesmo estado antes de uma delas escrever. Com
// um editor por vez (não há login, nunca houve), isso basta.
// ---------------------------------------------------------------------------

const RAIZ = resolve(process.cwd(), "dados");

function caminho(relativo: string): string {
  return resolve(RAIZ, relativo);
}

/**
 * Lê um JSON do disco. Arquivo ausente devolve o padrão — página nova ainda
 * não tem canvas gravado.
 *
 * ⚠ O PADRÃO NÃO PODE SER UM OBJETO COMPARTILHADO. Quando o arquivo não
 * existe, é ELE que volta — a mesma referência, não uma cópia. Quem chama
 * costuma mutar o resultado (`canvas.nos.push(...)`), então um padrão vindo de
 * uma constante de módulo vira estado global sujo: a próxima leitura de outro
 * arquivo ausente enxerga o que a anterior escreveu, e a sujeira dura enquanto
 * o processo durar.
 *
 * Não é hipótese — foi o defeito de 03/08 ("crio uma página e ela vem igual a
 * outra"). Passe SEMPRE um literal (`[]`, `{}`) ou o retorno de uma função que
 * monta um valor novo.
 */
export function ler<T>(relativo: string, padrao: T): T {
  const p = caminho(relativo);
  if (!existsSync(p)) return padrao;
  return JSON.parse(readFileSync(p, "utf8")) as T;
}

/**
 * Grava um JSON no disco, indentado a 2: o diff do git precisa ser lido por
 * gente.
 *
 * GUARDA O ESTADO ANTERIOR ANTES DE SOBRESCREVER. É por isto que o Ctrl+Z
 * cobre tudo sem nenhuma action saber que ele existe: este é o único ponto de
 * escrita do app, então toda operação passa por aqui — inclusive as que ainda
 * não foram escritas. Ver `lib/historico.ts`.
 *
 * `semHistorico` existe pra UM caso: o próprio desfazer, que restaura um
 * snapshot. Sem a saída, restaurar geraria um passo novo apontando pro estado
 * que acabou de ser descartado, e dois Ctrl+Z seguidos ficariam alternando
 * entre os mesmos dois estados pra sempre.
 */
export function gravar(
  relativo: string,
  dado: unknown,
  { semHistorico = false } = {},
): void {
  const p = caminho(relativo);
  if (!semHistorico) registrar(relativo);
  mkdirSync(resolve(p, ".."), { recursive: true });
  writeFileSync(p, JSON.stringify(dado, null, 2) + "\n", "utf8");
}

/** Remove um arquivo — o `ON DELETE CASCADE` de página/pasta, feito na mão. */
export function remover(relativo: string): void {
  const p = caminho(relativo);
  if (existsSync(p)) unlinkSync(p);
}

/** Ids das páginas que têm canvas gravado (nome do arquivo, sem `.json`). */
export function idsComCanvas(): string[] {
  const dir = caminho("paginas");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}
