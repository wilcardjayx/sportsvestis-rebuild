// ─── CONTACT ROUTES ──────────────────────────────────────────────────────
const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("../models/db");
const { authLimiter, sanitizeBody, validateEmail } = require("../middleware/security");

const router = express.Router();

// ── POST /api/contact ────────────────────────────────────────────────────
router.post(
  "/",
  authLimiter,          // prevent spam flooding
  sanitizeBody(5000),   // escape HTML, cap length
  validateEmail(),      // validate & normalize email
  (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: "All fields are required." });
      }

      if (name.length > 100 || subject.length > 200 || message.length > 5000) {
        return res.status(400).json({ error: "One or more fields exceed maximum length." });
      }

      // Parameterized insert — no injection
      db.prepare(`
        INSERT INTO contact_messages (id, name, email, subject, message, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuid(), name, email, subject, message, req.ip);

      res.status(201).json({ message: "Message received. We'll get back to you within 24 hours." });
    } catch (err) {
      console.error("Contact error:", err.message);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

module.exports = router;
