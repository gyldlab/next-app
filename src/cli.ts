#!/usr/bin/env bun

import { Command } from "commander";
import pc from "picocolors";
import { runCreateCommand } from "./commands/create.js";
import { runListTemplatesCommand } from "./commands/list-templates.js";
import { runInteractiveMode } from "./ui/interactive.js";
import { killActiveProcesses, type PackageManager } from "./utils/package-manager.js";

type CreateOptions = {
  readonly template?: string;
  readonly addons?: string;
  readonly install: boolean;
  readonly bun?: boolean;
  readonly pnpm?: boolean;
  readonly yarn?: boolean;
  readonly debug?: boolean;
};

/**
 * Resolve the package manager from CLI flags.
 * Returns undefined if no flag is set (auto-detect will be used).
 */
function resolvePackageManagerFromFlags(options: CreateOptions): PackageManager | undefined {
  if (options.bun) return "bun";
  if (options.pnpm) return "pnpm";
  if (options.yarn) return "yarn";
  return undefined;
}

// Global debug flag
let isDebugMode = false;

export function setDebugMode(enabled: boolean): void {
  isDebugMode = enabled;
}

export function getDebugMode(): boolean {
  return isDebugMode;
}

// Exit codes following sysexits.h conventions
const EXIT_SUCCESS = 0;
const EXIT_ERROR = 1;
const EXIT_USAGE = 64; // Command line usage error
const EXIT_CANCELLED = 130; // Script terminated by Ctrl+C

const program = new Command();

program
  .name("create-gyldlab-next")
  .description("Scaffold organization-approved Next.js projects from pre-built templates.")
  .version("0.1.0");

program
  .argument("[project-name]", "Name of the new project directory")
  .option("-t, --template <template-id>", "Template ID to use")
  .option("-a, --addons <addon-ids>", "Comma-separated add-on IDs")
  .option("--no-install", "Skip dependency installation after scaffolding")
  .option("-b, --bun", "Use bun as the package manager")
  .option("-p, --pnpm", "Use pnpm as the package manager")
  .option("-y, --yarn", "Use yarn as the package manager")
  .option("--debug", "Show detailed error stack traces")
  .action(async (projectName: string | undefined, options: CreateOptions) => {
    if (options.debug) setDebugMode(true);
    const packageManager = resolvePackageManagerFromFlags(options);
    // If interactive TTY and no template specified, use interactive mode with logo
    if (process.stdout.isTTY === true && !options.template) {
      await runInteractiveMode(projectName, options.install, "create", packageManager);
    } else {
      await runCreateCommand({
        projectName,
        templateId: options.template,
        addons: options.addons,
        install: options.install,
        packageManager,
      });
    }
  });

program
  .command("create")
  .description("Create a Next.js project from a template")
  .argument("[project-name]", "Name of the new project directory")
  .option("-t, --template <template-id>", "Template ID to use")
  .option("-a, --addons <addon-ids>", "Comma-separated add-on IDs")
  .option("--no-install", "Skip dependency installation after scaffolding")
  .option("-b, --bun", "Use bun as the package manager")
  .option("-p, --pnpm", "Use pnpm as the package manager")
  .option("-y, --yarn", "Use yarn as the package manager")
  .option("--debug", "Show detailed error stack traces")
  .action(async (projectName: string | undefined, options: CreateOptions) => {
    if (options.debug) setDebugMode(true);
    const packageManager = resolvePackageManagerFromFlags(options);
    // If interactive TTY and no template specified, use interactive mode with logo
    if (process.stdout.isTTY === true && !options.template) {
      await runInteractiveMode(projectName, options.install, "create", packageManager);
    } else {
      await runCreateCommand({
        projectName,
        templateId: options.template,
        addons: options.addons,
        install: options.install,
        packageManager,
      });
    }
  });

program
  .command("templates")
  .description("List all available templates with animated logo")
  .action(async () => {
    if (process.stdout.isTTY === true) {
      await runInteractiveMode(undefined, true, "list");
    } else {
      await runListTemplatesCommand();
    }
  });

program.addHelpText(
  "after",
  `
Examples:
  create-gyldlab-next                                   Interactive mode with logo
  create-gyldlab-next my-app                            Interactive template/addon selection
  create-gyldlab-next my-app --template next            Skip prompts, use specified template
  create-gyldlab-next my-app -b                         Use bun as package manager
  create-gyldlab-next my-app -p                         Use pnpm as package manager
  create-gyldlab-next my-app -y                         Use yarn as package manager
  create-gyldlab-next my-app --addons gsap-lenis        Include specific addons
  create-gyldlab-next my-app --no-install               Skip dependency installation
  create-gyldlab-next my-app --debug                    Show detailed error traces
  create-gyldlab-next templates                         List available templates

Package Manager:
  Auto-detected from how you run the CLI (npx → npm, bunx → bun, pnpx → pnpm, yarn dlx → yarn).
  Use -b, -p, or -y flags to override auto-detection.
`,
);

// Graceful shutdown handlers
function cleanup(): void {
  // Kill any active child processes (e.g., npm install)
  killActiveProcesses();
  console.log(pc.dim("\n\nCancelled."));
  process.exit(EXIT_CANCELLED);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown CLI error occurred.";

    // Check for specific error types to set appropriate exit codes
    let exitCode = EXIT_ERROR;
    if (message.includes("cancelled") || message.includes("Operation cancelled")) {
      exitCode = EXIT_CANCELLED;
    } else if (message.includes("not found") || message.includes("Invalid")) {
      exitCode = EXIT_USAGE;
    }

    console.error(pc.red(`\nError: ${message}`));

    if (getDebugMode() && error instanceof Error && error.stack) {
      console.error(pc.dim("\nStack trace:"));
      console.error(pc.dim(error.stack));
    } else if (exitCode !== EXIT_CANCELLED) {
      console.error(pc.dim("\nRun with --debug flag for more details."));
    }

    process.exitCode = exitCode;
  }
}

main().catch((error: unknown) => {
  console.error(pc.red("Fatal error:"), error);
  process.exitCode = EXIT_ERROR;
});
