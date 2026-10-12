# Lab 3 – Cross-site scripting, CSRF, cookies, and CSP

This lab uses **ShopLab** after the Week 2 SQL injection fixes. You will exploit **stored cross-site scripting (XSS)**, **cross-site request forgery (CSRF)**, and weak **session cookie** settings, then harden the app so those attacks fail. You will also add a **Content Security Policy (CSP)** as a safety net.

> **Rule:** run ShopLab only on your own machine. Test only ShopLab and your own project, never other people's systems.

## Before you start

1. From the `shoplab/` folder: `npm run setup` (once), then `npm start`.
2. Open **http://localhost:3000**.
3. If you still have Week 2 SQL injection in your branch, finish [`LAB2.md`](LAB2.md) first (or check out tag `week-3-start` from your instructor).
4. Read the lecture notes on reflected, stored, and DOM XSS; React escaping; `dangerouslySetInnerHTML`; CSRF; cookie flags; and CSP.

Lab accounts:

| Email | Password |
|---|---|
| alice@shoplab.test | alice123 |
| bob@shoplab.test | bob123 |

## Suggested schedule (~3 hours)

| Time | Part | What you do |
|---|---|---|
| 0:00–0:25 | A | Reproduce stored XSS (Bob → Alice) |
| 0:25–0:40 | B | Tie-in: XSS types; React vs raw HTML |
| 0:40–1:10 | C | Fix stored XSS and prove it |
| 1:10–1:35 | D | Reproduce CSRF with `demo-origin` |
| 1:35–2:05 | E | Add CSRF tokens and wire the client |
| 2:05–2:25 | F | Fix session cookie flags (`HttpOnly`, etc.) |
| 2:25–2:45 | G | Add CSP and prove scripts are blocked |
| 2:45–3:00 | H | Write-up and submit |

## What you must do

1. **Find and fix** one **stored XSS** vulnerability (product reviews).
2. **Find and fix** one **CSRF** weakness (`POST /api/orders/reorder`).
3. Set **correct session cookie flags** on `shoplab.sid` (`HttpOnly`; keep `SameSite` and `Secure` appropriate for localhost).
4. Add a **Content Security Policy** header on HTML responses.
5. **Prove** that stored XSS, CSRF reorder, and cookie theft via `document.cookie` no longer work as demonstrated in class.

Run `npm test` after your changes. Smoke tests must still pass.

---

## Part A – Reproduce stored XSS

Product pages now have **Reviews**. The UI says reviews support “simple HTML”. The server stores whatever text you post; the client renders it as HTML.

### A1 – Post a review as Bob

Log in as **Bob**. Open **Products**, expand **Reviews** on the **4K Monitor**, and post:

```html
<img src=x onerror="alert('XSS from Bob')">
```

Or use curl:

```bash
curl -s -c jar -b jar -H 'Content-Type: application/json' \
  -d '{"email":"bob@shoplab.test","password":"bob123"}' \
  http://localhost:3000/api/auth/login

curl -s -b jar -H 'Content-Type: application/json' \
  -d '{"body":"<img src=x onerror=\"alert(1)\">"}' \
  http://localhost:3000/api/products/3/reviews
```

### A2 – Trigger as Alice

Log out. Log in as **Alice**. Open **Products** → **4K Monitor** → **Reviews**.

Before your fix, the alert runs in Alice's browser. Explain why this is **stored** XSS (payload lives in the database) and whose origin the script runs in.

### A3 – Session cookie readable from JavaScript (optional)

While the session cookie is not `HttpOnly`, try a payload that shows cookies:

```html
<img src=x onerror="alert(document.cookie)">
```

You should see `shoplab.sid=…`. Discuss what an attacker could do with that value versus using `fetch('/api/orders')` from the same page.

### A4 – Contrast: search box (reflected, escaped)

On **Products**, search for:

```text
<img src=x onerror="alert(1)">
```

React shows the text safely in the UI (and the API returns normal JSON). Note the difference from reviews.

---

## Part B – Understand the vulnerable code

Locate:

- [`client/src/pages/Products.jsx`](client/src/pages/Products.jsx) – `dangerouslySetInnerHTML`
- [`server/src/routes/reviews.js`](server/src/routes/reviews.js) – stores `body` as-is (that is OK if the client never interprets it as HTML)

Checklist for your write-up:

- [ ] Stored vs reflected vs DOM XSS – which applies here?
- [ ] What does React do by default when you write `{review.body}`?
- [ ] Why is sanitisation only needed if you **must** allow some HTML?

---

## Part C – Fix stored XSS

**Goal:** reviews display as plain text (or are sanitised if you keep HTML — bonus only).

Recommended fix:

- Remove `dangerouslySetInnerHTML`.
- Render `{review.body}` inside a normal element (React escapes HTML entities).

