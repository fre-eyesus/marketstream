# 005 At-least-once delivery

## Status

Accepted

## Context

Exactly-once end-to-end across Kafka, DB, and Redis is complex for an MVP.

## Decision

Use at-least-once processing with idempotent bar upserts on `(symbol, interval, start_ts)`.

## Consequences

Duplicate ticks may be written; bars converge via upsert; alert triggers may duplicate under redelivery.
