# MarketStream

Real-time market data platform: simulator → ingestion → Kafka → processor → TimescaleDB/Redis → API / WebSocket / alerts → web UI.

## Stack

- **Node 22 + pnpm** TypeScript monorepo
- **Redpanda** (Kafka API) for ticks, bars, alerts
- **Redis** for hot ticks and pub/sub fan-out
- **TimescaleDB** for ticks, bars, alert history
- **Next.js** dashboard

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm --filter @marketstream/schemas... build
pnpm infra:up
pnpm bootstrap
pnpm dev:services
pnpm --filter @marketstream/web dev
```

Open [http://localhost:3000](http://localhost:3000).

## Services

| Service | Port | Role |
|---------|------|------|
| web | 3000 | Dashboard |
| api | 3001 | REST (instruments, bars, alerts) |
| websocket | 3002 | Live tick/bar/alert stream |
| ingestion | 3003 | HTTP tick intake → Kafka |
| processor | — | Ticks → 1s bars, DB, Redis |
| alert-worker | — | Rule evaluation |
| simulator | — | Synthetic ticks |

Metrics scrape ports: `9101`–`9105`. Prometheus: `9090`.

## Scripts

- `pnpm infra:up` / `infra:down` — Docker deps
- `pnpm topics` — create Kafka topics
- `pnpm migrate` — Timescale schema
- `pnpm seed` — demo instruments/user/alert
- `pnpm bootstrap` — topics + migrate + seed
- `pnpm benchmark` — POST ticks at ingestion

## Data flow

```
simulator → ingestion → market.ticks → processor ─┬→ TimescaleDB
                                                  ├→ Redis pub/sub
                                                  └→ market.bars
market.ticks → alert-worker → market.alerts + Redis alerts channel
web ← API (history) + WebSocket (live)
```
