import { z } from "zod";

export const TickSchema = z.object({
  type: z.literal("tick"),
  symbol: z.string().min(1).max(32),
  price: z.number().positive(),
  volume: z.number().nonnegative(),
  ts: z.string().datetime(),
  source: z.string().min(1).default("simulator"),
});

export const BarSchema = z.object({
  type: z.literal("bar"),
  symbol: z.string().min(1).max(32),
  interval: z.enum(["1s", "1m", "5m", "1h"]),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().nonnegative(),
  startTs: z.string().datetime(),
  endTs: z.string().datetime(),
});

export const MarketEventSchema = z.discriminatedUnion("type", [
  TickSchema,
  BarSchema,
]);

export type Tick = z.infer<typeof TickSchema>;
export type Bar = z.infer<typeof BarSchema>;
export type MarketEvent = z.infer<typeof MarketEventSchema>;
