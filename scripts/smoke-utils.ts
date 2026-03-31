export type RunCommandOptions = {
  readonly cwd: string;
};

export type AddonManifest = {
  readonly skills?: {
    readonly bundled?: string[];
  };
};

export type SkillsLockfile = {
  readonly skills?: Record<string, unknown>;
};

export function runCommand(
  command: string,
  args: readonly string[],
  options: RunCommandOptions,
): void {
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

export function runCommandOutput(
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

export function commandSucceeds(
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

export function decodeOutput(output: Uint8Array | null | undefined): string {
  return new TextDecoder().decode(output ?? new Uint8Array());
}

export function dirnamePath(path: string): string {
  const separatorIndex = path.lastIndexOf("/");

  if (separatorIndex <= 0) {
    return "/";
  }

  return path.slice(0, separatorIndex);
}

export function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);
}

export function buildCli(repositoryRoot: string): void {
  runCommand("bun", ["run", "build"], {
    cwd: repositoryRoot,
  });
}

export async function verifyGeneratedSkills(
  requiredSkills: readonly string[],
  generatedProjectDirectory: string,
  repositoryRoot: string,
): Promise<void> {
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

export async function getExpectedBundledSkills(addonManifestPath: string): Promise<string[]> {
  const parsedManifest = (await Bun.file(addonManifestPath).json()) as AddonManifest;
  const bundledSkills = parsedManifest.skills?.bundled;

  if (!Array.isArray(bundledSkills) || bundledSkills.length === 0) {
    throw new Error(`Expected ${addonManifestPath} to define skills.bundled.`);
  }

  return bundledSkills;
}
