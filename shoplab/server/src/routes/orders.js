const express = require('express');
const { db, transaction, findProduct, findCoupon } = require('../db');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();

router.get('/', requireLogin, (req, res) => {
  const orders = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
    .all(req.session.userId);
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

router.post('/', requireLogin, (req, res) => {
  const { items, total, couponCode, discount } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty' });
  }

  let coupon = null;
  if (couponCode) {
    coupon = findCoupon(couponCode);
    if (!coupon) {
      return res.status(400).json({ error: 'Invalid coupon' });
    }
  }

  const lines = [];
  for (const item of items) {
    const product = findProduct(item.productId);
    if (!product) {
      return res.status(400).json({ error: 'Unknown product' });
    }
    lines.push({
      productId: product.id,
      quantity: item.quantity ?? 1,
      unitPriceCents: Math.round((Number(item.unitPrice) || 0) * 100),
    });
  }

  // Amounts are stored in cents to avoid floating point rounding issues.
  const totalCents = Math.round((Number(total) || 0) * 100);
  const discountCents = coupon ? Math.round((Number(discount) || 0) * 100) : 0;
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
