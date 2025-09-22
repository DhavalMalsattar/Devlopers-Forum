const dotenv =  require('dotenv');

dotenv.config();

const config = {
  mongoURI: process.env.MONGO_URI,
  postgresURI: process.env.POSTGRES_URI,
  redisURI: process.env.REDIS_URI,
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT || 6379,
  redisPassword: process.env.REDIS_PASSWORD,
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
};

module.exports = config;