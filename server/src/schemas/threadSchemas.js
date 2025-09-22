// src/schemas/threadSchemas.js
const { z } = require('zod');
const { pageQuery, positiveInt } = require('./commonSchemas');

const threadCreateSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(300),
    body: z.string().min(1),
    board_id: z.number().int().positive("Board ID must be positive"),
    tags: z.array(z.string().min(1).max(50)).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const threadUpdateSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(300).optional(),
    body: z.string().min(1).optional(),
    tags: z.array(z.string().min(1).max(50)).optional()
  }),
  params: z.object({
    threadId: positiveInt()
  })
});

const threadListSchema = z.object({
  query: pageQuery,
  body: z.object({}).optional(),
  params: z.object({}).optional()
});

const threadIdParamSchema = z.object({
  params: z.object({
    threadId: positiveInt()
  })
});

module.exports = {
  threadCreateSchema,
  threadUpdateSchema,
  threadListSchema,
  threadIdParamSchema
};
