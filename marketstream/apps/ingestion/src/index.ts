import http from "node:http";
import { loadConfig } from "@marketstream/config";
import {
  createKafkaClient,
  createProducer,
  sendJson,
  TOPICS,
} from "@marketstream/kafka";
import { createLogger } from "@marketstream/logger";
import { MetricsRegistry, startMetricsServer } from "@marketstream/metrics";
import { TickSchema } from "@marketstream/schemas";

const config = loadConfig();
const log = createLogger({ service: "ingestion", level: config.LOG_LEVEL });
const metrics = new MetricsRegistry();
const ticksReceived = metrics.counter(
  "marketstream_ingestion_ticks_total",
  "Ticks accepted by ingestion"
);
const ticksRejected = metrics.counter(
  "marketstream_ingestion_ticks_rejected_total",
  "Ticks rejected by ingestion"
);

async function main(): Promise<void> {
  const kafka = createKafkaClient({
    brokers: config.kafkaBrokers,
    clientId: "marketstream-ingestion",
  });
  const producer = await createProducer(kafka);
  startMetricsServer(metrics, 9101);

  const server = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "POST" && req.url === "/ticks") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const tick = TickSchema.parse(body);
        await sendJson(producer, TOPICS.MARKET_TICKS, {
          key: tick.symbol,
          value: tick,
        });
        ticksReceived.inc({ symbol: tick.symbol });
        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ accepted: true }));
      } catch (error) {
        ticksRejected.inc();
        log.warn("Rejected tick", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            accepted: false,
            error: error instanceof Error ? error.message : String(error),
          })
        );
      }
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(config.INGESTION_PORT, () => {
    log.info("Ingestion listening", { port: config.INGESTION_PORT });
  });

  const shutdown = async () => {
    log.info("Shutting down ingestion");
    server.close();
    await producer.disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  log.error("Ingestion failed to start", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
