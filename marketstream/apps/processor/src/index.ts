import { loadConfig } from "@marketstream/config";
import {
  createPool,
  insertBar,
  insertTick,
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
import type { Bar, Tick } from "@marketstream/schemas";
import { TickSchema } from "@marketstream/schemas";
import { DEFAULT_BAR_INTERVAL } from "@marketstream/shared";

const config = loadConfig();
const log = createLogger({ service: "processor", level: config.LOG_LEVEL });
const metrics = new MetricsRegistry();
const ticksProcessed = metrics.counter(
  "marketstream_processor_ticks_total",
  "Ticks processed"
);
const barsEmitted = metrics.counter(
  "marketstream_processor_bars_total",
  "Bars emitted"
);

interface OpenBar {
  symbol: string;
  interval: typeof DEFAULT_BAR_INTERVAL;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  startTs: number;
  endTs: number;
}

const openBars = new Map<string, OpenBar>();

function bucketStart(tsMs: number): number {
  return Math.floor(tsMs / 1000) * 1000;
}

async function flushBar(
  bar: OpenBar,
  producer: Awaited<ReturnType<typeof createProducer>>,
  db: ReturnType<typeof createPool>,
  redis: ReturnType<typeof createRedisClient>
): Promise<void> {
  const event: Bar = {
    type: "bar",
    symbol: bar.symbol,
    interval: bar.interval,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
    startTs: new Date(bar.startTs).toISOString(),
    endTs: new Date(bar.endTs).toISOString(),
  };

  await insertBar(db, event);
  await sendJson(producer, TOPICS.MARKET_BARS, {
    key: event.symbol,
    value: event,
  });
  await redis.set(
    RedisKeys.lastBar(event.symbol, event.interval),
    JSON.stringify(event)
  );
  await publishJson(redis, RedisChannels.bars, event);
  barsEmitted.inc({ symbol: event.symbol });
}

async function handleTick(
  tick: Tick,
  producer: Awaited<ReturnType<typeof createProducer>>,
  db: ReturnType<typeof createPool>,
  redis: ReturnType<typeof createRedisClient>
): Promise<void> {
  await insertTick(db, tick);
  await redis.set(RedisKeys.lastTick(tick.symbol), JSON.stringify(tick));
  await publishJson(redis, RedisChannels.ticks, tick);

  const tsMs = Date.parse(tick.ts);
  const start = bucketStart(tsMs);
  const key = `${tick.symbol}:${DEFAULT_BAR_INTERVAL}`;
  const current = openBars.get(key);

  if (!current) {
    openBars.set(key, {
      symbol: tick.symbol,
      interval: DEFAULT_BAR_INTERVAL,
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      volume: tick.volume,
      startTs: start,
      endTs: tsMs,
    });
  } else if (current.startTs !== start) {
    await flushBar(current, producer, db, redis);
    openBars.set(key, {
      symbol: tick.symbol,
      interval: DEFAULT_BAR_INTERVAL,
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      volume: tick.volume,
      startTs: start,
      endTs: tsMs,
    });
  } else {
    current.high = Math.max(current.high, tick.price);
    current.low = Math.min(current.low, tick.price);
    current.close = tick.price;
    current.volume += tick.volume;
    current.endTs = tsMs;
  }

  ticksProcessed.inc({ symbol: tick.symbol });
}

async function main(): Promise<void> {
  const db = createPool(config.DATABASE_URL);
  const redis = createRedisClient(config.REDIS_URL);
  const kafka = createKafkaClient({
    brokers: config.kafkaBrokers,
    clientId: "marketstream-processor",
  });
  const producer = await createProducer(kafka);
  const consumer = await createConsumer(kafka, {
    groupId: "marketstream-processor",
    topics: [TOPICS.MARKET_TICKS],
  });

  startMetricsServer(metrics, 9102);
  log.info("Processor started");

  await runConsumer(consumer, async (payload) => {
    const raw = parseJsonMessage<unknown>(payload);
    if (!raw) return;
    try {
      const tick = TickSchema.parse(raw);
      await handleTick(tick, producer, db, redis);
    } catch (error) {
      log.warn("Failed to process tick", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  const shutdown = async () => {
    log.info("Shutting down processor");
    for (const bar of openBars.values()) {
      await flushBar(bar, producer, db, redis);
    }
    await consumer.disconnect();
    await producer.disconnect();
    await poolEndSafe(db);
    redis.disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function poolEndSafe(db: ReturnType<typeof createPool>): Promise<void> {
  await db.end();
}

main().catch((error) => {
  log.error("Processor failed to start", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
