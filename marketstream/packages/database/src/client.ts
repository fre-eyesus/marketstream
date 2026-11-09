import pg from "pg";

const { Pool } = pg;

export type DbPool = pg.Pool;
export type DbClient = pg.PoolClient;

export function createPool(databaseUrl: string): DbPool {
  return new Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30_000,
  });
}

export async function withTransaction<T>(
  pool: DbPool,
  fn: (client: DbClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
