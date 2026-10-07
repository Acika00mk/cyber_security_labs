import {z} from 'zod'

export const LoginSchema = z.object({
    email: z.email().min(3).max(300),
    password: z.string().min(6)

})

export const SortSchema = z.object({
    sort: z.enum(["id", "name", "price_cents ASC", "price_cents DESC"])

})
