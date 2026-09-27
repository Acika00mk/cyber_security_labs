const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'shoplab.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    password_hash TEXT
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT,
    description TEXT,
    price_cents INTEGER,
    image TEXT
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    total_cents INTEGER,
    status TEXT,
    created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_price_cents INTEGER
  );
`);

function seed() {
  const users = [
    ['alice@shoplab.test', 'Alice', 'alice123'],
    ['bob@shoplab.test', 'Bob', 'bob123'],
  ];
  const products = [
    [1, 'Mechanical Keyboard', 'Tactile switches, full-size layout, white backlight.', 8900, '/images/keyboard.svg'],
    [2, 'Noise-Cancelling Headphones', 'Over-ear, 30 hours of battery, travel case included.', 24900, '/images/headphones.svg'],
    [3, '4K Monitor', '27 inch IPS panel, 3840 x 2160, USB-C input.', 39900, '/images/monitor.svg'],
    [4, 'USB-C Hub', 'HDMI, 3 x USB-A, SD card reader, 100 W pass-through.', 3900, '/images/hub.svg'],
    [5, 'Laptop Stand', 'Aluminium, adjustable height, fits 11 to 17 inch laptops.', 4500, '/images/stand.svg'],
  ];

  const insertUser = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)');
  for (const [email, name, password] of users) {
    insertUser.run(email, name, bcrypt.hashSync(password, 10));
  }
  const insertProduct = db.prepare(
    'INSERT INTO products (id, name, description, price_cents, image) VALUES (?, ?, ?, ?, ?)'
  );
  for (const product of products) insertProduct.run(...product);

  db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES ('orders', 1000)").run();
}

if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0) {
  seed();
}

function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function findProduct(id) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(Number(id) || 0);
}

module.exports = { db, transaction, findProduct };
