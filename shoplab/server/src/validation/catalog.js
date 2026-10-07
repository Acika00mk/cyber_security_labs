import { z } from 'zod';

export const LoginScnema = z.object({
  email:    z.string().email().max(255),
  password: z.string().min(1).max(100)
})

export const searchSchema = z.object({
  search:   z.string().min(2).max(2000).optional(),
  sort:     z.enum(["id", "name", "price_cents ASC", "price_cents DESC"]).optional()
})