import type { PackageManager } from "../types/package-manager.js";

export type { PackageManager };

export type PackageExecutor = {
  readonly command: string;
  readonly args: readonly string[];
};

// Timeout for dependency installation (5 minutes)
const INSTALL_TIMEOUT_MS = 5 * 60 * 1000;

// Track active child processes for cleanup
const activeProcesses = new Set<ReturnType<typeof Bun.spawn>>();

/**
 * Detect the package manager based on how the CLI was invoked.
 * Priority:
 * 1. npm_config_user_agent (set by npx/pnpx/yarn dlx/bunx)
 * 2. process.versions.bun (running under bun runtime)
 * 3. process.argv[0] contains "bun" (bun link scenario)
 * 4. Default to npm
 */
export function detectPackageManager(): PackageManager {
  // Check npm_config_user_agent first (most reliable for npx/bunx/pnpx/yarn dlx)
  const userAgent = process.env.npm_config_user_agent?.toLowerCase() ?? "";

  if (userAgent.includes("bun")) {
    return "bun";
  }

  if (userAgent.includes("pnpm")) {
    return "pnpm";
  }

  if (userAgent.includes("yarn")) {
    return "yarn";
  }

  if (userAgent.includes("npm")) {
    return "npm";
  }

  // Check if running under bun runtime (covers bun link and direct bun execution)
  if (process.versions.bun) {
    return "bun";
  }

  // Check if invoked via bun command
  const execPath = process.argv[0]?.toLowerCase() ?? "";
  if (execPath.includes("bun")) {
    return "bun";
  }

  // Default to npm
  return "npm";
}

export function formatRunDevCommand(packageManager: PackageManager): string {
  return packageManager === "npm" ? "npm run dev" : `${packageManager} dev`;
}

export function getPackageManagerDlxCommand(packageManager: PackageManager): PackageExecutor {
  switch (packageManager) {
    case "bun":
      return {
        command: "bun",
        args: ["x"],
      };
    case "pnpm":
      return {
        command: "pnpm",
        args: ["dlx"],
      };
    case "yarn":
      return {
        command: "yarn",
        args: ["dlx"],
      };
    case "npm":
      return {
        command: "npx",
        args: [],
      };
    default:
      return {
        command: "npx",
        args: [],
      };
  }
}

export async function installDependencies(
  packageManager: PackageManager,
  cwd: string,
): Promise<void> {
  const args = packageManager === "yarn" ? [] : ["install"];
  await runCommand(packageManager, args, cwd);
}

/**
 * Kill all active child processes. Called during cleanup/shutdown.
 */
export function killActiveProcesses(): void {
  for (const child of activeProcesses) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  activeProcesses.clear();
}

function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    let child: ReturnType<typeof Bun.spawn>;

    try {
      child = Bun.spawn([command, ...args], {
        cwd,
        env: process.env,
        stdin: "ignore",
        stdout: "inherit",
        stderr: "inherit",
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown spawn error";
      reject(new Error(`Failed to run "${command}": ${reason}`));
      return;
    }

    activeProcesses.add(child);

    // Timeout handler
    const timeout = setTimeout(() => {
      if (!child.killed) {
        timedOut = true;
        child.kill("SIGTERM");
      }
    }, INSTALL_TIMEOUT_MS);

    const cleanup = (): void => {
      clearTimeout(timeout);
      activeProcesses.delete(child);
    };

    child.exited
      .then((code) => {
        cleanup();

        if (timedOut) {
          reject(
            new Error(
              `Command "${command} ${args.join(" ")}" timed out after ${INSTALL_TIMEOUT_MS / 1000}s.`,
            ),
          );
          return;
        }

        if (code === 0) {
          resolve();
          return;
        }

        const fullCommand = [command, ...args].join(" ");
        reject(new Error(`Command "${fullCommand}" failed with exit code ${code ?? "unknown"}.`));
      })
      .catch((error: unknown) => {
        cleanup();
        const reason = error instanceof Error ? error.message : "Unknown spawn error";
        reject(new Error(`Failed to run "${command}": ${reason}`));
      });
  });
}
