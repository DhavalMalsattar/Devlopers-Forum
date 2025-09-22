# DESIGN.md

## Purpose

This document captures the architecture and design decisions for the Forum project. It is written to explain why key choices were made, how the components interact, and which conventions to follow when extending the system. Use this as the single source of truth to copy into your repository `docs/` folder or `README`.

---

## High-level architecture (text diagram)

```
+-------------------+       +-----------------+       +----------------+
|   Express API     | <-->  |   PostgreSQL    | <-->  |   Redis        |
|   (app.js)        |       |   (primary DB)  |       | (sessions/cache)
| routes/controllers|       | (users,meta,    |       |                |
+-------------------+       |  threads, tags) |       +----------------+
        |  ^                           ^
        |  |                           |
        v  |                           v
+-------------------+             +----------------+
|  Middleware layer |             |   MongoDB      |
|  sessionAuth,     |             | (verification, |
|  validate (zod),  |             |  activity logs)|
|  rateLimiter,     |             +----------------+
|  cacheMiddleware  |
+-------------------+
```

Notes:

- Postgres is authoritative for relational data and IDs.
- Redis is used for ephemeral state: sessions, caches, rate-limits, trending sets.
- Mongo stores TTL-style verification codes and append-only activity logs.

---

## Key design decisions (short)

- **Single source of truth:** Postgres for relational entities (users, threads, comments, tags, boards, votes).
- **Global numeric ID:** `global_id_seq` in Postgres is used to generate numeric visible IDs used across stores.
- **Cache & invalidation:** Short-TTL caches in Redis; invalidation is best-effort after writes.
- **Sessions:** Server-side sessions in Redis (key `session:<sid>`), `HttpOnly` cookie + header fallback.
- **Validation:** Zod schemas via `validate` middleware for all endpoints.
- **Permissions:** Owner-or-admin model; role stored as `roles` text[] on `users` table.
- **No distributed transactions:** Postgres commits first; non-critical external writes (cache, logs) are best-effort with retry queue.

---

## Component responsibilities

### PostgreSQL

- Tables: `users`, `threads`, `comments`, `votes`, `tags`, `thread_tags`, `boards`, `reports`, `notifications`.
- Triggers/functions: maintain `comments_count`, `search_vector`, aggregate `score` on votes.
- Materialized view: `popular_threads` refreshed by job.
- ID generation: `global_id_seq` and `next_global_id()` helper.

### MongoDB (Mongoose)

- Collections: `VerificationCode`, `ActivityLog`.
- `VerificationCode` uses TTL index on `expiresAt` to auto-expire codes.
- `ActivityLog` is append-only for analytics and debugging, references Postgres user ids.

### Redis (ioredis)

- `session:<sid>` — JSON payload with TTL.
- `thread:detail:<tid>` — cached JSON payload (thread+nested comments).
- `thread:comments:<tid>` — cached comments tree.
- `threads:list:*` — cached listing pages.
- `ratelimit:<actor>:<route>` — counters used by rate limiter.

---

## API surface (summary)

- `POST /api/v1/auth/register` — create user + session

- `POST /api/v1/auth/login` — login + session

- `POST /api/v1/auth/logout` — delete session

- `GET /api/v1/boards` — list boards

- `POST /api/v1/boards` — create board (admin)

- `GET /api/v1/boards/:id/threads` — list threads in board

- `GET /api/v1/threads` — list threads (filter by board\_id, tag, sort, page)

- `POST /api/v1/threads` — create thread (requires `board_id`)

- `GET /api/v1/threads/:threadId` — full thread + nested comments

- `PUT /api/v1/threads/:threadId` — update (owner/admin)

- `DELETE /api/v1/threads/:threadId` — delete (owner/admin)

- `POST /api/v1/threads/:threadId/comments` — create comment

- `GET /api/v1/tags` — list/search tags

- `POST /api/v1/tags` — create tag (admin)

- `POST /api/v1/threads/:threadId/tags` — add tags to thread (owner/admin)

- `DELETE /api/v1/threads/:threadId/tags/:tagId` — remove tag (owner/admin)

---

## Data flow examples

### Create thread

1. Acquire `id = nextval('global_id_seq')` in Postgres.
2. Insert thread metadata into `threads` (id, author\_id, board\_id, title, excerpt, body, tags[]).
3. Commit transaction.
4. Best-effort: call `tagService.addTagsToThread(id, tags)` to ensure tags and `thread_tags` relation.
5. Invalidate Redis caches: `thread:detail:<id>`, `threads:list:*`.
6. Return created thread id to client.

### Create comment

1. Acquire `id = nextval('global_id_seq')`.
2. Insert into `comments` (thread\_id, parent\_id, body, author\_id).
3. Triggers update `threads.comments_count`.
4. Invalidate Redis caches for that thread.

---

## Caching keys and TTLs

- `thread:detail:<threadId>` — TTL 120s (cache thread + nested comments)
- `thread:comments:<threadId>` — TTL 60s
- `threads:list:board=<id|all>:sort=...:tag=...:page=...:limit=...` — TTL 30s
- `session:<sid>` — TTL 7d
- `ratelimit:*` — TTL windowSec per middleware

---

## Error handling & retries

- Use transactions for Postgres writes. On error, `ROLLBACK` and return 5xx.
- For cross-store operations (Postgres + Redis/Mongo): commit Postgres first; perform external writes best-effort and log failures.
- Consider a Redis-backed retry queue `pending:content` for failed Mongo writes (background worker can retry).

---

## Deployment & local dev notes

- Provide `.env.example` with required env vars. Do not commit secrets.
- Local dev: `docker-compose.yml` recommended with Postgres, Redis, Mongo, and the app.
- Use migration files under `migrations/` or a migration tool to manage schema changes.

---

<!-- ## How to extend this doc

- When adding new endpoints, add a short note under *API surface* and update related caching keys.
- When changing DB schema, add a migration file and update the *Postgres* section.
- When introducing new stores (e.g., ElasticSearch), add a *Data store* subsection describing tradeoffs. -->

---

## Next actions / checklist

-

---

*End of document.*

