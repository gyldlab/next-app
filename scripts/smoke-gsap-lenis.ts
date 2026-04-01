import {
  buildCli,
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
    `${repositoryRoot}/templates/addons/gsap-lenis/addon.json`,
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
      "gsap-lenis",
      "--no-install",
    ],
    {
      cwd: temporaryRoot,
    },
  );

  await verifyGeneratedSkills(requiredSkills, generatedProjectDirectory, repositoryRoot);
  console.log("Smoke test passed: scaffolded project has expected GSAP and Claude skill wiring.");
}
