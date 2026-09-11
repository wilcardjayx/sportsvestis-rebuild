// ─── CONFIGURATION ───────────────────────────────────────────────────────
// Load from environment variables. NEVER commit real values to git.
// Copy this to .env and fill in production values.

module.exports = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",

  // JWT — use a 256-bit+ random secret in production
  JWT_SECRET: process.env.JWT_SECRET || "CHANGE_ME_use_openssl_rand_hex_64",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",

  // Bcrypt cost factor — 12 is ~250ms on modern hardware
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,

  // CORS — whitelist your frontend origin(s)
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,  // 15 minutes
  RATE_LIMIT_MAX: 100,                     // per window per IP
  AUTH_RATE_LIMIT_MAX: 10,                 // login/register per window

  // Cookie settings
  COOKIE_SECURE: process.env.NODE_ENV === "production",
  COOKIE_SAMESITE: "strict",
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,

  // Database
  DB_PATH: process.env.DB_PATH || "./data/sportsvestis.db",
};
