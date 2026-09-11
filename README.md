# Sportsvestis — Full Rebuild

A complete rebuild of [sportsvestis.com](https://sportsvestis.com) with a modern WebGL liquid glass UI, glassmorphic design system, and a hardened Node.js backend.

![License](https://img.shields.io/badge/license-MIT-blue)

---

## Overview

**Frontend** — React single-page app with:
- WebGL fragment shader hero (liquid glass / caustic animation)
- Glassmorphic navigation with `backdrop-filter` blur
- 6 pages: Home, Shop, Product Detail, About, Contact, Login/Signup
- Slide-out cart drawer, live search modal, currency switcher
- Fully responsive (480px → 1400px+)
- Image placeholders ready for your product photos

**Backend** — Hardened Express.js API with:
- Zero SQL injection surface (100% prepared statements)
- bcrypt password hashing (cost factor 12)
- JWT auth in httpOnly cookies (XSS-proof)
- Rate limiting + account lockout (brute-force protection)
- Helmet security headers (CSP, HSTS, clickjacking prevention)
- IDOR protection on all user-scoped endpoints
- Input sanitization on every route

---

## Project Structure

```
sportsvestis-rebuild/
├── frontend/
│   └── sportsvestis-full.jsx    # Complete React app (all 6 pages)
│
├── backend/
│   ├── src/
│   │   ├── server.js            # Express app entry point
│   │   ├── config/index.js      # Environment configuration
│   │   ├── models/db.js         # SQLite schema + seed data
│   │   ├── middleware/security.js # Rate limiter, auth guard, sanitizer
│   │   └── routes/
│   │       ├── auth.js          # Register, login, logout, me
│   │       ├── products.js      # Product listing + detail
│   │       ├── orders.js        # Checkout + order history
│   │       └── contact.js       # Contact form
│   ├── package.json
│   └── README.md                # API docs + security architecture
│
└── README.md
```

---

## Quick Start

### Backend

```bash
cd backend
npm install
npm run dev
# → API running on http://localhost:3001
```

The SQLite database auto-creates with seeded products on first run.

### Frontend

Drop `sportsvestis-full.jsx` into any React project (Vite, Next.js, CRA), or use it directly in Claude Artifacts.

---

## Security

See [backend/README.md](backend/README.md) for the full security architecture covering SQL injection, XSS, CSRF, brute force, IDOR, timing attacks, and more.

---

## Tech Stack

| Layer    | Tech                                              |
|----------|---------------------------------------------------|
| Frontend | React, WebGL (GLSL shaders), CSS `backdrop-filter` |
| Backend  | Node.js, Express, better-sqlite3                  |
| Auth     | bcrypt, JWT (httpOnly cookies)                     |
| Security | Helmet, express-rate-limit, hpp, validator         |

---

## License

MIT
