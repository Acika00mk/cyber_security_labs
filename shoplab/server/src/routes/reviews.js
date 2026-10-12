const express = require('express');
const { db, findProduct } = require('../db');
const requireLogin = require('../middleware/requireLogin');
const { productIdParamSchema, reviewBodySchema } = require('../validation/catalog');

const router = express.Router({ mergeParams: true });

function invalid(res) {
  return res.status(400).json({ error: 'Invalid request' });
}

router.get('/', (req, res) => {
  const parsed = productIdParamSchema.safeParse(req.params.productId);
  if (!parsed.success) return invalid(res);

  const product = findProduct(parsed.data);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const rows = db
    .prepare(
      `SELECT r.id, r.body, r.created_at, u.name AS author_name
       FROM product_reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`
    )
    .all(parsed.data);

  res.json(
    rows.map((row) => ({
      id: row.id,
      body: row.body,
      authorName: row.author_name,
      createdAt: row.created_at,
    }))
  );
});

router.post('/', requireLogin, (req, res) => {
  const idParsed = productIdParamSchema.safeParse(req.params.productId);
  if (!idParsed.success) return invalid(res);

  const product = findProduct(idParsed.data);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const bodyParsed = reviewBodySchema.safeParse(req.body || {});
  if (!bodyParsed.success) return invalid(res);

  const createdAt = new Date().toISOString();
  const result = db
    .prepare('INSERT INTO product_reviews (product_id, user_id, body, created_at) VALUES (?, ?, ?, ?)')
    .run(idParsed.data, req.session.userId, bodyParsed.data.body, createdAt);

  res.status(201).json({
    id: result.lastInsertRowid,
    body: bodyParsed.data.body,
    createdAt,
  });
});

module.exports = router;
