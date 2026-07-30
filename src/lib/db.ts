import "server-only";
import { Pool } from "pg";

// ---------------------------------------------------------------------------
// Pool de conexão
// ---------------------------------------------------------------------------
// Guardado no `globalThis` porque o Fast Refresh do dev reavalia o módulo a
// cada salvamento — sem isso, cada edição abriria um pool novo e o Postgres
// acabaria recusando conexão por limite.
//
// `server-only`: importar isto de um componente cliente vira erro de build, e
// não credencial vazada no bundle.
// ---------------------------------------------------------------------------

const global_ = globalThis as unknown as { __cockpitPool?: Pool };

function criarPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não definida. Copie .env.example para .env.local e rode `docker compose up -d`.",
    );
  }
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

export function pool(): Pool {
  global_.__cockpitPool ??= criarPool();
  return global_.__cockpitPool;
}

export async function query<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const r = await pool().query(sql, params);
  return r.rows as T[];
}

/** Roda várias instruções como uma coisa só. Ou entra tudo, ou não entra nada. */
export async function transacao<T>(
  fn: (exec: (sql: string, params?: unknown[]) => Promise<unknown[]>) => Promise<T>,
): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("BEGIN");
    const r = await fn(async (sql, params = []) => (await c.query(sql, params)).rows);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
