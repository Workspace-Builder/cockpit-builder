// Aplica as migrations pendentes em ordem.
// Uso: npm run db:migrate
//
// Registra o que já rodou em `cockpit.migration`, então é seguro rodar sempre.
// Cada arquivo roda dentro de uma transação: ou entra inteiro, ou não entra.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

// Carrega .env.local na mão (sem depender de dotenv, igual à área de membros)
try {
  for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = linha.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
    }
  }
} catch {
  // ok — talvez já esteja no ambiente
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida. Copie .env.example para .env.local.");
  process.exit(1);
}

const dir = resolve("migrations");
const arquivos = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new Client({ connectionString: url });
await client.connect();

await client.query(`
  CREATE SCHEMA IF NOT EXISTS cockpit;
  CREATE TABLE IF NOT EXISTS cockpit.migration (
    nome        text PRIMARY KEY,
    aplicada_em timestamptz NOT NULL DEFAULT NOW()
  );
`);

const { rows } = await client.query("SELECT nome FROM cockpit.migration");
const jaRodou = new Set(rows.map((r) => r.nome));

let aplicadas = 0;
for (const nome of arquivos) {
  if (jaRodou.has(nome)) {
    console.log(`· ${nome} (já aplicada)`);
    continue;
  }
  const sql = readFileSync(resolve(dir, nome), "utf8");
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO cockpit.migration (nome) VALUES ($1)", [
      nome,
    ]);
    await client.query("COMMIT");
    console.log(`✓ ${nome}`);
    aplicadas++;
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(`✗ ${nome}: ${e.message}`);
    await client.end();
    process.exit(1);
  }
}

console.log(
  aplicadas ? `\n${aplicadas} migration(s) aplicada(s).` : "\nNada pendente.",
);
await client.end();
