import "server-only";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { novoId } from "./ids";

// ---------------------------------------------------------------------------
// A print colada vira arquivo do repositório
// ---------------------------------------------------------------------------
// Companheiro de `dados.ts`, e a razão de morar noutro arquivo é o DESTINO:
// aquele escreve em `dados/` (o conteúdo), este em `public/` (o binário). São
// dois lugares com regras diferentes — o JSON é diff legível, a imagem é
// arquivo opaco que o `next build` copia pro `out/` no modo aluno.
//
// POR QUE ARQUIVO, E NÃO BASE64 NO JSON: está escrito no modelo desde antes
// disto existir (`ItemDoNo.src`) — a página publicada é HTML estático e não
// pode depender deste servidor pra mostrar imagem. Base64 embutido também
// mataria o diff do git: uma print colada viraria uma linha de 200KB no meio
// do conteúdo, e o arquivo da página deixaria de ser legível por gente.
//
// O peso já vem resolvido: `colarImagem.ts` encolhe pra 1600px e converte pra
// WebP no navegador, antes de chegar aqui.
// ---------------------------------------------------------------------------

/** Onde as prints coladas moram. Separado de `esteira/` e `onboarding/`, que vieram de import. */
const PASTA = resolve(process.cwd(), "public", "assets", "colados");

/**
 * Teto de segurança, já DEPOIS do encolhimento do navegador.
 *
 * Não é sobre disco, é sobre o repositório: 4MB é ~20× o tamanho de uma print
 * de 1600px em WebP, então bater neste teto significa que algo não passou pelo
 * redutor — e é melhor recusar do que engordar o git em silêncio.
 */
const TETO_BYTES = 4 * 1024 * 1024;

const PREFIXO = "data:image/webp;base64,";

/**
 * Grava a print e devolve o caminho público (`/assets/colados/...`).
 *
 * O nome carrega a página de propósito: com dezenas de arquivos numa pasta só,
 * `onboarding-img-k3f9x2.webp` diz de onde veio sem abrir. O sufixo aleatório
 * evita que duas colagens no mesmo segundo se sobrescrevam.
 */
export function salvarImagemColada(paginaId: string, dataUrl: string): string {
  if (!dataUrl.startsWith(PREFIXO)) {
    throw new Error("esperava uma imagem WebP em data URL");
  }
  const dados = Buffer.from(dataUrl.slice(PREFIXO.length), "base64");
  if (!dados.length) throw new Error("imagem vazia");
  if (dados.length > TETO_BYTES) {
    throw new Error(
      `imagem de ${Math.round(dados.length / 1024)}KB passa do teto — não foi reduzida`,
    );
  }

  // `paginaId` vem do cliente e vira nome de arquivo: qualquer coisa fora de
  // [a-z0-9-] sai antes de tocar no disco, senão um id com `../` escreveria
  // fora de `public/`.
  const seguro = paginaId.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "pagina";
  const nome = `${seguro}-${novoId("img")}.webp`;

  mkdirSync(PASTA, { recursive: true });
  writeFileSync(resolve(PASTA, nome), dados);
  return `/assets/colados/${nome}`;
}

/**
 * Apaga uma print colada. É o desfazer de `salvarImagemColada`.
 *
 * POR QUE PRECISA EXISTIR: gravar o arquivo e registrar onde ele aparece são
 * dois passos, e o arquivo vai primeiro (o registro precisa do caminho). Se o
 * segundo falhar e ninguém desfizer o primeiro, sobra um `.webp` em `public/`
 * que nenhuma página menciona — e, como o repositório é o banco, esse órfão é
 * commitado e fica pra sempre. Aconteceu de verdade: seis arquivos numa página
 * que ficou com zero nós.
 *
 * Silencioso de propósito: quem chama já está tratando o erro de verdade (o
 * que impediu o registro). Estourar aqui trocaria a causa pela consequência.
 */
export function removerImagemColada(src: string): void {
  const nome = src.replace(/^\/assets\/colados\//, "");
  // Mesma desconfiança do nome na gravação: `src` só chega aqui vindo daqui
  // mesmo, mas um `..` no meio apagaria arquivo fora da pasta.
  if (!nome || nome !== nome.replace(/[/\\]/g, "")) return;
  try {
    const p = resolve(PASTA, nome);
    if (existsSync(p)) unlinkSync(p);
  } catch {
    // disco recusou apagar: o órfão é menos grave que derrubar a resposta
  }
}
