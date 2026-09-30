# ShopLab

ShopLab is a small online shop built for the web security course. You will use it in the labs to look at how a real web application works, find problems in it, and fix them.

> **Rule:** run ShopLab only on your own machine. Test only ShopLab and your own project, never other people's systems.

## Requirements

- **Node.js 22.13 or newer** (check with `node -v`). Download the LTS version from [nodejs.org](https://nodejs.org/).
- Nothing else. The database is SQLite, built into Node, and stored in a file.

## Start the shop

From the `shoplab/` folder:

```bash
npm run setup     # once: installs all dependencies
npm start         # builds the shop and starts it
```

Open **http://localhost:3000**. Stop the server with `Ctrl+C`.

### Development mode

If you want to change the React code and see it reload automatically:

```bash
npm run dev
```

Then open **http://localhost:5173**. Vite forwards every `/api` request to the server on port 3000, so the browser still talks to a single origin.

### Reset the data

```bash
npm run reset-db
```

This deletes the database file (`server/data/shoplab.db`). The next start creates it again with the original users and products.

### Run the tests

```bash
npm test
```

## Lab accounts

| Email | Password |
|---|---|
| alice@shoplab.test | alice123 |
| bob@shoplab.test | bob123 |

## Lab coupons

Enter a coupon code on the Cart page before clicking **Place order**.

| Code | Discount |
|---|---|
| WELCOME10 | €10.00 off the order |
| SPRING50 | €50.00 off the order |

## Project structure

```
shoplab/
  server/src/app.js          Express app (sessions, routes, serves the built client)
  server/src/index.js        starts the server on 127.0.0.1:3000
  server/src/db.js           SQLite schema, seed data, small helpers
  server/src/routes/         auth, products, orders, debug
  server/src/middleware/     requireLogin, requestLog
  server/test/               smoke tests (npm test)
  client/src/api.js          every fetch() call to the API
  client/src/cart.js         cart logic (stored in localStorage)
  client/src/pages/          Login, Products, Cart, Orders
  demo-origin/               a second "website" on port 4000, used in the lecture
```

## Notes

- `GET /api/debug/echo` is a teaching endpoint: it shows the method, URL, headers and cookie **names** your browser sends. Cookie values are never shown.
- The session cookie uses `secure: false` because the lab runs on plain `http://localhost`. A production site must use HTTPS and `secure: true`.
- The server listens on `127.0.0.1` only, so other computers on your network cannot reach it.
- Settings can be changed in a `.env` file; see `.env.example`.

## Troubleshooting

- **`node:sqlite` not found, or "Unknown built-in module":** your Node.js is too old. Install Node 22.13 or newer.
- **Port 3000 (or 5173) is already in use:** stop the other program, or find it with `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows). You can also set `PORT=3001` in `.env`.
- **"401 Please log in" after restarting the server:** sessions are kept in memory, so a restart logs everyone out. Log in again.
- **The shop shows old data:** run `npm run reset-db` and start again.
