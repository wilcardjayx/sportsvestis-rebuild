// ─── HERO SLIDES ROUTES (PUBLIC READ) ────────────────────────────────────
const express = require("express");
const db = require("../models/db");

const router = express.Router();

// ── GET /api/slides — public, returns active slides in display order ────
router.get("/", (req, res) => {
  try {
    const slides = db.prepare(`
      SELECT id, title, subtitle, cta_label, cta_target, image_url, sort_order
      FROM hero_slides
      WHERE active = 1
      ORDER BY sort_order ASC
      LIMIT 7
    `).all();

    res.json({ slides });
  } catch (err) {
    console.error("Slides fetch error:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
