const express = require('express');
const { db } = require('../db');

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

router.get('/', (req, res) => {
  let { search, sort } = req.query;

  let params = [];
  const sortEnums = ['Default','Name','price_cents ASC','price_cents DESC']
  
  let sql = 'SELECT * FROM products';
  if (search) {
    sql += " WHERE name LIKE ? OR description LIKE ?";
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY ' + (sort || 'id');
  params.push(sort);
  console.log(sql);
  console.log(params);
  try {
    if (params){
      const products = db.prepare(sql).all(...params);
    res.json(products.map(toJson));
    }
  else
    {
      const products = db.prepare(sql).all();
        res.json(products.map(toJson));
    }  
  } 
  catch (err) {
    res.status(400).json({ error: 'Could not search products' });
  }
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ' + req.params.id).get();
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(toJson(product));
});

module.exports = router;
