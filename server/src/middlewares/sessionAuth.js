// src/middlewares/sessionAuth.js
const db = require('../db'); // exports: { initDBConnections, pgPool, redisClient }
const sessionService = require('../services/sessionService');

async function sessionAuth(req, res, next) {
  try {
    // cookie 'sid' or header 'x-session-id' / Authorization: Bearer <sid>
    const cookieSid = req.cookies && req.cookies.sid;
    const header = req.get('x-session-id') || req.get('authorization');
    const headerSid = header ? header.replace(/^Bearer\s+/, '') : null;
    const sid = cookieSid || headerSid;

    if (!sid) {
      req.session = null;
      req.user = null;
      return next();
    }

    const sess = await sessionService.getSession(sid);
    if (!sess || !sess.userId) {
      req.session = null;
      req.user = null;
      return next();
    }

    // attach session
    req.session = sess;
    req.session.sid = sid;

    // fetch user from Postgres once and attach small user object
    const { rows } = await db.pgPool.query('SELECT id, username, display_name, email, roles FROM users WHERE id = $1', [sess.userId]);
    if (rows.length === 0) {
      req.user = null;
    } else {
      req.user = rows[0];
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

async function requireSession(req, res, next) {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

module.exports = { sessionAuth, requireSession };
