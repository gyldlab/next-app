import {
  configuredAdminUser,
  Console,
  Effect,
  runScript,
  upsertAdminUser,
  withDatabase,
} from "./runtime";

const program = Effect.gen(function* () {
  const adminUser = yield* configuredAdminUser;

  yield* Console.log("🔐  Registering admin user...\n");

  const result = yield* withDatabase((sql) => upsertAdminUser(sql, adminUser));

  yield* Console.log("✅  Admin user upserted successfully:");
  yield* Console.log(`      ID       : ${result.id}`);
  yield* Console.log(`      Email    : ${result.email}`);
  yield* Console.log(`      Name     : ${adminUser.fullName}`);
  yield* Console.log(`      Username : ${result.username}`);
  yield* Console.log(
    "\n💡  Password hashing uses Bun.password with Argon2id defaults tuned explicitly for ops scripts.\n",
  );
});

await runScript(program, "❌  Registration failed:");
