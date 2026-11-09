import type { Kafka, Message, Producer } from "kafkajs";
import type { KafkaMessageEnvelope } from "./types.js";

export async function createProducer(kafka: Kafka): Promise<Producer> {
  const producer = kafka.producer({
    allowAutoTopicCreation: false,
    idempotent: true,
  });
  await producer.connect();
  return producer;
}

function toMessage<T>(message: KafkaMessageEnvelope<T>): Message {
  const out: Message = {
    key: message.key,
    value: JSON.stringify(message.value),
  };
  if (message.headers) {
    out.headers = message.headers;
  }
  return out;
}

export async function sendJson<T>(
  producer: Producer,
  topic: string,
  message: KafkaMessageEnvelope<T>
): Promise<void> {
  await producer.send({
    topic,
    messages: [toMessage(message)],
  });
}

export async function sendJsonBatch<T>(
  producer: Producer,
  topic: string,
  messages: KafkaMessageEnvelope<T>[]
): Promise<void> {
  if (messages.length === 0) return;
  await producer.send({
    topic,
    messages: messages.map(toMessage),
  });
}
