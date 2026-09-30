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
  const { items, couponCode } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty' });
  }

  // Coupon: must be a string and must exist in the database
  let coupon = null;
  if (couponCode !== undefined && couponCode !== null && couponCode !== '') {
    if (typeof couponCode !== 'string') {
      return res.status(400).json({ error: 'Invalid coupon' });
    }
    coupon = findCoupon(couponCode);
    if (!coupon) {
      return res.status(400).json({ error: 'Invalid coupon' });
    }
  }

  // Items: price from the database, quantity validated
  const lines = [];
  let subtotalCents = 0;
  for (const item of items) {
    const product = findProduct(item.productId);
    if (!product) {
      return res.status(400).json({ error: 'Unknown product' });
    }

    const quantity = Number(item.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    const unitPriceCents = product.price_cents;
    subtotalCents += unitPriceCents * quantity;
    lines.push({ productId: product.id, quantity, unitPriceCents });
  }

  // Discount: calculated by the server from the coupon in the database
  let discountCents = 0;
  if (coupon) {
    if (coupon.percent_off != null) {
      discountCents = Math.round((subtotalCents * coupon.percent_off) / 100);
    } else if (coupon.amount_off_cents != null) {
      discountCents = coupon.amount_off_cents;
    }
  }

  discountCents = Math.max(0, Math.min(discountCents, subtotalCents));

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

  res.status(201).json({
    orderId,
    total: totalCents / 100,
    discount: discountCents / 100,
    status: 'paid',
  });
});

module.exports = router;