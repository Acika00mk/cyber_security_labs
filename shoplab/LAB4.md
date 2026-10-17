# Lab 4 – Authentication

This lab uses **ShopLab** after the Week 3 XSS/CSRF/cookie/CSP fixes. You will inspect a **weak password database**, exploit **user enumeration** and **unlimited password guessing**, forge a **JWT** that the server trusts without verifying, then harden the app so those attacks fail. You will also add **rate limiting** on login.

> **Rule:** run ShopLab only on your own machine. Test only ShopLab and your own project, never other people's systems.

## Before you start

1. From the `shoplab/` folder: `npm run setup` (once), then `npm start`.
2. Open **http://localhost:3000**.
3. If you still have Week 3 vulnerabilities in your branch, finish [`LAB3.md`](LAB3.md) first (or check out tag `week-4-start` from your instructor).
4. Reset the database so seeds match this teaching build: `npm run reset-db`, then start again.
5. Read the lecture notes on password hashing (bcrypt / argon2), why MD5/SHA-* are wrong for passwords, sessions vs JWTs, token verification, rate limiting, and MFA at a high level.

**Note:** Lab 2 may already have introduced bcrypt. This teaching build **intentionally uses weak SHA-256 hashing again** so you can study breach dumps and work factors.

Lab accounts:

| Email | Password |
|---|---|
| alice@shoplab.test | alice123 |
| bob@shoplab.test | bob123 |

## Suggested schedule (~3 hours)

| Time | Part | What you do |
|---|---|---|
| 0:00–0:25 | A | Inspect the password database (breach look) |
| 0:25–0:45 | B | Reproduce enumeration + unlimited guessing |
| 0:45–1:15 | C | Fix hashing with bcrypt and re-seed |
| 1:15–1:30 | D | Make login responses identical |
| 1:30–1:55 | E | Reproduce the edited JWT attack |
| 1:55–2:25 | F | Verify JWTs properly (signature + expiry + env secret) |
| 2:25–2:45 | G | Add rate limiting on login |
| 2:45–3:00 | H | Write-up and submit |

## What you must do

