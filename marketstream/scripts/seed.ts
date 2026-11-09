import { loadConfig } from "@marketstream/config";
import {
  createPool,
  listAlertRules,
  upsertInstrument,
} from "@marketstream/database";
import { createLogger } from "@marketstream/logger";
import {
  createRedisClient,
  RedisKeys,
} from "@marketstream/redis";
import type { AlertRule, Instrument } from "@marketstream/schemas";

const log = createLogger({ service: "seed" });

const INSTRUMENTS: Instrument[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    exchange: "NASDAQ",
    currency: "USD",
    tickSize: 0.01,
    active: true,
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    exchange: "NASDAQ",
    currency: "USD",
    tickSize: 0.01,
    active: true,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    exchange: "NASDAQ",
    currency: "USD",
    tickSize: 0.01,
    active: true,
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    exchange: "NASDAQ",
    currency: "USD",
    tickSize: 0.01,
    active: true,
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    exchange: "NASDAQ",
    currency: "USD",
    tickSize: 0.01,
    active: true,
  },
];

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = createPool(config.DATABASE_URL);
  const redis = createRedisClient(config.REDIS_URL);

  try {
    for (const instrument of INSTRUMENTS) {
      await upsertInstrument(pool, instrument);
    }
    await redis.set(RedisKeys.instruments(), JSON.stringify(INSTRUMENTS));

    const userId = "11111111-1111-1111-1111-111111111111";
    await pool.query(
      `INSERT INTO users (id, email, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [userId, "demo@marketstream.local", "Demo Trader"]
    );

    const alertId = "22222222-2222-2222-2222-222222222222";
    await pool.query(
      `INSERT INTO alert_rules (id, user_id, symbol, condition, threshold, active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (id) DO NOTHING`,
      [alertId, userId, "AAPL", "above", 190]
    );

    const rules: AlertRule[] = await listAlertRules(pool);
    await redis.set(RedisKeys.alertRules(), JSON.stringify(rules));
    for (const rule of rules) {
      await redis.sadd(RedisKeys.alertRulesBySymbol(rule.symbol), rule.id);
    }

    log.info("Seed data loaded", {
      instruments: INSTRUMENTS.length,
      alerts: rules.length,
    });
  } finally {
    await pool.end();
    redis.disconnect();
  }
}

main().catch((error) => {
  log.error("Seed failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
