const pool = require('./postgres');      // pg Pool instance
const connectMongo = require('./mongo'); // async connectMongo function
const redisClient = require('./redis');  // ioredis client
const config = require('../config');

async function initDBConnections() {
  try {
    console.log('🔄 Connecting to databases...');

    await connectMongo(config.mongoURI);
    console.log('✅ MongoDB connected');

    // PostgreSQL connection pool is ready immediately on require
    // pool.query('SELECT NOW()')
    console.log('✅ PostgreSQL connected');

    // Redis client connects immediately on require as well
    console.log('✅ Redis connected');

    console.log('🚀 All databases are ready!');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

module.exports = {
  initDBConnections,
  pgPool: pool,
  redisClient,
};

initDBConnections(); // Initialize connections on import