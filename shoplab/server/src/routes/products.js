const express = require('express');
const { db } = require('../db');

const router = express.Router();

const {SortSchema} = require('../validation/catalog.js');

function toJson(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price_cents / 100,
    image: product.image,
  };
}

router.get('/', (req, res) => {
  let { search, sort } = req.query;

  const SortParsed = SortSchema.safeParse(req.query);

  if(!SortParsed.success){
    sort = 'id'

    // return res.status(400).json({error: "Invalid search or sort"});
    // return res.status(400).json({error: SortSchema.error.message});
  }

  let sql = 'SELECT * FROM products';
  const props = []
  if (search) {
    sql += " WHERE name LIKE ? OR description LIKE ?";
    props.push("%" + search + "%","%" + search + "%")

  }
  sql += ' ORDER BY ' + (sort || 'id');

  try {
    const products = db.prepare(sql).all(...props);
    res.json(products.map(toJson));
  } catch (err) {
    res.status(400).json({ error: 'Could not search products' });
  }
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ' + req.params.id).get();
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(toJson(product));
});

module.exports = router;
