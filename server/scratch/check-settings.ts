import { Pool } from "pg";
import { config } from "dotenv";

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/agentradar",
});

async function run() {
  try {
    const res = await pool.query(`SELECT * FROM settings LIMIT 5;`);
    console.log("Settings:");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
