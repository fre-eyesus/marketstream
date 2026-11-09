import { loadConfig } from "@marketstream/config";
import { createLogger } from "@marketstream/logger";
import { DEFAULT_SYMBOLS } from "@marketstream/shared";
import { TickSchema } from "@marketstream/schemas";

const config = loadConfig();
const log = createLogger({ service: "simulator", level: config.LOG_LEVEL });

const prices = new Map<string, number>(
  DEFAULT_SYMBOLS.map((symbol) => [symbol, 100 + Math.random() * 100])
);

const intervalMs = Number(process.env.SIM_INTERVAL_MS ?? 250);
const ingestionUrl =
  process.env.INGESTION_URL ?? `http://localhost:${config.INGESTION_PORT}/ticks`;

async function sendTick(symbol: string): Promise<void> {
  const prev = prices.get(symbol) ?? 100;
  const drift = (Math.random() - 0.5) * 0.8;
  const next = Math.max(1, Number((prev + drift).toFixed(2)));
  prices.set(symbol, next);

  const tick = TickSchema.parse({
    type: "tick",
    symbol,
    price: next,
    volume: Math.floor(Math.random() * 500) + 1,
    ts: new Date().toISOString(),
    source: "simulator",
  });

  const res = await fetch(ingestionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tick),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ingestion rejected tick: ${res.status} ${text}`);
  }
}

async function main(): Promise<void> {
  log.info("Simulator started", {
    symbols: [...DEFAULT_SYMBOLS],
    intervalMs,
    ingestionUrl,
  });

  const timer = setInterval(() => {
    void (async () => {
      for (const symbol of DEFAULT_SYMBOLS) {
        try {
          await sendTick(symbol);
        } catch (error) {
          log.warn("Failed to send tick", {
            symbol,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();
  }, intervalMs);

  const shutdown = () => {
    clearInterval(timer);
    log.info("Simulator stopped");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  log.error("Simulator failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
