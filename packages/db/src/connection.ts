import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { logger } from "@deploysentinel/shared";

let client: postgres.Sql | null = null;

export function getDbConnection(connectionString?: string) {
  const url =
    connectionString ||
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/deploysentinel";
  if (!client) {
    client = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: (notice) => logger.debug(`DB Notice: ${notice.message}`),
    });
  }
  return drizzle(client);
}

export async function closeDbConnection(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
  }
}
