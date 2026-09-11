#!/usr/bin/env node
// ─── CREATE ADMIN ACCOUNT ────────────────────────────────────────────────
// Run this ONCE to create your first admin user.
//
// Usage:
//   node src/seed-admin.js admin@sportsvestis.com YourPassword123!
//
// Or with prompts:
//   node src/seed-admin.js
//

const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const db = require("./models/db");
const config = require("./config");

async function seedAdmin() {
  let email = process.argv[2];
  let password = process.argv[3];

  // If no args, use defaults and print them
  if (!email || !password) {
    email = "admin@sportsvestis.com";
    password = "Admin123!";
    console.log("");
    console.log("  No arguments provided. Using default credentials:");
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log("");
    console.log("  To set your own:");
    console.log("  node src/seed-admin.js youremail@domain.com YourPassword123!");
    console.log("");
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
  console.log("  You can now log in at /admin on your website.");
  console.log("");
}

seedAdmin().catch(err => {
  console.error("Failed to create admin:", err.message);
  process.exit(1);
});
