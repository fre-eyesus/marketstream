import { Kafka, logLevel, type KafkaConfig } from "kafkajs";

export function createKafkaClient(options: {
  brokers: string[];
  clientId: string;
}): Kafka {
  const config: KafkaConfig = {
    clientId: options.clientId,
    brokers: options.brokers,
    logLevel: logLevel.WARN,
    retry: {
      initialRetryTime: 300,
      retries: 8,
    },
  };
  return new Kafka(config);
}
