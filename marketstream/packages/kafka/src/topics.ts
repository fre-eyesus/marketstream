export const TOPICS = {
  MARKET_TICKS: "market.ticks",
  MARKET_BARS: "market.bars",
  ALERTS: "market.alerts",
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

export const TOPIC_CONFIG: Record<
  TopicName,
  { partitions: number; replicationFactor: number }
> = {
  [TOPICS.MARKET_TICKS]: { partitions: 6, replicationFactor: 1 },
  [TOPICS.MARKET_BARS]: { partitions: 6, replicationFactor: 1 },
  [TOPICS.ALERTS]: { partitions: 3, replicationFactor: 1 },
};
