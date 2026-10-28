# Lab 5 – Authorization and access control

This lab uses **ShopLab** after the Week 4 authentication fixes. You are already logged in correctly; now you check **what each user is allowed to do**. You will exploit an **insecure direct object reference (IDOR)**, call an **administrative API** that the UI hides from normal users, and escalate privileges with **mass assignment** on profile update. Then you harden the app so those attacks return errors.

> **Rule:** run ShopLab only on your own machine. Test only ShopLab and your own project, never other people's systems.

## Before you start

1. From the `shoplab/` folder: `npm run setup` (once), then `npm start`.
2. Open **http://localhost:3000**.
3. Finish [`LAB4.md`](LAB4.md) first (or check out tag **`week-5-start`** from your instructor if you need the teaching build with these bugs).
4. **Reset the database** so demo orders and roles match this lab: `npm run reset-db`, then start again.
5. Read the lecture notes on authentication vs authorization, IDOR, horizontal and vertical privilege escalation, mass assignment, deny-by-default middleware, and owner-scoped database queries.

Lab accounts:

| Email | Password | Role |
|---|---|---|
| alice@shoplab.test | alice123 | customer |
| bob@shoplab.test | bob123 | customer |
| admin@shoplab.test | admin123 | admin |

Demo orders (after reset):

| Order ID | Owner | Item |
|---|---|---|
| 1001 | Alice | 4K Monitor |
| 1002 | Bob | USB-C Hub |

## Suggested schedule (~3 hours)

| Time | Part | What you do |
|---|---|---|
| 0:00–0:30 | A | Reproduce IDOR on order detail |
| 0:30–0:55 | B | Reproduce admin API access as Bob |
| 0:55–1:20 | C | Reproduce mass assignment (`role`) |
| 1:20–1:50 | D | Fix IDOR (owner in SQL) |
| 1:50–2:15 | E | Add `requireRole` middleware for `/api/admin` |
| 2:15–2:40 | F | Fix mass assignment (allowlist + explicit UPDATE) |
| 2:40–3:00 | G | Proof table and write-up |

## What you must do

1. **Fix** the **IDOR** on `GET /api/orders/:id` by limiting the query to the **logged-in owner** (not by loading the row and checking afterwards).
2. **Protect** all routes under `/api/admin` with a **role check** in **middleware** (deny by default).
3. **Remove** the **mass-assignment** weakness on `PATCH /api/auth/me` (allow only fields the user should change, e.g. `name`).
4. **Prove** that Bob cannot read Alice's order **#1001**, cannot list users via the admin API, and cannot set `role: admin` on himself.

Run `npm test` after your changes. Smoke tests must still pass.

Stretch ideas (optional): [`LAB5-EXTENSIONS.md`](LAB5-EXTENSIONS.md).

---

## Part A – Authentication is not authorization

Logging in proves **who you are**. Authorization decides **what you may do** with that identity.

- `GET /api/orders` already returns only **your** orders (`user_id` in the query).
- `GET /api/orders/:id` returns a **single** order by numeric id.

### A1 – Log in as Bob and list orders

In the UI, log in as **Bob**. **My orders** should show order **#1002** only (USB-C Hub).

Or with curl:

```bash
curl -s -c bob.jar -H 'Content-Type: application/json' \
  -d '{"email":"bob@shoplab.test","password":"bob123"}' \
  http://localhost:3000/api/auth/login

curl -s -b bob.jar http://localhost:3000/api/orders
```

### A2 – Horizontal privilege escalation (IDOR)

Still as Bob, request **Alice's** order id:

```bash
curl -s -b bob.jar http://localhost:3000/api/orders/1001
```

Before your fix you should get **200** with Alice's monitor order (total €399.00). Bob never owned that order; he only changed the **identifier** in the URL. That is an **insecure direct object reference** — **horizontal** privilege escalation (peer user's data).

Open [`server/src/routes/orders.js`](server/src/routes/orders.js) and find `GET /:id`. Notice the SQL loads by `id` only.

### A3 – Write-up

In your notes, explain why checking `order.user_id === req.session.userId` **after** `SELECT ... WHERE id = ?` is weaker than putting `user_id` in the **same** query.

---

## Part B – Hidden admin link is not protection

The React app shows **Admin** in the nav only when `user.role === 'admin'`. Bob does not see the link.

### B1 – Call the API directly as Bob

```bash
curl -s -b bob.jar http://localhost:3000/api/admin/users
```

Before your fix you should get **200** and a JSON array of every account (emails and roles). The UI never offered Bob a button, but the **server** allowed the request. That is **vertical** privilege escalation toward an admin function.

### B2 – Compare with admin login

```bash
curl -s -c admin.jar -H 'Content-Type: application/json' \
  -d '{"email":"admin@shoplab.test","password":"admin123"}' \
  http://localhost:3000/api/auth/login

curl -s -b admin.jar http://localhost:3000/api/admin/users
```

Admin should succeed before and after your fix. Bob should be **denied** after your fix.

