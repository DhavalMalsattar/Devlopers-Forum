// src/routes/comments.js
const express = require('express');
const router = express.Router();
const { postComment, getThread } = require('../controllers/commentsController');
const { requireSession } = require('../middlewares/sessionAuth');

router.post('/:threadId/comments', requireSession, postComment);
router.get('/:threadId', getThread);

module.exports = router;
