import {
  Console,
  databaseNameFromUrl,
  Effect,
  promptForInput,
  runScript,
  withDatabase,
} from "./runtime";

const program = withDatabase((sql, databaseUrl) =>
  Effect.gen(function* () {
    if (process.env.NODE_ENV === "production") {
      yield* Effect.fail(new Error("db:reset is disabled when NODE_ENV=production."));
    }

    yield* Console.log("\n⚠️   DATABASE RESET\n" + "═".repeat(50));
    yield* Console.log(`   This will DROP ALL TABLES in "${databaseNameFromUrl(databaseUrl)}".`);
    yield* Console.log("   All data will be permanently deleted.");
    yield* Console.log("═".repeat(50));

    const answer = yield* promptForInput('\n   Type "yes" to confirm: ');

    if (answer.toLowerCase() !== "yes") {
      yield* Console.log("\n🚫  Reset cancelled.\n");
      return;
    }

    yield* Console.log("\n🗑️   Dropping all tables...");

    yield* Effect.tryPromise({
      try: () => sql`DROP SCHEMA public CASCADE`,
      catch: (error) =>
        new Error(error instanceof Error ? error.message : "Failed to drop the public schema."),
    });
    yield* Effect.tryPromise({
      try: () => sql`CREATE SCHEMA public`,
      catch: (error) =>
        new Error(error instanceof Error ? error.message : "Failed to recreate the public schema."),
    });
    yield* Effect.tryPromise({
      try: () => sql`GRANT ALL ON SCHEMA public TO public`,
      catch: (error) =>
        new Error(error instanceof Error ? error.message : "Failed to grant schema permissions."),
    });

    yield* Console.log("✅  All tables and enum types were dropped.");
    yield* Console.log('👉  Run "bun run db:push" or "bun run db:migrate" to rebuild the schema.');
    yield* Console.log('👉  Then run "bun run db:seed" to restore the default admin record.\n');
  }),
);

await runScript(program, "❌  Reset failed:");
