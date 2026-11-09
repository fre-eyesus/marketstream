import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AppConfig } from "@marketstream/config";
import {
  createPool,
  getRecentBars,
  listAlertRules,
  listInstruments,
  listUsers,
  type DbPool,
} from "@marketstream/database";
import { createLogger, type Logger } from "@marketstream/logger";
import {
  createRedisClient,
  RedisKeys,
  type RedisClient,
} from "@marketstream/redis";

function readUrl(req: IncomingMessage): URL {
  return new URL(req.url ?? "/", "http://localhost");
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

export function createApp(config: AppConfig): {
  server: Server;
  db: DbPool;
  redis: RedisClient;
  log: Logger;
} {
  const log = createLogger({ service: "api", level: config.LOG_LEVEL });
  const db = createPool(config.DATABASE_URL);
  const redis = createRedisClient(config.REDIS_URL);

  const server = createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      sendJson(res, 204, {});
      return;
    }

    const url = readUrl(req);

    try {
      if (req.method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, { ok: true });
        return;
      }

      if (req.method === "GET" && url.pathname === "/instruments") {
        const cached = await redis.get(RedisKeys.instruments());
        if (cached) {
          sendJson(res, 200, JSON.parse(cached));
          return;
        }
        const instruments = await listInstruments(db);
        await redis.set(RedisKeys.instruments(), JSON.stringify(instruments));
        sendJson(res, 200, instruments);
        return;
      }

      if (req.method === "GET" && url.pathname === "/users") {
        sendJson(res, 200, await listUsers(db));
        return;
      }

      if (req.method === "GET" && url.pathname === "/alerts") {
        sendJson(res, 200, await listAlertRules(db));
        return;
      }

      if (req.method === "GET" && url.pathname.startsWith("/bars/")) {
        const symbol = decodeURIComponent(url.pathname.slice("/bars/".length));
        const interval = url.searchParams.get("interval") ?? "1s";
        const limit = Number(url.searchParams.get("limit") ?? 100);
        const bars = await getRecentBars(db, symbol, interval, limit);
        sendJson(res, 200, bars);
        return;
      }

      if (req.method === "GET" && url.pathname.startsWith("/ticks/last/")) {
        const symbol = decodeURIComponent(
          url.pathname.slice("/ticks/last/".length)
        );
        const raw = await redis.get(RedisKeys.lastTick(symbol));
        if (!raw) {
          sendJson(res, 404, { error: "No tick for symbol" });
          return;
        }
        sendJson(res, 200, JSON.parse(raw));
        return;
      }

      if (req.method === "POST" && url.pathname === "/echo") {
        const body = await readJson(req);
        sendJson(res, 200, body);
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      log.error("API request failed", {
        path: url.pathname,
        error: error instanceof Error ? error.message : String(error),
      });
      sendJson(res, 500, { error: "Internal server error" });
    }
  });

  return { server, db, redis, log };
}
