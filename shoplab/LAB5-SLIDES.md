# Week 5 – Authorization and access control (slide content)

Use one `##` heading per slide. Speaker notes are in blockquotes.

---

## Week 5: Authorization and access control

ShopLab Lab 5

- Authentication vs authorization
- IDOR and owner-scoped queries
- Admin routes and role middleware
- Mass assignment
- Horizontal and vertical privilege escalation

> Welcome back. Lab 4 answered “who are you?” Today: “what are you allowed to do?”

---

## Learning outcomes

By the end of this session you can:

- Explain why login alone does not protect data
- Find and fix one IDOR in an API
- Protect administrative routes with middleware
- Stop mass assignment on profile updates
- Demonstrate three blocked attacks with curl or the proxy

> Students submit a proof table; code changes are small but concepts carry to every backend.

---

## Authentication vs authorization

| Question | Mechanism | Lab |
|---|---|---|
| Who are you? | Password, session, JWT | Lab 4 |
| What may you do? | Roles, ownership, policies | Lab 5 |

> Analogy: building pass (auth) vs which rooms your pass opens (authz).

---

## Broken access control (OWASP A01)

Common patterns:

- Changing an id in a URL or JSON body
- Calling `/api/admin/...` without a role check
- Sending extra fields the server writes to the database
- Assuming the UI is the security boundary

> #1 on many OWASP Top 10 lists; often easy to exploit, easy to prevent with discipline.

---

## Insecure direct object reference (IDOR)

```
GET /api/orders/1002   → Bob's order   OK
GET /api/orders/1001   → Alice's order  BUG if Bob is logged in
```

The server trusted the **id** from the client and did not tie it to **user_id**.

> “Direct object reference” = primary key or file name in the request.

---

## Fix IDOR: limit the query to the owner

**Weak:** `SELECT * FROM orders WHERE id = ?` then `if (order.user_id !== me)`.

**Strong:** `SELECT * FROM orders WHERE id = ? AND user_id = ?`.

No row → **404** “Order not found”.

> One round-trip; no branch that leaks “exists but not yours” if you standardise on 404.

---

## Security through obscurity fails

ShopLab React app:

- Shows **Admin** link only when `role === 'admin'`
- Bob never sees the link

Bob can still:

```http
GET /api/admin/users
Cookie: shoplab.sid=...
```

> Every sensitive action must be enforced on the **server**. The UI is hints for honest users only.

---

## Deny by default + middleware

Stack for admin routes:

1. `requireLogin` — must be authenticated
2. `requireRole('admin')` — must have role
3. Route handler

Mount on the **router** in `app.js` so new admin endpoints inherit protection.

> “Deny by default” = missing check means forbidden, not allowed.

---

## Mass assignment

UI sends: `{ "name": "Robert" }`

Attacker sends: `{ "name": "Robert", "role": "admin" }`

Server bug: updates every column from `req.body`.

**Fix:** allowlist (Zod schema) + explicit `UPDATE` of allowed columns only.

> Same class of bug as binding request JSON directly into ORM `.update(req.body)`.

---

## Horizontal vs vertical escalation

| Type | Meaning | Lab example |
|---|---|---|
| Horizontal | Access **peer** data | Bob reads Alice's order |
| Vertical | Gain **higher** privileges | Bob lists all users or sets `role: admin` |

> Both are authorization failures; fixes differ (ownership vs role).

---

## Lab 5 walkthrough

1. `npm run reset-db` — demo orders **1001** / **1002**
2. Reproduce three attacks as Bob
3. Fix order detail query
4. Add `requireRole` on `/api/admin`
5. Allowlist `PATCH /api/auth/me`
6. Fill proof table; run `npm test`

> ~3 hours; curl-first, then optional Burp.

---

## Demo: IDOR (before fix)

```bash
# Login Bob, then:
curl -b bob.jar http://localhost:3000/api/orders/1001
```

Expect Alice's monitor line items — discuss impact (PII, purchase history).

> After fix: 404 for Bob, 200 for Alice.

---

## Demo: admin API (before fix)

```bash
curl -b bob.jar http://localhost:3000/api/admin/users
```

JSON list of emails and roles — vertical escalation.

> After fix: 403 Forbidden.

---

## Demo: mass assignment (before fix)

```bash
curl -b bob.jar -X PATCH -H 'Content-Type: application/json' \
  -d '{"name":"Bob","role":"admin"}' \
  http://localhost:3000/api/auth/me
```

Reload profile / `GET /api/auth/me` — Bob is admin in DB.

> After fix: role stays `customer`.

---

## Files students touch

- `server/src/routes/orders.js`
- `server/src/routes/auth.js`
- `server/src/middleware/requireRole.js` (new)
- `server/src/app.js`
- `server/src/validation/catalog.js`

> Point them to `// Lab 5 teaching build:` comments in the starter repo.

---

## Mapping to standards

- **OWASP A01** Broken Access Control
- **CWE-639** Authorization bypass through user-controlled key (IDOR)
- **CWE-915** Mass assignment

> Link to your course submission template and branch naming.

---

## Recap and next steps

- Authorization belongs in the **API**, not the UI
- Prefer **owner in SQL** over load-then-check
- **Middleware** for roles; **schemas** for writable fields
- Optional: [`LAB5-EXTENSIONS.md`](LAB5-EXTENSIONS.md)

> Q&A; office hours for `requireRole` and Zod allowlists.
