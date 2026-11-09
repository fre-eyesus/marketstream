import type { DbPool } from "./client.js";

const MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE TABLE IF NOT EXISTS instruments (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  exchange TEXT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  tick_size NUMERIC(18, 8) NOT NULL DEFAULT 0.01,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticks (
  symbol TEXT NOT NULL,
  price NUMERIC(18, 8) NOT NULL,
  volume NUMERIC(18, 8) NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'simulator'
);

SELECT create_hypertable('ticks', 'ts', if_not_exists => TRUE, migrate_data => TRUE);

CREATE TABLE IF NOT EXISTS bars (
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL,
  open NUMERIC(18, 8) NOT NULL,
  high NUMERIC(18, 8) NOT NULL,
  low NUMERIC(18, 8) NOT NULL,
  close NUMERIC(18, 8) NOT NULL,
  volume NUMERIC(18, 8) NOT NULL,
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (symbol, interval, start_ts)
);

SELECT create_hypertable('bars', 'start_ts', if_not_exists => TRUE, migrate_data => TRUE);

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  symbol TEXT NOT NULL REFERENCES instruments(symbol),
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below', 'crosses')),
  threshold NUMERIC(18, 8) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_symbol ON alert_rules (symbol) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS alert_triggers (
  id BIGSERIAL,
  alert_id UUID NOT NULL,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  condition TEXT NOT NULL,
  threshold NUMERIC(18, 8) NOT NULL,
  price NUMERIC(18, 8) NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id, ts)
);

SELECT create_hypertable('alert_triggers', 'ts', if_not_exists => TRUE, migrate_data => TRUE);
`;

export async function runMigrations(pool: DbPool): Promise<void> {
  await pool.query(MIGRATION_SQL);
}
