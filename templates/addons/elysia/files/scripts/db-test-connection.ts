import {
  Console,
  databaseNameFromUrl,
  Effect,
  maskDatabaseUrl,
  runScript,
  withDatabase,
} from "./runtime";

const program = withDatabase((sql, databaseUrl) =>
  Effect.gen(function* () {
    yield* Console.log("🔍  Testing database connection...");
    yield* Console.log(`📍  Connecting to: ${maskDatabaseUrl(databaseUrl)}`);

    const [{ connected }] = yield* Effect.tryPromise({
      try: () => sql<{ connected: number }[]>`SELECT 1 AS connected`,
      catch: (error) =>
        new Error(error instanceof Error ? error.message : "Connection test query failed."),
    });
    const [{ version }] = yield* Effect.tryPromise({
      try: () => sql<{ version: string }[]>`SELECT version()`,
      catch: (error) => new Error(error instanceof Error ? error.message : "Version query failed."),
    });

    if (connected !== 1) {
      yield* Effect.fail(new Error("Connection test query did not return the expected result."));
    }

    yield* Console.log("✅  Database connection successful!");
    yield* Console.log(`🗄️   Database  : ${databaseNameFromUrl(databaseUrl)}`);
    yield* Console.log(`🖥️   Server    : ${version.split(" on ")[0]}`);
  }),
);

await runScript(program, "❌  Database connection failed:");
