const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'shoplab.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const BCRYPT_ROUNDS = 10;

function hashPassword(password) {
  return bcrypt.hashSync(String(password), BCRYPT_ROUNDS);
}

function verifyPassword(password, passwordHash) {
  return bcrypt.compareSync(String(password), passwordHash);
}

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    password_hash TEXT,
    password TEXT,
    role TEXT NOT NULL DEFAULT 'customer'
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
    created_at TEXT,
    coupon_code TEXT,
    discount_cents INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_price_cents INTEGER
  );
  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY,
    code TEXT UNIQUE,
    discount_cents INTEGER,
    active INTEGER
  );
  CREATE TABLE IF NOT EXISTS product_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// Databases created before coupons existed are missing these columns.
const orderColumns = db.prepare('PRAGMA table_info(orders)').all().map((column) => column.name);
if (!orderColumns.includes('coupon_code')) db.exec('ALTER TABLE orders ADD COLUMN coupon_code TEXT');
if (!orderColumns.includes('discount_cents')) {
  db.exec('ALTER TABLE orders ADD COLUMN discount_cents INTEGER DEFAULT 0');
}

const customerUsers = [
  ['alice@shoplab.test', 'Alice', 'alice123', 'customer'],
  ['bob@shoplab.test', 'Bob', 'bob123', 'customer'],
];

const adminUser = ['admin@shoplab.test', 'Admin', 'admin123', 'admin'];

// Databases created before the login rewrite are missing the password column.
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((column) => column.name);
if (!userColumns.includes('password')) {
  db.exec('ALTER TABLE users ADD COLUMN password TEXT');
  const setPassword = db.prepare('UPDATE users SET password = ? WHERE email = ?');
  for (const [email, , password] of customerUsers) setPassword.run(password, email);
}
if (!userColumns.includes('role')) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
}

function seedDemoOrders() {
  if (db.prepare('SELECT id FROM orders WHERE id = 1001').get()) {
    return;
  }

  const alice = db.prepare('SELECT id FROM users WHERE email = ?').get('alice@shoplab.test');
  const bob = db.prepare('SELECT id FROM users WHERE email = ?').get('bob@shoplab.test');
  if (!alice || !bob) return;

  const createdAt = new Date('2025-10-01T12:00:00.000Z').toISOString();
  const insertOrder = db.prepare(
    `INSERT INTO orders (id, user_id, total_cents, status, created_at, coupon_code, discount_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)'
  );

  insertOrder.run(1001, alice.id, 39900, 'paid', createdAt, null, 0);
  insertItem.run(1001, 3, 1, 39900);

  insertOrder.run(1002, bob.id, 3900, 'paid', createdAt, null, 0);
  insertItem.run(1002, 4, 1, 3900);

  db.prepare("UPDATE sqlite_sequence SET seq = MAX(seq, 1002) WHERE name = 'orders'").run();
}

function seed() {
  const products = [
    [1, 'Mechanical Keyboard', 'Tactile switches, full-size layout, white backlight.', 8900, '/images/keyboard.svg'],
    [2, 'Noise-Cancelling Headphones', 'Over-ear, 30 hours of battery, travel case included.', 24900, '/images/headphones.svg'],
    [3, '4K Monitor', '27 inch IPS panel, 3840 x 2160, USB-C input.', 39900, '/images/monitor.svg'],
    [4, 'USB-C Hub', 'HDMI, 3 x USB-A, SD card reader, 100 W pass-through.', 3900, '/images/hub.svg'],
    [5, 'Laptop Stand', 'Aluminium, adjustable height, fits 11 to 17 inch laptops.', 4500, '/images/stand.svg'],
  ];

  const insertUser = db.prepare(
    'INSERT INTO users (email, name, password_hash, password, role) VALUES (?, ?, ?, ?, ?)'
  );
  for (const [email, name, password, role] of customerUsers) {
    insertUser.run(email, name, hashPassword(password), null, role);
  }
  const [email, name, password, role] = adminUser;
  insertUser.run(email, name, hashPassword(password), null, role);

  const insertProduct = db.prepare(
    'INSERT INTO products (id, name, description, price_cents, image) VALUES (?, ?, ?, ?, ?)'
  );
  for (const product of products) insertProduct.run(...product);

  db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES ('orders', 1000)").run();
  seedDemoOrders();
}

if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0) {
  seed();
}

if (!db.prepare('SELECT id FROM users WHERE email = ?').get('admin@shoplab.test')) {
  const [email, name, password, role] = adminUser;
  db.prepare('INSERT INTO users (email, name, password_hash, password, role) VALUES (?, ?, ?, ?, ?)').run(
    email,
    name,
    hashPassword(password),
    null,
    role
  );
}

seedDemoOrders();

if (db.prepare('SELECT COUNT(*) AS n FROM coupons').get().n === 0) {
  const insertCoupon = db.prepare('INSERT INTO coupons (code, discount_cents, active) VALUES (?, ?, 1)');
  insertCoupon.run('WELCOME10', 1000);
  insertCoupon.run('SPRING50', 5000);
}

if (db.prepare('SELECT COUNT(*) AS n FROM product_reviews').get().n === 0) {
  const alice = db.prepare('SELECT id FROM users WHERE email = ?').get('alice@shoplab.test');
  if (alice) {
    const insertReview = db.prepare(
      'INSERT INTO product_reviews (product_id, user_id, body, created_at) VALUES (?, ?, ?, ?)'
    );
    insertReview.run(
      3,
      alice.id,
      'Sharp picture and easy to set up. Worth it for long coding sessions.',
      new Date('2025-09-01T10:00:00.000Z').toISOString()
    );
  }
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

function findCoupon(code) {
  return db
    .prepare('SELECT * FROM coupons WHERE code = ? AND active = 1')
    .get(String(code).trim().toUpperCase());
}

module.exports = { db, transaction, findProduct, findCoupon, hashPassword, verifyPassword };
