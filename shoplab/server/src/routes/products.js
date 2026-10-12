const express = require('express');
const { db } = require('../db');
const { productListQuerySchema, productIdParamSchema, SORT_SQL } = require('../validation/catalog');

const router = express.Router();

function toJson(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price_cents / 100,
    image: product.image,
  };
}

function invalid(res) {
  return res.status(400).json({ error: 'Invalid request' });
}

router.get('/', (req, res) => {
  const parsed = productListQuerySchema.safeParse(req.query);
  if (!parsed.success) return invalid(res);

  const { search, sort } = parsed.data;
  const orderBy = SORT_SQL[sort];

  let sql = 'SELECT * FROM products';
  const params = [];
  if (search) {
    const pattern = `%${search}%`;
    sql += ' WHERE name LIKE ? OR description LIKE ?';
    params.push(pattern, pattern);
  }
  sql += ` ORDER BY ${orderBy}`;

  const products = db.prepare(sql).all(...params);
  res.json(products.map(toJson));
});

router.get('/:id', (req, res) => {
  const parsed = productIdParamSchema.safeParse(req.params.id);
  if (!parsed.success) return invalid(res);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(parsed.data);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(toJson(product));
});

module.exports = router;
