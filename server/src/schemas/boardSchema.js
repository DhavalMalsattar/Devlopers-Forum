import { z } from "zod";

export const createBoardSchema = z.object({
  name: z.string().min(3, "Board name must be at least 3 characters"),
  description: z.string().optional(),
});
