# Lab 6 – Extension ideas

Optional stretch work after you finish [`LAB6.md`](LAB6.md). Do not attack any system you do not own.

---

## 1. Fail fast on missing secrets

On startup, if `NODE_ENV=production`, exit when `SESSION_SECRET`, `JWT_SECRET`, or other required vars are missing. Compare with the Lab 6 teaching fallback in `app.js`.

## 2. Correlation ids

Add middleware that sets `X-Request-Id` and include the same id in error JSON and server logs.

## 3. SSRF integration test

Add a test that asserts `fetch` to `http://127.0.0.1` returns **400** after your fix.

## 4. ClamAV or file-type sniffing

After upload, run `file-type` from npm on the buffer and reject mismatches.

## 5. Remove `/uploads` static mount

Serve files only through `GET /api/uploads/:id` with login and ownership checks.

## 6. Helmet.js comparison

Refactor headers to use [`helmet`](https://www.npmjs.com/package/helmet) and document what each default changes. Read the package README before adding it.

## 7. gitleaks in CI

Add a documented pre-push step or GitHub Action that scans for high-entropy strings. No real secrets in the repo.

## 8. SBOM export

Run `npm sbom` or `npx @cyclonedx/cyclonedx-npm` and attach the SBOM to your write-up.

## 9. Production cookie flags

When `NODE_ENV=production`, set `cookie.secure: true` and document required HTTPS.

## 10. Rate limit tools and uploads

Apply `express-rate-limit` to `/api/tools/fetch` and `/api/uploads` to reduce abuse.
