# Events

## Kafka topics

| Topic | Key | Payload |
|-------|-----|---------|
| `market.ticks` | symbol | `Tick` |
| `market.bars` | symbol | `Bar` |
| `market.alerts` | symbol | `AlertTriggered` |

## Redis channels

| Channel | Payload |
|---------|---------|
| `channel:ticks` | `Tick` |
| `channel:bars` | `Bar` |
| `channel:alerts` | `AlertTriggered` |

Schemas live in `@marketstream/schemas`.
