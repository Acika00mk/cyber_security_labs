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
  const { items, couponCode, total, discount } = req.body || {};
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
  let calculatedSubTotals = 0;
  for (const item of items) {
    const product = findProduct(item.productId);
    if (!product) {
      return res.status(400).json({ error: 'Unknown product' });
    }

    
    const quantity = parseInt(item.quantity, 10);
    if (isNaN(quantity) || quantity < 1) {
      return res.status(400).json({
        error: 'Kolicinata mora da bide cel broj pogolem od 0.'
      });
    }

    const correctUnitPriceCents = product.price_cents ?? Math.round((Number(product.price) || 0) * 100);
    const clientUnitPriceCents = Math.round((Number(item.unitPrice) || 0) * 100);

    
    if (clientUnitPriceCents !== correctUnitPriceCents) {
      return res.status(400).json({ 
        error: `Obid za manipulacija so cenata! Cenata za proizvodot "${product.name}" e izmeneta.` 
      });
    }
    
    lines.push({
      productId: product.id,
      quantity: quantity,
      unitPriceCents: correctUnitPriceCents,
    });
    calculatedSubTotals += correctUnitPriceCents * quantity;
  }

  
  let correctDiscountCents = 0;
  if (coupon) {
    if (coupon.discount_cents) {
      correctDiscountCents = coupon.discount_cents;
    } else if (coupon.discount_percent) {
      correctDiscountCents = Math.round((calculatedSubTotals * coupon.discount_percent) / 100);
    } else if (coupon.discount) {
      correctDiscountCents = Math.round(Number(coupon.discount) * 100);
    }
  }
  correctDiscountCents = Math.min(correctDiscountCents, calculatedSubTotals);

  
  const clientDiscountCents = Math.round((Number(discount) || 0) * 100);
  if (discount !== undefined && clientDiscountCents !== correctDiscountCents) {
    return res.status(400).json({
      error: 'popustot ne smee da se menuva!'
    });
  }

  const correctTotalCents = Math.max(0, calculatedSubTotals - correctDiscountCents);

  
  const clientTotalCents = Math.round((Number(total) || 0) * 100);
  if (total !== undefined && clientTotalCents !== correctTotalCents) {
    return res.status(400).json({
      error: 'total ne smee da se menuva!'
    });
  }

  const orderId = transaction(() => {
    const order = db
      .prepare(
        `INSERT INTO orders (user_id, total_cents, status, created_at, coupon_code, discount_cents)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.session.userId,
        correctTotalCents,
        'paid',
        new Date().toISOString(),
        coupon ? coupon.code : null,
        correctDiscountCents
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
    total: correctTotalCents / 100, 
    discount: correctDiscountCents / 100, 
    status: 'paid' 
  });
});

module.exports = router;