// src/controllers/authController.js
const bcrypt = require('bcrypt');
const db = require('../db'); // { pgPool, redisClient }
const sessionService = require('../services/sessionService');

const SALT_ROUNDS = 10;

async function register(req, res, next) {
  try {
    // validate input
    if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid request body' });
    const { username, email, password, display_name } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    // check exists
    const exists = await db.pgPool.query('SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1', [email, username]);
    if (exists.rows.length) return res.status(409).json({ error: 'User already exists' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user (let Postgres assign id)
    const insertQ = `INSERT INTO users (username, email, password_hash, display_name)
                     VALUES ($1,$2,$3,$4) RETURNING id, username, email, display_name`;
    const { rows } = await db.pgPool.query(insertQ, [username, email, password_hash, display_name || null]);
    const user = rows[0];

    // create session
    const { sid, ttl } = await sessionService.createSession(user.id);

    res.cookie('sid', sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: ttl * 1000,
      sameSite: 'lax'
    });

    return res.status(201).json({ ok: true, user: { id: user.id, username: user.username, display_name: user.display_name } });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) return res.status(400).json({ error: 'Missing fields' });

    const q = `SELECT id, username, password_hash, display_name FROM users WHERE email = $1 OR username = $1 LIMIT 1`;
    const { rows } = await db.pgPool.query(q, [emailOrUsername]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const { sid, ttl } = await sessionService.createSession(user.id);

    res.cookie('sid', sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: ttl * 1000,
      sameSite: 'lax'
    });

    res.json({ ok: true, user: { id: user.id, username: user.username, display_name: user.display_name } });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const sid = (req.cookies && req.cookies.sid) || (req.get('x-session-id') || '').replace(/^Bearer\s+/, '');
    if (sid) {
      await sessionService.deleteSession(sid);
      res.clearCookie('sid');
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout };
