# Database

TimescaleDB hypertables:

- `ticks` — partitioned on `ts`
- `bars` — partitioned on `start_ts`, PK `(symbol, interval, start_ts)`
- `alert_triggers` — partitioned on `ts`

Relational tables:

- `instruments`
- `users`
- `alert_rules`

Apply with `pnpm migrate`.
