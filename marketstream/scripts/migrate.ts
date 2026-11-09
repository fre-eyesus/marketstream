import { loadConfig } from "@marketstream/config";
import { createPool, runMigrations } from "@marketstream/database";
import { createLogger } from "@marketstream/logger";

const log = createLogger({ service: "migrate" });

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = createPool(config.DATABASE_URL);
  try {
    await runMigrations(pool);
    log.info("Migrations applied");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  log.error("Migration failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
