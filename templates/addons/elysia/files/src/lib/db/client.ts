import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const globalDatabase = globalThis as typeof globalThis & {
  __elysiaTemplateDb?: ReturnType<typeof drizzle<typeof schema>>;
  __elysiaTemplateSqlClient?: ReturnType<typeof postgres>;
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the Elysia auth module.");
  }

  return databaseUrl;
}

function getSqlClient() {
  if (globalDatabase.__elysiaTemplateSqlClient) {
    return globalDatabase.__elysiaTemplateSqlClient;
  }

  const sqlClient = postgres(getDatabaseUrl(), {
    max: 1,
    prepare: false,
  });

  if (process.env.NODE_ENV !== "production") {
    globalDatabase.__elysiaTemplateSqlClient = sqlClient;
  }

  return sqlClient;
}

export function getDb() {
  if (process.env.NODE_ENV !== "production" && globalDatabase.__elysiaTemplateDb) {
    return globalDatabase.__elysiaTemplateDb;
  }

  const database = drizzle(getSqlClient(), { schema });

  if (process.env.NODE_ENV !== "production") {
    globalDatabase.__elysiaTemplateDb = database;
  }

  return database;
}
