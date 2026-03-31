import { spawn, type ChildProcess } from "node:child_process";

export type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

// Timeout for dependency installation (5 minutes)
const INSTALL_TIMEOUT_MS = 5 * 60 * 1000;

// Track active child processes for cleanup
const activeProcesses = new Set<ChildProcess>();

export function detectPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent?.toLowerCase() ?? "";

  if (userAgent.startsWith("pnpm")) {
    return "pnpm";
  }

  if (userAgent.startsWith("yarn")) {
    return "yarn";
  }

  if (userAgent.startsWith("bun")) {
    return "bun";
  }

  // Check if running under bun runtime (covers bun link scenario)
  if (process.versions.bun || process.argv[0]?.includes("bun")) {
    return "bun";
  }

  return "npm";
}

export function formatRunDevCommand(packageManager: PackageManager): string {
  return packageManager === "npm" ? "npm run dev" : `${packageManager} dev`;
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
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    activeProcesses.add(child);

    // Timeout handler
    const timeout = setTimeout(() => {
      if (!child.killed) {
        child.kill("SIGTERM");
        activeProcesses.delete(child);
        reject(new Error(`Command "${command} ${args.join(" ")}" timed out after ${INSTALL_TIMEOUT_MS / 1000}s.`));
      }
    }, INSTALL_TIMEOUT_MS);

    const cleanup = (): void => {
      clearTimeout(timeout);
      activeProcesses.delete(child);
    };

    child.once("error", (error) => {
      cleanup();
      reject(new Error(`Failed to run "${command}": ${error.message}`));
    });

    child.once("exit", (code) => {
      cleanup();
      if (code === 0) {
        resolve();
        return;
      }

      const fullCommand = [command, ...args].join(" ");
      reject(new Error(`Command "${fullCommand}" failed with exit code ${code ?? "unknown"}.`));
    });
  });
}
