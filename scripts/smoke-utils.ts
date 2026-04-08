export type RunCommandOptions = {
  readonly cwd: string;
  readonly env?: Record<string, string | undefined>;
};

export function runCommand(
  command: string,
  args: readonly string[],
  options: RunCommandOptions,
): void {
  const result = Bun.spawnSync({
    cmd: [command, ...args],
    cwd: options.cwd,
    env: options.env,
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
    env: options.env,
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
    env: options.env,
    stdout: "ignore",
    stderr: "ignore",
  });

  return result.success;
}

export function decodeOutput(output: Uint8Array | null | undefined): string {
  return new TextDecoder().decode(output ?? new Uint8Array());
}

export function buildCli(repositoryRoot: string): void {
  runCommand("bun", ["run", "build"], {
    cwd: repositoryRoot,
  });
}

export async function createMockPackageExecutors(
  temporaryRoot: string,
): Promise<{ readonly env: Record<string, string | undefined>; readonly logPath: string }> {
  const binDirectory = `${temporaryRoot}/mock-bin`;
  const logPath = `${temporaryRoot}/mock-package-exec.log`;
  const executables = ["bunx", "npx", "pnpm", "yarn"] as const;

  await Bun.$`mkdir -p ${binDirectory}`;

  for (const executableName of executables) {
    const executablePath = `${binDirectory}/${executableName}`;
    await Bun.write(
      executablePath,
      [
        "#!/bin/sh",
        `printf \"%s\\n\" \"${executableName} $*\" >> \"${logPath}\"`,
        "exit 0",
        "",
      ].join("\n"),
    );
    runCommand("chmod", ["755", executablePath], {
      cwd: temporaryRoot,
    });
  }

  return {
    env: {
      ...process.env,
      PATH: `${binDirectory}:${process.env.PATH ?? ""}`,
    },
    logPath,
  };
}

export async function verifyPackageExecutorCommands(
  expectedCommands: readonly string[],
  logPath: string,
): Promise<void> {
  if (!(await Bun.file(logPath).exists())) {
    throw new Error(`Expected package executor log at ${logPath}.`);
  }

  const rawLog = await Bun.file(logPath).text();
  const actualCommands = rawLog
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (actualCommands.length !== expectedCommands.length) {
    throw new Error(
      `Expected ${expectedCommands.length} package executor calls but found ${actualCommands.length}.`,
    );
  }

  for (const [index, expectedCommand] of expectedCommands.entries()) {
    if (actualCommands[index] !== expectedCommand) {
      throw new Error(
        `Expected executor call ${index + 1} to be "${expectedCommand}" but got "${actualCommands[index]}".`,
      );
    }
  }
}
