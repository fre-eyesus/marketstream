import { Kafka } from "kafkajs";
import { loadConfig } from "@marketstream/config";
import { TOPIC_CONFIG, TOPICS } from "@marketstream/kafka";
import { createLogger } from "@marketstream/logger";

const log = createLogger({ service: "create-topics" });

async function main(): Promise<void> {
  const config = loadConfig();
  const kafka = new Kafka({
    clientId: "marketstream-admin",
    brokers: config.kafkaBrokers,
  });
  const admin = kafka.admin();
  await admin.connect();

  const existing = new Set(await admin.listTopics());
  const toCreate = Object.values(TOPICS)
    .filter((topic) => !existing.has(topic))
    .map((topic) => ({
      topic,
      numPartitions: TOPIC_CONFIG[topic].partitions,
      replicationFactor: TOPIC_CONFIG[topic].replicationFactor,
    }));

  if (toCreate.length === 0) {
    log.info("All Kafka topics already exist");
  } else {
    await admin.createTopics({ topics: toCreate, waitForLeaders: true });
    log.info("Created Kafka topics", { topics: toCreate.map((t) => t.topic) });
  }

  await admin.disconnect();
}

main().catch((error) => {
  log.error("Failed to create topics", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