Optional bonus: use a library such as [DOMPurify](https://github.com/cure53/DOMPurify) if you intentionally keep a subset of HTML.

Do **not** weaken review validation on the server for this lab; the main bug is **output encoding** on the client.

### Prove the XSS fix

| Step | Expected after fix |
|---|---|
| Bob posts the `<img onerror=…>` review again | Alice sees literal text or safe rendering — **no alert** |
| View page source / DevTools | No executable handler injected into the DOM from the review |

---

## Part D – Reproduce CSRF (reorder)

**My orders** has **Buy again**, which calls `POST /api/orders/reorder`. The lecture demo site can do the same with a plain HTML form.

1. Start the demo origin (second terminal):

   ```bash
   cd shoplab && npm run demo
   ```

2. Log in to ShopLab as **Alice** at http://localhost:3000.
3. Open http://localhost:4000 and click **Simulate evil site order (4K Monitor)**.
4. Back in ShopLab, open **My orders**. You should see a **new paid order** for the monitor you did not click in the shop UI.

Explain: the browser **automatically attached** Alice's session cookie to the cross-origin POST because both hosts are `localhost` (same site).

### curl variant

```bash
curl -s -c jar -b jar -H 'Content-Type: application/json' \
  -d '{"email":"alice@shoplab.test","password":"alice123"}' \
  http://localhost:3000/api/auth/login

curl -s -b jar -X POST http://localhost:3000/api/orders/reorder \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'productId=3&quantity=1'
```

---

## Part E – Fix CSRF

Implement a **synchronizer token**:

1. On login (or session creation), store a random `csrfToken` in the server session.
2. Expose `GET /api/auth/csrf` → `{ "csrfToken": "…" }` for logged-in users.
3. For state-changing routes you protect (at minimum `POST /api/orders/reorder`), require header `X-CSRF-Token` matching the session value. Return `403` when missing or wrong.
4. In [`client/src/api.js`](client/src/api.js), fetch the token after login and send it on mutating requests (`POST` review, reorder, place order, logout — your choice, but reorder is required).

`POST /api/auth/login` stays without a token (no session yet).

Suggested file: `server/src/middleware/csrf.js`.

### Prove CSRF fix

| Attack | Expected after fix |
|---|---|
| Demo form on localhost:4000 | Order **not** created (`403` or form error page) |
| **Buy again** in ShopLab with correct token | `201`, order created |
| curl reorder with cookie but **no** `X-CSRF-Token` | `403` |

---

## Part F – Session cookie flags

In [`server/src/app.js`](server/src/app.js), configure the session cookie:

| Flag | Localhost lab | Production (HTTPS) |
|---|---|---|
| `httpOnly` | `true` – JS cannot read `shoplab.sid` | `true` |
| `secure` | `false` (HTTP) | `true` |
| `sameSite` | `'lax'` (default-like) | `'lax'` or `'strict'` as appropriate |

After `httpOnly: true`, repeat the cookie-stealing XSS payload from Part A3. `document.cookie` should **not** include `shoplab.sid`.

The `theme` cookie set in [`client/src/App.jsx`](client/src/App.jsx) is intentionally readable from JS for the UI — discuss why that is a lower risk than the session id.

---

## Part G – Content Security Policy

Add a `Content-Security-Policy` response header for the shop (middleware in `app.js` is fine). Example policy that works with the Vite build:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

Adjust only if the built app fails to load (check the browser console).

### Prove CSP

| Check | Expected |
|---|---|
| Response headers on http://localhost:3000 | Includes `Content-Security-Policy` |
| Re-introduce a test inline script in a review (before client fix) | Browser console may report CSP blocked script (defence in depth) |

CSP does **not** replace escaping user content; it limits damage when something is missed.

---

## Part H – Final proof table

Repeat every attack from Parts A and D after **all** fixes:

| Attack | Expected |
|---|---|
| Stored XSS review as Bob, view as Alice | No script execution |
| `document.cookie` XSS payload | No `shoplab.sid` in the alert |
| CSRF form on port 4000 | No new order |
| Normal **Buy again** in the UI | Works |
| Normal login and shopping | Works |

## Submit

Follow your course instructions (branch, screenshots, short write-up). Mention **OWASP XSS** and **CSRF** and **CWE-79** / **CWE-352** in your own words.

List what you changed in:

- `client/src/pages/Products.jsx` (output encoding)
- `server/src/middleware/csrf.js` and `server/src/routes/auth.js` (token)
- `server/src/app.js` (cookies + CSP)
- `client/src/api.js` (send token)

Keep brief notes on what each cookie flag prevents and one CSP directive you used.

## Bonus (optional)

- Add DOMPurify and allow only `<b>` / `<i>` in reviews.
- Extend CSRF protection to every `POST` under `/api` except login.
- Try `CORS_MODE=reflect` from Week 1 notes together with XSS — when would stolen data leave the browser?
