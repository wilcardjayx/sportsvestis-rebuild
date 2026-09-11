#!/usr/bin/env node
// ─── CREATE ADMIN ACCOUNT ────────────────────────────────────────────────
// Run this ONCE to create your first admin user.
//
// Usage:
//   node src/seed-admin.js admin@sportsvestis.com YourPassword123!
//
// Or with no arguments — a random secure password is generated for you:
//   node src/seed-admin.js
//

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { v4: uuid } = require("uuid");
const db = require("./models/db");
const config = require("./config");

/** Generates a random 20-character password guaranteed to pass the policy. */
function generateSecurePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_=+";
  const all = upper + lower + digits + symbols;

  const pick = (set) => set[crypto.randomInt(set.length)];

  // Guarantee at least one of each required character class
  let pw = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = pw.length; i < 20; i++) pw.push(pick(all));

  // Shuffle so the guaranteed characters aren't always at the front
  for (let i = pw.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }
  return pw.join("");
}

async function seedAdmin() {
  let email = process.argv[2];
  let password = process.argv[3];
  let generated = false;

  // If no args, generate a random secure password — never hardcode one
  if (!email || !password) {
    email = "admin@sportsvestis.com";
    password = generateSecurePassword();
    generated = true;
  }

  // Validate password
  if (password.length < 8) {
    console.error("ERROR: Password must be at least 8 characters.");
    process.exit(1);
  }
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    console.error("ERROR: Password must contain at least one uppercase letter and one number.");
    process.exit(1);
  }

  // Check if admin already exists
  const existing = db.prepare("SELECT id, email FROM users WHERE email = ?").get(email);
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    console.log("To reset the password, delete the user first or use the API.");
    process.exit(0);
  }

  // Hash and insert
  const hash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
  const id = uuid();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role, email_verified)
    VALUES (?, ?, ?, ?, 'admin', 1)
  `).run(id, email, hash, "Store Admin");

  console.log("✓ Admin account created successfully!");
  console.log(`  ID:    ${id}`);
  console.log(`  Email: ${email}`);
  console.log(`  Role:  admin`);
  console.log("");
  if (generated) {
    console.log("  ┌─────────────────────────────────────────────────────┐");
    console.log("  │  SAVE THIS PASSWORD NOW — it will not be shown again │");
    console.log("  └─────────────────────────────────────────────────────┘");
    console.log(`  Password: ${password}`);
    console.log("");
    console.log("  Store it in a password manager. It is NOT saved anywhere");
    console.log("  in plain text — only its bcrypt hash lives in the database.");
    console.log("");
  }
  console.log("  You can now log in at /admin on your website.");
  console.log("");
}

seedAdmin().catch(err => {
  console.error("Failed to create admin:", err.message);
  process.exit(1);
});
