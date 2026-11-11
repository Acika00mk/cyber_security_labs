# Lab 7 – Extension ideas

Optional stretch work after you finish [`LAB7.md`](LAB7.md). Do not attack any system you do not own.

---

## 1. Request IDs on every security event

Middleware assigns `req.id` (UUID). Include it on `securityLog` lines and on generic error JSON. Do not treat it as a session token.

## 2. Admin login as a sensitive success

Log `auth.login_success` with `role` (not the password) so overnight admin logins stand out. Still log failures for **all** accounts without user enumeration in the **HTTP** response.

## 3. Negative tests

Add tests that:

- failed login does not include `password` in anything passed to `console.log`
- Bob’s `GET /api/orders/1001` emits `authorization.denied`
- `AUTHZ_UNAVAILABLE=1` returns **503** for `/api/admin/users`

## 4. Password-change and admin actions

If you add `POST /api/auth/password` or an admin “disable user” route, log `auth.password_changed` / `admin.user_disabled` with actor and target ids only.

## 5. Redaction helper

Central `redact(obj)` that strips keys matching `/password|token|authorization|cookie|card/i` before any log. Unit-test it.

## 6. Alert rule (paper)

Write a one-page rule: “15 `auth.login_failed` for the same `actorId` in 2 minutes → page the on-call.” No need to run a real SIEM.

## 7. Release checklist dry-run

Print the lecture production checklist and tick what ShopLab actually meets on localhost vs what you would still block for a public deploy.
