// src/middlewares/cacheMiddleware.js
const redis = require('../db').redisClient;

module.exports = function cacheMiddleware(getKeyFn, ttl = 60) {
  return async (req, res, next) => {
    try {
      if (!redis) return next();
      const key = getKeyFn(req);
      if (!key) return next();
      const cached = await redis.get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
      // intercept res.json to cache response
      const origJson = res.json.bind(res);
      res.json = async (body) => {
        try { await redis.set(key, JSON.stringify(body), 'EX', ttl); } catch (e) {}
        res.setHeader('X-Cache', 'MISS');
        origJson(body);
      };
      next();
    } catch (err) { next(err); }
  };
};
