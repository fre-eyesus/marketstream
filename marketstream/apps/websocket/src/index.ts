import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { loadConfig } from "@marketstream/config";
import { createLogger } from "@marketstream/logger";
import { MetricsRegistry, startMetricsServer } from "@marketstream/metrics";
import {
  createRedisClient,
  RedisChannels,
  subscribeJson,
} from "@marketstream/redis";

const config = loadConfig();
const log = createLogger({ service: "websocket", level: config.LOG_LEVEL });
const metrics = new MetricsRegistry();
const connections = metrics.gauge(
  "marketstream_websocket_connections",
  "Active websocket connections"
);
const messagesSent = metrics.counter(
  "marketstream_websocket_messages_total",
  "Messages pushed to clients"
);

type ClientState = {
  socket: WebSocket;
  symbols: Set<string> | null;
};

async function main(): Promise<void> {
  const clients = new Set<ClientState>();
  const subscriber = createRedisClient(config.REDIS_URL);

  await subscribeJson(
    subscriber,
    [RedisChannels.ticks, RedisChannels.bars, RedisChannels.alerts],
    (channel, payload) => {
      const symbol =
        payload &&
        typeof payload === "object" &&
        "symbol" in payload &&
        typeof (payload as { symbol: unknown }).symbol === "string"
          ? (payload as { symbol: string }).symbol
          : null;

      const envelope = JSON.stringify({ channel, data: payload });
      for (const client of clients) {
        if (client.socket.readyState !== client.socket.OPEN) continue;
        if (
          client.symbols &&
          symbol &&
          !client.symbols.has(symbol)
        ) {
          continue;
        }
        client.socket.send(envelope);
        messagesSent.inc({ channel });
      }
    }
  );

  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, clients: clients.size }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server });
  wss.on("connection", (socket) => {
    const state: ClientState = { socket, symbols: null };
    clients.add(state);
    connections.set({}, clients.size);
    log.info("Client connected", { clients: clients.size });

    socket.send(
      JSON.stringify({
        channel: "system",
        data: {
          message: "subscribed",
          channels: [
            RedisChannels.ticks,
            RedisChannels.bars,
            RedisChannels.alerts,
          ],
        },
      })
    );

    socket.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as {
          action?: string;
          symbols?: string[];
        };
        if (msg.action === "subscribe" && Array.isArray(msg.symbols)) {
          state.symbols = new Set(msg.symbols);
          socket.send(
            JSON.stringify({
              channel: "system",
              data: { message: "filter.updated", symbols: [...state.symbols] },
            })
          );
        }
        if (msg.action === "subscribe_all") {
          state.symbols = null;
        }
      } catch {
        // ignore malformed client messages
      }
    });

    socket.on("close", () => {
      clients.delete(state);
      connections.set({}, clients.size);
    });
  });

  startMetricsServer(metrics, 9104);
  server.listen(config.WEBSOCKET_PORT, () => {
    log.info("WebSocket listening", { port: config.WEBSOCKET_PORT });
  });

  const shutdown = () => {
    log.info("Shutting down websocket");
    for (const client of clients) client.socket.close();
    wss.close();
    server.close();
    subscriber.disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  log.error("WebSocket failed to start", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
