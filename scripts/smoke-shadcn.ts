import {
  buildCli,
  commandSucceeds,
  getExpectedBundledSkills,
  runCommand,
  verifyGeneratedSkills,
} from "./smoke-utils.js";

const repositoryRoot = `${import.meta.dir}/..`;
const temporaryRoot = `${repositoryRoot}/.tmp-smoke`;
const generatedProjectDirectory = `${temporaryRoot}/smoke-app`;

await runSmokeTest();

async function runSmokeTest(): Promise<void> {
  const requiredSkills = await getExpectedBundledSkills(
    `${repositoryRoot}/templates/addons/shadcn/addon.json`,
  );
  buildCli(repositoryRoot);

  await Bun.$`rm -rf ${temporaryRoot}`;
  await Bun.$`mkdir -p ${temporaryRoot}`;

  runCommand(
    "bun",
    [
      `${repositoryRoot}/dist/cli.js`,
      "smoke-app",
      "--template",
      "next",
      "--addons",
      "shadcn",
      "--no-install",
    ],
    {
      cwd: temporaryRoot,
    },
  );

  await verifyGeneratedSkills(requiredSkills, generatedProjectDirectory, repositoryRoot);
  await verifyShadcnFiles();
  console.log(
    "Smoke test passed: scaffolded project has expected shadcn configuration and skill wiring.",
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
}
