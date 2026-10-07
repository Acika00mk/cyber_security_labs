const express = require('express');
const { db, transaction, findProduct, findCoupon } = require('../db');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();

router.get('/', requireLogin, (req, res) => {
  const { product } = req.query;

  let sql = 'SELECT * FROM orders WHERE user_id = ' + req.session.userId;
  if (product) {
    sql +=
      " AND id IN (SELECT order_id FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE p.name LIKE ?)";
  }
  sql += ' ORDER BY id DESC';

  const orders = db.prepare(sql).all(product ? [`%${product}%`] : []);
  const itemsQuery = db.prepare(`
    SELECT oi.product_id, p.name, oi.quantity, oi.unit_price_cents
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `);

  res.json(
    orders.map((order) => ({
      id: order.id,
      createdAt: order.created_at,
      status: order.status,
      total: order.total_cents / 100,
      couponCode: order.coupon_code,
      discount: (order.discount_cents || 0) / 100,
      items: itemsQuery.all(order.id).map((item) => ({
        productId: item.product_id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unit_price_cents / 100,
      })),
    }))
  );
});

const MAX_ITEMS = 20;
const MAX_QUANTITY = 10;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(object, allowed) {
  return Object.keys(object).every((key) => allowed.includes(key));
}

router.post('/', requireLogin, (req, res) => {
  const invalid = () => res.status(400).json({ error: 'Invalid order' });

  // The client may only say WHAT it wants to buy and which coupon it has.
  // Prices, discounts and totals come from the database.
  if (!isPlainObject(req.body) || !hasOnlyKeys(req.body, ['items', 'couponCode'])) return invalid();
  const { items, couponCode } = req.body;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) return invalid();

  let coupon = null;
  if (couponCode !== undefined && couponCode !== null) {
    if (typeof couponCode !== 'string') return invalid();
    coupon = findCoupon(couponCode);
    if (!coupon) {
      return res.status(400).json({ error: 'Invalid coupon' });
    }
  }

  const lines = [];
  for (const item of items) {
    if (!isPlainObject(item) || !hasOnlyKeys(item, ['productId', 'quantity'])) return invalid();
    const { productId, quantity } = item;
    if (!Number.isInteger(productId) || !Number.isInteger(quantity)) return invalid();
    if (quantity < 1 || quantity > MAX_QUANTITY) return invalid();

    const product = findProduct(productId);
    if (!product) {
      return res.status(400).json({ error: 'Unknown product' });
    }
    lines.push({ productId: product.id, quantity, unitPriceCents: product.price_cents });
  }

  // Amounts are stored in cents to avoid floating point rounding issues.
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const discountCents = coupon ? Math.min(coupon.discount_cents, subtotalCents) : 0;
  const totalCents = subtotalCents - discountCents;
  const orderId = transaction(() => {
    const order = db
      .prepare(
        `INSERT INTO orders (user_id, total_cents, status, created_at, coupon_code, discount_cents)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.session.userId,
        totalCents,
        'paid',
        new Date().toISOString(),
        coupon ? coupon.code : null,
        discountCents
      );
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)'
    );
    for (const line of lines) {
      insertItem.run(order.lastInsertRowid, line.productId, line.quantity, line.unitPriceCents);
    }
    return order.lastInsertRowid;
  });

  res.status(201).json({ orderId, total: totalCents / 100, discount: discountCents / 100, status: 'paid' });
});

module.exports = router;
