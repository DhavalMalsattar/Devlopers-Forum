// src/services/commentService.js
const db = require('../db');
const redis = db.redisClient;

// Utility to build nested tree from flat array
function buildCommentTree(flatComments) {
  const map = new Map();
  const roots = [];
  for (const c of flatComments) {
    map.set(c.id, { ...c, replies: [] });
  }
  for (const c of flatComments) {
    if (c.parent_id == null) {
      roots.push(map.get(c.id));
    } else {
      const parent = map.get(c.parent_id);
      if (parent) parent.replies.push(map.get(c.id));
      else roots.push(map.get(c.id)); // orphan -> treat as root
    }
  }
  // Optional: sort by created_at
  function sortRec(nodes) {
    nodes.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    for (const n of nodes) if (n.replies.length) sortRec(n.replies);
  }
  sortRec(roots);
  return roots;
}

async function createComment({ threadId, parentId, authorId, body }) {
  const client = await db.pgPool.connect();
  try {
    await client.query('BEGIN');

    // get next id
    const idRow = await client.query(`SELECT nextval('comments_id_seq') AS id`);
    const id = idRow.rows[0].id;

    // optional: store snippet in Postgres body (we have body column in DDL)
    const snippet = body.length > 1000 ? body.slice(0, 1000) : body;

    const insertText = `INSERT INTO comments (id, thread_id, parent_id, author_id, body, metadata)
                        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    const insertValues = [id, threadId, parentId || null, authorId, snippet, JSON.stringify({})];

    const res = await client.query(insertText, insertValues);
    await client.query('COMMIT');

    // invalidate redis cache for thread detail
    try {
      await redis.del(`thread:detail:${threadId}`);
    } catch (e) {
      // log but don't fail response
      console.warn('redis del failed', e.message);
    }

    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    throw err;
  } finally {
    client.release();
  }
}

async function getThreadCommentsNested(threadId) {
  // attempt cache first
  try {
    const cached = await redis.get(`comments:thread:detail:${threadId}`);
    if (cached) return JSON.parse(cached);
  } catch (e) { /* ignore cache failure */ }

  // fetch comments rows
  const q = `SELECT id, thread_id, parent_id, author_id, body, metadata, edited, deleted, score, created_at
             FROM comments WHERE thread_id = $1 ORDER BY created_at ASC`;
  const { rows } = await db.pgPool.query(q, [threadId]);

  const nested = buildCommentTree(rows);

  // optionally cache the full thread (but note: thread metadata should be combined here by caller)
  try {
    await redis.set(`comments:thread:detail:${threadId}`, JSON.stringify(nested), 'EX', 3600); // 2 minutes
  } catch (e) {}

  return nested;
}

module.exports = { createComment, getThreadCommentsNested };
