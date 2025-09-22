// src/schemas/userSchemas.js
const { z } = require('zod');

const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).optional(),
    display_name: z.string().max(100).optional(),
    bio: z.string().max(1000).optional(),
    avatar_url: z.string().url().optional()
  }),
  params: z.object({
    id: z.coerce.number().int().positive()
  }).optional()
});

module.exports = { updateProfileSchema };
