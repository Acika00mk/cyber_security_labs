const express = require('express');
const { db, transaction, findProduct, findCoupon } = require('../db');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();

// GET /api/orders
router.get('/', requireLogin, (req, res) => {
  try {
    const orders = db
      .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
      .all(req.session.userId);

    // SQL упитот имаше двоен JOIN JOIN products p ON p.id = oi.product_id (кој сега е корегиран)
    const itemsQuery = db.prepare(`
      SELECT oi.product_id, p.name, oi.quantity, oi.unit_price_cents
      FROM order_items oi 
      JOIN products p ON p.id = oi.product_id
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
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders
router.post('/', requireLogin, (req, res) => {
  try {
    const { items, couponCode } = req.body || {};

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

    let subtotalCents = 0;
    const lines = [];

    for (const item of items) {
      const product = findProduct(item.productId);
      if (!product) {
        return res.status(400).json({ error: 'Unknown product' });
      }

      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);

      // Безбедна одредба за единечна цена (од DB или од body)
      let unitPriceCents = 0;
      if (typeof product.price_cents === 'number') {
        unitPriceCents = product.price_cents;
      } else if (typeof product.price === 'number') {
        unitPriceCents = Math.round(product.price * 100);
      } else if (typeof product.unit_price_cents === 'number') {
        unitPriceCents = product.unit_price_cents;
      } else if (item.unitPrice !== undefined && item.unitPrice !== null) {
        unitPriceCents = Math.round((Number(item.unitPrice) || 0) * 100);
      }

      subtotalCents += unitPriceCents * quantity;

      lines.push({
        productId: product.id,
        quantity,
        unitPriceCents,
      });
    }

    // Безбедно одредување попуст во центи
    let discountCents = 0;
    if (coupon) {
      if (typeof coupon.discount_cents === 'number') {
        discountCents = coupon.discount_cents;
      } else if (typeof coupon.discount_percent === 'number') {
        discountCents = Math.round((subtotalCents * coupon.discount_percent) / 100);
      } else if (typeof coupon.discountPercent === 'number') {
        discountCents = Math.round((subtotalCents * coupon.discountPercent) / 100);
      } else if (typeof coupon.discount === 'number') {
        discountCents = Math.round(coupon.discount * 100);
      } else if (req.body.discount !== undefined) {
        discountCents = Math.round((Number(req.body.discount) || 0) * 100);
      }
    }

    discountCents = Math.min(discountCents, subtotalCents);
    const totalCents = Math.max(0, subtotalCents - discountCents);

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
          coupon ? (coupon.code || couponCode) : null,
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

    return res.status(201).json({
      orderId,
      total: totalCents / 100,
      discount: discountCents / 100,
      status: 'paid',
    });
  } catch (err) {
    console.error('Order creation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;