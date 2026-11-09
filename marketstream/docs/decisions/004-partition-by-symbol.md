# 004 Partition by symbol

## Status

Accepted

## Context

Consumers need stable per-symbol ordering for bars and alerts.

## Decision

Use the instrument symbol as the Kafka message key.

## Consequences

All events for a symbol land on one partition; hot symbols can create skew.
