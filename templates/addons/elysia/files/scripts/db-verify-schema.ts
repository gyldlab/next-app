import { Console, Effect, runScript, withDatabase } from "./runtime";

const program = withDatabase((sql) =>
  Effect.gen(function* () {
    const tables = yield* Effect.tryPromise({
      try: () =>
        sql<{ table_name: string }[]>`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `,
      catch: (error) =>
        new Error(error instanceof Error ? error.message : "Table listing query failed."),
    });

    if (tables.length === 0) {
      yield* Console.log("⚠️   No tables found. Run bun run db:migrate or bun run db:push first.");
      return;
    }

    yield* Console.log("\n✅  Schema verified successfully!\n");
    yield* Console.log(`📊  Tables (${tables.length}):`);
    yield* Console.log("─".repeat(40));

    for (const [index, { table_name: tableName }] of tables.entries()) {
      yield* Console.log(`   ${String(index + 1).padStart(2, " ")}. ${tableName}`);
    }

    const enumTypes = yield* Effect.tryPromise({
      try: () =>
        sql<{ enum_name: string }[]>`
          SELECT DISTINCT t.typname AS enum_name
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          ORDER BY t.typname
        `,
      catch: (error) => new Error(error instanceof Error ? error.message : "Enum query failed."),
    });

    if (enumTypes.length > 0) {
      yield* Console.log(`\n📋  Enum types (${enumTypes.length}):`);
      yield* Console.log("─".repeat(40));

      for (const { enum_name: enumName } of enumTypes) {
        yield* Console.log(`      • ${enumName}`);
      }
    }

    yield* Console.log("");
  }),
);

await runScript(program, "❌  Schema verification failed:");
