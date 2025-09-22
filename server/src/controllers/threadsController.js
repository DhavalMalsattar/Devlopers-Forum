// src/controllers/threadsController.js
const threadService = require('../services/threadService');
const boardService = require('../services/boardService');
const { ensureTagsExist } = require('../services/tagService');
const db = require('../db');

async function createThreadHandler(req, res, next) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { title, body, tags, boardId, board_id } = req.body;
    const resolvedBoardId = Number(boardId || board_id);

    if (!title || !body || !resolvedBoardId) {
      return res.status(400).json({ error: 'Missing fields (title, body, boardId required)' });
    }

    // Check board exists
    const board = await boardService.getBoardById(resolvedBoardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });

    // Generate excerpt
    const excerpt = body.length > 200 ? body.slice(0, 200) + '…' : body;

    // Ensure tags is an array
    const tagsArray = Array.isArray(tags) ? tags : [];


    const tagRows = await ensureTagsExist(tagsArray);
    const tagIds = tagRows.map(t => t.id);
    const tagNames = tagRows.map(t => t.name);

    const created = await threadService.createThread({
      authorId: user.id,
      boardId: resolvedBoardId,
      title,
      body,
      excerpt,
      tags: tagNames.length ? tagNames : null,
      tagIds: tagIds.length ? tagIds : null
    });

    res.status(201).json({ thread: created });
  } catch (err) {
    next(err);
  }
}


async function getThreadHandler(req, res, next) {
  try {
    const threadId = parseInt(req.params.threadId, 10);
    if (!threadId) return res.status(400).json({ error: 'Missing threadId' });

    const payload = await threadService.getThreadById(threadId);
    if (!payload) return res.status(404).json({ error: 'Thread not found' });
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

async function listThreadsHandler(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const sort = req.query.sort || 'last_activity';
    const tag = req.query.tag || null;
    // board_id can come from query param ?board_id= or ?board= or ?b
    const boardId = req.query.board_id || req.query.board || req.query.b || undefined;
    // to decide what kind of tag filter , threads containing all tags or any of the tags
    const tagFilter = req.query.tag_filter || 'any'; // 'any' or 'all'

    const rows = await threadService.listThreads({
      page,
      limit,
      sort,
      tag,
      boardId: boardId ? Number(boardId) : undefined,
      tagFilter
    });

    res.json({ threads: rows, meta: { page, limit } });
  } catch (err) {
    next(err);
  }
}

async function updateThreadHandler(req, res, next) {
  try {
    const threadId = parseInt(req.params.threadId, 10);
    if (!threadId) return res.status(400).json({ error: 'Missing threadId' });
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // permission check: ensure owner or admin
    const { rows } = await db.pgPool.query('SELECT author_id FROM threads WHERE id = $1', [threadId]);
    if (!rows.length) return res.status(404).json({ error: 'Thread not found' });
    const ownerId = rows[0].author_id;
    const isOwner = ownerId === user.id;
    const isAdmin = (user.roles || []).includes('admin');
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const updated = await threadService.updateThread({
      threadId,
      userId: user.id,
      title: req.body.title,
      body: req.body.body,
      tags: req.body.tags     // can only add extra tags, not remove existing ones
    });

    res.json({ thread: updated });
  } catch (err) {
    next(err);
  }
}

async function deleteThreadHandler(req, res, next) {
  try {
    const threadId = parseInt(req.params.threadId, 10);
    if (!threadId) return res.status(400).json({ error: 'Missing threadId' });
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { rows } = await db.pgPool.query('SELECT author_id FROM threads WHERE id = $1', [threadId]);
    if (!rows.length) return res.status(404).json({ error: 'Thread not found' });
    const ownerId = rows[0].author_id;
    const isOwner = ownerId === user.id;
    const isAdmin = (user.roles || []).includes('admin');
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    await threadService.deleteThread({ threadId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createThreadHandler,
  getThreadHandler,
  listThreadsHandler,
  updateThreadHandler,
  deleteThreadHandler
};
