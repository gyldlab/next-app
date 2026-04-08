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
  const authIndexPath = `${generatedProjectDirectory}/src/modules/auth/index.ts`;
  const authServicePath = `${generatedProjectDirectory}/src/modules/auth/service.ts`;
  const authModelPath = `${generatedProjectDirectory}/src/modules/auth/model.ts`;
  const modulesIndexPath = `${generatedProjectDirectory}/src/modules/index.ts`;
  const edenPath = `${generatedProjectDirectory}/src/lib/eden.ts`;
  const apiRoutePath = `${generatedProjectDirectory}/app/api/[[...slugs]]/route.ts`;

  const filesToCheck = [
    authIndexPath,
    authServicePath,
    authModelPath,
    modulesIndexPath,
    edenPath,
    apiRoutePath,
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
  if (!edenContent.includes("treaty")) {
    throw new Error(`Expected ${edenPath} to configure Eden Treaty client.`);
  }
}
