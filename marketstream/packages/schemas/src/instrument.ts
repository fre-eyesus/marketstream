import { z } from "zod";

export const InstrumentSchema = z.object({
  symbol: z.string().min(1).max(32),
  name: z.string().min(1),
  exchange: z.string().min(1),
  currency: z.string().length(3).default("USD"),
  tickSize: z.number().positive().default(0.01),
  active: z.boolean().default(true),
});

export type Instrument = z.infer<typeof InstrumentSchema>;
