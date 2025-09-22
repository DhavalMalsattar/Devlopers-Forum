// src/services/threadService.js
const { ta } = require('zod/locales');
const db = require('../db');
const redis = db.redisClient;
const commentService = require('./commentService');
const tagService = require('./tagService');

async function clearThreadsListCaches() {
  try {
    const stream = redis.scanStream({ match: 'threads:list:*', count: 100 });
    stream.on('data', (keys) => {
      if (keys.length) redis.del(keys);
    });
  } catch (e) {
    console.warn('Failed clearing threads list caches', e.message);
  }
}

async function createThread({ authorId, boardId, title, body, excerpt, tags = [], tagIds = [] }) {
  if (!boardId) throw new Error("board_id is required");

  const client = await db.pgPool.connect();
  try {
    await client.query('BEGIN');

    const idRow = await client.query(`SELECT nextval('threads_id_seq') AS id`);
    const id = idRow.rows[0].id;

    // const excerpt = body ? (body.length > 300 ? body.slice(0, 300) : body) : null;

    const insertText = `
      INSERT INTO threads (id, author_id, board_id, title, excerpt, body)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id, board_id, author_id, title, excerpt, tags, comments_count, score, created_at
    `;
    const insertVals = [id, authorId, boardId, title, excerpt, body];
    const { rows } = await client.query(insertText, insertVals);

    // Insert into join table for tags
    // await client.query(
    //   `INSERT INTO thread_tag (thread_id, tag_id)
    //   SELECT $1, unnest($2::bigint[])`,
    //   [ rows[0].id, tagIds ]
    // );
    // -----already did this in below try-catch block tagService.addTagsToThread ------//


    await client.query('COMMIT');


    // add tags to thread_tags table
    // after commit in createThread
    try {
      if (tags && tags.length) {
        // best-effort: don't break thread creation if tagService fails
        await tagService.addTagsToThread(id, tags);
      }
    } catch (e) {
      console.warn('tagService.addTagsToThread failed:', e.message || e);
    }
    
    await redis.del(`thread:detail:${id}`);  // <---not neccesary i think.
    clearThreadsListCaches();                // <---this is neccessary so as to update the "threads list of all filters" cache to include the new thread that might satisfy the filter.

    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function getThreadById(threadId) {
  try {
    const cached = await redis.get(`thread:detail:${threadId}`);
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  const q = `
    SELECT id, board_id, author_id, title, excerpt, tags, comments_count, score, created_at, last_activity_at
    FROM threads WHERE id = $1
  `;
  const { rows } = await db.pgPool.query(q, [threadId]);
  if (!rows.length) return null;
  const thread = rows[0];

  const comments = await commentService.getThreadCommentsNested(threadId);

  const payload = { thread, comments };

  try {
    await redis.set(`thread:detail:${threadId}`, JSON.stringify(payload), 'EX', 3600);
  } catch (e) {}

  return payload;
}

async function listThreads({ page = 1, limit = 20, sort = 'last_activity', tag, boardId , tagFilter = 'any' }) {
  const offset = (page - 1) * limit;
  const cacheKey = `threads:list:board=${boardId || 'all'}:sort=${sort}:tag=${tag || 'all'}:tagFilter=${tagFilter}:page=${page}:limit=${limit}`;

  try {
    // console.log("trying cacheKey", cacheKey);
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  let order = 'last_activity_at DESC';
  if (sort === 'latest') order = 'created_at DESC';
  if (sort === 'top') order = 'score DESC';

  const vals = [];
  let q = `
    SELECT id, board_id, title, excerpt, tags, comments_count, score, last_activity_at, created_at, author_id
    FROM threads
  `;

  const conditions = [];
  if (boardId) {
    vals.push(boardId);
    conditions.push(`board_id = $${vals.length}`);
  }
  console.log("tags", tag);

  if (tag) {
    const tagList = tag.split(',').map(t => t.trim());
    console.log("tagList", tagList);

    vals.push(tagList);

    if (tagFilter === 'any') {
      conditions.push(`tags && $${vals.length}::text[]`);
    } else if (tagFilter === 'all') {
      conditions.push(`tags @> $${vals.length}::text[]`);
    }
  }

  if (conditions.length) {
    q += ' WHERE ' + conditions.join(' AND ');
  }

  vals.push(limit, offset);
  q += ` ORDER BY ${order} LIMIT $${vals.length - 1} OFFSET $${vals.length}`;

  const { rows } = await db.pgPool.query(q, vals);

  try {
    await redis.set(cacheKey, JSON.stringify(rows), 'EX', 120);
  } catch (e) {}

  return rows;
}

async function updateThread({ threadId, title, body, tags }) {
  const client = await db.pgPool.connect();
  try {
    await client.query('BEGIN');

    const excerpt = body ? (body.length > 300 ? body.slice(0, 300) : body) : null;

    const q = `
      UPDATE threads
      SET title = COALESCE($2, title),
          body = COALESCE($3, body),
          excerpt = COALESCE($4, excerpt),
          tags = tags || $5,
          updated_at = now()
      WHERE id = $1
      RETURNING id, board_id, title, excerpt, tags, comments_count, score, updated_at
    `;
    const vals = [threadId, title, body, excerpt, tags];
    const { rows } = await client.query(q, vals);

    await client.query('COMMIT');

    try {
      if (tags) {
        // console.log(tags);
        await tagService.addTagsToThread(threadId, tags);
        // You may optionally call a sync function if you implement one; addTagsToThread merges new tags.
      }
    } catch (e) {
      console.warn('tagService.sync failed:', e.message || e);
    }

    await redis.del(`thread:detail:${threadId}`);   // <-- neccesary to clear the thread detail cache if this thread was cached.
    clearThreadsListCaches();                       // <-- neccesary to clear the threads list cache because due to update thread might satisfy some filters now or might not satisfy some filters from before.

    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    throw err;
  } finally {
    client.release();
  }
}

async function deleteThread({ threadId }) {
  const client = await db.pgPool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM threads WHERE id = $1', [threadId]);
    await client.query('COMMIT');

    await redis.del(`thread:detail:${threadId}`);
    clearThreadsListCaches();

    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createThread,
  getThreadById,
  listThreads,
  updateThread,
  deleteThread
};
