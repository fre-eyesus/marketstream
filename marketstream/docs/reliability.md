# Reliability

- Kafka producer is idempotent.
- Bar writes upsert on primary key to tolerate reprocessing.
- Services expose `/health` where applicable and Prometheus metrics on `9101`–`9105`.
- Delivery semantics: at-least-once (see ADR 005).

## Current limitations and next work

The repository contains the initial end-to-end MVP. The processor now skips invalid
messages separately from operational failures: DB, Redis, and Kafka write errors
reject the message handler so failed processing is not reported as successful.
Regression tests cover validation and error propagation; they do not replace a
live Kafka recovery test.

Before treating the pipeline as durable:

- Persist or reconstruct open bars across crashes and partition reassignment.
  Current aggregation lives in memory, and committed ticks cannot rebuild a lost
  partial bar automatically. Upserts alone do not guarantee convergence.
- Define late-tick handling and flush idle buckets. Currently any different
  timestamp bucket flushes the current bar, including an older incoming bucket.
- Make alert processing retry-safe. The worker advances its previous-price state
  before publishing, which can suppress an alert on retry after a partial failure.
- Add integration coverage for ingestion through persisted bars and WebSocket
  delivery, including dependency outages and consumer restarts.
- Add WebSocket reconnect handling in the dashboard and validate API query limits.

Local startup also needs explicit environment setup when overriding defaults:
backend processes do not automatically load the root `.env` file. Export backend
variables in the launching shell; put dashboard overrides in `apps/web/.env.local`.
