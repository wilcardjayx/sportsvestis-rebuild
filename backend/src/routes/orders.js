// ─── ORDER ROUTES ────────────────────────────────────────────────────────
const express = require("express");
const { v4: uuid } = require("uuid");
const validator = require("validator");
const db = require("../models/db");
const { requireAuth, sanitizeBody, validateEmail } = require("../middleware/security");

const router = express.Router();

// ── POST /api/orders — create order ──────────────────────────────────────
router.post(
  "/",
  requireAuth,
  sanitizeBody(5000),
  validateEmail(),
  (req, res) => {
    try {
      const { items, email, shipping } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Cart is empty." });
      }
      if (items.length > 50) {
        return res.status(400).json({ error: "Too many items." });
      }
      if (!email) {
        return res.status(400).json({ error: "Email is required." });
      }

      // ── Validate each item and calculate total server-side
      // NEVER trust client-sent prices — look up from DB
      const productStmt = db.prepare("SELECT * FROM products WHERE id = ? AND active = 1");
      let totalCents = 0;
      const validatedItems = [];

      for (const item of items) {
        if (!item.product_id || !item.size || !item.color || !item.quantity) {
          return res.status(400).json({ error: "Each item needs product_id, size, color, and quantity." });
        }

        const qty = parseInt(item.quantity, 10);
        if (isNaN(qty) || qty < 1 || qty > 20) {
          return res.status(400).json({ error: "Quantity must be 1-20 per item." });
        }

        // Parameterized lookup — no injection
        const product = productStmt.get(item.product_id);
        if (!product) {
          return res.status(400).json({ error: `Product not found: ${validator.escape(String(item.product_id).slice(0, 36))}` });
        }

        // Validate size and color against product's allowed values
        const sizes = JSON.parse(product.sizes);
        const colors = JSON.parse(product.colors);

        if (!sizes.includes(item.size)) {
          return res.status(400).json({ error: `Invalid size "${validator.escape(item.size)}" for ${product.name}.` });
        }
        if (!colors.includes(item.color)) {
          return res.status(400).json({ error: `Invalid color "${validator.escape(item.color)}" for ${product.name}.` });
        }

        // Check stock
        if (product.stock < qty) {
          return res.status(409).json({ error: `Insufficient stock for ${product.name}.` });
        }

        totalCents += product.price_cents * qty;
        validatedItems.push({
          product_id: product.id,
          size: item.size,
          color: item.color,
          quantity: qty,
          unit_price: product.price_cents,
        });
      }

      // ── Create order in a transaction — atomic stock deduction
      const orderId = uuid();

      const createOrder = db.transaction(() => {
        // Insert order
        db.prepare(`
          INSERT INTO orders (id, user_id, total_cents, email, shipping)
          VALUES (?, ?, ?, ?, ?)
        `).run(orderId, req.user.id, totalCents, email, shipping ? JSON.stringify(shipping) : null);

        // Insert items and deduct stock
        const insertItem = db.prepare(`
          INSERT INTO order_items (id, order_id, product_id, size, color, quantity, unit_price)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const deductStock = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?");

        for (const vi of validatedItems) {
          insertItem.run(uuid(), orderId, vi.product_id, vi.size, vi.color, vi.quantity, vi.unit_price);

          const result = deductStock.run(vi.quantity, vi.product_id, vi.quantity);
          if (result.changes === 0) {
            throw new Error(`Stock depleted for product ${vi.product_id}`);
          }
        }
      });

      createOrder();

      res.status(201).json({
        order: {
          id: orderId,
          total: totalCents / 100,
          total_cents: totalCents,
          items: validatedItems.length,
          status: "pending",
        },
      });
    } catch (err) {
      if (err.message.includes("Stock depleted")) {
        return res.status(409).json({ error: "An item went out of stock. Please refresh your cart." });
      }
      console.error("Order error:", err.message);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

// ── GET /api/orders — list user's orders ─────────────────────────────────
router.get("/", requireAuth, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT id, status, total_cents, created_at
      FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(req.user.id);

    res.json({
      orders: orders.map(o => ({
        ...o,
        total: o.total_cents / 100,
      })),
    });
  } catch (err) {
    console.error("Orders list error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ── GET /api/orders/:id — order detail ───────────────────────────────────
router.get("/:id", requireAuth, (req, res) => {
  try {
    const id = req.params.id;
    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return res.status(400).json({ error: "Invalid order ID." });
    }

    // Only return orders that belong to this user (IDOR protection)
    const order = db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!order) return res.status(404).json({ error: "Order not found." });

    const items = db.prepare(`
      SELECT oi.*, p.name as product_name, p.slug as product_slug
      FROM order_items oi JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(id);

    res.json({
      order: {
        ...order,
        total: order.total_cents / 100,
        shipping: order.shipping ? JSON.parse(order.shipping) : null,
        items: items.map(i => ({
          ...i,
          unit_price_dollars: i.unit_price / 100,
        })),
      },
    });
  } catch (err) {
    console.error("Order detail error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
