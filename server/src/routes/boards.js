// src/routes/boards.js
const express = require('express');
const router = express.Router();
const boardsController = require('../controllers/boardsController');
const { requireSession } = require('../middlewares/sessionAuth');

// GET /boards
router.get('/', boardsController.listBoardsHandler);

// POST /boards (admin only)
router.post('/', requireSession, boardsController.createBoardHandler);

// GET /boards/:id/threads (quiery is supported) (tag queiry not working yet)
router.get('/:id/threads', boardsController.getBoardThreadsHandler);

module.exports = router;
