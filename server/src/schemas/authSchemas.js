// src/schemas/authSchemas.js
const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30),
    email: z.string().email(),
    password: z.string().min(8),
    display_name: z.string().max(100).optional()
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

const loginSchema = z.object({
  body: z.object({
    emailOrUsername: z.string().min(1),
    password: z.string().min(1)
  })
});

module.exports = { registerSchema, loginSchema };
