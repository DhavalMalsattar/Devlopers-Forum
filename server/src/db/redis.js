// src/db/redis.js
const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD || undefined,
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

module.exports = redis;

// junk code for testing connection

// Active connection check
// (async () => {
//   try {
//     const pong = await redis.ping();
//     if (pong === 'PONG') {
//       console.log('🔍 Redis connection test passed');
//     }
//   } catch (err) {
//     console.error('⚠️ Redis connection test failed:', err);
//   }
// })();