// src/services/boardService.js
const db = require('../db'); // { pgPool, redisClient }

async function getBoards() {
  const { rows } = await db.pgPool.query(
    'SELECT id, name, description, created_at, created_by FROM boards ORDER BY name'
  );
  return rows;
}

async function createBoard({ name, description, created_by }) {
  const insertQ = `INSERT INTO boards (name, description, created_by) VALUES ($1, $2, $3) RETURNING id, name, description, created_at, created_by`;
  const { rows } = await db.pgPool.query(insertQ, [name, description || null, created_by || null]);
  return rows[0];
}

async function getBoardById(boardId) {
  const { rows } = await db.pgPool.query('SELECT id, name, description, created_at, created_by FROM boards WHERE id = $1', [boardId]);
  return rows[0] || null;
}

// Helper that reuses threadService for listing threads in board
const threadService = require('./threadService');
async function getBoardThreads(boardId, opts = {}) {
  // opts may contain page, limit, sort, tag
  const rows = await threadService.listThreads({ ...opts, boardId });
  return rows;
}

module.exports = {
  getBoards,
  createBoard,
  getBoardById,
  getBoardThreads
};
