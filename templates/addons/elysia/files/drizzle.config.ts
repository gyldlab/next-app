import { Config, Effect } from "effect";
import { defineConfig } from "drizzle-kit";

const databaseUrl = (() => {
  try {
    return Effect.runSync(Config.string("DATABASE_URL"));
  } catch {
    throw new Error(
      "DATABASE_URL is required to run Drizzle commands. Use `bun run ...` so Bun loads .env.local automatically.",
    );
  }
})();

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
