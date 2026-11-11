# Lab 7 – Logging, safe failure and releasing

This lab uses **ShopLab** after the Week 6 configuration fixes. The shop still **does not record security events**, **logs a password** on login, and **fails open** when a role check throws. You will add structured security logs, remove the unsafe log, fail closed when authorization cannot be verified, and produce a **prioritised list of every finding from the semester**.

> **Rule:** run ShopLab only on your own machine. Test only ShopLab and your own project, never other people's systems.

## Before you start

1. From the `shoplab/` folder: `npm run setup` (once), then `npm start`.
2. Open **http://localhost:3000**.
3. Finish [`LAB6.md`](LAB6.md) first (or check out tag **`week-7-start`** from your instructor if you need the teaching build with Lab 7 bugs only).
4. Read [`WEEK7-SLIDES.md`](WEEK7-SLIDES.md) on what to log, what never to log, fail closed, and release checklists.

Lab accounts (same as earlier labs):

| Email | Password | Role |
|---|---|---|
| alice@shoplab.test | alice123 | customer |
| bob@shoplab.test | bob123 | customer |
| admin@shoplab.test | admin123 | admin |

Demo orders (after `npm run reset-db` if needed):

| Order ID | Owner |
|---|---|
| 1001 | Alice |
| 1002 | Bob |

## Suggested schedule (~3 hours)

| Time | Part | What you do |
|---|---|---|
| 0:00–0:25 | A | Unsafe login log in the terminal |
| 0:25–0:55 | B | Access log vs security events |
| 0:55–1:20 | C | Fail-open role check (`AUTHZ_UNAVAILABLE=1`) |
| 1:20–2:10 | D | Implement logs + fail closed |
| 2:10–2:50 | E | Prioritised semester findings |
| 2:50–3:00 | F | Proof table and write-up |

## What you must do

1. **Add security logging** for **login** (`auth.login_failed`, `auth.login_success`) and **access-control** denials (`authorization.denied` on admin 403 and on Bob reading Alice’s order).
2. **Remove** the unsafe login `console.log` that prints **passwords** (and do not log tokens or session cookies).
3. **Change** the fail-open `catch` in [`server/src/middleware/requireRole.js`](server/src/middleware/requireRole.js) so a failed role lookup **stops** the request (prefer **503** when the permission check cannot complete).
4. **Produce** a prioritised list of **every finding from the semester** (Weeks 2–7), plus one plain-language remaining-risk paragraph.

Run `npm test` after your changes. The Lab 7 smoke tests expect the **teaching** build (password in the login log; Bob reaches `/api/admin/users` when `AUTHZ_UNAVAILABLE=1`). After your fail-closed and log fixes those two tests should fail until you update them (or your instructor provides patched tests).

Stretch ideas: [`LAB7-EXTENSIONS.md`](LAB7-EXTENSIONS.md).

---

## Part A – A password in the log

### A1 – Watch the server terminal

Keep `npm start` in a visible terminal. Log in as Alice in the browser, or:

```bash
curl -s -H 'Content-Type: application/json' \
  -d '{"email":"alice@shoplab.test","password":"alice123"}' \
  http://localhost:3000/api/auth/login | jq
```

You should see a line like `[auth] login attempt` that includes **`alice123`**.

### A2 – Find it

Read [`server/src/routes/auth.js`](server/src/routes/auth.js). That log is the Lab 7 teaching defect. Logs are a second copy of secrets: anyone with log access gets the password.

### A3 – Write-up

Note why `email` in a security event can be acceptable while `password`, `Authorization`, and `shoplab.sid` cookie **values** are not.

---

## Part B – Would we see an attack?

[`server/src/middleware/requestLog.js`](server/src/middleware/requestLog.js) prints method, path, status, origin, and whether a session cookie was **present**. That is an access log, not an audit log.

### B1 – Failed login

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H 'Content-Type: application/json' \
  -d '{"email":"admin@shoplab.test","password":"wrong"}' \
  http://localhost:3000/api/auth/login
```

The access log shows `POST /api/auth/login 401`. It does **not** say which account, or that this was `auth.login_failed`.

### B2 – Access denied (IDOR still blocked)

```bash
curl -s -c bob.jar -H 'Content-Type: application/json' \
  -d '{"email":"bob@shoplab.test","password":"bob123"}' \
  http://localhost:3000/api/auth/login >/dev/null

