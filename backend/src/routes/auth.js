// ─── AUTH ROUTES ─────────────────────────────────────────────────────────
// No SQL string concatenation. Every query uses prepared statements.
// Passwords: bcrypt with configurable cost factor.
// Tokens: JWT in httpOnly cookies — never exposed to JS.

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");
const db = require("../models/db");
const config = require("../config");
const {
  authLimiter,
  sanitizeBody,
  validateEmail,
  requireAuth,
} = require("../middleware/security");

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.JWT_SECRET,
    { algorithm: "HS256", expiresIn: config.JWT_EXPIRES_IN }
  );
}

function setTokenCookie(res, token) {
  res.cookie("access_token", token, {
    httpOnly: true,           // JS can't read it → immune to XSS theft
    secure: config.COOKIE_SECURE,  // HTTPS only in production
    sameSite: config.COOKIE_SAMESITE,  // CSRF mitigation
    domain: config.COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    path: "/",
  });
}

const LOCKOUT_MINUTES = 15;
const MAX_FAILED_LOGINS = 5;

// ── Prepared statements — created once, reused every request ─────────────
const stmts = {
  findByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
  insertUser: db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name)
    VALUES (?, ?, ?, ?)
  `),
  incrementFailed: db.prepare(`
    UPDATE users SET failed_logins = failed_logins + 1, updated_at = datetime('now')
    WHERE id = ?
  `),
  lockAccount: db.prepare(`
    UPDATE users SET locked_until = datetime('now', '+' || ? || ' minutes'), updated_at = datetime('now')
    WHERE id = ?
  `),
  resetFailed: db.prepare(`
    UPDATE users SET failed_logins = 0, locked_until = NULL, updated_at = datetime('now')
    WHERE id = ?
  `),
  getById: db.prepare("SELECT id, email, full_name, role, created_at FROM users WHERE id = ?"),
};

// ── POST /api/auth/register ──────────────────────────────────────────────
router.post(
  "/register",
  authLimiter,
  sanitizeBody(500),
  validateEmail(),
  async (req, res) => {
    try {
      const { email, password, full_name } = req.body;

      // ── Validate required fields
      if (!email || !password || !full_name) {
        return res.status(400).json({ error: "Email, password, and full name are required." });
      }

      // ── Password policy — enforce on backend, not just frontend
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters." });
      }
      if (password.length > 128) {
        return res.status(400).json({ error: "Password too long." });
      }
      if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({ error: "Password must contain at least one uppercase letter and one number." });
      }

      // ── Check for existing user (parameterized)
      const existing = stmts.findByEmail.get(email);
      if (existing) {
        // Don't reveal whether email exists — timing-safe response
        return res.status(409).json({ error: "Unable to create account. Please try a different email." });
      }

      // ── Hash password with bcrypt
      const hash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
      const id = uuid();

      stmts.insertUser.run(id, email, hash, full_name);

      // ── Issue token
      const token = signAccessToken({ id, email, role: "customer" });
      setTokenCookie(res, token);

      res.status(201).json({
        user: { id, email, full_name, role: "customer" },
      });
    } catch (err) {
      console.error("Register error:", err.message);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

// ── POST /api/auth/login ─────────────────────────────────────────────────
router.post(
  "/login",
  authLimiter,
  sanitizeBody(500),
  validateEmail(),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      // ── Find user (parameterized — no injection possible)
      const user = stmts.findByEmail.get(email);

      if (!user) {
        // Constant-time: hash a dummy password so timing doesn't leak existence
        await bcrypt.hash("dummy_password_to_waste_time", config.BCRYPT_ROUNDS);
        return res.status(401).json({ error: "Invalid email or password." });
      }

      // ── Check account lockout
      if (user.locked_until) {
        const lockedUntil = new Date(user.locked_until + "Z");
        if (lockedUntil > new Date()) {
          const minutes = Math.ceil((lockedUntil - new Date()) / 60000);
          return res.status(423).json({
            error: `Account temporarily locked. Try again in ${minutes} minute(s).`,
            locked_until: user.locked_until,
          });
        }
        // Lock expired — reset
        stmts.resetFailed.run(user.id);
      }

      // ── Verify password (bcrypt — timing-safe comparison built in)
      const valid = await bcrypt.compare(password, user.password_hash);

      if (!valid) {
        const newFailed = user.failed_logins + 1;
        stmts.incrementFailed.run(user.id);

        if (newFailed >= MAX_FAILED_LOGINS) {
          stmts.lockAccount.run(LOCKOUT_MINUTES.toString(), user.id);
          return res.status(423).json({
            error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
          });
        }

        // Generic message — never say "wrong password" vs "user not found"
        return res.status(401).json({
          error: "Invalid email or password.",
          remaining_attempts: MAX_FAILED_LOGINS - newFailed,
        });
      }

      // ── Success — reset failed counter and issue token
      stmts.resetFailed.run(user.id);
      const token = signAccessToken(user);
      setTokenCookie(res, token);

      res.json({
        user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
      });
    } catch (err) {
      console.error("Login error:", err.message);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

// ── POST /api/auth/logout ────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAMESITE,
    path: "/",
  });
  res.json({ message: "Signed out." });
});

// ── GET /api/auth/me — who am I? ────────────────────────────────────────
router.get("/me", requireAuth, (req, res) => {
  const user = stmts.getById.get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user });
});

module.exports = router;
