const { test, before } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shoplab-test-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-test-jwt-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();
let agent;

before(async () => {
  agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: 'alice@shoplab.test', password: 'alice123' }).expect(200);
});

test('login with alice works', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'alice@shoplab.test', password: 'alice123' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.name, 'Alice');
});

test('wrong password gives 401', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'alice@shoplab.test', password: 'wrong' });
  assert.strictEqual(res.status, 401);
});

test('products list has 5 products and product 3 costs 399', async () => {
  const res = await request(app).get('/api/products');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.length, 5);
  assert.strictEqual(res.body.find((p) => p.id === 3).price, 399);
});

test('product search returns an array', async () => {
  const res = await request(app).get('/api/products').query({ search: 'hub' });
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('GET /api/products/3 returns the 4K monitor', async () => {
  const res = await request(app).get('/api/products/3');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.name, '4K Monitor');
});

test('an order without price fields does not crash the server', async () => {
  const res = await agent.post('/api/orders').send({ items: [{ productId: 3, quantity: 1 }] });
  assert.ok(res.status < 500, `unexpected status ${res.status}`);
});

test('an order with a coupon code does not crash the server', async () => {
  const res = await agent
    .post('/api/orders')
    .send({ items: [{ productId: 3, quantity: 1 }], couponCode: 'WELCOME10' });
  assert.ok(res.status < 500, `unexpected status ${res.status}`);
});

test('GET /api/orders returns an array for a logged-in user', async () => {
  const res = await agent.get('/api/orders');
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('GET /api/products/3/reviews returns an array', async () => {
  const res = await request(app).get('/api/products/3/reviews');
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('POST review requires login', async () => {
  const res = await request(app).post('/api/products/3/reviews').send({ body: 'Nice monitor' });
  assert.strictEqual(res.status, 401);
});

test('logged-in user can post a product review', async () => {
  const res = await agent.post('/api/products/3/reviews').send({ body: 'Smoke test review' });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.id);
});

test('GET /api/orders/1001 returns Alice demo order', async () => {
  const res = await agent.get('/api/orders/1001');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.id, 1001);
  assert.ok(res.body.items.length >= 1);
});

test('Bob cannot read Alice order 1001 (IDOR fix)', async () => {
  const bob = request.agent(app);
  await bob
    .post('/api/auth/login')
    .send({ email: 'bob@shoplab.test', password: 'bob123' })
    .expect(200);
  const res = await bob.get('/api/orders/1001');
  assert.strictEqual(res.status, 404);
});

test('Bob cannot list admin users', async () => {
  const bob = request.agent(app);
  await bob
    .post('/api/auth/login')
    .send({ email: 'bob@shoplab.test', password: 'bob123' })
    .expect(200);
  const res = await bob.get('/api/admin/users');
  assert.strictEqual(res.status, 403);
});

test('profile PATCH rejects role mass assignment', async () => {
  const res = await agent
    .patch('/api/auth/me')
    .send({ name: 'Alice', role: 'admin' });
  assert.strictEqual(res.status, 400);
  const me = await agent.get('/api/auth/me');
  assert.strictEqual(me.body.role, 'customer');
});

test('debug config endpoint is reachable in teaching build', async () => {
  const res = await request(app).get('/api/debug/config');
  assert.strictEqual(res.status, 200);
  assert.ok('nodeEnv' in res.body);
});

test('security headers are present on responses', async () => {
  const res = await request(app).get('/api/products');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
  assert.strictEqual(res.headers['referrer-policy'], 'no-referrer');
});

test('tools fetch blocks private loopback SSRF targets', async () => {
  const res = await agent.get('/api/tools/fetch').query({ url: 'http://127.0.0.1:1' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'Only public HTTPS URLs are allowed.');
});

test('uploads reject traversal attempts and keep files inside the upload root', async () => {
  const res = await agent
    .post('/api/uploads')
    .query({ name: '../../../tmp/evil.txt' })
    .set('Content-Type', 'text/plain')
    .send('payload');
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'Invalid file name.');
});

test('verbose error handler hides stack traces', async () => {
  const res = await request(app).get('/api/debug/crash');
  assert.strictEqual(res.status, 500);
  assert.strictEqual(res.body.error, 'Something went wrong');
  assert.ok(!('stack' in res.body));
});

test('admin can log in', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@shoplab.test', password: 'admin123' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.role, 'admin');
});
