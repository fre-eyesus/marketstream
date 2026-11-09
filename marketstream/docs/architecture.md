# Architecture

MarketStream is an event-driven market data pipeline.

1. The **simulator** (or any producer) POSTs ticks to **ingestion**.
2. **Ingestion** validates with Zod and publishes to Kafka topic `market.ticks` keyed by symbol.
3. **Processor** consumes ticks, writes them to TimescaleDB, updates Redis last-tick keys, publishes Redis `channel:ticks`, and aggregates **1s OHLC bars** into `market.bars` / DB / `channel:bars`.
4. **Alert worker** consumes ticks, evaluates active rules, writes triggers, publishes `market.alerts` and `channel:alerts`.
5. **API** serves instruments, last ticks, and bar history from Redis/DB.
6. **WebSocket** fans out Redis pub/sub messages to browsers.
7. **Web** renders live prices and recent bars.

Delivery is **at-least-once** (Kafka auto-commit after handler). Partitioning by symbol keeps per-symbol ordering.
