# Reliability

- Kafka producer is idempotent.
- Bar writes upsert on primary key to tolerate reprocessing.
- Services expose `/health` where applicable and Prometheus metrics on `9101`–`9105`.
- Delivery semantics: at-least-once (see ADR 005).
