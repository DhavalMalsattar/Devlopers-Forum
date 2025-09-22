// src/services/tagService.js
const db = require('../db'); // { pgPool, redisClient }

async function createTag(name) {
  const q = `INSERT INTO tags (name) VALUES ($1) RETURNING id, name`;
  const { rows } = await db.pgPool.query(q, [name]);
  return rows[0];
}

async function getTagByName(name) {
  const { rows } = await db.pgPool.query('SELECT id, name FROM tags WHERE name = $1', [name]);
  return rows[0] || null;
}

async function ensureTagsExist(names = []) {
  // names: array of strings, returns array of tag rows [{id,name},...]
  const uniqueNames = Array.from(
		new Set(
				(names || [])
				.map(n => String(n).trim().toLowerCase())
				.filter(Boolean)
		)
	);

  if (!uniqueNames.length) return [];

  // Try to insert all tags (ON CONFLICT DO NOTHING) then select them
  const client = await db.pgPool.connect();
  try {
    await client.query('BEGIN');

    const insertQ = `
      INSERT INTO tags (name)
      SELECT unnest($1::text[])
      ON CONFLICT (name) DO NOTHING
    `;
    await client.query(insertQ, [uniqueNames]);

    const selectQ = 'SELECT id, name FROM tags WHERE name = ANY($1::text[])';
    const { rows } = await client.query(selectQ, [uniqueNames]);

    await client.query('COMMIT');
    return rows;
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    throw err;
  } finally {
    client.release();
  }
}

async function addTagsToThread(threadId, tagNames = []) {
  // ensure tags exist then insert to thread_tags, and update threads.tags array for quick reads
  if (!threadId || !tagNames || !tagNames.length) return [];

  const tagRows = await ensureTagsExist(tagNames);
  const client = await db.pgPool.connect();
  try {
    await client.query('BEGIN');

    // insert into thread_tags if not exists
    for (const t of tagRows) {
      await client.query(
        `INSERT INTO thread_tags (thread_id, tag_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [threadId, t.id]
      );
    }

    // update threads.tags column to be array of tag names (keeping it denormalized for fast read)
    const names = tagRows.map(r => r.name);
    await client.query(
      `UPDATE threads SET tags = (SELECT array_agg(name) FROM tags JOIN thread_tags tt ON tt.tag_id = tags.id WHERE tt.thread_id = $1)
       WHERE id = $1`,
      [threadId]
    );

    await client.query('COMMIT');
    // return current tags for thread
    return await getTagsForThread(threadId);
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    throw err;
  } finally {
    client.release();
  }
}

async function removeTagFromThread(threadId, tagId) {
  const client = await db.pgPool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`DELETE FROM thread_tags WHERE thread_id = $1 AND tag_id = $2`, [threadId, tagId]);

    // update threads.tags array
    await client.query(
      `UPDATE threads SET tags = (SELECT COALESCE(array_agg(name), ARRAY[]::text[]) FROM tags JOIN thread_tags tt ON tt.tag_id = tags.id WHERE tt.thread_id = $1)
       WHERE id = $1`,
      [threadId]
    );

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    throw err;
  } finally {
    client.release();
  }
}

async function getTagsForThread(threadId) {
  const q = `
    SELECT t.id, t.name
    FROM tags t
    JOIN thread_tags tt ON tt.tag_id = t.id
    WHERE tt.thread_id = $1
    ORDER BY t.name
  `;
  const { rows } = await db.pgPool.query(q, [threadId]);
  return rows;
}

async function listTags({ q = '', page = 1, limit = 50 } = {}) {
  const offset = (page - 1) * limit;
  if (q) {
    const likeQ = `%${q}%`;
    const res = await db.pgPool.query(
      `SELECT id, name FROM tags WHERE name ILIKE $1 ORDER BY name LIMIT $2 OFFSET $3`,
      [likeQ, limit, offset]
    );
    return res.rows;
  } else {
    const res = await db.pgPool.query(
      `SELECT id, name FROM tags ORDER BY name LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.rows;
  }
}

module.exports = {
  createTag,
  getTagByName,
  ensureTagsExist,
  addTagsToThread,
  removeTagFromThread,
  getTagsForThread,
  listTags
};
