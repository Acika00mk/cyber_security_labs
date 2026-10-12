const { z } = require('zod');

const productListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['id', 'name', 'price_asc', 'price_desc']).optional().default('id'),
});

const productIdParamSchema = z.coerce.number().int().positive();

const loginBodySchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

const SORT_SQL = {
  id: 'id',
  name: 'name',
  price_asc: 'price_cents ASC',
  price_desc: 'price_cents DESC',
};

const orderListQuerySchema = z.object({
  product: z.string().trim().max(100).optional(),
});

const reviewBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

const reorderBodySchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(10),
});

module.exports = {
  productListQuerySchema,
  productIdParamSchema,
  loginBodySchema,
  SORT_SQL,
  orderListQuerySchema,
  reviewBodySchema,
  reorderBodySchema,
};
