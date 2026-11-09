import type { RedisClient } from "./client.js";

export async function publishJson(
  redis: RedisClient,
  channel: string,
  payload: unknown
): Promise<void> {
  await redis.publish(channel, JSON.stringify(payload));
}

export async function subscribeJson(
  subscriber: RedisClient,
  channels: string[],
  onMessage: (channel: string, payload: unknown) => void
): Promise<void> {
  await subscriber.subscribe(...channels);
  subscriber.on("message", (channel: string, message: string) => {
    try {
      onMessage(channel, JSON.parse(message));
    } catch {
      onMessage(channel, message);
    }
  });
}
