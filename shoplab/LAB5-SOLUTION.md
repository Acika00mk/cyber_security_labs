# Lab 5 – Authorization and access control

## Proof

The server smoke tests verify the following outcomes:

| Request | Result |
|---|---|
| Bob reads Alice's order `1001` | `404 Order not found` |
| Bob reads his order `1002` | `200` |
| Bob lists users through `/api/admin/users` | `403 Forbidden` |
| Admin lists users through `/api/admin/users` | `200` |
| Bob submits `role: "admin"` and another email in a profile update | `400`, profile unchanged |
| Bob updates his profile name | `200`, with the new name |

Run the checks from `server/` with `npm test`.

## Write-up

**Authentication vs. authorization:** Lab 4 established and verified a user's identity at login. Lab 5 enforces what that authenticated identity can access, including ownership of an order and permission to use administrative routes.

**Why hiding the Admin link is insufficient:** Hiding a link only changes the interface; it does not prevent a user from sending an HTTP request directly to `/api/admin/users`. The server now checks the current user's role in middleware before any admin route runs.

**Horizontal vs. vertical escalation:** Reading Alice's order as Bob is horizontal escalation because it crosses between users at the same privilege level. Accessing the admin user list as Bob, or changing his own role to admin, is vertical escalation because it attempts to gain higher privileges. Filtering by both order ID and owner ID in the same SQL query ensures the application never loads an order that the user is not authorized to access; checking ownership afterward risks using or exposing the row before the check, and makes it easier for future code paths to omit the check.

These are examples of OWASP A01: Broken Access Control. CWE-639 describes authorization bypass by changing a user-controlled object identifier; the owner-scoped order query prevents it. CWE-915 describes improperly controlled modification of object attributes; the profile endpoint only updates the allowlisted `name` field.

## Changes

- `server/src/routes/orders.js`: restrict order details by both order ID and authenticated owner ID.
- `server/src/middleware/requireRole.js` and `server/src/app.js`: load the authenticated user's role and protect the complete admin router.
- `server/src/routes/auth.js` and `server/src/validation/catalog.js`: validate profile changes with a strict `profilePatchSchema` and update only the name.
- `server/test/smoke.test.js`: cover owner isolation, admin access control, and role/email mass-assignment attempts.
