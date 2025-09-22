// src/controllers/tagsController.js
const tagService = require('../services/tagService');
const db = require('../db');

async function listTagsHandler(req, res, next) {
  try {
    const q = req.query.q || '';
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const tags = await tagService.listTags({ q, page, limit });
    res.json({ tags, meta: { page, limit } });
  } catch (err) { next(err); }
}

async function createTagHandler(req, res, next) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!((user.roles || []).includes('admin'))) return res.status(403).json({ error: 'Forbidden' });

    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });

    try {
      const tag = await tagService.createTag(name.trim());
      return res.status(201).json({ tag });
    } catch (err) {
      // handle unique violation
      if (err && err.code === '23505') {
        return res.status(409).json({ error: 'Tag already exists' });
      }
      throw err;
    }
  } catch (err) { next(err); }
}

async function getThreadTagsHandler(req, res, next) {
  try {
    const threadId = parseInt(req.params.threadId || req.params.id, 10);
    if (!threadId) return res.status(400).json({ error: 'Missing threadId' });
    const tags = await tagService.getTagsForThread(threadId);
    res.json({ tags });
  } catch (err) { next(err); }
}

async function addTagsToThreadHandler(req, res, next) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const threadId = parseInt(req.params.threadId, 10);
    if (!threadId) return res.status(400).json({ error: 'Missing threadId' });

    // permission: only thread owner or admin can add tags
    const { rows } = await db.pgPool.query('SELECT author_id FROM threads WHERE id = $1', [threadId]);
    if (!rows.length) return res.status(404).json({ error: 'Thread not found' });
    const ownerId = rows[0].author_id;
    const isOwner = ownerId === user.id;
    const isAdmin = (user.roles || []).includes('admin');
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const tagNames = Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags ? [req.body.tags] : []);
    if (!tagNames.length) return res.status(400).json({ error: 'No tags provided' });

    const tags = await tagService.addTagsToThread(threadId, tagNames);
    res.status(200).json({ tags });
  } catch (err) { next(err); }
}

async function removeTagFromThreadHandler(req, res, next) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const threadId = parseInt(req.params.threadId, 10);
    const tagId = parseInt(req.params.tagId, 10);
    if (!threadId || !tagId) return res.status(400).json({ error: 'Missing params' });

    // permission: only thread owner or admin can remove tags
    const { rows } = await db.pgPool.query('SELECT author_id FROM threads WHERE id = $1', [threadId]);
    if (!rows.length) return res.status(404).json({ error: 'Thread not found' });
    const ownerId = rows[0].author_id;
    const isOwner = ownerId === user.id;
    const isAdmin = (user.roles || []).includes('admin');
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    await tagService.removeTagFromThread(threadId, tagId);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  listTagsHandler,
  createTagHandler,
  getThreadTagsHandler,
  addTagsToThreadHandler,
  removeTagFromThreadHandler
};
