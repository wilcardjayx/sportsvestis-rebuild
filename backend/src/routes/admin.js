// ─── ADMIN ROUTES ────────────────────────────────────────────────────────
// All routes require admin role. Parameterized queries only.

const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const db = require("../models/db");
const config = require("../config");
const { requireAuth, requireAdmin, sanitizeBody, validateEmail } = require("../middleware/security");

const router = express.Router();

// Every route here needs admin auth
router.use(requireAuth, requireAdmin);

// ── GET /api/admin/stats — dashboard stats ───────────────────────────────
router.get("/stats", (req, res) => {
  try {
    const totalProducts = db.prepare("SELECT COUNT(*) as c FROM products WHERE active = 1").get().c;
    const totalOrders = db.prepare("SELECT COUNT(*) as c FROM orders").get().c;
    const totalCustomers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'customer'").get().c;
    const revenue = db.prepare("SELECT COALESCE(SUM(total_cents), 0) as r FROM orders WHERE status != 'cancelled'").get().r;
    const pendingOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status IN ('pending', 'paid')").get().c;
    const unreadMessages = db.prepare("SELECT COUNT(*) as c FROM contact_messages").get().c;

    res.json({
      total_products: totalProducts,
      total_orders: totalOrders,
      total_customers: totalCustomers,
      revenue_cents: revenue,
      revenue: revenue / 100,
      pending_orders: pendingOrders,
      unread_messages: unreadMessages,
    });
  } catch (err) {
    console.error("Admin stats error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── GET /api/admin/orders — all orders with customer info ────────────────
router.get("/orders", (req, res) => {
  try {
    let { status, page, limit } = req.query;
    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (status && ["pending", "paid", "shipped", "delivered", "cancelled"].includes(status)) {
      conditions.push("o.status = ?");
      params.push(status);
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    const orders = db.prepare(`
      SELECT o.*, u.full_name as customer_name, u.email as customer_email
      FROM orders o LEFT JOIN users u ON o.user_id = u.id
      ${where}
      ORDER BY o.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = db.prepare(`SELECT COUNT(*) as c FROM orders o ${where}`).all(...params)[0].c;

    res.json({
      orders: orders.map(o => ({
        ...o,
        total: o.total_cents / 100,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Admin orders error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── PUT /api/admin/orders/:id/status — update order status ───────────────
router.put("/orders/:id/status", sanitizeBody(100), (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!/^[0-9a-f-]{36}$/.test(id)) {
      return res.status(400).json({ error: "Invalid order ID." });
    }

    const validStatuses = ["pending", "paid", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const result = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    res.json({ message: "Order status updated.", status });
  } catch (err) {
    console.error("Update order status error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── GET /api/admin/customers — all customers ─────────────────────────────
router.get("/customers", (req, res) => {
  try {
    const customers = db.prepare(`
      SELECT u.id, u.email, u.full_name, u.created_at,
             COUNT(o.id) as order_count,
             COALESCE(SUM(o.total_cents), 0) as total_spent_cents
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.status != 'cancelled'
      WHERE u.role = 'customer'
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT 100
    `).all();

    res.json({
      customers: customers.map(c => ({
        ...c,
        total_spent: c.total_spent_cents / 100,
      })),
    });
  } catch (err) {
    console.error("Admin customers error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── GET /api/admin/messages — contact form submissions ───────────────────
router.get("/messages", (req, res) => {
  try {
    const messages = db.prepare("SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100").all();
    res.json({ messages });
  } catch (err) {
    console.error("Admin messages error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── DELETE /api/admin/messages/:id ───────────────────────────────────────
router.delete("/messages/:id", (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[0-9a-f-]{36}$/.test(id)) {
      return res.status(400).json({ error: "Invalid message ID." });
    }
    db.prepare("DELETE FROM contact_messages WHERE id = ?").run(id);
    res.json({ message: "Deleted." });
  } catch (err) {
    console.error("Delete message error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── PUT /api/admin/products/:id — update product ─────────────────────────
router.put("/products/:id", sanitizeBody(2000), (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price_cents, category, badge, active, image_url } = req.body;

    if (!/^[0-9a-f-]{36}$/.test(id)) {
      return res.status(400).json({ error: "Invalid product ID." });
    }

    const fields = [];
    const params = [];

    if (name) { fields.push("name = ?"); params.push(name); }
    if (description !== undefined) { fields.push("description = ?"); params.push(description); }
    if (price_cents) {
      const p = parseInt(price_cents, 10);
      if (isNaN(p) || p <= 0) return res.status(400).json({ error: "Invalid price." });
      fields.push("price_cents = ?"); params.push(p);
    }
    if (category) { fields.push("category = ?"); params.push(category); }
    if (badge !== undefined) { fields.push("badge = ?"); params.push(badge || null); }
    if (active !== undefined) { fields.push("active = ?"); params.push(active ? 1 : 0); }
    if (image_url !== undefined) {
      if (image_url && !/^(\/uploads\/[a-zA-Z0-9._-]+|https?:\/\/.+)$/.test(image_url)) {
        return res.status(400).json({ error: "Invalid image URL." });
      }
      fields.push("image_url = ?"); params.push(image_url || null);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update." });
    }

    params.push(id);
    const result = db.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Product not found." });
    }

    res.json({ message: "Product updated." });
  } catch (err) {
    console.error("Update product error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── DELETE /api/admin/products/:id — soft delete ─────────────────────────
router.delete("/products/:id", (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[0-9a-f-]{36}$/.test(id)) {
      return res.status(400).json({ error: "Invalid product ID." });
    }
    // Soft delete — keep data for order history
    db.prepare("UPDATE products SET active = 0 WHERE id = ?").run(id);
    res.json({ message: "Product removed." });
  } catch (err) {
    console.error("Delete product error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── POST /api/admin/create-admin — create another admin ──────────────────
router.post("/create-admin", sanitizeBody(500), validateEmail(), async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: "Email, password, and full name are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return res.status(409).json({ error: "A user with that email already exists." });
    }

    const hash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    const id = uuid();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, email_verified)
      VALUES (?, ?, ?, ?, 'admin', 1)
    `).run(id, email, hash, full_name);

    res.status(201).json({ message: "Admin account created.", id, email });
  } catch (err) {
    console.error("Create admin error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
