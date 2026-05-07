import { Config } from "effect";
import { Console, deleteAdminUser, Effect, runScript, withDatabase } from "./runtime";

const program = Effect.gen(function* () {
  const adminEmail = (yield* Config.string("AUTH_ADMIN_EMAIL")).trim();

  if (adminEmail.length === 0) {
    yield* Effect.fail(new Error("AUTH_ADMIN_EMAIL cannot be empty."));
  }

  yield* Console.log(`🗑️   Removing admin user: ${adminEmail}\n`);

  const result = yield* withDatabase((sql) => deleteAdminUser(sql, adminEmail));

  if (result) {
    yield* Console.log("✅  Admin user removed successfully:");
    yield* Console.log(`      ID    : ${result.id}`);
    yield* Console.log(`      Email : ${result.email}\n`);
    return;
  }

  yield* Console.log(`ℹ️   No user found with email "${adminEmail}".\n`);
});

await runScript(program, "❌  Removal failed:");
