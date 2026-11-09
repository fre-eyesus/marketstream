export const RedisKeys = {
  lastTick: (symbol: string) => `tick:last:${symbol}`,
  lastBar: (symbol: string, interval: string) => `bar:last:${symbol}:${interval}`,
  instruments: () => "instruments:active",
  alertRules: () => "alerts:rules",
  alertRulesBySymbol: (symbol: string) => `alerts:rules:${symbol}`,
} as const;

export const RedisChannels = {
  ticks: "channel:ticks",
  bars: "channel:bars",
  alerts: "channel:alerts",
} as const;
