import { MarketDashboard } from "@/components/MarketDashboard";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3002";

async function getInstruments() {
  try {
    const res = await fetch(`${API_URL}/instruments`, {
      next: { revalidate: 10 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Array<{
      symbol: string;
      name: string;
      exchange: string;
    }>;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const instruments = await getInstruments();

  return (
    <main>
      <section className="hero">
        <div className="brand">MarketStream</div>
        <p className="lede">
          Live ticks and one-second bars streamed through Kafka, Redis, and
          TimescaleDB.
        </p>
      </section>
      <MarketDashboard
        instruments={instruments}
        apiUrl={API_URL}
        wsUrl={WS_URL}
      />
    </main>
  );
}
