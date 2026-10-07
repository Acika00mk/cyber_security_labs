const { test, before } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shoplab-test-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');

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

test('invalid login input returns a JSON error without crashing', async () => {
  for (const body of [{}, { email: 'invalid', password: 'alice123' }, { email: 'alice@shoplab.test', password: 123456 }]) {
    const res = await request(app).post('/api/auth/login').send(body);
    assert.strictEqual(res.status, 401);
    assert.deepStrictEqual(res.body, { error: 'Invalid input fields' });
  }
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
