# 001 Use Kafka

## Status

Accepted

## Context

We need durable, ordered, multi-consumer delivery of market ticks.

## Decision

Use Kafka-compatible Redpanda with topics keyed by symbol.

## Consequences

Consumers can scale independently; ordering is per partition/symbol.
