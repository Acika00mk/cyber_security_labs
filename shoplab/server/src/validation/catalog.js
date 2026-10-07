const { z } = require("zod");
const { _enum } = require("zod/v4/core");

const LoginSchema = z.object({
    email: z.email().min(3).max(300),
    password: z.string().min(6)
});

const SortSchema = z.object({
    sort: z.enum(["id", 'name', "price_cents ASC", "price_cents DESC"])
})

module.exports = { LoginSchema, SortSchema };
