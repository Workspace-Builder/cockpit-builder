// Importa o board legado (dados/legado.json) pras tabelas `no` e `aresta`.
// Uso: npm run db:importar
//
// O JSON foi extraído do `index.html` rodando no navegador — posição, tamanho e
// tipo já calculados pelo próprio motor antigo, não adivinhados de código.
// Rodar de novo é seguro: apaga os nós das duas páginas e regrava.
import { readFileSync } from "node:fs";
import { Client } from "pg";

for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = linha.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

// doc do board legado → id da página no banco
const PAGINA = { "metodo-10k": "metodo", onboarding: "onboarding" };

// Os nós com COMPORTAMENTO — canvas animado, SVG interativo, controles.
// Não são forma de fluxograma: cada um vira um componente React, mapeado aqui
// pelo nome. Marcação e CSS sozinhos deixam o nó com a cara certa e morto.
const COMPONENTE = {
  nTimeline: "Timeline",
  nWheel: "Flywheel",
  "n-balde-furado-torneira": "BaldeFurado",
  "n-os-dois-balcoes-meio-fim": "DoisBalcoes",
  "n-furadeira-quadro-na-parede": "Furadeira",
  "n-o-80-20-da-tua-fase": "OitentaVinte",
  "n-os-12-meses": "DozeMeses",
  "n-servico-solucao": "ServicoSolucao",
};

const dados = JSON.parse(readFileSync("dados/legado.json", "utf8"));
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Onde cada página do legado deve morar, se ela não existir mais.
// O importador recria: página apagada pela interface (não há login nem
// desfazer) não pode travar o import do conteúdo.
const DESTINO = {
  metodo: {
    pasta: "obra-10k",
    nome: "O Método 10k",
    resumo: "Por quê e quanto: o funil antiprospecção e a conta do 10k.",
    ordem: 0,
  },
  onboarding: {
    pasta: "setup-6d",
    nome: "Onboarding",
    resumo: "O fluxo do cliente novo, do contrato à entrega.",
    ordem: 0,
  },
};

try {
  await client.query("BEGIN");

  const paginas = Object.values(PAGINA);

  for (const [id, d] of Object.entries(DESTINO)) {
    await client.query(
      `INSERT INTO cockpit.pasta (id, nome, ordem)
       VALUES ($1, $2, 0) ON CONFLICT (id) DO NOTHING`,
      [d.pasta, d.pasta === "obra-10k" ? "Obra 10k" : "Setup Agência 6D"],
    );
    const { rowCount } = await client.query(
      `INSERT INTO cockpit.pagina (id, pasta_id, nome, resumo, ordem)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [id, d.pasta, d.nome, d.resumo, d.ordem],
    );
    if (rowCount) {
      console.log(`  recriada a página "${d.nome}" (não existia mais)`);
      await client.query(
        `INSERT INTO cockpit.vista (pagina_id, rotulo, ordem)
         SELECT $1, rotulo, ordem
         FROM UNNEST($2::text[]) WITH ORDINALITY AS t(rotulo, ordem)`,
        [
          id,
          ["Ver tudo", "Ver uma parte", "Ver outra parte", "Ver só o essencial"],
        ],
      );
    }
  }
  // ON DELETE CASCADE leva as arestas junto
  await client.query("DELETE FROM cockpit.no WHERE pagina_id = ANY($1)", [
    paginas,
  ]);

  let nos = 0;
  for (const n of dados.nos) {
    const pagina = PAGINA[n.doc];
    if (!pagina) continue;
    await client.query(
      `INSERT INTO cockpit.no (id, pagina_id, tipo, x, y, w, h, z, txt, html, url, img, comp, legenda)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        n.id,
        pagina,
        COMPONENTE[n.id] ? "anim" : n.tipo,
        n.x,
        n.y,
        n.w || null,
        n.h || null,
        n.z ? Number(n.z) : null,
        n.txt || null,
        // Nó de fluxograma tem rótulo curto; guardar o HTML dele seria ruído.
        ["texto", "shot", "iframe", "video"].includes(n.tipo)
          ? n.html || null
          : null,
        n.url || null,
        n.img || null,
        COMPONENTE[n.id] || null,
        n.cap || null,
      ],
    );
    nos++;
  }

  let arestas = 0,
    puladas = 0;
  const ids = new Set(dados.nos.map((n) => n.id));
  for (const a of dados.arestas) {
    const pagina = PAGINA[a.doc];
    if (!pagina || !ids.has(a.de) || !ids.has(a.para)) {
      puladas++;
      continue;
    }
    await client.query(
      `INSERT INTO cockpit.aresta (pagina_id, de, para, lado_de, lado_para, tracejada, falha)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [pagina, a.de, a.para, a.ladoDe, a.ladoPara, !!a.tracejada, !!a.falha],
    );
    arestas++;
  }

  await client.query("COMMIT");
  console.log(`✓ ${nos} nós, ${arestas} arestas`);
  if (puladas) console.log(`  (${puladas} aresta(s) pulada(s): nó inexistente)`);
} catch (e) {
  await client.query("ROLLBACK");
  console.error("✗", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
