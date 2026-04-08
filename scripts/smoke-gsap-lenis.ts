import {
  buildCli,
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
    "bunx skills add greensock/gsap-skills --skill gsap-core gsap-performance gsap-plugins gsap-react gsap-scrolltrigger gsap-timeline gsap-utils -a amp -a claude-code -y",
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
      "gsap-lenis",
      "--bun",
      "--no-install",
    ],
    {
      cwd: temporaryRoot,
      env: mockExecutors.env,
    },
  );

  await verifyPackageExecutorCommands(expectedCommands, mockExecutors.logPath);
  console.log("Smoke test passed: scaffolded project installs the expected GSAP skills.");
}
