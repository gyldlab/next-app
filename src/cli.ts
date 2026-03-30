#!/usr/bin/env node

import { Command } from "commander";
import pc from "picocolors";
import { runCreateCommand } from "./commands/create.js";
import { runListTemplatesCommand } from "./commands/list-templates.js";

// Custom GYLDLAB ASCII logo - matches the brand SVG
const GYLDLAB_LOGO = `
                      ++++++++++++++++++++++++++++++++++++++      
                      ++++++++++++++++++++++++++++++++++++++      
                      ++++++++++++++++++++++++++++++++++++++      
                      ++++++++++++++++++++++++++++++++++++++      
            +++++++++++++++++++++++++++++++++++++++++++++++       
            +++++++++++                                           
            +++++++++++                               ++++++++++  
            +++++++++++                              +++++++++++  
            +++++++++++                              +++++++++++  
            +++++++++++++++++++++++++++++++          +++++++++++  
            ++++++++++++++++++++++++++++++++++       +++++++++++  
              ++++++++++++++++++++++++++++++++++     +++++++++++  
                 +++++++++++++++++++++++++++++++++++++++++++++++  
                   +++++++++++++++++++++++++++++++++++++++++++++  
                     +++++++++++++++++++++++++++++++++++++++++++  
                                                                                   
                                                                                                                                          
                               88           88  88              88           
                               88           88  88              88           
                               88           88  88              88           
      ,adPPYb,d8  8b       d8  88   ,adPPYb,88  88  ,adPPYYba,  88,dPPYba,   
     a8"    \`Y88  \`8b     d8'  88  a8"    \`Y88  88  ""     \`Y8  88P'    "8a  
     8b       88   \`8b   d8'   88  8b       88  88  ,adPPPPP88  88       d8  
     "8a,   ,d88    \`8b,d8'    88  "8a,   ,d88  88  88,    ,88  88b,   ,a8"  
      \`"YbbdP"Y8      Y88'     88   \`"8bbdP"Y8  88  \`"8bbdP"Y8  8Y"Ybbd8"'   
      aa,    ,88      d8'                                                    
       "Y8bbdP"      d8'                                                     
`;

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
    await runCreateCommand({
      projectName,
      templateId: options.template,
      addons: options.addons,
      install: options.install,
    });
  });

program
  .command("create")
  .description("Create a Next.js project from a template")
  .argument("[project-name]", "Name of the new project directory")
  .option("-t, --template <template-id>", "Template ID to use")
  .option("-a, --addons <addon-ids>", "Comma-separated add-on IDs")
  .option("--no-install", "Skip dependency installation after scaffolding")
  .action(async (projectName: string | undefined, options: CreateOptions) => {
    await runCreateCommand({
      projectName,
      templateId: options.template,
      addons: options.addons,
      install: options.install,
    });
  });

program
  .command("templates")
  .description("List all available templates")
  .action(async () => {
    await runListTemplatesCommand();
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
    if (shouldShowBrandBanner(process.argv.slice(2))) {
      printBrandBanner();
    }

    await program.parseAsync(process.argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown CLI error occurred.";
    console.error(pc.red(`Error: ${message}`));
    process.exitCode = 1;
  }
}

function shouldShowBrandBanner(args: readonly string[]): boolean {
  if (!process.stdout.isTTY) {
    return false;
  }

  if (process.env.GYLDLAB_CLI_NO_BANNER === "1") {
    return false;
  }

  return !args.includes("--version") && !args.includes("-v");
}

function printBrandBanner(): void {
  // Print the custom GYLDLAB ASCII logo
  for (const line of GYLDLAB_LOGO.split("\n")) {
    console.log(pc.white(line));
  }

  console.log(pc.dim(centerLine("create-gyld-next :: templates + addons + skills")));
  console.log();
}

function centerLine(line: string): string {
  const terminalWidth = process.stdout.columns ?? 0;

  if (terminalWidth <= line.length) {
    return line;
  }

  const padding = Math.floor((terminalWidth - line.length) / 2);
  return `${" ".repeat(padding)}${line}`;
}

void main();