curl -s -o /dev/null -w "%{http_code}\n" -b bob.jar http://localhost:3000/api/orders/1001
curl -s -o /dev/null -w "%{http_code}\n" -b bob.jar http://localhost:3000/api/admin/users
```

Expect **404** (order) and **403** (admin). The access log looks like ordinary traffic. There is no `authorization.denied` event, no actor, no resource id.

### B3 – Write-up

Would Lab 4 brute force or Lab 5 IDOR probing be visible **after** those bugs were fixed? What field would you add first?

---

## Part C – Fail open

[`requireRole.js`](server/src/middleware/requireRole.js) wraps the role lookup in `try/catch` and calls **`next()`** on error (allow the request). `AUTHZ_UNAVAILABLE=1` throws on purpose so you can demo an outage.

### C1 – Reproduce

Stop the server. Start with the flag:

```bash
AUTHZ_UNAVAILABLE=1 npm start
```

As Bob:

```bash
curl -s -c bob.jar -H 'Content-Type: application/json' \
  -d '{"email":"bob@shoplab.test","password":"bob123"}' \
  http://localhost:3000/api/auth/login >/dev/null

curl -s -b bob.jar http://localhost:3000/api/admin/users | jq
```

You should get **200** and a user list. Authentication succeeded; authorization **failed to run** and was treated as permission.

### C2 – Write-up

What status should a client see when you cannot complete the check: **403** (denied) vs **503** (dependency down)? The lecture default for this outage is **fail closed with 503**.

Unset the flag when you go back to normal work (`Ctrl+C`, then `npm start`).

---

## Part D – Implement

Suggested helper (name and keys may vary; keep them consistent):

```js
// server/src/lib/securityLog.js
function securityLog(fields) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    ...fields,
  }));
}
```

Minimum events:

| Event | When |
|---|---|
| `auth.login_failed` | Wrong password or unknown user (same client message as today) |
| `auth.login_success` | After credentials verify |
| `authorization.denied` | Admin role rejection; order exists but **not owner** (still return **404**) |
| `authorization.check_failed` | Role lookup threw (then **503**, do not call `next()`) |

Rules: no passwords, tokens, session ids, or full `req.body` on login. `actorId` / resource id are enough.

Remove the `[auth] login attempt` line.

Keep Lab 5 behaviour: Bob still gets **404** for order 1001 and **403** for admin when `AUTHZ_UNAVAILABLE` is unset.

---

## Part E – Prioritised findings (semester)

Build a table covering **Weeks 2–7** (SQL injection, XSS/CSRF, auth, IDOR/roles/mass assignment, SSRF/uploads/errors/config, logging/fail-open). Include issues you fixed **and** anything still open.

| ID | Week | Finding | Severity (Low–Critical) | Business impact | Rank | Status |
|---|---|---|---|---|---|---|
| F1 | | | | | 1 | fixed / leftover |

Then write **5–10 sentences** a non-technical product owner could read:

- What could still go wrong?
- Who is affected?
- How plausible is it on localhost vs a public shop?
- What should happen before a real release?
- What risk remains after your Lab 7 fixes?

There is no single correct ranking. You must **defend** blockers vs later work. A public IDOR or fail-open admin path is normally a release blocker; a missing header on a demo page is not.

---

## Part F – Proof table

| Check | Teaching build | After your fix |
|---|---|---|
| Login as Alice; server log | Password visible | No password / token |
| Wrong password | Access log 401 only | + `auth.login_failed` JSON |
| Bob `GET /api/orders/1001` | 404, no audit event | 404 + `authorization.denied` |
| Bob `GET /api/admin/users` | 403 | 403 + `authorization.denied` |
| `AUTHZ_UNAVAILABLE=1`, Bob admin list | **200** | **503** (or documented 403), request **stops** |
| `npm test` | Pass on teaching smokes | Update the two Lab 7 smokes; rest still pass |

---

## Mapping to standards

- **OWASP A09** Security Logging and Monitoring Failures
- **CWE-532** Insertion of sensitive information into log files
- **CWE-755** / fail-open authorization
- Release readiness: OWASP logging and error-handling cheat sheets (see lecture)

Submit: proof table, file list, structured log examples (redacted), findings table, remaining-risk paragraph.
