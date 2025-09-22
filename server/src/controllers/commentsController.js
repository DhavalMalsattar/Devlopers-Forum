// src/controllers/commentsController.js
const commentService = require('../services/commentService');

async function postComment(req, res, next) {
  try {
    const authorId = req.user && req.user.id;
    if (!authorId) return res.status(401).json({ error: 'Unauthorized' });

    const threadId = parseInt(req.params.threadId, 10);
    const { parentId, body } = req.body;
    if (!body || !threadId) return res.status(400).json({ error: 'Missing fields' });

    const result = await commentService.createComment({ threadId, parentId, authorId, body });
    return res.status(201).json({ comment: result });
  } catch (err) { next(err); }
}

async function getThread(req, res, next) {
  try {
    const threadId = parseInt(req.params.threadId, 10);
    if (!threadId) return res.status(400).json({ error: 'Missing threadId' });

    const nestedComments = await commentService.getThreadCommentsNested(threadId);

    // fetch thread metadata separately from Postgres if needed and combine
    const { rows } = await require('../db').pgPool.query('SELECT id, title, author_id, tags, comments_count, score, created_at FROM threads WHERE id = $1', [threadId]);
    const thread = rows[0] || null;

    return res.json({ thread, comments: nestedComments });
  } catch (err) { next(err); }
}

module.exports = { postComment, getThread };
