# Lab 5 – Extension ideas

Optional stretch work after you finish [`LAB5.md`](LAB5.md). These are **suggestions**, not required deliverables. Do not attack any system you do not own.

---

## 1. Central authorization helper

Add `server/src/authz/can.js` with something like `can(user, action, resource)` and call it from routes instead of scattering `if (role)` checks. Discuss how this scales compared to middleware-only checks.

## 2. Integration tests for access control

Add tests (instructor-style) that log in as Bob and assert **403** or **404** on every sensitive route. Run them in CI so a missing `requireRole` fails the build.

## 3. Audit log for admin actions

Create an `admin_audit` table: who called which admin endpoint, when, and from which IP. Display the last 50 entries on the Admin page.

## 4. More IDOR surfaces

- `DELETE /api/products/:productId/reviews/:reviewId` without checking review author.
- Download invoice at `/api/orders/:id/invoice.pdf` using predictable ids.
- Coupon redemption history keyed only by coupon id.

Fix each with owner or role checks in the **query**, not only in the UI.

## 5. Attribute-based rules

Allow order **cancellation** only when `status === 'pending'` and `user_id` matches. Reject changes to **paid** orders even for the owner. Teaches **ABAC**-style conditions on top of RBAC.

## 6. GraphQL / BOLA (conceptual)

If you have seen GraphQL APIs: explain **Broken Object Level Authorization** when clients can request `user(id: 5)` without server-side field guards. Map that to the REST IDOR you fixed in ShopLab.

## 7. Policy in the database

Store permissions in tables (`roles`, `permissions`, `role_permissions`) instead of hard-coding `'admin'`. Seed read-only **support** role that can list orders but not users.

## 8. Secure defaults in the client

Even after server fixes, stop sending `role` from login responses to the browser if the UI does not need it (reduces tampering hints). Discuss **defence in depth** vs unnecessary data exposure.

## 9. OpenAPI / route inventory

Generate a list of all `/api` routes and mark each with required role and ownership rule. Use it as a checklist for penetration tests.

## 10. Compare 403 vs 404

Write a short paragraph on **information disclosure**: when returning 404 for “exists but not yours” hides resource existence, and when 403 is acceptable for clearly admin-only namespaces like `/api/admin`.
