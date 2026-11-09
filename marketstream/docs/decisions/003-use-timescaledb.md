# 003 Use TimescaleDB

## Status

Accepted

## Context

Ticks and bars are high-volume time-series.

## Decision

Store ticks, bars, and alert triggers in TimescaleDB hypertables on Postgres.

## Consequences

Efficient range queries for charts; operational model stays Postgres-compatible.
