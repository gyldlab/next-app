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
      "shadcn",
      "--no-install",
    ],
    {
      cwd: temporaryRoot,
    },
  );

  await verifyGeneratedSkills(requiredSkills);
  await verifyShadcnFiles();
  console.log("Smoke test passed: scaffolded project has expected shadcn configuration and skill wiring.");
}

function buildCli(): void {
  runCommand("bun", ["run", "build"], {
    cwd: repositoryRoot,
  });
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
    throw new Error(`Expected components.json style to be "radix-maia" but got "${componentsJson.style}".`);
  }

  // Verify utils.ts contains cn function
  const utilsContent = await Bun.file(utilsPath).text();
  if (!utilsContent.includes("export function cn(")) {
    throw new Error(`Expected ${utilsPath} to export cn function.`);
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
  const addonManifestPath = `${repositoryRoot}/templates/addons/shadcn/addon.json`;
  const parsedManifest = (await Bun.file(addonManifestPath).json()) as AddonManifest;
  const bundledSkills = parsedManifest.skills?.bundled;

  if (!Array.isArray(bundledSkills) || bundledSkills.length === 0) {
    throw new Error("Expected templates/addons/shadcn/addon.json to define skills.bundled.");
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
