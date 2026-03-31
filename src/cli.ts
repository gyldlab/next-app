#!/usr/bin/env node

import { Command } from "commander";
import pc from "picocolors";
import { runCreateCommand } from "./commands/create.js";
import { runListTemplatesCommand } from "./commands/list-templates.js";
import { runInteractiveMode } from "./ui/interactive.js";

type CreateOptions = {
  readonly template?: string;
  readonly addons?: string;
  readonly install: boolean;
};

const program = new Command();

program
  .name("create-gyld-next")
  .description("Scaffold organization-approved Next.js projects from pre-built templates.")
  .version("0.1.0");

program
  .argument("[project-name]", "Name of the new project directory")
  .option("-t, --template <template-id>", "Template ID to use")
  .option("-a, --addons <addon-ids>", "Comma-separated add-on IDs")
  .option("--no-install", "Skip dependency installation after scaffolding")
  .action(async (projectName: string | undefined, options: CreateOptions) => {
    // If interactive TTY and no template specified, use interactive mode
    if (process.stdout.isTTY && !options.template && projectName) {
      await runInteractiveMode(projectName, options.install);
    } else {
      await runCreateCommand({
        projectName,
        templateId: options.template,
        addons: options.addons,
        install: options.install,
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
  .action(async (projectName: string | undefined, options: CreateOptions) => {
    // If interactive TTY and no template specified, use interactive mode
    if (process.stdout.isTTY && !options.template && projectName) {
      await runInteractiveMode(projectName, options.install);
    } else {
      await runCreateCommand({
        projectName,
        templateId: options.template,
        addons: options.addons,
        install: options.install,
      });
    }
  });

program
  .command("templates")
  .description("List all available templates with animated logo")
  .action(async () => {
    if (process.stdout.isTTY) {
      await runInteractiveMode(undefined, true, "list");
    } else {
      await runListTemplatesCommand();
    }
  });

program.addHelpText(
  "after",
  `
Examples:
  create-gyld-next my-app
  create-gyld-next my-app --template next
  create-gyld-next my-app --addons gsap-lenis
  create-gyld-next my-app --template next --addons gsap-lenis
  create-gyld-next create my-app --no-install
  create-gyld-next templates
`,
);

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown CLI error occurred.";
    console.error(pc.red(`Error: ${message}`));
    process.exitCode = 1;
  }
}

void main();
