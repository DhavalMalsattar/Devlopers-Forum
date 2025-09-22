// src/middlewares/permissionCheck.js
const db = require('../db');

module.exports = function permissionCheck(opts = {}) {
  // opts: { resource: 'thread'|'comment', idParam: 'threadId'|'commentId' }
  const resType = opts.resource || 'thread';
  const idParam = opts.idParam || (resType === 'thread' ? 'threadId' : 'commentId');

  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const id = parseInt(req.params[idParam], 10);
      if (!id) return res.status(400).json({ error: 'Missing id param' });

      // fetch owner from Postgres
      let q = '';
      if (resType === 'thread') q = 'SELECT author_id FROM threads WHERE id = $1';
      else q = 'SELECT author_id FROM comments WHERE id = $1';

      const { rows } = await db.pgPool.query(q, [id]);
      if (!rows.length) return res.status(404).json({ error: `${resType} not found` });

      const ownerId = rows[0].author_id;
      if (ownerId === user.id || (user.roles || []).includes('admin')) return next();

      return res.status(403).json({ error: 'Forbidden' });
    } catch (err) {
      return next(err);
    }
  };
};
