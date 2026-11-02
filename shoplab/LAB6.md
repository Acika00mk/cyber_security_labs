# Lab 6 – Secrets, dependencies and configuration

This lab uses **ShopLab** after the Week 5 authorization fixes. The app still runs locally with teaching defaults (predictable session secret fallback, debug routes, verbose API errors). You will exploit **information disclosure in errors**, **SSRF** on a URL preview tool, **unsafe file uploads**, and weak **security headers / debug exposure**. Then you harden configuration so those attacks fail or leak less.

> **Rule:** run ShopLab only on your own machine. Test only ShopLab and your own project, never other people's systems.

## Before you start

1. From the `shoplab/` folder: `npm run setup` (once), then `npm start`.
2. Open **http://localhost:3000**.
3. Finish [`LAB5.md`](LAB5.md) first (or check out tag **`week-6-start`** from your instructor if you need the teaching build with Lab 6 bugs only).
4. Read [`WEEK6-SLIDES.md`](WEEK6-SLIDES.md) (lecture) on git secrets, `.env`, npm supply chain, headers, uploads, and SSRF.

Lab accounts (same as earlier labs):

| Email | Password | Role |
|---|---|---|
| alice@shoplab.test | alice123 | customer |
| bob@shoplab.test | bob123 | customer |
| admin@shoplab.test | admin123 | admin |

## Suggested schedule (~3 hours)

| Time | Part | What you do |
|---|---|---|
| 0:00–0:25 | A | Verbose errors and `/api/debug/config` |
| 0:25–0:55 | B | SSRF with `/api/tools/fetch` |
| 0:55–1:25 | C | Unsafe upload and path traversal |
| 1:25–1:50 | D | Security headers and debug gating |
| 1:50–2:20 | E | Implement fixes |
| 2:20–2:45 | F | `.env` hygiene and dependency audit |
| 2:45–3:00 | G | Proof table and write-up |

## What you must do

1. **Replace** the Lab 6 **verbose error handler** so clients never receive `stack` (or SQL details); log details server-side only.
2. **Harden** `GET /api/tools/fetch` against **SSRF** (allowlist public HTTPS hosts, or block private/metadata IPs — document your rule).
3. **Fix** `POST /api/uploads` — sanitise filename, prevent path traversal, enforce size/type rules, do not serve uploads from a predictable public static path without controls.
4. **Extend** [`server/src/middleware/securityHeaders.js`](server/src/middleware/securityHeaders.js) with at least **`X-Content-Type-Options: nosniff`**, **`Referrer-Policy`**, and document **`Strict-Transport-Security`** for production behind HTTPS.
5. **Gate** debug routes: return **404** when `NODE_ENV=production`, or require admin + document choice.
6. Run **`npm audit`** in `server/` and note one finding (or confirm clean); ensure `.env` is gitignored and secrets only in `.env.example` as placeholders.

Run `npm test` after your changes. Update tests only if your fixes change intentional teaching behaviour (ask your instructor).

Stretch ideas: [`LAB6-EXTENSIONS.md`](LAB6-EXTENSIONS.md).

---

## Part A – Errors that help attackers

Production APIs should not return stack traces, internal paths, or database error text to browsers.

### A1 – Trigger a deliberate crash

```bash
curl -s http://localhost:3000/api/debug/crash | jq
```

Before your fix you should see JSON with **`stack`** containing file paths under `server/src/`.

### A2 – Find the handler

Read [`server/src/middleware/errorHandler.js`](server/src/middleware/errorHandler.js) and where it is mounted in [`server/src/app.js`](server/src/app.js).

### A3 – Debug configuration leak

```bash
curl -s http://localhost:3000/api/debug/config | jq
```

Note fields like `usingDefaultSessionSecret`. Discuss why this should not be public on the internet.

### A4 – Write-up

In your notes: difference between **logging for developers** and **responding to users**.

---

## Part B – Server-side request forgery (SSRF)

The **Tools** page (`#/tools`) calls `GET /api/tools/fetch?url=...`. The **server** fetches the URL, not the browser.

### B1 – Fetch a local API URL as Alice

Log in as **Alice** in the UI, open **Tools**, or use curl with session/JWT:

```bash
# After login, with session cookie or Bearer token:
curl -s -b alice.jar 'http://localhost:3000/api/tools/fetch?url=http://127.0.0.1:3000/api/products'
```

You should get product JSON in the response body — the server reached **loopback** on your behalf.

### B2 – Why this matters

Attackers cannot always reach `127.0.0.1` from their laptop, but **your server can**. In cloud deployments, similar calls hit **metadata services** or internal admin ports.

Read [`server/src/routes/tools.js`](server/src/routes/tools.js).

