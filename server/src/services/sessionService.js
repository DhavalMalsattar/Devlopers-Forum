const crypto = require('crypto');
const redis = require('../db/redis'); // adjust path to your redis client
const DEFAULT_TTL = 7 * 24 * 3600; // 7 days

function genSid() {
  return crypto.randomBytes(32).toString('hex');
}

async function createSession(userId, ttl = DEFAULT_TTL) {
  const sid = genSid();
  const key = `session:${sid}`;
  const payload = { userId, createdAt: new Date().toISOString() };
  await redis.set(key, JSON.stringify(payload), 'EX', ttl);
  return { sid, ttl, payload };
}

async function getSession(sid) {
  if (!sid) return null;
  const key = `session:${sid}`;
  const raw = await redis.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch(e) { return null; }
}

async function deleteSession(sid) {
  if (!sid) return false;
  return await redis.del(`session:${sid}`);
}

async function touchSession(sid, ttl = DEFAULT_TTL) {
  if (!sid) return false;
  return await redis.expire(`session:${sid}`, ttl);
}

module.exports = { createSession, getSession, deleteSession, touchSession };
