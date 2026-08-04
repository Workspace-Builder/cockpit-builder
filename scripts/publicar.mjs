// Liga e desliga telas da publicação — o que o aluno vê.
//
//   node scripts/publicar.mjs                 lista o estado de tudo
//   node scripts/publicar.mjs onboarding      publica
//   node scripts/publicar.mjs --tirar metodo  despublica
//
// Mexe SÓ em `dados/publicadas.json`. Não builda e não sobe nada: publicar de
// verdade é `npm run build:aluno` + subir `out/`. A separação é de propósito —
// dá pra revisar o diff da lista antes de qualquer coisa ir pro ar.
//
// A ARMADILHA QUE ISTO NÃO RESOLVE, e que precisa ficar dita: tirar um id
// daqui faz a página parar de ser GERADA, não parar de EXISTIR no host. Se o
// deploy for incremental (sincroniza arquivo novo e não apaga o que sumiu), o
// HTML antigo continua no ar respondendo na mesma URL. Despublicar só vale
// quando a pasta publicada é SUBSTITUÍDA inteira, não mesclada.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const LISTA = resolve("dados", "publicadas.json");
const ARVORE = resolve("dados", "arvore.json");

const ler = (p, padrao) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return padrao;
  }
};

const arvore = ler(ARVORE, []);
const publicadas = ler(LISTA, []);

/** Todas as páginas que existem, com o nome, na ordem da árvore. */
const existentes = arvore.flatMap((g) =>
  g.paginas.map((p) => ({ id: p.id, nome: p.nome, pasta: g.pasta.nome })),
);

const args = process.argv.slice(2);
const tirar = args.includes("--tirar");
const ids = args.filter((a) => !a.startsWith("--"));

// --- sem argumento: mostra o estado -----------------------------------------

if (!ids.length) {
  console.log("\nO que o aluno vê (dados/publicadas.json):\n");
  for (const p of existentes) {
    const no = publicadas.includes(p.id);
    // Sem cor ANSI: o PowerShell 5.1 do Windows, que é o shell da casa, não
    // interpreta as sequências e imprime `[2m` como texto.
    console.log(
      `  ${no ? "●" : "○"} ${p.id.padEnd(16)} ${p.nome}${no ? "" : "   (rascunho)"}`,
    );
  }
  // Id na lista que não existe mais na árvore: não quebra o build (queries.ts
  // descarta), mas é lixo que confunde na próxima leitura.
  const fantasmas = publicadas.filter(
    (id) => !existentes.some((p) => p.id === id),
  );
  if (fantasmas.length) {
    console.log(
      `\n  ⚠ na lista mas não existem mais: ${fantasmas.join(", ")}`,
    );
  }
  console.log(
    `\n  ${publicadas.length} de ${existentes.length} publicada(s).` +
      `\n  publicar:    node scripts/publicar.mjs <id>` +
      `\n  despublicar: node scripts/publicar.mjs --tirar <id>\n`,
  );
  process.exit(0);
}

// --- com argumento: liga ou desliga -----------------------------------------

const desconhecidos = ids.filter((id) => !existentes.some((p) => p.id === id));
if (desconhecidos.length) {
  console.error(
    `Não existe página com id: ${desconhecidos.join(", ")}\n` +
      `Rode sem argumento pra ver a lista.`,
  );
  process.exit(1);
}

const antes = new Set(publicadas);
const depois = new Set(publicadas);
for (const id of ids) {
  if (tirar) depois.delete(id);
  else depois.add(id);
}

// Preserva a ordem da árvore em vez da ordem em que alguém publicou: o arquivo
// é lido por gente no diff do git, e ordem estável faz o diff mostrar só o que
// mudou de verdade.
const nova = existentes.map((p) => p.id).filter((id) => depois.has(id));
writeFileSync(LISTA, JSON.stringify(nova, null, 2) + "\n", "utf8");

for (const id of ids) {
  const nome = existentes.find((p) => p.id === id).nome;
  const mudou = antes.has(id) !== depois.has(id);
  console.log(
    mudou
      ? `${tirar ? "✗ despublicada" : "✓ publicada"}: ${nome} (${id})`
      : `— já estava ${tirar ? "fora" : "publicada"}: ${nome} (${id})`,
  );
}

console.log(
  `\n${nova.length} publicada(s). Agora: npm run build:aluno` +
    (tirar
      ? `\n⚠ despublicar só vale se o deploy SUBSTITUIR a pasta inteira —` +
        ` sincronização incremental deixa o HTML antigo no ar.`
      : ""),
);
