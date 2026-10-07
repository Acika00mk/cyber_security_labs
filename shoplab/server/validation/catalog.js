import {z} from 'zod'

export const sortSchema = z.object({
    sort: z.enum(['id', 'name', 'price_cents ASC', 'price_cents DESC'])
})