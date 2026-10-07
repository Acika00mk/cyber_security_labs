# Lab 2 – SQL injection

This lab uses **ShopLab**, the same shop from Lab 1. You will find places where the server builds SQL by joining strings, exploit them, then rewrite the code so those attacks no longer work.

> **Rule:** run ShopLab only on your own machine. Test only ShopLab and your own project, never other people's systems.

## Before you start

1. From the `shoplab/` folder: `npm run setup` (once), then `npm start`.
2. Open **http://localhost:3000**.
3. Read the lecture notes on injection: data and instructions travelling in the same string, parameterised queries, and why stripping quotes by hand does not work.

Lab accounts:

| Email | Password |
|---|---|
| alice@shoplab.test | alice123 |
| bob@shoplab.test | bob123 |

## What you must do

1. **Find** every query in the catalog module (`server/src/routes/products.js`), the login handler (`server/src/routes/auth.js`), and the order list (`server/src/routes/orders.js`, `GET /` only) that is built by concatenating user input into the SQL string.
2. **Rewrite** those queries as parameterised statements (prepared statements with `?` placeholders and bound values).
3. **Add** a second layer: validate input with a schema (for example [Zod](https://zod.dev/)) before it reaches the database. Boundaries: search text length, allowed sort options, numeric product id, login email/password shape, order product filter length.
4. **Remember:** `ORDER BY` column names cannot be bound as parameters. Use an allow-list of safe sort keys mapped to fixed SQL fragments.
5. **Restore secure login:** look up the user by email with a parameter, then verify the password with `bcrypt` against `password_hash` in the database. Do not compare passwords inside SQL.
6. **Prove** that each attack payload below fails after your fix (401, 400, or empty safe results — not another user's data).

Run `npm test` after your changes. The smoke tests must still pass.

## Part A – Reproduce the problems

Use the browser, **curl**, or an intercepting proxy (ZAP on port 8080). Record what you send and what comes back (screenshots or terminal output).

### A1 – Login bypass

The login form posts JSON to `POST /api/auth/login`.

Try logging in **without** Bob's password:

```bash
curl -s -H 'Content-Type: application/json' \
  -d '{"email":"bob@shoplab.test'\'' -- ","password":"anything"}' \
  http://localhost:3000/api/auth/login
```

Try a classic tautology:

```bash
curl -s -H 'Content-Type: application/json' \
  -d '{"email":"'\'' OR 1=1 -- ","password":"x"}' \
  http://localhost:3000/api/auth/login
```

You should get `200` and a user object while the vulnerable code is unfixed. Explain which part of the SQL string your input changed.

### A2 – Read data that is not yours (UNION)

On the Products page, search uses `GET /api/products?search=...`.

Dump rows from the `users` table (emails and passwords stored for this lab):

```bash
curl -sG http://localhost:3000/api/products \
  --data-urlencode "search=zzz' UNION SELECT id, email, password, 0, NULL FROM users -- "
```

You should see objects whose `name` field looks like an email address. That is data you were never meant to see.

Optional: the product detail route `GET /api/products/:id` also builds SQL from the URL segment. Try a similar `UNION` in the `:id` value with curl or ZAP.

### A3 – Control query logic (`ORDER BY`)

Sorting uses `GET /api/products?sort=...`. The server appends your value to `ORDER BY`.

Normal sort (should work before and after your fix):

```bash
curl -sG http://localhost:3000/api/products --data-urlencode "sort=price_cents DESC"
```

Injection example (changes row order based on a subquery):

```bash
curl -sG http://localhost:3000/api/products \
  --data-urlencode "sort=(CASE WHEN (SELECT substr(password,1,1) FROM users WHERE id=1)='a' THEN price_cents ELSE name END)"
```

Explain why a `?` placeholder cannot replace the sort column name.

## Part B – Fix the code

Work in:

- `server/src/routes/products.js` – list, search, sort, and get-by-id
- `server/src/routes/auth.js` – login
- `server/src/routes/orders.js` – list orders (`GET /` only; leave `POST /` unchanged)
- Add a small validation module if it keeps the routes readable (for example `server/src/validation/catalog.js`)

Checklist:

- [ ] No user input is copied into SQL with `+` or template literals for values.
- [ ] `search` uses bound parameters for `LIKE` patterns.
- [ ] `sort` is chosen only from a fixed map (allow-list).
- [ ] Product `id` is validated as a positive integer before querying.
- [ ] Login uses `?` for email and `bcrypt.compareSync` for the password.
- [ ] Order list uses `?` for `user_id` and for the `LIKE` pattern when filtering by product name.
- [ ] Schema validation rejects oversized or malformed input before the database runs.

## Part C – Prove the fix (catalog and login)

Repeat **every** payload from Part A. After your fix:

| Attack | Expected result |
|---|---|
| Login bypass (comment or `OR 1=1`) | `401`, or `400` if schema rejects the malformed email |
| `UNION` in `search` | No user emails/passwords in the JSON array |
| `UNION` in `:id` | `404` or `400`, not another user's row |
| Malicious `sort` (CASE / subquery) | `400` |
| Normal login as Alice | `200` |
| Normal search `hub` | `200`, only matching products |
| Normal sort `price_cents DESC` or your allow-list equivalent | `200`, products ordered by price |

Continue to **Part D** for the order-history exercise (Lab 2B).

## Part D – Reproduce: order history filter (Lab 2B)

**My orders** can filter by product name: `GET /api/orders?product=...`. The server builds that filter by joining the `product` query parameter into SQL.

### Setup

1. Log in as **Alice**. Place an order that includes the **4K Monitor** (product id 3).
2. Log in as **Bob** (another browser or after logging out). Place an order for the **Mechanical Keyboard** (product id 1).
3. As Alice, open **My orders** and filter by `Monitor`. You should see only Alice's monitor order.

### Cross-user leak

While still logged in as Alice, call the API with a crafted `product` value that changes the `WHERE` clause (Bob's `user_id` in the database is **2**):

```bash
curl -s -b jar -c jar -H 'Content-Type: application/json' \
  -d '{"email":"alice@shoplab.test","password":"alice123"}' \
  http://localhost:3000/api/auth/login

curl -sG -b jar http://localhost:3000/api/orders \
  --data-urlencode "product=%') OR user_id=2 OR ('1'='1"
```

Before your fix, the JSON array can include **Bob's order** (keyboard) even though Alice is logged in. Explain how the `LIKE '...'` string was closed and how `OR user_id=2` was injected.

Optional: try a `UNION` in `product` (same idea as Part A2).

## Part E – Fix: orders list

In `server/src/routes/orders.js` (`GET /` only):

- Always bind `user_id` with `?` (from `req.session.userId`, never concatenated).
- Bind the product filter as `LIKE ?` with `'%' + product + '%'` passed as data.
- Add schema validation, for example `orderListQuerySchema` with optional `product` string (max length 100).

Do not change secure order placement (`POST /`).

## Part F – Prove: Lab 2B

| Attack / use case | Expected after fix |
|---|---|
| Cross-user leak (`product` payload above) | `200` but **only Alice's** orders (no Bob keyboard order) |
| Normal filter `product=Monitor` | `200`, only Alice's orders that contain a monitor |

## Bonus (optional)

Replace the raw SQLite calls in the catalog module with **Sequelize** (or another ORM). Document:

- What the ORM parameterises automatically (`findAll`, `findByPk`, …)
- Where protection stops (`sequelize.query` with string interpolation, raw `order` from the client, passing user objects into `where`)

This is not required for a passing grade on the core lab.

## Submit

Follow your course instructions (branch name, screenshots, short write-up). Your write-up should mention **OWASP Injection** and **CWE-89** (SQL injection) in your own words, and list fixes in **three modules**: products, auth, and orders (`GET /`).

Keep brief notes: file and line of each vulnerable query, how parameterisation fixes it, and one example of input that schema validation blocks.
