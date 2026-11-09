# Benchmarking

With ingestion running:

```bash
BENCH_COUNT=10000 pnpm benchmark
```

This POSTs synthetic ticks to `/ticks` and reports accepted throughput.
