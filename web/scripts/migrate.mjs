import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
try { process.loadEnvFile(`${root}.env.local`); } catch { /* Deployment environments provide variables directly. */ }
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL before running migrations.");
const url = new URL(process.env.DATABASE_URL);
const connection = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: url.pathname.slice(1), PGSSLMODE: url.searchParams.get("sslmode") || "require", PGCONNECT_TIMEOUT: "10" };
function sql(input) { const result = spawnSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-At"], { env: connection, input, encoding: "utf8" }); if (result.status !== 0) { process.stderr.write(result.stderr); throw new Error("Migration stopped; no later migrations were applied."); } return result.stdout.trim(); }
sql("create table if not exists public.brixer_schema_migrations(filename text primary key, applied_at timestamptz not null default now()); alter table public.brixer_schema_migrations enable row level security;");
const initial = "202610140001_initial_schema.sql";
if (sql("select to_regclass('public.orders') is not null") === "t" && sql(`select exists(select 1 from public.brixer_schema_migrations where filename='${initial}')`) === "f") {
  const required = ["profiles", "orders", "payments", "applications", "documents", "notifications", "notification_deliveries", "referral_codes", "referral_ledger", "staff_earnings", "bank_requests", "audit_logs", "order_claims", "order_stage_events", "payout_requests", "compliance_items"];
  if (sql(`select bool_and(to_regclass('public.'||name) is not null) from unnest(array[${required.map((n) => `'${n}'`).join(",")}]) as name`) !== "t") throw new Error("Existing installation has an incomplete initial schema. Review it before applying upgrades.");
  sql(`insert into public.brixer_schema_migrations(filename) values('${initial}')`);
}
for (const name of readdirSync(`${root}supabase/migrations`).filter((name) => /^\d+_[a-z_]+\.sql$/.test(name)).sort()) {
  if (sql(`select exists(select 1 from public.brixer_schema_migrations where filename='${name}')`) === "t") continue;
  const content = readFileSync(`${root}supabase/migrations/${name}`, "utf8");
  sql(`begin;\n${content}\ninsert into public.brixer_schema_migrations(filename) values('${name}');\ncommit;`);
  process.stdout.write(`Applied ${name}\n`);
}
