import { loadConfig } from "@marketstream/config";
import { createLogger } from "@marketstream/logger";
import { TickSchema } from "@marketstream/schemas";

const log = createLogger({ service: "benchmark" });

async function main(): Promise<void> {
  const config = loadConfig();
  const port = config.INGESTION_PORT;
  const count = Number(process.env.BENCH_COUNT ?? 10_000);
  const symbol = process.env.BENCH_SYMBOL ?? "AAPL";
  const started = Date.now();
  let ok = 0;

  for (let i = 0; i < count; i += 1) {
    const tick = TickSchema.parse({
      type: "tick",
      symbol,
      price: 100 + Math.random() * 50,
      volume: Math.floor(Math.random() * 1000) + 1,
      ts: new Date().toISOString(),
      source: "benchmark",
    });

    const res = await fetch(`http://localhost:${port}/ticks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tick),
    });
    if (res.ok) ok += 1;
  }

  const elapsedMs = Date.now() - started;
  const rate = (ok / (elapsedMs / 1000)).toFixed(1);
  log.info("Benchmark complete", { ok, count, elapsedMs, ratePerSec: rate });
}

main().catch((error) => {
  log.error("Benchmark failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
