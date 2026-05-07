#!/usr/bin/env bun

import pc from "picocolors";
import { CliUsageError, getCliHelpText, parseCliArgs, type CreateCliOptions } from "./cli-args.js";
import { runCreateCommand } from "./commands/create.js";
import { runListTemplatesCommand } from "./commands/list-templates.js";
import { runInteractiveMode } from "./ui/interactive.js";
import { killActiveProcesses } from "./utils/package-manager.js";
import type { PackageManager } from "./types/package-manager.js";

import packageJson from "../package.json" with { type: "json" };

const packageVersion = packageJson.version;

/**
 * Resolve the package manager from CLI flags.
 * Returns undefined if no flag is set (auto-detect will be used).
 */
function resolvePackageManagerFromFlags(options: CreateCliOptions): PackageManager | undefined {
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

// Graceful shutdown handlers
function cleanup(): void {
  // Kill any active child processes (e.g., npm install)
  killActiveProcesses();
  console.log(pc.dim("\n\nCancelled."));
  process.exit(EXIT_CANCELLED);
}

// Only register global SIGINT/SIGTERM when NOT in interactive mode.
// During interactive mode, the Ink renderer owns signal handling to
// properly restore the alternate screen buffer before exiting.
let interactiveActive = false;

export function setInteractiveActive(active: boolean): void {
  interactiveActive = active;
}

process.on("SIGINT", () => {
  if (!interactiveActive) cleanup();
});
process.on("SIGTERM", () => {
  if (!interactiveActive) cleanup();
});

async function main(): Promise<void> {
  try {
    const parsedCommand = parseCliArgs(Bun.argv.slice(2));

    if (parsedCommand.kind === "help") {
      console.log(getCliHelpText(packageVersion));
      return;
    }

    if (parsedCommand.kind === "version") {
      console.log(packageVersion);
      return;
    }

    if (parsedCommand.kind === "templates") {
      if (process.stdout.isTTY === true) {
        await runInteractiveMode(undefined, true, "list");
      } else {
        await runListTemplatesCommand();
      }

      return;
    }

    if (parsedCommand.options.debug) {
      setDebugMode(true);
    }

    const packageManager = resolvePackageManagerFromFlags(parsedCommand.options);

    if (process.stdout.isTTY === true && !parsedCommand.options.template) {
      await runInteractiveMode(
        parsedCommand.projectName,
        parsedCommand.options.install,
        "create",
        packageManager,
      );
      return;
    }

    await runCreateCommand({
      projectName: parsedCommand.projectName,
      templateId: parsedCommand.options.template,
      addons: parsedCommand.options.addons,
      install: parsedCommand.options.install,
      packageManager,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown CLI error occurred.";

    // Check for specific error types to set appropriate exit codes
    let exitCode = EXIT_ERROR;
    if (message.includes("cancelled") || message.includes("Operation cancelled")) {
      exitCode = EXIT_CANCELLED;
    } else if (
      error instanceof CliUsageError ||
      message.includes("not found") ||
      message.includes("Invalid")
    ) {
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
