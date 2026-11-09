import type { AlertRule, Bar, Instrument, Tick, User } from "@marketstream/schemas";
import type { DbClient, DbPool } from "./client.js";

export async function upsertInstrument(
  db: DbPool | DbClient,
  instrument: Instrument
): Promise<void> {
  await db.query(
    `INSERT INTO instruments (symbol, name, exchange, currency, tick_size, active)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (symbol) DO UPDATE SET
       name = EXCLUDED.name,
       exchange = EXCLUDED.exchange,
       currency = EXCLUDED.currency,
       tick_size = EXCLUDED.tick_size,
       active = EXCLUDED.active`,
    [
      instrument.symbol,
      instrument.name,
      instrument.exchange,
      instrument.currency,
      instrument.tickSize,
      instrument.active,
    ]
  );
}

export async function listInstruments(db: DbPool | DbClient): Promise<Instrument[]> {
  const result = await db.query<{
    symbol: string;
    name: string;
    exchange: string;
    currency: string;
    tick_size: string;
    active: boolean;
  }>(`SELECT symbol, name, exchange, currency, tick_size, active FROM instruments WHERE active = true ORDER BY symbol`);

  return result.rows.map((row) => ({
    symbol: row.symbol,
    name: row.name,
    exchange: row.exchange,
    currency: row.currency,
    tickSize: Number(row.tick_size),
    active: row.active,
  }));
}

export async function insertTick(db: DbPool | DbClient, tick: Tick): Promise<void> {
  await db.query(
    `INSERT INTO ticks (symbol, price, volume, ts, source)
     VALUES ($1, $2, $3, $4, $5)`,
    [tick.symbol, tick.price, tick.volume, tick.ts, tick.source]
  );
}

export async function insertBar(db: DbPool | DbClient, bar: Bar): Promise<void> {
  await db.query(
    `INSERT INTO bars (symbol, interval, open, high, low, close, volume, start_ts, end_ts)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (symbol, interval, start_ts) DO UPDATE SET
       high = GREATEST(bars.high, EXCLUDED.high),
       low = LEAST(bars.low, EXCLUDED.low),
       close = EXCLUDED.close,
       volume = EXCLUDED.volume,
       end_ts = EXCLUDED.end_ts`,
    [
      bar.symbol,
      bar.interval,
      bar.open,
      bar.high,
      bar.low,
      bar.close,
      bar.volume,
      bar.startTs,
      bar.endTs,
    ]
  );
}

export async function getRecentBars(
  db: DbPool | DbClient,
  symbol: string,
  interval: string,
  limit = 100
): Promise<Bar[]> {
  const result = await db.query<{
    symbol: string;
    interval: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    start_ts: Date;
    end_ts: Date;
  }>(
    `SELECT symbol, interval, open, high, low, close, volume, start_ts, end_ts
     FROM bars
     WHERE symbol = $1 AND interval = $2
     ORDER BY start_ts DESC
     LIMIT $3`,
    [symbol, interval, limit]
  );

  return result.rows.map((row) => ({
    type: "bar" as const,
    symbol: row.symbol,
    interval: row.interval as Bar["interval"],
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume),
    startTs: row.start_ts.toISOString(),
    endTs: row.end_ts.toISOString(),
  }));
}

export async function listUsers(db: DbPool | DbClient): Promise<User[]> {
  const result = await db.query<{
    id: string;
    email: string;
    display_name: string;
    created_at: Date;
  }>(`SELECT id, email, display_name, created_at FROM users ORDER BY created_at`);

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function listAlertRules(db: DbPool | DbClient): Promise<AlertRule[]> {
  const result = await db.query<{
    id: string;
    user_id: string;
    symbol: string;
    condition: AlertRule["condition"];
    threshold: string;
    active: boolean;
    created_at: Date;
  }>(
    `SELECT id, user_id, symbol, condition, threshold, active, created_at
     FROM alert_rules
     WHERE active = true`
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    condition: row.condition,
    threshold: Number(row.threshold),
    active: row.active,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function insertAlertTrigger(
  db: DbPool | DbClient,
  trigger: {
    alertId: string;
    userId: string;
    symbol: string;
    condition: string;
    threshold: number;
    price: number;
    ts: string;
  }
): Promise<void> {
  await db.query(
    `INSERT INTO alert_triggers (alert_id, user_id, symbol, condition, threshold, price, ts)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      trigger.alertId,
      trigger.userId,
      trigger.symbol,
      trigger.condition,
      trigger.threshold,
      trigger.price,
      trigger.ts,
    ]
  );
}
