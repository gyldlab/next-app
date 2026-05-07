import { $ } from "bun";
import { Config } from "effect";
import { Console, databaseNameFromUrl, Effect, runScript } from "./runtime";

function parseCliArguments() {
  const cliArguments = process.argv.slice(2);
  let dumpFormat = "plain";
  let outputFileName = "";

  for (let index = 0; index < cliArguments.length; index += 1) {
    const argument = cliArguments[index];

    if (argument?.startsWith("--format=")) {
      dumpFormat = argument.split("=")[1] ?? "plain";
      continue;
    }

    if (argument === "--format") {
      dumpFormat = cliArguments[index + 1] ?? "plain";
      index += 1;
      continue;
    }

    if (!outputFileName && argument) {
      outputFileName = argument.trim();
    }
  }

  return {
    dumpFormat,
    outputFileName,
  };
}

const program = Effect.gen(function* () {
  const databaseUrl = (yield* Config.string("DATABASE_URL")).trim();

  if (databaseUrl.length === 0) {
    yield* Effect.fail(new Error("DATABASE_URL cannot be empty."));
  }

  const databaseName = databaseNameFromUrl(databaseUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const { dumpFormat, outputFileName } = parseCliArguments();

  if (!["plain", "custom"].includes(dumpFormat)) {
    yield* Effect.fail(new Error('Invalid format. Use "plain" or "custom".'));
  }

  const defaultExtension = dumpFormat === "custom" ? "dump" : "sql";
  const fileName =
    outputFileName.length > 0
      ? outputFileName
      : `${databaseName}_dump_${timestamp}.${defaultExtension}`;
  const exportDirectory = "backups/exports";
  const outputPath = `${exportDirectory}/${fileName}`;

  yield* Effect.tryPromise({
    try: () => $`mkdir -p ${exportDirectory}`.quiet(),
    catch: (error) =>
      new Error(error instanceof Error ? error.message : "Failed to create export directory."),
  });

  yield* Console.log("📦  Exporting PostgreSQL database...");
  yield* Console.log(`🗄️   Database : ${databaseName}`);
  yield* Console.log(`🧾  Format   : ${dumpFormat}`);
  yield* Console.log(`📄  Output   : ${outputPath}`);

  const pgDumpCheck = yield* Effect.tryPromise({
    try: () => $`pg_dump --version`.nothrow().quiet(),
    catch: (error) =>
      new Error(error instanceof Error ? error.message : "Failed to check pg_dump."),
  });

  if (pgDumpCheck.exitCode !== 0) {
    yield* Effect.fail(
      new Error(
        "pg_dump is not available on this machine. Install PostgreSQL client tools and retry.",
      ),
    );
  }

  const dump = yield* Effect.tryPromise({
    try: () =>
      $`pg_dump ${databaseUrl} --no-owner --no-privileges --format=${dumpFormat} --file=${outputPath}`
        .nothrow()
        .quiet(),
    catch: (error) => new Error(error instanceof Error ? error.message : "Database export failed."),
  });

  if (dump.exitCode !== 0) {
    const errorText = dump.stderr.toString().trim();
    yield* Effect.fail(
      new Error(
        errorText.length > 0 ? `Database export failed: ${errorText}` : "Database export failed.",
      ),
    );
  }

  yield* Console.log("✅  Database export completed successfully.");
  yield* Console.log(`📁  File saved: ${outputPath}`);
});

await runScript(program, "❌  Database export failed:");
