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
    "bunx skills add shadcn/ui -a amp -a claude-code -y",
  ];
  buildCli(repositoryRoot);

  await Bun.$`rm -rf ${temporaryRoot}`;
  await Bun.$`mkdir -p ${temporaryRoot}`;
  await seedInstalledShadcnSkillArtifacts();
  const mockExecutors = await createMockPackageExecutors(temporaryRoot);

  runCommand(
    "bun",
    [
      `${repositoryRoot}/dist/cli.js`,
      "smoke-app",
      "--template",
      "next",
      "--addons",
      "shadcn",
      "--bun",
      "--no-install",
    ],
    {
      cwd: temporaryRoot,
      env: mockExecutors.env,
    },
  );

  await verifyPackageExecutorCommands(expectedCommands, mockExecutors.logPath);
  await verifyShadcnFiles();
  console.log(
    "Smoke test passed: scaffolded project has expected shadcn configuration and skill install commands.",
  );
}

async function verifyShadcnFiles(): Promise<void> {
  // Verify components.json exists
  const componentsJsonPath = `${generatedProjectDirectory}/components.json`;
  if (!commandSucceeds("test", ["-f", componentsJsonPath], { cwd: repositoryRoot })) {
    throw new Error(`Expected ${componentsJsonPath} to exist.`);
  }

  // Verify utils.ts exists
  const utilsPath = `${generatedProjectDirectory}/src/lib/utils.ts`;
  if (!commandSucceeds("test", ["-f", utilsPath], { cwd: repositoryRoot })) {
    throw new Error(`Expected ${utilsPath} to exist.`);
  }

  // Verify components.json has correct style
  const componentsJson = await Bun.file(componentsJsonPath).json();
  if (componentsJson.style !== "radix-maia") {
    throw new Error(
      `Expected components.json style to be "radix-maia" but got "${componentsJson.style}".`,
    );
  }

  // Verify utils.ts contains cn function
  const utilsContent = await Bun.file(utilsPath).text();
  if (!utilsContent.includes("export function cn(")) {
    throw new Error(`Expected ${utilsPath} to export cn function.`);
  }

  for (const skillRoot of [".claude", ".agents"] as const) {
    const skillDirectory = `${generatedProjectDirectory}/${skillRoot}/skills/shadcn`;
    if (await Bun.file(`${skillDirectory}/agents`).exists()) {
      throw new Error(`Expected ${skillDirectory}/agents to be removed.`);
    }

    if (await Bun.file(`${skillDirectory}/assets`).exists()) {
      throw new Error(`Expected ${skillDirectory}/assets to be removed.`);
    }

    const skillFilePath = `${skillDirectory}/SKILL.md`;
    const skillFileContent = await Bun.file(skillFilePath).text();
    if (skillFileContent.includes("user-invocable: false")) {
      throw new Error(`Expected ${skillFilePath} to omit user-invocable: false.`);
    }
  }
}

async function seedInstalledShadcnSkillArtifacts(): Promise<void> {
  const skillFileContent = [
    "---",
    "name: shadcn",
    "user-invocable: false",
    "allowed-tools: Bash(npx shadcn@latest *)",
    "---",
    "",
    "# shadcn/ui",
    "",
  ].join("\n");

  for (const skillRoot of [".claude", ".agents"] as const) {
    const skillDirectory = `${generatedProjectDirectory}/${skillRoot}/skills/shadcn`;
    await Bun.$`mkdir -p ${skillDirectory}/agents ${skillDirectory}/assets`;
    await Bun.write(`${skillDirectory}/agents/placeholder.txt`, "agent\n");
    await Bun.write(`${skillDirectory}/assets/placeholder.txt`, "asset\n");
    await Bun.write(`${skillDirectory}/SKILL.md`, skillFileContent);
  }
}
