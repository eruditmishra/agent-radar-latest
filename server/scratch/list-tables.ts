import { Pool } from "pg";
import { config } from "dotenv";

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/agentradar",
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    console.log("Tables:");
    res.rows.forEach(row => console.log(row.table_name));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
