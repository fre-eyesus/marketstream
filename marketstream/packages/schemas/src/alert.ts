import { z } from "zod";

export const AlertConditionSchema = z.enum(["above", "below", "crosses"]);

export const AlertRuleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  symbol: z.string().min(1).max(32),
  condition: AlertConditionSchema,
  threshold: z.number().positive(),
  active: z.boolean().default(true),
  createdAt: z.string().datetime(),
});

export const AlertTriggeredSchema = z.object({
  type: z.literal("alert.triggered"),
  alertId: z.string().uuid(),
  userId: z.string().uuid(),
  symbol: z.string().min(1).max(32),
  condition: AlertConditionSchema,
  threshold: z.number().positive(),
  price: z.number().positive(),
  ts: z.string().datetime(),
});

export type AlertCondition = z.infer<typeof AlertConditionSchema>;
export type AlertRule = z.infer<typeof AlertRuleSchema>;
export type AlertTriggered = z.infer<typeof AlertTriggeredSchema>;
