// src/schemas/commentSchemas.js
const { z } = require('zod');
const { positiveInt } = require('./commonSchemas');

const commentCreateSchema = z.object({
  body: z.object({
    parentId: z.coerce.number().int().positive().optional().nullable(),
    body: z.string().min(1).max(5000)
  }),
  params: z.object({
    threadId: positiveInt()
  })
});

module.exports = { commentCreateSchema };
