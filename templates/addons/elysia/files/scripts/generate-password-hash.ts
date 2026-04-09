import { Console, Effect, hashPassword, runScript } from "./runtime";

const program = Effect.gen(function* () {
  const plainTextPassword = process.argv[2]?.trim();

  if (!plainTextPassword) {
    yield* Effect.fail(new Error('Usage: bun run auth:hash -- "YourStrongPassword123!"'));
  }

  const passwordHash = yield* hashPassword(plainTextPassword);
  yield* Console.log(passwordHash);
});

await runScript(program, "❌  Hash failed:");
