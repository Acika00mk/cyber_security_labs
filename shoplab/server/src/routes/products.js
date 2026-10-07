const express = require("express");
const { db } = require("../db");
const { SearchSchema } = require("../../validation/catalog");

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

router.get("/", (req, res) => {
  const { search, sort } = req.query;

  const parsedBody = SearchSchema.safeParse(req.query);

  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid form fields" });
  }

  let params = [];
  let sql = "SELECT * FROM products";
  if (search) {
    sql += " WHERE name LIKE ? OR description LIKE ?";
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY " + sort;

  try {
    const products = db.prepare(sql).all(...params);
    res.json(products.map(toJson));
  } catch (err) {
    res.status(400).json({ error: "Could not search products" });
  }
});

router.get("/:id", (req, res) => {
  const product = db
    .prepare("SELECT * FROM products WHERE id = " + req.params.id)
    .get();
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(toJson(product));
});

module.exports = router;
