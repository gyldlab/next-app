import {
  buildCli,
  commandSucceeds,
  createMockPackageExecutors,
  runCommand,
  verifyPackageExecutorCommands,
} from "./smoke-utils.js";

const repositoryRoot = `${import.meta.dir}/..`;
const temporaryRoot = `${repositoryRoot}/.tmp-smoke`;
const generatedProjectDirectory = `${temporaryRoot}/smoke-app`;

await runSmokeTest();

async function runSmokeTest(): Promise<void> {
  const expectedCommands = [
    "bunx skills add vercel-labs/agent-skills --skill vercel-composition-patterns vercel-react-best-practices vercel-react-view-transitions web-design-guidelines -a amp -a claude-code -y",
    "bunx skills add elysiajs/skills -a amp -a claude-code -y",
  ];
  buildCli(repositoryRoot);

  await Bun.$`rm -rf ${temporaryRoot}`;
  await Bun.$`mkdir -p ${temporaryRoot}`;
  const mockExecutors = await createMockPackageExecutors(temporaryRoot);

  runCommand(
    "bun",
    [
      `${repositoryRoot}/dist/cli.js`,
      "smoke-app",
      "--template",
      "next",
      "--addons",
      "elysia",
      "--bun",
      "--no-install",
    ],
    {
      cwd: temporaryRoot,
      env: mockExecutors.env,
    },
  );

  await verifyPackageExecutorCommands(expectedCommands, mockExecutors.logPath);
  await verifyElysiaFiles();
  console.log(
    "Smoke test passed: scaffolded project has expected Elysia MVC structure and skill install commands.",
  );
}

async function verifyElysiaFiles(): Promise<void> {
  // Verify MVC structure exists
  const envExamplePath = `${generatedProjectDirectory}/.env.example`;
  const drizzleConfigPath = `${generatedProjectDirectory}/drizzle.config.ts`;
  const authIndexPath = `${generatedProjectDirectory}/src/modules/auth/index.ts`;
  const authServicePath = `${generatedProjectDirectory}/src/modules/auth/service.ts`;
  const authModelPath = `${generatedProjectDirectory}/src/modules/auth/model.ts`;
  const modulesIndexPath = `${generatedProjectDirectory}/src/modules/index.ts`;
  const edenPath = `${generatedProjectDirectory}/src/lib/eden.ts`;
  const dbSchemaPath = `${generatedProjectDirectory}/src/lib/db/schema.ts`;
  const apiRoutePath = `${generatedProjectDirectory}/app/api/[[...slugs]]/route.ts`;
  const scriptsAgentsPath = `${generatedProjectDirectory}/scripts/AGENTS.md`;
  const scriptsRuntimePath = `${generatedProjectDirectory}/scripts/runtime.ts`;
  const passwordHashScriptPath = `${generatedProjectDirectory}/scripts/generate-password-hash.ts`;
  const dbSeedScriptPath = `${generatedProjectDirectory}/scripts/db-seed.ts`;
  const dbStatusScriptPath = `${generatedProjectDirectory}/scripts/db-status.ts`;
  const packageJsonPath = `${generatedProjectDirectory}/package.json`;

  const filesToCheck = [
    envExamplePath,
    drizzleConfigPath,
    authIndexPath,
    authServicePath,
    authModelPath,
    modulesIndexPath,
    edenPath,
    dbSchemaPath,
    apiRoutePath,
    scriptsAgentsPath,
    scriptsRuntimePath,
    passwordHashScriptPath,
    dbSeedScriptPath,
    dbStatusScriptPath,
    packageJsonPath,
  ];

  for (const filePath of filesToCheck) {
    if (!commandSucceeds("test", ["-f", filePath], { cwd: repositoryRoot })) {
      throw new Error(`Expected ${filePath} to exist.`);
    }
  }

  // Verify auth/index.ts exports Elysia instance
  const authIndexContent = await Bun.file(authIndexPath).text();
  if (!authIndexContent.includes("new Elysia")) {
    throw new Error(`Expected ${authIndexPath} to export Elysia instance.`);
  }

  // Verify route.ts exports app type for Eden
  const apiRouteContent = await Bun.file(apiRoutePath).text();
  if (!apiRouteContent.includes("export type app =")) {
    throw new Error(`Expected ${apiRoutePath} to export app type for Eden Treaty.`);
  }

  // Verify eden.ts has treaty client
  const edenContent = await Bun.file(edenPath).text();
  if (!edenContent.includes("edenTreaty")) {
    throw new Error(`Expected ${edenPath} to configure Eden Treaty client.`);
  }

  const drizzleConfigContent = await Bun.file(drizzleConfigPath).text();
  if (!drizzleConfigContent.includes('schema: "./src/lib/db/schema.ts"')) {
    throw new Error(`Expected ${drizzleConfigPath} to point Drizzle at src/lib/db/schema.ts.`);
  }

  if (!drizzleConfigContent.includes('import { Config, Effect } from "effect"')) {
    throw new Error(`Expected ${drizzleConfigPath} to load DATABASE_URL through Effect config.`);
  }

  const dbSchemaContent = await Bun.file(dbSchemaPath).text();
  if (!dbSchemaContent.includes('"admin_users"')) {
    throw new Error(`Expected ${dbSchemaPath} to define the admin_users table.`);
  }

  const scriptsRuntimeContent = await Bun.file(scriptsRuntimePath).text();
  if (!scriptsRuntimeContent.includes("Bun.password.hash")) {
    throw new Error(`Expected ${scriptsRuntimePath} to hash passwords with Bun.password.`);
  }

  if (!scriptsRuntimeContent.includes("Effect.acquireRelease")) {
    throw new Error(
      `Expected ${scriptsRuntimePath} to manage the database client lifecycle with Effect.`,
    );
  }

  const dbSeedContent = await Bun.file(dbSeedScriptPath).text();
  if (!dbSeedContent.includes("seedAdminUser")) {
    throw new Error(
      `Expected ${dbSeedScriptPath} to derive bootstrap values through the shared script runtime.`,
    );
  }

  const scriptsAgentsContent = await Bun.file(scriptsAgentsPath).text();
  if (!scriptsAgentsContent.includes("Keep scripts/db-seed.ts synchronized")) {
    throw new Error(`Expected ${scriptsAgentsPath} to instruct agents to keep db-seed in sync.`);
  }

  if (!scriptsAgentsContent.includes("Prefer Bun-native APIs")) {
    throw new Error(`Expected ${scriptsAgentsPath} to require Bun-native script internals.`);
  }

  const legacyHelpersDirectory = `${generatedProjectDirectory}/scripts/_lib`;
  if (commandSucceeds("test", ["-d", legacyHelpersDirectory], { cwd: repositoryRoot })) {
    throw new Error(
      `Expected ${legacyHelpersDirectory} to be removed in favor of flat script helpers.`,
    );
  }

  const packageJson = (await Bun.file(packageJsonPath).json()) as {
    dependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  if (packageJson.scripts?.["db:seed"] !== "bun scripts/db-seed.ts") {
    throw new Error(`Expected ${packageJsonPath} to expose the db:seed script.`);
  }

  if (packageJson.scripts?.["db:push"] !== "drizzle-kit push") {
    throw new Error(`Expected ${packageJsonPath} to expose the db:push script.`);
  }

  if (!packageJson.dependencies?.effect) {
    throw new Error(`Expected ${packageJsonPath} to include the Effect runtime dependency.`);
  }
}
