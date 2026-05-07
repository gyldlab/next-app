import type { CreateCliOptions, ParsedCliCommand } from "./types/cli.js";

export type { CreateCliOptions, ParsedCliCommand };

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

const HELP_TEXT = `Scaffold organization-approved Next.js projects from pre-built templates.

Usage:
  create-next [project-name] [options]
  create-next create [project-name] [options]
  create-next templates

Options:
  -t, --template <template-id>  Template ID to use
  -a, --addons <addon-ids>      Comma-separated add-on IDs
  --no-install                  Skip dependency installation after scaffolding
  -b, --bun                     Use bun as the package manager
  -p, --pnpm                    Use pnpm as the package manager
  -y, --yarn                    Use yarn as the package manager
  --debug                       Show detailed error stack traces
  -h, --help                    Show help information
  -V, --version                 Show CLI version

Examples:
  bun create @gyldlab/next
  bun create @gyldlab/next my-app
  bun create @gyldlab/next my-app --template next
  bun create @gyldlab/next my-app --addons gsap-lenis
  bun create @gyldlab/next my-app --no-install
  bun create @gyldlab/next templates

Package Manager:
  Auto-detected from invocation (npm create → npm, bun create → bun, pnpm create → pnpm, yarn create → yarn).
  Use -b, -p, or -y flags to override auto-detection.
`;

export function getCliHelpText(packageVersion: string): string {
  return `@gyldlab/create-next ${packageVersion}\n\n${HELP_TEXT}`;
}

export function parseCliArgs(rawArgs: readonly string[]): ParsedCliCommand {
  const args = [...rawArgs];
  const [firstArgument] = args;

  if (firstArgument === "templates") {
    if (args.length > 1) {
      throw new CliUsageError('The "templates" command does not accept additional arguments.');
    }

    return { kind: "templates" };
  }

  if (firstArgument === "create") {
    return parseCreateArgs(args.slice(1));
  }

  return parseCreateArgs(args);
}

function parseCreateArgs(args: readonly string[]): ParsedCliCommand {
  let projectName: string | undefined;
  let selectedPackageManager: "bun" | "pnpm" | "yarn" | undefined;
  const options: {
    template?: string;
    addons?: string;
    install: boolean;
    bun?: boolean;
    pnpm?: boolean;
    yarn?: boolean;
    debug?: boolean;
  } = {
    install: true,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === undefined) {
      continue;
    }

    if (argument === "-h" || argument === "--help") {
      return { kind: "help" };
    }

    if (argument === "-V" || argument === "--version") {
      return { kind: "version" };
    }

    if (argument === "--debug") {
      options.debug = true;
      continue;
    }

    if (argument === "--no-install") {
      options.install = false;
      continue;
    }

    if (argument === "-b" || argument === "--bun") {
      selectedPackageManager = setPackageManagerFlag(selectedPackageManager, "bun");
      options.bun = true;
      continue;
    }

    if (argument === "-p" || argument === "--pnpm") {
      selectedPackageManager = setPackageManagerFlag(selectedPackageManager, "pnpm");
      options.pnpm = true;
      continue;
    }

    if (argument === "-y" || argument === "--yarn") {
      selectedPackageManager = setPackageManagerFlag(selectedPackageManager, "yarn");
      options.yarn = true;
      continue;
    }

    if (argument === "-t" || argument === "--template") {
      options.template = readOptionValue("template", args, index + 1);
      index += 1;
      continue;
    }

    if (argument.startsWith("--template=")) {
      options.template = readInlineOptionValue("template", argument);
      continue;
    }

    if (argument === "-a" || argument === "--addons") {
      options.addons = readOptionValue("addons", args, index + 1);
      index += 1;
      continue;
    }

    if (argument.startsWith("--addons=")) {
      options.addons = readInlineOptionValue("addons", argument);
      continue;
    }

    if (argument.startsWith("-")) {
      throw new CliUsageError(`Unknown option: ${argument}`);
    }

    if (projectName !== undefined) {
      throw new CliUsageError(`Unexpected argument: ${argument}`);
    }

    projectName = argument;
  }

  return {
    kind: "create",
    ...(projectName ? { projectName } : {}),
    options,
  };
}

function readOptionValue(optionName: string, args: readonly string[], index: number): string {
  const value = args[index];

  if (!value || value.startsWith("-")) {
    throw new CliUsageError(`Option "${optionName}" requires a value.`);
  }

  return value;
}

function readInlineOptionValue(optionName: string, argument: string): string {
  const [, ...parts] = argument.split("=");
  const value = parts.join("=").trim();

  if (value.length === 0) {
    throw new CliUsageError(`Option "${optionName}" requires a value.`);
  }

  return value;
}

function setPackageManagerFlag(
  current: "bun" | "pnpm" | "yarn" | undefined,
  next: "bun" | "pnpm" | "yarn",
): "bun" | "pnpm" | "yarn" {
  if (current && current !== next) {
    throw new CliUsageError("Use only one package manager flag at a time.");
  }

  return next;
}
