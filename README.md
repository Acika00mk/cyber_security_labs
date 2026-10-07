# Cyber Security Labs

Lab material for the web security course. Each lab uses a small application that you run on your own laptop, examine, and improve.

> **Rule:** run the lab applications only on your own machine. Test only these applications and your own projects, never other people's systems.

## Labs

| Lab | Folder | Description |
|---|---|---|
| Week 1 – How the web works and how it breaks | [`shoplab/`](shoplab/) | ShopLab, a small online shop (Express + React + SQLite) |
| Week 2 – Injection (SQL) | [`shoplab/LAB2.md`](shoplab/LAB2.md) | String-built SQL in catalog, login, and order filter; fix with parameters and schema validation |

## Quick start (ShopLab)

Requires **Node.js 22.11 or newer** (`node -v`). Nothing else is needed: the database is SQLite, built into Node. The npm commands enable SQLite automatically, including on Node 22.11.

```bash
cd shoplab
npm run setup     # once: installs all dependencies
npm start         # builds and starts the shop
```

Open **http://localhost:3000** and log in with one of the lab accounts:

| Email | Password |
|---|---|
| alice@shoplab.test | alice123 |
| bob@shoplab.test | bob123 |

Lab coupons for the Cart page: `WELCOME10` (€10.00 off) and `SPRING50` (€50.00 off).

Stop the server with `Ctrl+C`. Reset the data with `npm run reset-db`.

See [`shoplab/README.md`](shoplab/README.md) for development mode, tests, the project structure and troubleshooting.

## Repository layout

```
shoplab/
  server/        Express API, SQLite database, smoke tests
  client/        React app (Vite)
  demo-origin/   a second "website" on port 4000, used in the lecture
  README.md      full instructions for ShopLab
```

## Notes

- Everything runs on `127.0.0.1` only. Nothing is reachable from other computers on your network.
- Port 8080 is left free for the intercepting proxy (ZAP) used in the labs.
- No real payments, emails or external services are involved.
