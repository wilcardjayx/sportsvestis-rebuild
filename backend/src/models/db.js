// ─── DATABASE — SQLite with prepared statements only ─────────────────────
// Every query uses ? placeholders. No string concatenation. Ever.

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const config = require("../config");

const dbDir = path.dirname(path.resolve(config.DB_PATH));
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.resolve(config.DB_PATH));

// ── Security pragmas ─────────────────────────────────────────────────────
db.pragma("journal_mode = WAL");       // crash-safe writes
db.pragma("foreign_keys = ON");        // enforce FK constraints
db.pragma("secure_delete = ON");       // zero-fill deleted data

// ── Schema ───────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
    email_verified INTEGER NOT NULL DEFAULT 0,
    locked_until  TEXT,
    failed_logins INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT,
    price_cents INTEGER NOT NULL CHECK(price_cents > 0),
    category    TEXT NOT NULL,
    badge       TEXT,
    sizes       TEXT NOT NULL DEFAULT '["S","M","L","XL","2XL"]',
    colors      TEXT NOT NULL DEFAULT '["Black","White","Navy","Red"]',
    stock       INTEGER NOT NULL DEFAULT 100,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id           TEXT PRIMARY KEY,
    user_id      TEXT REFERENCES users(id),
    status       TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','shipped','delivered','cancelled')),
    total_cents  INTEGER NOT NULL CHECK(total_cents >= 0),
    email        TEXT NOT NULL,
    shipping     TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id         TEXT PRIMARY KEY,
    order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    size       TEXT NOT NULL,
    color      TEXT NOT NULL,
    quantity   INTEGER NOT NULL CHECK(quantity > 0),
    unit_price INTEGER NOT NULL CHECK(unit_price > 0)
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    subject    TEXT NOT NULL,
    message    TEXT NOT NULL,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Index for fast lookups
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
`);

// ── Seed products if empty ───────────────────────────────────────────────
const count = db.prepare("SELECT COUNT(*) as c FROM products").get();
if (count.c === 0) {
  const insert = db.prepare(`
    INSERT INTO products (id, name, slug, description, price_cents, category, badge)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const seed = db.transaction((products) => {
    for (const p of products) {
      insert.run(p.id, p.name, p.slug, p.desc, p.price, p.cat, p.badge);
    }
  });

  const { v4: uuid } = require("uuid");
  seed([
    { id: uuid(), name: "Dragon Mode Endzone Tee", slug: "dragon-mode-endzone-tee", desc: "Unleash your inner beast on game day.", price: 2999, cat: "football", badge: "Best Seller" },
    { id: uuid(), name: "Football Forever Vintage Tee", slug: "football-forever-vintage-tee", desc: "Road to the end zone — vintage-inspired.", price: 2999, cat: "football", badge: null },
    { id: uuid(), name: "Touchdown Devil Game Day Tee", slug: "touchdown-devil-game-day-tee", desc: "Hellish season energy in a bold graphic.", price: 2999, cat: "football", badge: "Hot" },
    { id: uuid(), name: "Field General Eagle Tee", slug: "field-general-eagle-tee", desc: "Channel your inner quarterback.", price: 2999, cat: "football", badge: null },
    { id: uuid(), name: "Striker's Flame Soccer Tee", slug: "strikers-flame-soccer-tee", desc: "Blaze past defenders.", price: 2999, cat: "soccer", badge: "New" },
    { id: uuid(), name: "Slam Dunk Thunder Tee", slug: "slam-dunk-thunder-tee", desc: "Rise above the rim.", price: 3499, cat: "basketball", badge: "Hot" },
    { id: uuid(), name: "Grand Slam Vintage Tee", slug: "grand-slam-vintage-tee", desc: "Grand slam with Americana flair.", price: 2999, cat: "baseball", badge: null },
    { id: uuid(), name: "Kickflip Culture Tee", slug: "kickflip-culture-tee", desc: "Skate culture meets street art.", price: 3299, cat: "skateboard", badge: null },
  ]);
}

module.exports = db;
