import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .default("postgresql://marketstream:marketstream@localhost:5432/marketstream"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  KAFKA_BROKERS: z.string().default("localhost:19092"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("debug"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  WEBSOCKET_PORT: z.coerce.number().int().positive().default(3002),
  METRICS_PORT: z.coerce.number().int().positive().default(9100),
  INGESTION_PORT: z.coerce.number().int().positive().default(3003),
});

export type AppConfig = z.infer<typeof EnvSchema> & {
  kafkaBrokers: string[];
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.parse(env);
  return {
    ...parsed,
    kafkaBrokers: parsed.KAFKA_BROKERS.split(",")
      .map((b) => b.trim())
      .filter(Boolean),
  };
}