### B3 – Where the check belongs

Read [`server/src/app.js`](server/src/app.js). `/api/admin` uses `requireLogin` but not a **role** gate. Your fix should add middleware so **every** future admin route is protected automatically.

---

## Part C – Mass assignment on profile update

**Profile** in the UI only edits **name**. The server endpoint is `PATCH /api/auth/me`.

### C1 – Normal update

```bash
curl -s -b bob.jar -H 'Content-Type: application/json' \
  -X PATCH -d '{"name":"Robert"}' \
  http://localhost:3000/api/auth/me
```

### C2 – Privilege escalation via extra JSON fields

```bash
curl -s -b bob.jar -H 'Content-Type: application/json' \
  -X PATCH -d '{"name":"Bob","role":"admin"}' \
  http://localhost:3000/api/auth/me
```

Before your fix the response should show `"role":"admin"`. Confirm in the database or log in again and check `GET /api/auth/me`.

This is **mass assignment**: trusting the whole request body when writing to the user model. Frameworks that bind `req.body` directly into ORM updates are a common source of this bug.

---

## Part D – Fix IDOR (owner-scoped query)

In [`server/src/routes/orders.js`](server/src/routes/orders.js), change the detail query to:

```sql
SELECT * FROM orders WHERE id = ? AND user_id = ?
```

Use `req.session.userId` as the second parameter.

If no row matches, return **404** `{ "error": "Order not found" }` (same response whether the id does not exist or belongs to someone else — avoids leaking that order 1001 exists).

### Prove IDOR fix

| Request | Actor | Before fix | After fix |
|---|---|---|---|
| `GET /api/orders/1001` | Bob | 200, Alice's order | **404** |
| `GET /api/orders/1002` | Bob | 200, own order | **200** |
| `GET /api/orders/1001` | Alice | 200 | **200** |

---

## Part E – Role middleware (deny by default)

Create [`server/src/middleware/requireRole.js`](server/src/middleware/requireRole.js):

- Load the current user from the database (by `req.session.userId`).
- If `user.role` is not in the allowed list (e.g. `'admin'`), respond **403** `{ "error": "Forbidden" }`.
- Do not run the route handler when forbidden.

Wire it in [`server/src/app.js`](server/src/app.js):

```javascript
app.use('/api/admin', requireLogin, requireRole('admin'), adminRoutes);
```

Adjust the export style to match your code (factory `requireRole('admin')` or similar).

### Prove admin fix

| Request | Actor | After fix |
|---|---|---|
| `GET /api/admin/users` | Bob | **403** |
| `GET /api/admin/users` | admin | **200** |

---

## Part F – Fix mass assignment

In [`server/src/routes/auth.js`](server/src/routes/auth.js):

1. Validate the body with **`profilePatchSchema`** from [`server/src/validation/catalog.js`](server/src/validation/catalog.js) (only `name`).
2. Run an explicit `UPDATE users SET name = ? WHERE id = ?` — do **not** update `role` or `email` from the client body.

Return the same shape as `GET /api/auth/me` (role unchanged unless changed by an admin process you build later).

### Prove mass-assignment fix

```bash
curl -s -b bob.jar -H 'Content-Type: application/json' \
  -X PATCH -d '{"name":"Bob","role":"admin"}' \
  http://localhost:3000/api/auth/me
```

| Check | After fix |
|---|---|
| HTTP status | **400** (validation) or **200** with `role` still `customer` — pick one approach and document it |
| `GET /api/auth/me` as Bob | `role` is **`customer`** |
| Admin nav in UI | Still hidden for Bob |

---

## Part G – Final proof table

After **all** fixes:

| Attack | Expected |
|---|---|
| Bob `GET /api/orders/1001` | **404** (or **403** if you documented that choice) |
| Bob `GET /api/admin/users` | **403** |
| Bob `PATCH /api/auth/me` with `"role":"admin"` | Error; role unchanged |
| Alice `GET /api/orders/1001` | **200** |
| Admin `GET /api/admin/users` | **200** |
| Normal shopping and profile name change | Works |

### Short write-up (required)

In a few sentences each:

1. **Authentication vs authorization** — what Lab 4 fixed vs what Lab 5 fixes.
2. **Why UI hiding is insufficient** — use the Admin link as an example.
3. **Horizontal vs vertical escalation** — which attack in this lab is which?

## Submit

Follow your course instructions (branch, screenshots, short write-up). Mention **OWASP A01 Broken Access Control** and, in your own words, **CWE-639** (authorization bypass through user-controlled key) and **CWE-915** (improperly controlled modification of dynamically-determined attributes).

List what you changed in:

- `server/src/routes/orders.js` (IDOR)
- `server/src/middleware/requireRole.js` and `server/src/app.js` (admin routes)
- `server/src/routes/auth.js` and `server/src/validation/catalog.js` (profile PATCH)

## Bonus (optional)

See [`LAB5-EXTENSIONS.md`](LAB5-EXTENSIONS.md) for policy helpers, audit logs, and more IDOR ideas.
