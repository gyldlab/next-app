import { Config, Console, Effect } from "effect";
import postgres from "postgres";

const PASSWORD_HASH_OPTIONS = {
  algorithm: "argon2id",
  memoryCost: 65536,
  timeCost: 3,
} as const;

const DEFAULT_ADMIN = {
  email: "admin@example.com",
  fullName: "Project Admin",
  password: "ChangeMe123!",
  phoneNumber: "0000000000",
  username: "admin",
} as const;

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallbackMessage;
}

function requireNonEmpty(value: string, name: string): string {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new Error(`${name} cannot be empty.`);
  }

  return trimmedValue;
}

function normalizeUsername(value: string): string {
  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);

  return normalizedValue.length > 0 ? normalizedValue : DEFAULT_ADMIN.username;
}

function buildAdminUser(
  email: string,
  password: string,
  fullName: string,
  phoneNumber: string,
  preferredUsername: string,
) {
  const fallbackUsername = email.split("@")[0] ?? DEFAULT_ADMIN.username;

  return {
    email,
    fullName,
    password,
    phoneNumber,
    username: normalizeUsername(
      preferredUsername.length > 0 ? preferredUsername : fallbackUsername,
    ),
  };
}

export const configuredAdminUser = Effect.gen(function* () {
  const email = requireNonEmpty(yield* Config.string("AUTH_ADMIN_EMAIL"), "AUTH_ADMIN_EMAIL");
  const password = requireNonEmpty(
    yield* Config.string("AUTH_ADMIN_PASSWORD"),
    "AUTH_ADMIN_PASSWORD",
  );
  const fullName = requireNonEmpty(
    yield* Config.string("AUTH_ADMIN_NAME").pipe(Config.withDefault(DEFAULT_ADMIN.fullName)),
    "AUTH_ADMIN_NAME",
  );
  const phoneNumber = requireNonEmpty(
    yield* Config.string("AUTH_ADMIN_PHONE_NUMBER").pipe(
      Config.withDefault(DEFAULT_ADMIN.phoneNumber),
    ),
    "AUTH_ADMIN_PHONE_NUMBER",
  );
  const preferredUsername = (yield* Config.string("AUTH_ADMIN_USERNAME").pipe(
    Config.withDefault(""),
  )).trim();

  return buildAdminUser(email, password, fullName, phoneNumber, preferredUsername);
});

export const seedAdminUser = Effect.gen(function* () {
  const email = requireNonEmpty(
    yield* Config.string("AUTH_ADMIN_EMAIL").pipe(Config.withDefault(DEFAULT_ADMIN.email)),
    "AUTH_ADMIN_EMAIL",
  );
  const password = requireNonEmpty(
    yield* Config.string("AUTH_ADMIN_PASSWORD").pipe(Config.withDefault(DEFAULT_ADMIN.password)),
    "AUTH_ADMIN_PASSWORD",
  );
  const fullName = requireNonEmpty(
    yield* Config.string("AUTH_ADMIN_NAME").pipe(Config.withDefault(DEFAULT_ADMIN.fullName)),
    "AUTH_ADMIN_NAME",
  );
  const phoneNumber = requireNonEmpty(
    yield* Config.string("AUTH_ADMIN_PHONE_NUMBER").pipe(
      Config.withDefault(DEFAULT_ADMIN.phoneNumber),
    ),
    "AUTH_ADMIN_PHONE_NUMBER",
  );
  const preferredUsername = (yield* Config.string("AUTH_ADMIN_USERNAME").pipe(
    Config.withDefault(DEFAULT_ADMIN.username),
  )).trim();

  return buildAdminUser(email, password, fullName, phoneNumber, preferredUsername);
});

export function databaseNameFromUrl(databaseUrl: string): string {
  return databaseUrl.split("/").at(-1)?.split("?")[0] ?? "database";
}

export function maskDatabaseUrl(databaseUrl: string): string {
  return databaseUrl.replace(/:[^:@]*@/, ":****@");
}

export function hashPassword(plainTextPassword: string) {
  return Effect.tryPromise({
    try: () => Bun.password.hash(plainTextPassword, PASSWORD_HASH_OPTIONS),
    catch: (error) => new Error(getErrorMessage(error, "Failed to hash password.")),
  });
}

export function promptForInput(promptText: string) {
  return Effect.tryPromise({
    try: async () => {
      await Bun.write(Bun.stdout, promptText);
      const iterator = console[Symbol.asyncIterator]();
      const result = await iterator.next();
      await iterator.return?.();
      return typeof result.value === "string" ? result.value.trim() : "";
    },
    catch: (error) => new Error(getErrorMessage(error, "Failed to read terminal input.")),
  });
}

export function withDatabase<A, E>(
  execute: (sql: ReturnType<typeof postgres>, databaseUrl: string) => Effect.Effect<A, E, never>,
) {
  return Effect.scoped(
    Effect.gen(function* () {
      const databaseUrl = requireNonEmpty(yield* Config.string("DATABASE_URL"), "DATABASE_URL");

      const sql = yield* Effect.acquireRelease(
        Effect.sync(() => postgres(databaseUrl, { max: 1, prepare: false })),
        (client) =>
          Effect.tryPromise({
            try: () => client.end(),
            catch: (error) =>
              new Error(getErrorMessage(error, "Failed to close the database connection.")),
          }).pipe(Effect.orDie),
      );

      return yield* execute(sql, databaseUrl);
    }),
  );
}

export function upsertAdminUser(
  sql: ReturnType<typeof postgres>,
  adminUser: Awaited<
    typeof seedAdminUser extends Effect.Effect<infer A, any, any> ? Promise<A> : never
  >,
) {
  return Effect.gen(function* () {
    const passwordHash = yield* hashPassword(adminUser.password);

    const [result] = yield* Effect.tryPromise({
      try: () =>
        sql<{ id: string; email: string; username: string }[]>`
          INSERT INTO admin_users (username, full_name, email, phone_number, password_hash, is_active)
          VALUES (
            ${adminUser.username},
            ${adminUser.fullName},
            ${adminUser.email},
            ${adminUser.phoneNumber},
            ${passwordHash},
            TRUE
          )
          ON CONFLICT (email) DO UPDATE
            SET
              username = EXCLUDED.username,
              full_name = EXCLUDED.full_name,
              phone_number = EXCLUDED.phone_number,
              password_hash = EXCLUDED.password_hash,
              is_active = TRUE,
              updated_at = NOW()
          RETURNING id, email, username
        `,
      catch: (error) => new Error(getErrorMessage(error, "Failed to upsert the admin user.")),
    });

    if (!result) {
      yield* Effect.fail(new Error("Admin upsert did not return a record."));
    }

    return result;
  });
}

export function deleteAdminUser(sql: ReturnType<typeof postgres>, adminEmail: string) {
  return Effect.tryPromise({
    try: () =>
      sql<{ id: string; email: string }[]>`
        DELETE FROM admin_users
        WHERE email = ${adminEmail}
        RETURNING id, email
      `,
    catch: (error) => new Error(getErrorMessage(error, "Failed to remove the admin user.")),
  }).pipe(Effect.map((rows) => rows[0] ?? null));
}

export async function runScript(
  program: Effect.Effect<any, any, never>,
  failurePrefix: string,
): Promise<void> {
  try {
    await Effect.runPromise(program);
  } catch (error) {
    console.error(failurePrefix, getErrorMessage(error, "Unknown script failure."));
    process.exit(1);
  }
}

export { Console, Effect };
