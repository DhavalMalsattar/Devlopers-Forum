// src/middlewares/cacheInvalidate.js
const redis = require('../db').redisClient;

module.exports = function cacheInvalidate(patterns = []) {
  // patterns: array of key strings or globs like 'threads:list:*' or functions (req,result) => ['key']
  return async function invalidate(req, res, next) {
    // this is a helper to be used inside controllers after DB write.
    req.invalidateCache = async (result) => {
      try {
        for (const p of patterns) {
          if (typeof p === 'function') {
            const keys = p(req, result);
            for (const k of keys) await redis.del(k);
          } else if (p.includes('*')) {
            // scan & del
            const stream = redis.scanStream({ match: p, count: 100 });
            stream.on('data', (keys) => { if (keys.length) redis.del(keys); });
          } else {
            await redis.del(p);
          }
        }
      } catch (e) {
        console.warn('cacheInvalidate failed', e.message);
      }
    };
    next();
  };
};
