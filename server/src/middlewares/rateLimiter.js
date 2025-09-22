// src/middlewares/rateLimiter.js
const redis = require('../db').redisClient;

module.exports = function rateLimiter({ windowSec = 60, max = 30, keyPrefix = 'rl' } = {}) {
  return async (req, res, next) => {
    try {
      const id = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
      const key = `${keyPrefix}:${id}:${req.path}`;
      if (redis) {
        const cur = await redis.incr(key);
        if (cur === 1) await redis.expire(key, windowSec);
        if (cur > max) return res.status(429).json({ error: 'Too many requests' });
        return next();
      } else {
        console.warn('Redis client not available, using fallback rate limiting');
        // fallback: allow (or use memory-based counter)
        return next();
      }
    } catch (err) {
      console.error('Rate limiter error:', err);
      return next(err);
    }
  };
};
