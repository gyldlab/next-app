import {
  Console,
  Effect,
  runScript,
  seedAdminUser,
  upsertAdminUser,
  withDatabase,
} from "./runtime";

const program = Effect.gen(function* () {
  const adminUser = yield* seedAdminUser;

  yield* Console.log("🌱  Starting database seed...\n");

  const result = yield* withDatabase((sql) => upsertAdminUser(sql, adminUser));

  yield* Console.log("✅  Admin user seeded successfully:");
  yield* Console.log(`      Username : ${adminUser.username}`);
  yield* Console.log(`      Email    : ${adminUser.email}`);
  yield* Console.log(`      Password : ${adminUser.password}`);
  yield* Console.log("\n⚠️   Update scripts/db-seed.ts as your schema and bootstrap data grow.\n");
  yield* Console.log(`      Record ID : ${result.id}`);
});

await runScript(program, "❌  Seed failed:");
