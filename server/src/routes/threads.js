// src/routes/threads.js
const express = require('express');
const router = express.Router();
const threadsController = require('../controllers/threadsController');
const { requireSession } = require('../middlewares/sessionAuth');
const tagsController = require('../controllers/tagsController');
const validate = require('../middlewares/validate');
const { addTagsToThreadSchema } = require('../schemas/tagSchemas');


// public listing (supports ?board_id=)
router.get('/', threadsController.listThreadsHandler);

// create (auth required)
router.post('/', requireSession, threadsController.createThreadHandler);

// thread detail
router.get('/:threadId', threadsController.getThreadHandler);

// update & delete (auth required)
router.put('/:threadId', requireSession, threadsController.updateThreadHandler);
router.delete('/:threadId', requireSession, threadsController.deleteThreadHandler);

// add tags to a thread (thread owner or admin)
router.post('/:threadId/tags', requireSession, tagsController.addTagsToThreadHandler);

// remove a tag from a thread
router.delete('/:threadId/tags/:tagId', requireSession, tagsController.removeTagFromThreadHandler);

// get tags for a thread (public)
router.get('/:threadId/tags', tagsController.getThreadTagsHandler);


module.exports = router;
