// ─── SECURITY MIDDLEWARE ──────────────────────────────────────────────────
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const config = require("../config");

// ── Rate limiters ────────────────────────────────────────────────────────

/** General API rate limiter */
const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  // Use X-Forwarded-For behind a proxy — validate your proxy config
  keyGenerator: (req) => req.ip,
});

/** Strict limiter for auth endpoints (login, register, forgot-password) */
const authLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Try again in 15 minutes." },
  keyGenerator: (req) => req.ip,
});

// ── JWT authentication guard ─────────────────────────────────────────────

/**
 * Reads the JWT from the httpOnly cookie (not Authorization header).
 * Cookies are immune to XSS exfiltration — JS can't read them.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.access_token;

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      algorithms: ["HS256"],  // reject "none" algorithm attacks
    });

    // Attach user info to request — NOT the full token
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }
    return res.status(401).json({ error: "Invalid session." });
  }
}

/** Admin-only guard — use AFTER requireAuth */
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden." });
  }
  next();
}

// ── Input sanitization ──────────────────────────────────────────────────

/**
 * Sanitizes string fields in req.body:
 * - Trims whitespace
 * - Escapes HTML entities (prevents stored XSS)
 * - Rejects strings exceeding maxLength
 */
function sanitizeBody(maxLength = 5000) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== "object") return next();

    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === "string") {
        if (value.length > maxLength) {
          return res.status(400).json({ error: `Field "${key}" exceeds maximum length.` });
        }
        req.body[key] = validator.escape(validator.trim(value));
      }
    }
    next();
  };
}

/**
 * Validates that an email field is actually an email.
 * Prevents injection via email fields.
 */
function validateEmail(field = "email") {
  return (req, res, next) => {
    const email = req.body?.[field];
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email address." });
    }
    // Normalize to lowercase
    if (email) req.body[field] = validator.normalizeEmail(email);
    next();
  };
}

module.exports = {
  apiLimiter,
  authLimiter,
  requireAuth,
  requireAdmin,
  sanitizeBody,
  validateEmail,
};
