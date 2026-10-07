const z = require("zod");

const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" }),
});

const SortSchema = z.object({
  sort: z.enum([
    "id",
    "name",
    "price_censtprice_cents ASC",
    "price_cents DESC",
  ]),
});

module.exports = { LoginSchema, SortSchema };
