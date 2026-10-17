# Lab 4 – Extension ideas

Optional stretch work after you finish [`LAB4.md`](LAB4.md). These are **suggestions**, not required deliverables. Do not attack any system you do not own.

---

## 1. Argon2id instead of bcrypt

Replace bcrypt with **argon2id** (memory-hard). Tune memory, iterations, and parallelism for a lab laptop (keep login under ~500 ms). Document why argon2 resists GPU/ASIC cracking better than SHA-based hashes. Packages to explore: `argon2` (native) — note build tools may be needed on some machines.

## 2. Constant-time-ish login

Even with identical JSON errors, skipping bcrypt when the email is unknown leaks via **timing**. Always run a compare against a dummy hash when the user is missing. Measure before/after with a few curl timings (expect noise; discuss limits of timing on localhost).

## 3. Password-reset flow (single-use tokens)

Add:

- `POST /api/auth/forgot-password` — always returns the same message whether the email exists.
- A `password_reset_tokens` table: store a **hash** of the token, `user_id`, `expires_at`, `used_at`.
- `POST /api/auth/reset-password` with token + new password — reject reused or expired tokens.

**Email simulation:** instead of SMTP, add a tiny second Node app (like [`demo-origin/`](demo-origin/)) on another port that shows “inbox” messages containing the reset link. ShopLab “sends” mail by HTTP POST to that app. Same pattern works for **magic-link login** (passwordless): one-time link creates a session instead of setting a password.

Teaching bugs to fix: reusable tokens, long/no expiry, token in query string logged by proxies, account enumeration on forgot-password.

## 4. Multi-factor authentication (TOTP)

Sketch or implement a second factor with TOTP (`otplib` / similar):

- Enrolment stores a secret per user (encrypt at rest if you can).
- Login succeeds only after password **and** a valid 6-digit code.
- Discuss backup codes and phishing-resistant alternatives (WebAuthn) at a high level.

## 5. Account lockout vs rate limiting

Compare **per-IP rate limits**, **per-account lockout**, and **progressive delays**. What happens if an attacker lockouts Alice by spamming her email? What about distributed credential stuffing from many IPs?

## 6. Refresh tokens and logout

If you keep short-lived access JWTs:

- Issue a refresh token (httpOnly cookie or one-time DB row).
- Rotate refresh tokens; invalidate on logout.
- Discuss why “stateless JWT forever” makes revocation hard.

## 7. Secrets hygiene

- Confirm `JWT_SECRET` and `SESSION_SECRET` are **not** committed.
- Generate long random secrets for a “production-like” `.env`.
- Search the repo for leftover hardcoded secrets after Lab 4.

## 8. Drop the plaintext `password` column

Older ShopLab builds kept a plaintext `password` column for SQL injection demos. If it still exists in your schema, remove it from schema/seed/migrations and prove a dump no longer shows cleartext passwords.

## 9. CSRF on every mutating route

Lab 3 required CSRF on reorder. Extend `requireCsrf` to place-order, reviews, logout, and any new auth POSTs (except login / forgot-password as designed). Update [`client/src/api.js`](client/src/api.js) and smoke tests.

## 10. Credential stuffing demo (local only)

Build a short wordlist of lab-like passwords and a script that tries them against `POST /api/auth/login` **only on localhost**. Show how rate limiting + MFA change the outcome. Never point this at other hosts.
