# Redis Key Reference

This document tracks all Redis keys, their purpose, format, and stored values.

---

## Conventions

- Use `:` to separate namespaces and identifiers.
- Use `list:` for paginated/collection caches; `detail:` for single-entity caches.
- Prefer short, stable prefixes (`rl`, `session`, `threads`, `thread`).
- All values are JSON unless noted otherwise.
- Always set a TTL on caches; sessions/ratelimits must have TTLs.

---

## Rate Limiter

**Key format**

```
rl:{user|ip}:{id}:{path}
```

**Examples**

```
rl:user:42:/api/v1/threads
rl:ip:127.0.0.1:/login
```

**Value**
- Integer counter (incremented with `INCR`).

**TTL**
- `windowSec` (default `60s`). Auto-expires.

**Purpose**
- Throttle requests per user/IP **and** per path.

---

## User Sessions

**Key format**

```
session:{sid}
```

**Example**

```
session:abCDefGh123
```

**Value**

```json
{
  "userId": 42,
  "createdAt": "2025-08-16T05:00:00.000Z"
}
```

**TTL**
- `DEFAULT_TTL` (e.g., 7 days).

**Purpose**
- Store authenticated user session data.

---

## Threads List Cache

**Key format**

```
threads:list:board={boardId|all}:sort={last_activity|latest|top}:tag={csv|all}:tagFilter={any|all}:page={n}:limit={n}
```

**Example**

```
threads:list:board=5:sort=last_activity:tag=python,sql:tagFilter=any:page=1:limit=20
```

**Value**

```json
[
  {
    "id": 1000000009,
    "title": "How to reverse a string in Python?",
    "excerpt": "...",
    "tags": ["python","strings"],
    "comments_count": 3,
    "score": 2,
    "last_activity_at": "2025-08-16T02:30:00Z",
    "created_at": "2025-08-16T02:00:00Z",
    "board_id": 5,
    "author_id": 1000000001
  },
  {
    "id": 1000000010,
    "title": "Difference between async/await and Promises?",
    "excerpt": "...",
    "tags": ["javascript","async","promises"],
    "comments_count": 5,
    "score": 4,
    "last_activity_at": "2025-08-16T02:45:00Z",
    "created_at": "2025-08-16T02:10:00Z",
    "board_id": 5,
    "author_id": 1000000002
  }
]
```

**TTL**
- `120s`.

**Purpose**
- Cache paginated/filtered thread lists.

**Invalidation**
- Cleared via `SCAN` + `DEL` with pattern:

```
threads:list:*
```

---

## Thread Detail Cache

**Key format**

```
thread:detail:{threadId}
```

**Example**

```
thread:detail:1000000009
```

**Value**

```json
{
  "thread": {
    "id": 1000000009,
    "board_id": 5,
    "author_id": 1000000001,
    "title": "How to reverse a string in Python?",
    "excerpt": "I'm just getting started with Python...",
    "tags": ["python","strings","beginner"],
    "comments_count": 3,
    "score": 2,
    "created_at": "2025-08-16T02:00:00Z",
    "last_activity_at": "2025-08-16T02:30:00Z"
  },
  "comments": [
    /* nested comment tree */
  ]
}
```

**TTL**
- `3600s` (1 hour).

**Purpose**
- Cache a single thread’s metadata + nested comments payload.

**Invalidation**
- On delete/update of the thread:

```
DEL thread:detail:{threadId}
```

- Also clear list caches:

```
threads:list:*
```

---

## Invalidation Summary

- **Thread created/updated/deleted**
  - `DEL thread:detail:{threadId}`
  - Clear all lists: `threads:list:*`
- **Session expiry**
  - TTL auto-expires `session:{sid}`
- **Rate limit window**
  - TTL auto-expires `rl:*`

---
