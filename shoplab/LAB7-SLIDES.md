# Week 7 – Logging, safe failure and releasing (Lab slide content)

Use one `##` heading per slide. Speaker notes are in blockquotes.

---

## Week 7: Logging and fail closed

ShopLab Lab 7

- Security events vs access logs
- Never log passwords or tokens
- Fail closed when authz cannot run
- Rank every semester finding before “release”

> Lab 6 hardened **configuration**. Today: **visibility** and **safe failure**. Full steps: [`LAB7.md`](LAB7.md). Lecture: [`WEEK7-SLIDES.md`](WEEK7-SLIDES.md).

---

## Learning outcomes

By the end of this lab session you can:

- Show a password appearing in the server log, then remove that line
- Explain why `POST /login 401` is not an audit event
- Demo fail-open admin access with `AUTHZ_UNAVAILABLE=1`
- Add structured `auth.*` and `authorization.*` logs
- Prioritise semester findings in plain language

> Must-do is four items, not a new UI. Curl + the terminal are enough.

---

## Start here

1. `cd shoplab && npm run setup && npm start`
2. Open **http://localhost:3000**
3. Tag **`week-7-start`** if you need Lab 6 fixed + Lab 7 bugs
4. Accounts: alice / bob / admin (same passwords as always)

> ~3 hours. Watch the **server** terminal, not only the browser.

---

## Part A – Unsafe log

```bash
curl -s -H 'Content-Type: application/json' \
  -d '{"email":"alice@shoplab.test","password":"alice123"}' \
  http://localhost:3000/api/auth/login
```

Teaching build prints `[auth] login attempt` with **`password: alice123`**.

Fix: delete it. Never log `Authorization` or cookie values either.

> File: [`server/src/routes/auth.js`](server/src/routes/auth.js). Logs are a second breach if leaked.

---

## Part B – Access log is not enough

[`requestLog.js`](server/src/middleware/requestLog.js) → method, path, status.

Missing for investigation:

- which account failed login
- that Bob probed order **1001**
- that admin API returned **403**

> Successful IDOR (Lab 5, before the fix) would have been HTTP 200. Logs complement controls.

---

## Demo: denials look ordinary

```bash
# Bob
curl -s -o /dev/null -w "%{http_code}\n" -b bob.jar http://localhost:3000/api/orders/1001
curl -s -o /dev/null -w "%{http_code}\n" -b bob.jar http://localhost:3000/api/admin/users
```

404 and 403. No `authorization.denied`, no `actorId`, no resource.

> Students should design the JSON event before coding (lecture exercise).

---

## Part C – Fail open

`requireRole` `catch` calls **`next()`**.

```bash
AUTHZ_UNAVAILABLE=1 npm start
# Bob GET /api/admin/users → 200
```

Failure to **check** became **permission**.

> Lecture: fail closed, often **503** if the permission service is down. Restart without the env var afterwards.

---

## Part D – What to implement

| Event | Place |
|---|---|
| `auth.login_failed` / `_success` | `auth.js` |
| `authorization.denied` | `requireRole` 403; order not-owner (still 404) |
| `authorization.check_failed` | `requireRole` catch → **stop** with 503 |

Helper: small `securityLog()` JSON line. Consistent keys.

> Do not change IDOR status codes. Do not log secrets “for debugging”.

---

## Structured log shape

```json
{
  "timestamp": "2026-11-08T10:30:00Z",
  "event": "auth.login_failed",
  "actorId": 1,
  "reason": "invalid_credentials",
  "outcome": "denied"
}
```

Same keys every time so you can grep `event=`.

> Optional stretch: `requestId` on every event ([`LAB7-EXTENSIONS.md`](LAB7-EXTENSIONS.md)).

---

## Part E – Semester ranking

Table: id, week, finding, severity, business impact, rank, fixed/leftover.

Then **one paragraph** for a product owner: what could happen, who is hurt, how likely, what to do, what remains.

> No unique correct order. Blockers (IDOR, fail-open admin, SQLi) vs later (missing header). Defend it.

---

## Proof table

| After fix | Expect |
|---|---|
| Login log | No password |
| Failed login | `auth.login_failed` |
| Bob → order 1001 | 404 + denied event |
| `AUTHZ_UNAVAILABLE=1` Bob admin | **not** 200 |
| `npm test` | Update two Lab 7 smokes |

> Teaching smokes assert the **bugs**. After the fix they should fail until patched.

---

## Recap

- Log **security** events without secrets
- Access logs do not reconstruct attacks
- Authz errors **fail closed**
- Rank leftover risk before you would ship

Optional: [`LAB7-EXTENSIONS.md`](LAB7-EXTENSIONS.md)

> Submit: proof table, redacted log lines, findings table, remaining-risk paragraph.
