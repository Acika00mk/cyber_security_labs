import {z} from 'zod'



export const LoginSchema = z.object({
    email: z.email().min(3).max(30),
    password: z.string().min(6).max(100)
});