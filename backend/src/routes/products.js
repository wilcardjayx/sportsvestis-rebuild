// ─── PRODUCT ROUTES ──────────────────────────────────────────────────────
// All queries use prepared statements. No string interpolation.
// Category/sort filtering uses a whitelist — user input never touches SQL syntax.

const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("../models/db");
const { requireAuth, requireAdmin, sanitizeBody } = require("../middleware/security");

const router = express.Router();

// ── Whitelisted values — user input is checked against these, never injected ──
const VALID_CATEGORIES = ["football", "soccer", "basketball", "baseball", "skateboard"];
const VALID_SORT = {
  popular: "badge DESC, created_at DESC",
  newest: "created_at DESC",
  price_asc: "price_cents ASC",
  price_desc: "price_cents DESC",
  name: "name ASC",
};

// ── GET /api/products ────────────────────────────────────────────────────
router.get("/", (req, res) => {
  try {
    let { category, sort, min_price, max_price, search, page, limit } = req.query;

    // ── Validate & clamp pagination
    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (page - 1) * limit;

    // ── Build query safely — only parameterized conditions
    const conditions = ["active = 1"];
    const params = [];

    if (category) {
      // Whitelist check — reject anything not in the list
      if (!VALID_CATEGORIES.includes(category.toLowerCase())) {
        return res.status(400).json({ error: "Invalid category." });
      }
      conditions.push("category = ?");
      params.push(category.toLowerCase());
    }

    if (min_price) {
      const min = parseInt(min_price, 10);
      if (!isNaN(min) && min >= 0) {
        conditions.push("price_cents >= ?");
        params.push(min);
      }
    }

    if (max_price) {
      const max = parseInt(max_price, 10);
      if (!isNaN(max) && max > 0) {
        conditions.push("price_cents <= ?");
        params.push(max);
      }
    }

    if (search) {
      // Parameterized LIKE — the % wildcards are in the parameter, not the SQL
      conditions.push("(name LIKE ? OR description LIKE ?)");
      const term = `%${search.slice(0, 100)}%`;  // cap length
      params.push(term, term);
    }

    // ── Sort — whitelist lookup, never user string in ORDER BY
    const orderBy = VALID_SORT[sort] || VALID_SORT.popular;

    const where = conditions.join(" AND ");
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM products WHERE ${where}`);
    const dataStmt = db.prepare(`SELECT * FROM products WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`);

    const total = countStmt.get(...params).total;
    const products = dataStmt.all(...params, limit, offset).map(formatProduct);

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Products list error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── GET /api/products/:slug ──────────────────────────────────────────────
router.get("/:slug", (req, res) => {
  try {
    const slug = req.params.slug;

    // Reject obviously invalid slugs (prevent path traversal / injection attempts)
    if (!slug || slug.length > 200 || !/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: "Invalid product identifier." });
    }

    const product = db.prepare("SELECT * FROM products WHERE slug = ? AND active = 1").get(slug);

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    res.json({ product: formatProduct(product) });
  } catch (err) {
    console.error("Product detail error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── POST /api/products — admin only ──────────────────────────────────────
router.post("/", requireAuth, requireAdmin, sanitizeBody(2000), (req, res) => {
  try {
    const { name, slug, description, price_cents, category, badge, image_url } = req.body;

    if (!name || !slug || !price_cents || !category) {
      return res.status(400).json({ error: "Name, slug, price, and category are required." });
    }

    if (!VALID_CATEGORIES.includes(category.toLowerCase())) {
      return res.status(400).json({ error: "Invalid category." });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: "Slug must be lowercase alphanumeric with dashes." });
    }

    // image_url must be either empty, or a path our own upload endpoint
    // produced (/uploads/...), or a normal http(s) URL — never a bare
    // string that could be interpreted as something else client-side.
    if (image_url && !/^(\/uploads\/[a-zA-Z0-9._-]+|https?:\/\/.+)$/.test(image_url)) {
      return res.status(400).json({ error: "Invalid image URL." });
    }

    const price = parseInt(price_cents, 10);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: "Price must be a positive integer (cents)." });
    }

    const id = uuid();
    db.prepare(`
      INSERT INTO products (id, name, slug, description, price_cents, category, badge, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, slug, description || "", price, category.toLowerCase(), badge || null, image_url || null);

    res.status(201).json({ id, message: "Product created." });
  } catch (err) {
    if (err.message.includes("UNIQUE constraint")) {
      return res.status(409).json({ error: "A product with that slug already exists." });
    }
    console.error("Create product error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── Helper: format product for API response ──────────────────────────────
function formatProduct(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price_cents / 100,
    price_cents: row.price_cents,
    category: row.category,
    badge: row.badge,
    image_url: row.image_url || null,
    sizes: JSON.parse(row.sizes),
    colors: JSON.parse(row.colors),
    stock: row.stock,
    created_at: row.created_at,
  };
}

module.exports = router;
