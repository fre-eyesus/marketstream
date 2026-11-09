# HTTP API

Base URL: `http://localhost:3001`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness |
| GET | `/instruments` | Active instruments |
| GET | `/users` | Users |
| GET | `/alerts` | Active alert rules |
| GET | `/bars/:symbol?interval=1s&limit=100` | Recent bars |
| GET | `/ticks/last/:symbol` | Last tick from Redis |

Ingestion (`http://localhost:3003`):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness |
| POST | `/ticks` | Accept a tick JSON body |
