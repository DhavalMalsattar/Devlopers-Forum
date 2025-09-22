// src/controllers/boardsController.js
const boardService = require('../services/boardService');

async function listBoardsHandler(req, res, next) {
  try {
    const boards = await boardService.getBoards();
    res.json({ boards });
  } catch (err) {
    next(err);
  }
}

async function createBoardHandler(req, res, next) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Only allow admins (or you can check for moderator role)
    const isAdmin = (user.roles || []).includes('admin');
    if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });

    const board = await boardService.createBoard({ name, description, created_by: user.id });
    res.status(201).json({ board });
  } catch (err) {
    // if duplicate name, Postgres will error; map that to 409
    if (err && err.code === '23505') return res.status(409).json({ error: 'Board already exists' });
    next(err);
  }
}

async function getBoardThreadsHandler(req, res, next) {
  try {
    const boardId = parseInt(req.params.id, 10);
    if (!boardId) return res.status(400).json({ error: 'Missing board id' });

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const sort = req.query.sort || 'last_activity';
    const tag = req.query.tag || null;
    // to decide what kind of tag filter , threads containing all tags or any of the tags
    const tagFilter = req.query.tag_filter || 'any'; // 'any' or 'all'
    // console.log(`Fetching threads for board ${boardId} with page=${page}, limit=${limit}, sort=${sort}, tag=${tag}`);

    const threads = await boardService.getBoardThreads(boardId, { page, limit, sort, tag , tagFilter });
    res.json({ threads, meta: { page, limit, boardId } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listBoardsHandler,
  createBoardHandler,
  getBoardThreadsHandler
};
