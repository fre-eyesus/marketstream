import type { Consumer, EachMessagePayload, Kafka } from "kafkajs";

export async function createConsumer(
  kafka: Kafka,
  options: { groupId: string; topics: string[] }
): Promise<Consumer> {
  const consumer = kafka.consumer({
    groupId: options.groupId,
    allowAutoTopicCreation: false,
  });
  await consumer.connect();
  for (const topic of options.topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }
  return consumer;
}

export async function runConsumer(
  consumer: Consumer,
  handler: (payload: EachMessagePayload) => Promise<void>
): Promise<void> {
  await consumer.run({
    autoCommit: true,
    eachMessage: handler,
  });
}

export function parseJsonMessage<T>(payload: EachMessagePayload): T | null {
  const raw = payload.message.value?.toString();
  if (!raw) return null;
  return JSON.parse(raw) as T;
}
