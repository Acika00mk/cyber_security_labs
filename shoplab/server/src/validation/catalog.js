import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().min(3).max(300),
  password: z.string().min(6)
});

export const searchSchema = z.object({
  search: z.string().min(2).max(2000).optional(),
  sort: z.enum(["id", "name", "price_cents ASC", "price_cents DESC"])
});
