# 002 Use Redis

## Status

Accepted

## Context

The UI needs sub-second fan-out and last-tick reads without hitting the database.

## Decision

Use Redis for last-tick/last-bar keys and pub/sub channels.

## Consequences

Realtime path is fast; Redis is not the source of truth for history.
