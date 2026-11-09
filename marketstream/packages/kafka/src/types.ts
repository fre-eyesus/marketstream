export interface KafkaMessageEnvelope<T> {
  key: string;
  value: T;
  headers?: Record<string, string>;
}