### B3 – Goal after fix

Block private IP ranges, `file:`, and link-local/metadata URLs, **or** allowlist known-good HTTPS hosts. Return **400** for disallowed targets.

---

## Part C – File uploads

`POST /api/uploads?name=...` writes raw body bytes to disk and exposes files under **`/uploads/`**.

### C1 – Benign upload

In **Tools**, upload `avatar.jpg` with any text body. Open the returned `/uploads/...` URL.

### C2 – Path traversal

Try a name such as:

```text
../../../tmp/shoplab-lab6-proof.txt
```

Before your fix, a file may appear outside the intended `uploads/` folder (check `/tmp` on your machine).

### C3 – Fix checklist

- Reject `..`, absolute paths, and null bytes in names
- Store with a **random id**; keep original name in database if needed
- Prefer serving through an authenticated download route, not wide-open static hosting
- Limit **size** and **content type** (allowlist)

Code: [`server/src/routes/uploads.js`](server/src/routes/uploads.js) and static mount in [`server/src/app.js`](server/src/app.js).

---

## Part D – Security headers and debug routes

CSP from Lab 3 is set in [`server/src/middleware/securityHeaders.js`](server/src/middleware/securityHeaders.js). Other headers from the lecture are still missing in the teaching build.

### D1 – Inspect headers

```bash
curl -sI http://localhost:3000/ | grep -iE 'content-security|x-content-type|referrer|strict-transport'
```

Add missing headers in `securityHeaders.js`. For HSTS, add a comment that it applies only when the site is served over **HTTPS**.

### D2 – Gate debug routes

[`server/src/routes/debug.js`](server/src/routes/debug.js) includes `/echo`, `/config`, and `/crash`. In production these should not exist or should require strong auth.

Implement gating in the router or `app.js` using `NODE_ENV`.

---

## Part E – Implementation guide

### E1 – Safe error handler

- Log `err.stack` with `console.error` or a logger
- Respond with `{ "error": "Something went wrong" }` and optional opaque `requestId`
- Remove `stack` and `sql` from JSON responses

### E2 – SSRF

Examples of rules (pick one approach and document it):

- Parse URL; deny if hostname is IP in private ranges
- Allow only `https:` and hostnames ending in your shop domain
- Disable redirects or re-validate after redirect

### E3 – Uploads

- Resolve path and ensure it stays under `uploads/` root
- Use `path.basename` or UUID filenames

### E4 – Secrets and `.env`

- Copy [`.env.example`](.env.example) to `.env`; never commit `.env`
- Set long random `SESSION_SECRET` and `JWT_SECRET` locally
- Optional: fail startup in production if secrets missing (no `change-me-in-lab` fallback)

---

## Part F – npm audit and dependencies

From `shoplab/server/`:

```bash
npm audit
npm ls --depth=0
```

In your write-up:

- Name one **direct** dependency and one **transitive** dependency (use `npm ls <name>`)
- Explain what **`package-lock.json`** guarantees in CI (`npm ci`)
- Record one audit action (fix, ignore with justification, or no issues)

Do not run `npm audit fix --force` without testing — it may bump major versions.

---

## Part G – Final proof table

After **all** fixes:

| Check | Expected |
|---|---|
| `GET /api/debug/crash` | Generic error JSON **without** stack (or debug disabled in prod mode) |
| `GET /api/debug/config` as anonymous | **404** in prod mode, or still blocked by your policy |
| `GET /api/tools/fetch?url=http://127.0.0.1:...` | **400** blocked |
| `POST /api/uploads?name=../../../tmp/evil.txt` | **400** or safe path under uploads only |
| Response headers | `X-Content-Type-Options`, `Referrer-Policy` present |
| `npm test` | Passes |
| `.env` | Not tracked by git |

### Short write-up (required)

1. **Git history vs `.gitignore`** — why deleting a secret from a file is not enough.
2. **SSRF** — who performs the HTTP request and what an attacker gains.
3. **Uploads** — one way path traversal happens and your fix.
4. **One `npm audit` takeaway** — what you would do on a real project.

## Submit

Follow your course instructions. Mention **OWASP A05 Security Misconfiguration**, **A06 Vulnerable and Outdated Components**, and **CWE-918 SSRF** where relevant.

List files you changed, for example:

- `server/src/middleware/errorHandler.js`
- `server/src/routes/tools.js`
- `server/src/routes/uploads.js`
- `server/src/middleware/securityHeaders.js`
- `server/src/routes/debug.js` or `server/src/app.js`
- `.env` (local only, not committed)

## Bonus (optional)

See [`LAB6-EXTENSIONS.md`](LAB6-EXTENSIONS.md).
