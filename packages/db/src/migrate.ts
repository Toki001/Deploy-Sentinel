import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { join } from "node:path";

export async function runMigrations(connectionString?: string): Promise<void> {
  const url =
    connectionString ||
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/deploysentinel";
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  console.log("[Migration] Applying forward-only schema migrations...");
  const migrationsFolder = join(__dirname, "migrations");
  await migrate(db, { migrationsFolder });
  console.log("[Migration] Database schema migrations completed successfully.");
  await sql.end();
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith("migrate.ts") || process.argv[1].endsWith("migrate.js"))
) {
  runMigrations().catch((err) => {
    console.error("[Migration] Migration error:", err);
    process.exit(1);
  });
}
