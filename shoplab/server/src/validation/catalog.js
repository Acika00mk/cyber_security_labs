const { z } = require('zod');

const LoginScheme = z.object({
    email: z.email().min(3).max(300),
    password: z.string().min(6)
});

module.exports = { LoginScheme };