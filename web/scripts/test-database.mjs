import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.env.TEST_DATABASE_URL) throw new Error("Set TEST_DATABASE_URL to a new, empty local database named brixer_test_*.");
const url = new URL(process.env.TEST_DATABASE_URL);
const host = url.hostname || url.searchParams.get("host");
if (!/^brixer_test_[a-z0-9_]+$/.test(url.pathname.slice(1)) || !["localhost", "127.0.0.1", "/private/tmp", "/tmp"].includes(host)) throw new Error("Database acceptance tests only run against an explicitly named local test database.");
const files = ["tests/database/bootstrap.sql", ...readdirSync(`${root}supabase/migrations`).filter((name) => name.endsWith(".sql")).sort().flatMap((name) => name === "202610140001_initial_schema.sql" ? [`supabase/migrations/${name}`, "tests/database/legacy.sql"] : [`supabase/migrations/${name}`]), "tests/database/legacy-assertions.sql", "tests/database/commerce.sql", "tests/database/dashboard.sql"];
const result = spawnSync("psql", ["-X", "--dbname", process.env.TEST_DATABASE_URL, "-v", "ON_ERROR_STOP=1"], { input: files.map((file) => readFileSync(`${root}${file}`, "utf8")).join("\n"), encoding: "utf8" });
if (result.status !== 0) { process.stderr.write(result.stderr); process.exit(result.status ?? 1); }
process.stdout.write("Database migrations, payment allocation, authorization, and fulfillment acceptance tests passed.\n");
