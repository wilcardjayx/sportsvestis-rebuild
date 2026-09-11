# Sportsvestis Backend API

Hardened Node.js/Express API for the Sportsvestis e-commerce store.

## Quick Start

```bash
cd sportsvestis-backend
npm install
npm run dev
```

Server starts on `http://localhost:3001`. SQLite database auto-creates on first run with seeded products.

## API Endpoints

| Method | Endpoint              | Auth     | Description              |
|--------|-----------------------|----------|--------------------------|
| POST   | /api/auth/register    | —        | Create account           |
| POST   | /api/auth/login       | —        | Sign in                  |
| POST   | /api/auth/logout      | —        | Clear session cookie     |
| GET    | /api/auth/me          | Required | Current user profile     |
| GET    | /api/products         | —        | List products (filtered) |
| GET    | /api/products/:slug   | —        | Product detail           |
| POST   | /api/products         | Admin    | Create product           |
| POST   | /api/orders           | Required | Place order              |
| GET    | /api/orders           | Required | List your orders         |
| GET    | /api/orders/:id       | Required | Order detail             |
| POST   | /api/contact          | —        | Submit contact form      |
| GET    | /api/health           | —        | Health check             |

### Query params for GET /api/products

- `category` — football, soccer, basketball, baseball, skateboard
- `sort` — popular, newest, price_asc, price_desc, name
- `min_price` / `max_price` — in cents (e.g. 2999 = $29.99)
- `search` — text search on name + description
- `page` / `limit` — pagination (default 1/20, max limit 50)

## Security Architecture

### SQL Injection — Eliminated
Every database query uses **prepared statements** with `?` placeholders via better-sqlite3. No string concatenation or template literals ever touch SQL. Sort and category values are validated against **whitelists** — user input never appears in SQL syntax positions.

### XSS (Cross-Site Scripting)
- All string inputs are sanitized with `validator.escape()` before storage
- JWT tokens live in **httpOnly cookies** — JavaScript cannot read them
- Helmet sets `Content-Security-Policy` headers restricting script sources

### CSRF (Cross-Site Request Forgery)
- Cookies use `SameSite=Strict` — browsers won't send them on cross-origin requests
- CORS whitelist restricts which origins can make requests
- No bearer tokens in Authorization headers (the common CSRF vector)

### Brute Force / Credential Stuffing
- Auth endpoints have a **strict rate limiter** (10 attempts per 15 min per IP)
- After 5 failed logins, account is **locked for 15 minutes**
- Login failures return a generic message — never reveals if the email exists
- **Constant-time comparison**: on user-not-found, a dummy bcrypt hash runs to prevent timing analysis

### Password Storage
- bcrypt with cost factor 12 (~250ms per hash on modern hardware)
- Minimum 8 characters, requires uppercase + number
- Max 128 characters (prevents bcrypt DoS with extremely long passwords)

### Session Security
- JWTs stored in **httpOnly + Secure + SameSite=Strict** cookies
- 7-day expiry with server-side validation
- Algorithm locked to HS256 (rejects "none" algorithm attacks)
- Logout clears the cookie server-side

### IDOR (Insecure Direct Object Reference)
- Order endpoints scope queries to `user_id = ?` — users can only see their own data
- Admin routes require the `admin` role checked server-side

### HTTP Security Headers (via Helmet)
- `Strict-Transport-Security` — forces HTTPS
- `X-Frame-Options` / `frame-ancestors` — prevents clickjacking
- `X-Content-Type-Options` — prevents MIME sniffing
- `Content-Security-Policy` — restricts resource loading
- `X-Powered-By` — removed (hides Express fingerprint)

### Other Protections
- **hpp** middleware prevents HTTP parameter pollution
- Request body capped at 100KB (prevents payload DoS)
- Pagination capped at 50 items per page
- Input lengths validated (name: 100, subject: 200, message: 5000)
- UUIDs validated with regex before database lookup
- Product slugs validated against `/^[a-z0-9-]+$/`
- Global error handler never exposes stack traces to clients
- `trust proxy` configured for accurate IP detection behind reverse proxies

## Environment Variables

Set these in production (or a `.env` file):

```
PORT=3001
NODE_ENV=production
JWT_SECRET=<random 64-char hex string>
CORS_ORIGIN=https://sportsvestis.com
COOKIE_DOMAIN=sportsvestis.com
DB_PATH=./data/sportsvestis.db
BCRYPT_ROUNDS=12
```

Generate a JWT secret:
```bash
openssl rand -hex 64
```
