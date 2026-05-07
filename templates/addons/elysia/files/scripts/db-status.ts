import { Console, databaseNameFromUrl, Effect, runScript, withDatabase } from "./runtime";

const program = withDatabase((sql, databaseUrl) =>
  Effect.gen(function* () {
    const [{ version }] = yield* Effect.tryPromise({
      try: () => sql<{ version: string }[]>`SELECT version()`,
      catch: (error) => new Error(error instanceof Error ? error.message : "Version query failed."),
    });
    const [{ db_size: databaseSize }] = yield* Effect.tryPromise({
      try: () => sql<{ db_size: string }[]>`
        SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size
      `,
      catch: (error) =>
        new Error(error instanceof Error ? error.message : "Database size query failed."),
    });

    yield* Console.log("\n📡  Database Status\n" + "═".repeat(50));
    yield* Console.log(`   Database : ${databaseNameFromUrl(databaseUrl)}`);
    yield* Console.log(`   Server   : ${version.split(" on ")[0]}`);
    yield* Console.log(`   Size     : ${databaseSize}`);

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
      yield* Console.log(
        "\n⚠️   No tables found. Run bun run db:push or bun run db:migrate first.",
      );
      return;
    }

    yield* Console.log(`\n📊  Tables (${tables.length}):\n` + "─".repeat(50));
    yield* Console.log(`   ${"Table".padEnd(35)} Rows`);
    yield* Console.log("─".repeat(50));

    let totalRows = 0;

    for (const { table_name: tableName } of tables) {
      const [{ count }] = yield* Effect.tryPromise({
        try: () => sql<{ count: string }[]>`SELECT COUNT(*) AS count FROM ${sql(tableName)}`,
        catch: (error) =>
          new Error(
            error instanceof Error ? error.message : `Row count query failed for ${tableName}.`,
          ),
      });

      const rowCount = Number(count);
      totalRows += rowCount;
      yield* Console.log(`   ${tableName.padEnd(35)} ${String(rowCount).padStart(6)}`);
    }

    yield* Console.log("─".repeat(50));
    yield* Console.log(`   ${"TOTAL".padEnd(35)} ${String(totalRows).padStart(6)}`);
    yield* Console.log("");
  }),
);

await runScript(program, "❌  Status check failed:");
