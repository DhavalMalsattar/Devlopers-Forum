// src/routes/tags.js
const express = require('express');
const router = express.Router();
const tagsController = require('../controllers/tagsController');
const { requireSession } = require('../middlewares/sessionAuth');

// GET /tags?q=&page=&limit=
router.get('/', tagsController.listTagsHandler);

// POST /tags (admin only)
router.post('/', requireSession, tagsController.createTagHandler);

module.exports = router;