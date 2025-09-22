// src/schemas/tagSchemas.js
const { z } = require('zod');

const createTagSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100)
  })
});

const addTagsToThreadSchema = z.object({
  body: z.object({
    tags: z.array(z.string().min(1)).min(1)
  }),
  params: z.object({
    threadId: z.coerce.number().int().positive()
  })
});

module.exports = {
  createTagSchema,
  addTagsToThreadSchema
};