1. **Replace** weak password hashing with **bcrypt** (cost factor around 10) in seed and login.
2. **Make** login responses **identical** for unknown email and wrong password (same status and message).
3. **Verify** JWTs with `jwt.verify`, add an **expiry**, and load the signing secret from **`JWT_SECRET`** in the environment (not hardcoded in source).
4. **Add** rate limiting on `POST /api/auth/login` (for example with [`express-rate-limit`](https://www.npmjs.com/package/express-rate-limit)).
5. **Prove** that password guessing is throttled and that an edited JWT no longer grants access.

Run `npm test` after your changes. Smoke tests must still pass.

Stretch ideas (optional): [`LAB4-EXTENSIONS.md`](LAB4-EXTENSIONS.md).

---

## Part A – What a password database looks like after a breach

ShopLab stores users in SQLite (`server/data/shoplab.db` after first start).

### A1 – Dump hashes

With the server stopped or using a copy of the DB file, inspect the `users` table. Example with Node (from `shoplab/server/` after the DB exists):

```bash
node --disable-warning=ExperimentalWarning -e "
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/shoplab.db');
console.log(db.prepare('SELECT id, email, password_hash FROM users').all());
"
```

### A2 – Recognise the algorithm

Each `password_hash` should look like a **64-character hex** string. That is **unsalted SHA-256**, not bcrypt (bcrypt hashes start with `$2a$` / `$2b$`).

Compute Alice's hash and compare:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('alice123').digest('hex'))"
```

### A3 – Write-up

In your notes, explain briefly:

- Why **MD5, SHA-1, and SHA-256** are the wrong choice for password storage (fast, GPU-friendly, no work factor; unsalted hashes collide across users with the same password).
- What **salt** and **work factor** give you with bcrypt or argon2.

---

## Part B – Enumeration and unlimited guessing

### B1 – Different error messages

```bash
curl -s -H 'Content-Type: application/json' \
  -d '{"email":"nobody@shoplab.test","password":"x"}' \
  http://localhost:3000/api/auth/login

curl -s -H 'Content-Type: application/json' \
  -d '{"email":"alice@shoplab.test","password":"wrong"}' \
  http://localhost:3000/api/auth/login
```

Before your fix you should see **two different** error strings (one reveals that the account does not exist; the other that it does).

### B2 – Password guessing with no throttle

```bash
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -s -o /dev/null -w "$i %{http_code}\n" -H 'Content-Type: application/json' \
    -d '{"email":"alice@shoplab.test","password":"guess'"$i"'"}' \
    http://localhost:3000/api/auth/login
done
```

Every attempt should return **401** with no slowdown. That is an online **brute-force** / **credential-stuffing** opportunity.

---

## Part C – Fix password hashing (bcrypt)

Files to change:

- [`server/src/db.js`](server/src/db.js) — seed users with `bcrypt.hashSync(password, 10)` (or async equivalent).
- [`server/src/routes/auth.js`](server/src/routes/auth.js) — verify with `bcrypt.compareSync` (or `compare`) against `password_hash`.

`bcryptjs` is already a dependency.

After changing the seed, **reset the database** so hashes are rewritten:

```bash
npm run reset-db
npm start
```

### Prove hashing

| Check | Expected |
|---|---|
| Dump `password_hash` again | Values look like `$2a$10$…` or `$2b$10$…` |
| Login with `alice123` | Still `200` |
| SHA-256 of `alice123` equals DB hash? | No |

---

## Part D – Identical login responses

In [`server/src/routes/auth.js`](server/src/routes/auth.js), use **one** failure path for “no user” and “wrong password”, for example:

```json
{ "error": "Invalid email or password" }
```

with HTTP **401** in both cases.

Optional hardening: when the user is missing, still run a bcrypt compare against a dummy hash so response **timing** is closer (mention this in your write-up even if you skip the code).

### Prove enumeration fix

Repeat the two curls from B1. Bodies and status codes must match.

---

## Part E – Reproduce the edited JWT

On successful login the API also returns a **`token`** field (JWT). Cookie sessions still power the React UI; the JWT is for `Authorization: Bearer` access to protected APIs (for example `GET /api/orders`).

### E1 – Get a token as Alice

```bash
curl -s -H 'Content-Type: application/json' \
  -d '{"email":"alice@shoplab.test","password":"alice123"}' \
  http://localhost:3000/api/auth/login
```

Copy `token`. Decode the middle (payload) segment at [jwt.io](https://jwt.io) (paste **only** lab tokens) or with:

```bash
node -e "const t=process.argv[1].split('.')[1]; console.log(Buffer.from(t,'base64url').toString())" "$TOKEN"
```

You should see `userId` (Alice is `1`) and **no** `exp` claim.

### E2 – Place an order as Bob (so there is something to steal)

Log in as Bob in the browser, buy something, or use curl with Bob’s session. Confirm Bob has at least one order under **My orders**.

### E3 – Forge the token

The teaching middleware in [`server/src/middleware/requireLogin.js`](server/src/middleware/requireLogin.js) uses **`jwt.decode`** — it does **not** verify the signature. Build a token whose payload has `"userId": 2` (Bob). You can keep Alice’s header, change the payload, and leave any signature string; `decode` will still trust `userId`.

Example helper (run locally; replace `PAYLOAD_B64` with your edited base64url payload, keep Alice’s header segment):

```bash
# HEADER.PAYLOAD.SIGNATURE — signature can be garbage when the server only decodes
FORGED="$HEADER.$EDITED_PAYLOAD.forged"
curl -s -H "Authorization: Bearer $FORGED" http://localhost:3000/api/orders
```

Before your fix you should see **Bob’s** orders (not Alice’s), without knowing Bob’s password.

Also open [`server/src/routes/auth.js`](server/src/routes/auth.js) and find the **hardcoded** JWT secret in source.

---

## Part F – Verify tokens properly

1. In `requireLogin.js`, use **`jwt.verify(token, secret)`** instead of `jwt.decode`. Reject invalid or expired tokens with `401`.
2. When issuing the token in `auth.js`, pass `{ expiresIn: '1h' }` (or similar) to `jwt.sign`.
3. Read the secret from `process.env.JWT_SECRET` (see [`.env.example`](.env.example)). Do not leave `'shoplab-jwt-secret'` in source.
4. Copy `.env.example` to `.env` if needed and set a lab value for `JWT_SECRET`.

### Prove JWT fix

| Attack / check | Expected |
|---|---|
| Edited / forged Bearer token on `GET /api/orders` | `401` |
| Fresh login token on `GET /api/orders` | `200`, **your** orders only |
| Cookie session login in the UI | Still works |

---

## Part G – Rate limiting

Install and wire [`express-rate-limit`](https://www.npmjs.com/package/express-rate-limit) on **`POST /api/auth/login`** only (for example max 5–10 attempts per 15 minutes per IP).

```bash
cd server && npm install express-rate-limit
```

Return **429** when the limit is exceeded. Disable or raise the limit when `NODE_ENV=test` (or equivalent) so `npm test` still passes.

### Prove rate limit

```bash
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "$i %{http_code}\n" -H 'Content-Type: application/json' \
    -d '{"email":"alice@shoplab.test","password":"guess'"$i"'"}' \
    http://localhost:3000/api/auth/login
done
```

Later attempts should be **429**. A normal login from a fresh client / after the window should still work when under the limit (restart the server to clear the in-memory counter if needed).

---

## Part H – Final proof table

After **all** fixes:

| Attack | Expected |
|---|---|
| Dump `password_hash` | bcrypt (`$2a$` / `$2b$`), not 64-char hex SHA-256 |
| Unknown email vs wrong password | Same `401` body |
| Burst of wrong passwords | Eventually `429` |
| Edited JWT on `GET /api/orders` | `401` |
| Valid JWT or session | Own data only; UI login still works |

### Short write-up (required)

In a few sentences each:

1. **Sessions vs JWTs** — what each gives you and what each costs (revocation, storage, CSRF vs XSS token theft).
2. **MFA** — explain simply what a second factor adds against password stuffing (no code required).

## Submit

Follow your course instructions (branch, screenshots, short write-up). Mention **OWASP A07 Identification and Authentication Failures** and relevant weaknesses (**CWE-916** weak password hash, **CWE-307** brute force, **CWE-347** improper verification of cryptographic signature) in your own words.

List what you changed in:

- `server/src/db.js` (hashing at seed)
- `server/src/routes/auth.js` (verify, messages, JWT issue)
- `server/src/middleware/requireLogin.js` (verify Bearer tokens)
- `server/package.json` (rate-limit dependency)
- `.env` / `.env.example` (`JWT_SECRET`)

## Bonus (optional)

See [`LAB4-EXTENSIONS.md`](LAB4-EXTENSIONS.md) for password reset, argon2, MFA sketches, and more.
