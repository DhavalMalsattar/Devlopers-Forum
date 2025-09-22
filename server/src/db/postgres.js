// src/db/postgres.js
require('dotenv').config(); 
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER ,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: process.env.PG_PORT,
  max: 20, // max connections
  idleTimeoutMillis: 30000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL connection error:', err);
    process.exit(-1);
});

module.exports = pool;




// junk code for testing connection

// require('dotenv').config(); 
// console.log('PostgreSQL');
// (async () => {
//   try {
//     const res = await pool.query('SELECT NOW()');
//     console.log('✅ Connected to PostgreSQL at', res.rows[0].now);
//   } catch (err) {
//     console.error('❌ PostgreSQL connection failed:', err.message);
//     process.exit(1); // exit app if DB fails
//   }
// })();