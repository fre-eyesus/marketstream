import { loadConfig } from "@marketstream/config";
import { MetricsRegistry, startMetricsServer } from "@marketstream/metrics";
import { createApp } from "./app.js";

const config = loadConfig();
const { server, db, redis, log } = createApp(config);
const metrics = new MetricsRegistry();
metrics.gauge("marketstream_api_up", "API process up").set({}, 1);
startMetricsServer(metrics, 9103);

server.listen(config.API_PORT, () => {
  log.info("API listening", { port: config.API_PORT });
});

const shutdown = async () => {
  log.info("Shutting down API");
  server.close();
  await db.end();
  redis.disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
