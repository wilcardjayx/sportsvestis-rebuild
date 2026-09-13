// ─── SPORTSVESTIS API SERVER ──────────────────────────────────────────────
//
// Security measures applied:
//
// 1. SQL INJECTION         → Parameterized queries everywhere (better-sqlite3 prepared statements)
// 2. XSS                   → Input sanitization (validator.escape), httpOnly cookies
// 3. CSRF                  → SameSite=Strict cookies, no bearer tokens in headers
// 4. BRUTE FORCE           → Rate limiting (express-rate-limit) + account lockout
// 5. PASSWORD STORAGE      → bcrypt with cost factor 12
// 6. SESSION HIJACKING     → httpOnly + Secure + SameSite cookies, short JWT expiry
// 7. HTTP HEADER ATTACKS   → Helmet (CSP, HSTS, X-Frame-Options, etc.)
// 8. PARAMETER POLLUTION   → hpp middleware
// 9. CORS                  → Whitelisted origin only
// 10. IDOR                 → Orders scoped to authenticated user
// 11. MASS ASSIGNMENT      → Only whitelisted fields extracted from req.body
// 12. TIMING ATTACKS       → Constant-time bcrypt comparison, dummy hash on user-not-found
// 13. DIRECTORY TRAVERSAL  → Input format validation on slugs and IDs
// 14. DENIAL OF SERVICE    → Request body size limits, pagination caps
//

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const config = require("./config");
const { apiLimiter } = require("./middleware/security");

const app = express();

// ── Security headers — Helmet sets 15+ protective headers ────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // needed for inline styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],               // prevents clickjacking
    },
  },
  crossOriginEmbedderPolicy: false,              // allow image loading
  hsts: {
    maxAge: 31536000,                            // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// ── CORS — whitelist frontend origin only ────────────────────────────────
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,        // allow cookies
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
  maxAge: 86400,             // preflight cache 24h
}));

// ── Body parsing with size limits ────────────────────────────────────────
app.use(express.json({ limit: "100kb" }));       // reject huge payloads
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// ── Cookie parser — reads httpOnly cookies ───────────────────────────────
app.use(cookieParser());

// ── HTTP Parameter Pollution protection ──────────────────────────────────
app.use(hpp());

// ── Global rate limiter ──────────────────────────────────────────────────
app.use("/api/", apiLimiter);

// ── Trust proxy — required behind nginx/cloudflare for accurate req.ip ───
app.set("trust proxy", 1);

// ── Remove server fingerprint ────────────────────────────────────────────
app.disable("x-powered-by");

// ── Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/contact", require("./routes/contact"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/slides", require("./routes/slides"));

// ── Serve uploaded product images ────────────────────────────────────────
// Static files only — no execution, no directory listing, no traversal
// outside this folder (express.static resolves paths safely by default).
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"), {
  maxAge: "7d",
  dotfiles: "deny",
  index: false,
}));

// ── Health check ─────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── 404 handler — don't leak stack traces ────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

// ── Global error handler — never expose internals to clients ─────────────
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error." });
});

// ── Start ────────────────────────────────────────────────────────────────
app.listen(config.PORT, () => {
  console.log(`Sportsvestis API running on port ${config.PORT} [${config.NODE_ENV}]`);
});

module.exports = app;
