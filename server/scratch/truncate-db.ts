import { Pool } from "pg";
import { config } from "dotenv";

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/agentradar",
});

async function run() {
  const tablesToTruncate = [
    "discovery_scans",
    "scan_integrations",
    "integration_connections",
    "agent_model_usage",
    "discovered_models",
    "scan_logs",
    "audit_logs",
    "system_access_logs",
    "scan_findings",
    "agent_security_drift",
    "discovered_agents",
    "agent_security_assessments"
  ];

  try {
    const query = `TRUNCATE TABLE ${tablesToTruncate.join(", ")} CASCADE;`;
    console.log("Executing:", query);
    await pool.query(query);
    console.log("Successfully truncated non-auth tables.");
  } catch (err) {
    console.error("Error truncating tables:", err);
  } finally {
    await pool.end();
  }
}

run();
