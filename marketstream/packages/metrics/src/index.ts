import http from "node:http";

type Labels = Record<string, string>;

function labelsKey(labels: Labels): string {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(",");
}

class Counter {
  private values = new Map<string, number>();

  constructor(public readonly name: string, public readonly help: string) {}

  inc(labels: Labels = {}, by = 1): void {
    const key = labelsKey(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + by);
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    for (const [key, value] of this.values) {
      lines.push(key ? `${this.name}{${key}} ${value}` : `${this.name} ${value}`);
    }
    return lines.join("\n");
  }
}

class Gauge {
  private values = new Map<string, number>();

  constructor(public readonly name: string, public readonly help: string) {}

  set(labels: Labels, value: number): void {
    this.values.set(labelsKey(labels), value);
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} gauge`];
    for (const [key, value] of this.values) {
      lines.push(key ? `${this.name}{${key}} ${value}` : `${this.name} ${value}`);
    }
    return lines.join("\n");
  }
}

export class MetricsRegistry {
  private counters: Counter[] = [];
  private gauges: Gauge[] = [];

  counter(name: string, help: string): Counter {
    const c = new Counter(name, help);
    this.counters.push(c);
    return c;
  }

  gauge(name: string, help: string): Gauge {
    const g = new Gauge(name, help);
    this.gauges.push(g);
    return g;
  }

  render(): string {
    return [...this.counters, ...this.gauges].map((m) => m.render()).join("\n\n") + "\n";
  }
}

export function startMetricsServer(
  registry: MetricsRegistry,
  port: number
): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === "/metrics") {
      res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4" });
      res.end(registry.render());
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(port);
  return server;
}

export type { Counter, Gauge };
