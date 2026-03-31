type RunCommandOptions = {
  readonly cwd: string;
};

type AddonManifest = {
  readonly skills?: {
    readonly bundled?: string[];
  };
};

type SkillsLockfile = {
  readonly skills?: Record<string, unknown>;
};

const repositoryRoot = `${import.meta.dir}/..`;
const temporaryRoot = `${repositoryRoot}/.tmp-smoke`;
const generatedProjectDirectory = `${temporaryRoot}/smoke-app`;

await runSmokeTest();

async function runSmokeTest(): Promise<void> {
  const requiredSkills = await getExpectedBundledSkills();
  buildCli();

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
      "elysia",
      "--no-install",
    ],
    {
      cwd: temporaryRoot,
    },
  );

  await verifyGeneratedSkills(requiredSkills);
  await verifyElysiaFiles();
  console.log("Smoke test passed: scaffolded project has expected Elysia MVC structure and skill wiring.");
}

function buildCli(): void {
  runCommand("bun", ["run", "build"], {
    cwd: repositoryRoot,
  });
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

async function verifyGeneratedSkills(requiredSkills: readonly string[]): Promise<void> {
  const agentsSkillsDirectory = `${generatedProjectDirectory}/.agents/skills`;
  const claudeSkillsDirectory = `${generatedProjectDirectory}/.claude/skills`;
  const skillsLockPath = `${generatedProjectDirectory}/skills-lock.json`;

  for (const skillId of requiredSkills) {
    const agentsSkillPath = `${agentsSkillsDirectory}/${skillId}`;

    if (!commandSucceeds("test", ["-d", agentsSkillPath], { cwd: repositoryRoot })) {
      throw new Error(`Expected ${agentsSkillPath} to be a directory.`);
    }

    const claudeSkillPath = `${claudeSkillsDirectory}/${skillId}`;

    if (!commandSucceeds("test", ["-L", claudeSkillPath], { cwd: repositoryRoot })) {
      throw new Error(`Expected ${claudeSkillPath} to be a symlink.`);
    }

    const claudeLinkTarget = runCommandOutput("readlink", [claudeSkillPath], {
      cwd: repositoryRoot,
    });
    if (isAbsolutePath(claudeLinkTarget)) {
      throw new Error(`Expected ${claudeSkillPath} to use a relative symlink target.`);
    }

    const resolvedClaudeTarget = runCommandOutput(
      "realpath",
      [`${dirnamePath(claudeSkillPath)}/${claudeLinkTarget}`],
      {
        cwd: repositoryRoot,
      },
    );
    const resolvedAgentsSkillPath = runCommandOutput("realpath", [agentsSkillPath], {
      cwd: repositoryRoot,
    });

    if (resolvedClaudeTarget !== resolvedAgentsSkillPath) {
      throw new Error(
        [
          `Unexpected symlink target for ${claudeSkillPath}.`,
          `Expected: ${resolvedAgentsSkillPath}`,
          `Resolved: ${resolvedClaudeTarget}`,
        ].join("\n"),
      );
    }
  }

  const parsedLockfile = (await Bun.file(skillsLockPath).json()) as SkillsLockfile;
  const lockedSkills = Object.keys(parsedLockfile.skills ?? {}).sort();
  const expectedSkills = [...requiredSkills].sort();

  if (lockedSkills.length !== expectedSkills.length) {
    throw new Error(
      `Expected ${expectedSkills.length} locked skills but found ${lockedSkills.length}.`,
    );
  }

  for (const expectedSkillId of expectedSkills) {
    if (!lockedSkills.includes(expectedSkillId)) {
      throw new Error(`Expected skills-lock.json to include ${expectedSkillId}.`);
    }
  }
}

async function getExpectedBundledSkills(): Promise<string[]> {
  const addonManifestPath = `${repositoryRoot}/templates/addons/elysia/addon.json`;
  const parsedManifest = (await Bun.file(addonManifestPath).json()) as AddonManifest;
  const bundledSkills = parsedManifest.skills?.bundled;

  if (!Array.isArray(bundledSkills) || bundledSkills.length === 0) {
    throw new Error("Expected templates/addons/elysia/addon.json to define skills.bundled.");
  }

  return bundledSkills;
}

function runCommand(command: string, args: readonly string[], options: RunCommandOptions): void {
  const result = Bun.spawnSync({
    cmd: [command, ...args],
    cwd: options.cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  if (!result.success) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function runCommandOutput(
  command: string,
  args: readonly string[],
  options: RunCommandOptions,
): string {
  const result = Bun.spawnSync({
    cmd: [command, ...args],
    cwd: options.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  if (!result.success) {
    const stderr = decodeOutput(result.stderr);
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${stderr}`);
  }

  return decodeOutput(result.stdout).trim();
}

function commandSucceeds(
  command: string,
  args: readonly string[],
  options: RunCommandOptions,
): boolean {
  const result = Bun.spawnSync({
    cmd: [command, ...args],
    cwd: options.cwd,
    stdout: "ignore",
    stderr: "ignore",
  });

  return result.success;
}

function decodeOutput(output: Uint8Array | null | undefined): string {
  return new TextDecoder().decode(output ?? new Uint8Array());
}

function dirnamePath(path: string): string {
  const separatorIndex = path.lastIndexOf("/");

  if (separatorIndex <= 0) {
    return "/";
  }

  return path.slice(0, separatorIndex);
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);
}
