// src/schemas/voteSchemas.js
const { z } = require('zod');
const { positiveInt } = require('./commonSchemas');

const voteSchema = z.object({
  body: z.object({
    postType: z.enum(['thread','comment']),
    postId: positiveInt(),
    vote: z.number().refine(val => [-1,0,1].includes(val), { message: 'vote must be -1,0,1'})
  })
});

module.exports = { voteSchema };
