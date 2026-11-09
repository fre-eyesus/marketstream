import { loadConfig } from "@marketstream/config";
import {
  createPool,
  insertAlertTrigger,
  listAlertRules,
} from "@marketstream/database";
import {
  createConsumer,
  createKafkaClient,
  createProducer,
  parseJsonMessage,
  runConsumer,
  sendJson,
  TOPICS,
} from "@marketstream/kafka";
import { createLogger } from "@marketstream/logger";
import { MetricsRegistry, startMetricsServer } from "@marketstream/metrics";
import {
  createRedisClient,
  publishJson,
  RedisChannels,
  RedisKeys,
} from "@marketstream/redis";
import type { AlertRule, AlertTriggered, Tick } from "@marketstream/schemas";
import { TickSchema } from "@marketstream/schemas";

const config = loadConfig();
const log = createLogger({ service: "alert-worker", level: config.LOG_LEVEL });
const metrics = new MetricsRegistry();
const alertsFired = metrics.counter(
  "marketstream_alerts_triggered_total",
  "Alerts triggered"
);

const lastPrices = new Map<string, number>();

function shouldTrigger(
  rule: AlertRule,
  price: number,
  previous: number | undefined
): boolean {
  // Edge-triggered: fire only when entering the condition from outside it.
  if (previous === undefined) return false;
  switch (rule.condition) {
    case "above":
      return previous < rule.threshold && price >= rule.threshold;
    case "below":
      return previous > rule.threshold && price <= rule.threshold;
    case "crosses":
      return (
        (previous < rule.threshold && price >= rule.threshold) ||
        (previous > rule.threshold && price <= rule.threshold)
      );
    default:
      return false;
  }
}

async function loadRules(
  db: ReturnType<typeof createPool>,
  redis: ReturnType<typeof createRedisClient>
): Promise<AlertRule[]> {
  const cached = await redis.get(RedisKeys.alertRules());
  if (cached) return JSON.parse(cached) as AlertRule[];
  const rules = await listAlertRules(db);
  await redis.set(RedisKeys.alertRules(), JSON.stringify(rules));
  return rules;
}

async function main(): Promise<void> {
  const db = createPool(config.DATABASE_URL);
  const redis = createRedisClient(config.REDIS_URL);
  const kafka = createKafkaClient({
    brokers: config.kafkaBrokers,
    clientId: "marketstream-alert-worker",
  });
  const producer = await createProducer(kafka);
  const consumer = await createConsumer(kafka, {
    groupId: "marketstream-alert-worker",
    topics: [TOPICS.MARKET_TICKS],
  });

  startMetricsServer(metrics, 9105);
  log.info("Alert worker started");

  await runConsumer(consumer, async (payload) => {
    const raw = parseJsonMessage<unknown>(payload);
    if (!raw) return;

    let tick: Tick;
    try {
      tick = TickSchema.parse(raw);
    } catch {
      return;
    }

    const rules = (await loadRules(db, redis)).filter(
      (rule) => rule.active && rule.symbol === tick.symbol
    );
    const previous = lastPrices.get(tick.symbol);
    lastPrices.set(tick.symbol, tick.price);

    for (const rule of rules) {
      if (!shouldTrigger(rule, tick.price, previous)) continue;

      const event: AlertTriggered = {
        type: "alert.triggered",
        alertId: rule.id,
        userId: rule.userId,
        symbol: rule.symbol,
        condition: rule.condition,
        threshold: rule.threshold,
        price: tick.price,
        ts: tick.ts,
      };

      await insertAlertTrigger(db, {
        alertId: event.alertId,
        userId: event.userId,
        symbol: event.symbol,
        condition: event.condition,
        threshold: event.threshold,
        price: event.price,
        ts: event.ts,
      });
      await sendJson(producer, TOPICS.ALERTS, {
        key: event.symbol,
        value: event,
      });
      await publishJson(redis, RedisChannels.alerts, event);
      alertsFired.inc({ symbol: event.symbol, condition: event.condition });
      log.info("Alert triggered", {
        alertId: event.alertId,
        symbol: event.symbol,
        price: event.price,
        threshold: event.threshold,
      });
    }
  });

  const shutdown = async () => {
    log.info("Shutting down alert worker");
    await consumer.disconnect();
    await producer.disconnect();
    await db.end();
    redis.disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  log.error("Alert worker failed to start", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
