import {z} from 'zod';

export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(5).max(100)
})


export const SortSchema = z.object({
    sort: z.enum(['id','number','price_cents ASC','price_cents DESC'])
})
