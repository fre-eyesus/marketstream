"use client";

import { useEffect, useMemo, useState } from "react";

type Instrument = {
  symbol: string;
  name: string;
  exchange: string;
};

type Tick = {
  type: "tick";
  symbol: string;
  price: number;
  volume: number;
  ts: string;
};

type Bar = {
  type: "bar";
  symbol: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  startTs: string;
  endTs: string;
};

type Props = {
  instruments: Instrument[];
  apiUrl: string;
  wsUrl: string;
};

export function MarketDashboard({ instruments, apiUrl, wsUrl }: Props) {
  const [connected, setConnected] = useState(false);
  const [ticks, setTicks] = useState<Record<string, Tick>>({});
  const [selected, setSelected] = useState(instruments[0]?.symbol ?? "AAPL");
  const [bars, setBars] = useState<Bar[]>([]);

  useEffect(() => {
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => {
      setConnected(true);
      socket.send(JSON.stringify({ action: "subscribe_all" }));
    };
    socket.onclose = () => setConnected(false);
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as {
          channel: string;
          data: Tick | Bar;
        };
        if (msg.channel.includes("ticks") && msg.data?.type === "tick") {
          setTicks((prev) => ({ ...prev, [msg.data.symbol]: msg.data as Tick }));
        }
      } catch {
        // ignore
      }
    };
    return () => socket.close();
  }, [wsUrl]);

  useEffect(() => {
    let cancelled = false;
    async function loadBars() {
      try {
        const res = await fetch(`${apiUrl}/bars/${selected}?interval=1s&limit=20`);
        if (!res.ok) return;
        const data = (await res.json()) as Bar[];
        if (!cancelled) setBars(data);
      } catch {
        // ignore while api/bootstrap is warming up
      }
    }
    void loadBars();
    const id = setInterval(() => void loadBars(), 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [apiUrl, selected]);

  const rows = useMemo(() => {
    const list = instruments.length
      ? instruments
      : ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"].map((symbol) => ({
          symbol,
          name: symbol,
          exchange: "NASDAQ",
        }));
    return list;
  }, [instruments]);

  return (
    <>
      <div className="status">
        <span className={`dot ${connected ? "live" : ""}`} />
        {connected ? "Live stream connected" : "Connecting to websocket…"}
      </div>

      <div className="grid" style={{ marginTop: "1rem" }}>
        {rows.map((instrument) => {
          const tick = ticks[instrument.symbol];
          return (
            <button
              key={instrument.symbol}
              type="button"
              className={`tile ${selected === instrument.symbol ? "selected" : ""}`}
              onClick={() => setSelected(instrument.symbol)}
              style={{
                textAlign: "left",
                cursor: "pointer",
                color: "inherit",
                width: "100%",
              }}
            >
              <div className="symbol">{instrument.symbol}</div>
              <div className="price">
                {tick ? tick.price.toFixed(2) : "—"}
              </div>
              <div className="meta">
                {instrument.name} · {instrument.exchange}
              </div>
            </button>
          );
        })}
      </div>

      <section className="panel">
        <h2>Recent 1s bars · {selected}</h2>
        <table>
          <thead>
            <tr>
              <th>Start</th>
              <th>O</th>
              <th>H</th>
              <th>L</th>
              <th>C</th>
              <th>Vol</th>
            </tr>
          </thead>
          <tbody>
            {bars.map((bar) => {
              const up = bar.close >= bar.open;
              return (
                <tr key={`${bar.symbol}-${bar.startTs}`}>
                  <td>{new Date(bar.startTs).toLocaleTimeString()}</td>
                  <td>{bar.open.toFixed(2)}</td>
                  <td>{bar.high.toFixed(2)}</td>
                  <td>{bar.low.toFixed(2)}</td>
                  <td className={up ? "up" : "down"}>{bar.close.toFixed(2)}</td>
                  <td>{bar.volume.toFixed(0)}</td>
                </tr>
              );
            })}
            {bars.length === 0 && (
              <tr>
                <td colSpan={6}>Waiting for bars…</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
