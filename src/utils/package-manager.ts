import { spawn } from "node:child_process";

export type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

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

function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.once("error", (error) => {
      reject(error);
    });

    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const fullCommand = [command, ...args].join(" ");
      reject(new Error(`Command \"${fullCommand}\" failed with exit code ${code}.`));
    });
  });
}
