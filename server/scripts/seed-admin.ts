import { Pool } from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import crypto from "node:crypto";

dotenv.config();

const db = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/agentradar",
});

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  let generated = false;

  if (!password) {
    password = crypto.randomBytes(16).toString("base64");
    generated = true;
  }

  const role = "super_admin"; // matches the CHECK constraint added in migration 008_rbac_roles.sql

  console.log(`Checking if admin user ${email} exists...`);
  const existing = await db.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  if (existing.rowCount && existing.rowCount > 0) {
    console.log(`User ${email} already exists.`);
    process.exit(0);
  }

  console.log(`Hashing password for ${email}...`);
  const saltRounds = 12;
  const hash = await bcrypt.hash(password, saltRounds);

  console.log(`Inserting ${email} into the database...`);
  // Super Admin accounts require MFA by default — see server/migrations/012_mfa_totp.sql.
  await db.query(
    "INSERT INTO users (email, password_hash, role, mfa_enabled) VALUES ($1, $2, $3, TRUE)",
    [email, hash, role],
  );

  console.log("Admin user created successfully!");
  if (generated) {
    console.log(`\n=================================================`);
    console.log(`🔑 GENERATED ADMIN PASSWORD: ${password}`);
    console.log(`   Please save this immediately! It will not be shown again.`);
    console.log(`=================================================\n`);
  }
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Failed to seed admin:", err);
  process.exit(1);
});
