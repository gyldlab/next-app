import pc from "picocolors";
import prompts from "prompts";
import { generateHomePage } from "./home-page-template.js";
import { getSkillInstallSpecs } from "../config/skills.js";
import { getAddons, getBaseTemplates } from "../core/templates.js";
import type { AddonInfo, BaseTemplateInfo } from "../types/templates.js";
import {
  detectPackageManager,
  formatRunDevCommand,
  getPackageManagerDlxCommand,
  installDependencies,
} from "../utils/package-manager.js";
import type { PackageManager } from "../types/package-manager.js";
import { basenamePath, dirnamePath, joinPath, relativePath, resolvePath } from "../utils/path.js";
import {
  cp,
  lstat,
  mkdir,
  readTextFile,
  readdir,
  readlink,
  rename,
  rm,
  symlink,
  writeTextFile,
} from "../utils/runtime-fs.js";
import { toValidPackageName } from "../utils/project-name.js";

import type { CreateCommandOptions } from "../types/cli.js";

const SHADCN_SKILL_ID = "shadcn/ui";
const SHADCN_SKILL_ROOT_DIRECTORIES = [".claude", ".agents"] as const;
const SHADCN_SKILL_REMOVED_ENTRIES = ["agents", "assets"] as const;
const SHADCN_SKILL_USER_INVOCABLE_PATTERN = /^user-invocable: false\r?\n/m;

export async function runCreateCommand(options: CreateCommandOptions): Promise<void> {
  const baseTemplates = await getBaseTemplates();
  const availableAddons = await getAddons();

  if (baseTemplates.length === 0) {
    throw new Error(
      "No base templates were found. Add at least one template under templates/base/.",
    );
  }

  const projectName = await resolveProjectName(options.projectName);
  const baseTemplate = await resolveBaseTemplate(baseTemplates, options.templateId);
  const selectedAddons = await resolveAddons(availableAddons, options.addons);
  const targetDirectory = resolvePath(projectName);
  // For ".", use current directory name as package name
  const packageName = projectName === "." ? basenamePath(process.cwd()) : projectName;
  const packageManager = options.packageManager ?? detectPackageManager();

  await ensureTargetDirectoryIsUsable(targetDirectory, baseTemplate, selectedAddons);

  console.log(pc.cyan(`Scaffolding ${packageName} using base template ${baseTemplate.id}...`));

  await cp(baseTemplate.directory, targetDirectory, {
    recursive: true,
    force: false,
    filter: (source) => basenamePath(source) !== "template.json",
  });
  await restoreTemplateSymlinks(baseTemplate.directory, targetDirectory, ["template.json"]);

  if (selectedAddons.length > 0) {
    console.log(
      pc.cyan(`Applying add-ons: ${selectedAddons.map((addon) => addon.id).join(", ")}...`),
    );
    for (const addon of selectedAddons) {
      await applyAddon(targetDirectory, addon);
    }
  }

  await writeTextFile(
    joinPath(targetDirectory, "src", "app", "page.tsx"),
    generateHomePage(selectedAddons.map((addon) => addon.id)),
  );

  await renameIfExists(
    joinPath(targetDirectory, "gitignore"),
    joinPath(targetDirectory, ".gitignore"),
  );

  await rewritePackageName(targetDirectory, packageName);
  await installAgentSkills(targetDirectory, baseTemplate, selectedAddons, packageManager);

  if (options.install) {
    console.log(pc.cyan(`Installing dependencies with ${packageManager}...`));
    await installDependencies(packageManager, targetDirectory);
  }

  const relativeTargetDirectory = relativePath(process.cwd(), targetDirectory) || ".";
  console.log(pc.green("\nProject ready.\n"));
  console.log("Next steps:");
  if (relativeTargetDirectory !== ".") {
    console.log(`  cd ${relativeTargetDirectory}`);
  }
  if (!options.install) {
    console.log(`  ${packageManager} install`);
  }
  console.log(`  ${formatRunDevCommand(packageManager)}`);
}

async function resolveProjectName(providedProjectName?: string): Promise<string> {
  if (providedProjectName?.trim()) {
    return validateProjectName(providedProjectName.trim());
  }

  const response = (await prompts(
    {
      type: "text",
      name: "projectName",
      message: "Project name",
      initial: "my-next-app",
      validate: (value) => (value.trim().length === 0 ? "Project name is required." : true),
      stdin: process.stdin,
      stdout: process.stdout,
    },
    {
      onCancel: () => {
        throw new Error("Operation cancelled.");
      },
    },
  )) as { projectName?: string };

  return validateProjectName((response.projectName ?? "").trim());
}

async function resolveBaseTemplate(
  templates: BaseTemplateInfo[],
  providedTemplateId?: string,
): Promise<BaseTemplateInfo> {
  if (providedTemplateId?.trim()) {
    const exactMatch = templates.find((template) => template.id === providedTemplateId.trim());

    if (!exactMatch) {
      throw new Error(
        `Base template "${providedTemplateId}" was not found. Run "bun create @gyldlab/next templates" to view all options.`,
      );
    }

    return exactMatch;
  }

  const defaultTemplateIndex = templates.findIndex((template) => template.default);

  const response = (await prompts(
    {
      type: "select",
      name: "templateId",
      message: "Select a template",
      initial: defaultTemplateIndex >= 0 ? defaultTemplateIndex : 0,
      choices: templates.map((template) => ({
        title: `${template.name} (${template.id})`,
        description: template.description,
        value: template.id,
      })),
      stdin: process.stdin,
      stdout: process.stdout,
    },
    {
      onCancel: () => {
        throw new Error("Operation cancelled.");
      },
    },
  )) as { templateId?: string };

  const selectedTemplate = templates.find((template) => template.id === response.templateId);

  if (!selectedTemplate) {
    throw new Error("No template selected.");
  }

  return selectedTemplate;
}

async function resolveAddons(
  addons: AddonInfo[],
  providedAddonList?: string,
): Promise<AddonInfo[]> {
  if (addons.length === 0) {
    return [];
  }

  // When providedAddonList is a string (even empty), the caller has explicitly
  // specified which addons to use — skip the interactive prompt.
  if (providedAddonList !== undefined) {
    const requestedAddonIds = providedAddonList
      .split(",")
      .map((addonId) => addonId.trim())
      .filter((addonId) => addonId.length > 0);

    const selectedAddons: AddonInfo[] = [];

    for (const addonId of requestedAddonIds) {
      const addon = addons.find((candidate) => candidate.id === addonId);
      if (!addon) {
        throw new Error(
          `Add-on "${addonId}" was not found. Run "bun create @gyldlab/next templates" to view all options.`,
        );
      }
      selectedAddons.push(addon);
    }

    return selectedAddons;
  }

  const response = (await prompts(
    {
      type: "multiselect",
      name: "addonIds",
      message: "Select optional add-ons",
      hint: "Press space to select, enter to continue",
      choices: addons.map((addon) => ({
        title: `${addon.name} (${addon.id})`,
        description: addon.description,
        value: addon.id,
      })),
      stdin: process.stdin,
      stdout: process.stdout,
    },
    {
      onCancel: () => {
        throw new Error("Operation cancelled.");
      },
    },
  )) as { addonIds?: string[] };

  const selectedAddonIds = response.addonIds ?? [];
  return addons.filter((addon) => selectedAddonIds.includes(addon.id));
}

// Reserved names that shouldn't be used as project names
const RESERVED_NAMES = [
  "node_modules",
  ".git",
  ".github",
  ".vscode",
  "package.json",
  "package-lock.json",
  "bun.lock",
  "yarn.lock",
  "pnpm-lock.yaml",
];

// Windows reserved device names
const WINDOWS_RESERVED = [
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "com5",
  "com6",
  "com7",
  "com8",
  "com9",
  "lpt1",
  "lpt2",
  "lpt3",
  "lpt4",
  "lpt5",
  "lpt6",
  "lpt7",
  "lpt8",
  "lpt9",
];

function validateProjectName(projectName: string): string {
  if (projectName.length === 0) {
    throw new Error("Project name is required.");
  }

  // Allow "." to scaffold in current directory
  if (projectName === ".") {
    return projectName;
  }

  if (projectName === "..") {
    throw new Error('Project name cannot be "..".');
  }

  // Allow absolute paths (for programmatic use)
  // But validate the basename for relative paths
  const isAbsolutePath = projectName.startsWith("/") || /^[A-Za-z]:[\\/]/.test(projectName);

  if (isAbsolutePath) {
    // For absolute paths, just return as-is (validation happens at directory level)
    return projectName;
  }

  // For relative paths, don't allow path separators (must be a simple name)
  if (/[\\/]/.test(projectName)) {
    throw new Error(
      "Project name cannot contain path separators. Use an absolute path or a simple name.",
    );
  }

  // Check for reserved names
  const lowerName = projectName.toLowerCase();
  if (RESERVED_NAMES.includes(lowerName)) {
    throw new Error(`"${projectName}" is a reserved name and cannot be used as a project name.`);
  }

  // Check for Windows reserved device names
  if (
    WINDOWS_RESERVED.includes(lowerName) ||
    WINDOWS_RESERVED.some((r) => lowerName.startsWith(`${r}.`))
  ) {
    throw new Error(`"${projectName}" is a reserved system name and cannot be used.`);
  }

  // Check for invalid characters (only allow alphanumeric, dash, underscore, dot)
  if (!/^[a-zA-Z0-9._-]+$/.test(projectName)) {
    throw new Error(
      "Project name can only contain letters, numbers, dashes, underscores, and dots.",
    );
  }

  // Don't allow names starting with a dot (hidden files)
  if (projectName.startsWith(".")) {
    throw new Error("Project name cannot start with a dot.");
  }

  return projectName;
}

const PROJECT_MARKERS = [
  ".next",
  "bun.lock",
  "bun.lockb",
  "node_modules",
  "package-lock.json",
  "package.json",
  "pnpm-lock.yaml",
  "yarn.lock",
];
const LEGACY_SKILL_TEMPLATE_ENTRIES = new Set([".agents", ".claude", "skills-lock.json"]);

async function ensureTargetDirectoryIsUsable(
  targetDirectory: string,
  baseTemplate: BaseTemplateInfo,
  selectedAddons: readonly AddonInfo[],
): Promise<void> {
  try {
    const entries = await readdir(targetDirectory);
    if (entries.length === 0) {
      return;
    }

    const scaffoldedEntries = await getScaffoldedTopLevelEntries(baseTemplate, selectedAddons);
    const blockedEntries = [...new Set([...scaffoldedEntries, ...PROJECT_MARKERS])].filter(
      (entry) => entries.includes(entry),
    );

    if (blockedEntries.length > 0) {
      throw new Error(
        `Target directory "${targetDirectory}" contains existing project files that would conflict with scaffolding: ${blockedEntries.join(", ")}.`,
      );
    }
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      await mkdir(targetDirectory, { recursive: true });
      return;
    }

    if (isNodeErrorWithCode(error, "ENOTDIR")) {
      throw new Error(`Target path "${targetDirectory}" already exists and is not a directory.`);
    }

    throw error;
  }
}

async function getScaffoldedTopLevelEntries(
  baseTemplate: BaseTemplateInfo,
  selectedAddons: readonly AddonInfo[],
): Promise<string[]> {
  const topLevelEntries = new Set(
    await getTopLevelEntries(baseTemplate.directory, new Set(["template.json"])),
  );

  for (const addon of selectedAddons) {
    const addonFilesDirectory = joinPath(addon.directory, "files");
    const addonEntries = await getTopLevelEntries(
      addonFilesDirectory,
      LEGACY_SKILL_TEMPLATE_ENTRIES,
    );

    for (const entry of addonEntries) {
      topLevelEntries.add(entry);
    }
  }

  return [...topLevelEntries];
}

async function getTopLevelEntries(
  directory: string,
  ignoredEntries: ReadonlySet<string> = new Set(),
): Promise<string[]> {
  try {
    const entries = await readdir(directory, {
      withFileTypes: true,
      encoding: "utf8",
    });

    return entries.map((entry) => entry.name).filter((entryName) => !ignoredEntries.has(entryName));
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return [];
    }

    throw error;
  }
}

async function renameIfExists(sourcePath: string, destinationPath: string): Promise<void> {
  try {
    await rename(sourcePath, destinationPath);
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }
}

async function rewritePackageName(targetDirectory: string, projectName: string): Promise<void> {
  const packageJsonPath = joinPath(targetDirectory, "package.json");

  try {
    const rawPackageJson = await readTextFile(packageJsonPath);
    const packageJson = JSON.parse(rawPackageJson) as Record<string, unknown>;
    packageJson.name = toValidPackageName(projectName);

    await writeTextFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return;
    }

    throw error;
  }
}

async function applyAddon(targetDirectory: string, addon: AddonInfo): Promise<void> {
  const addonFilesDirectory = joinPath(addon.directory, "files");

  try {
    await cp(addonFilesDirectory, targetDirectory, {
      recursive: true,
      force: true,
      filter: (src) => shouldCopyAddonPath(addonFilesDirectory, src),
    });
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }

  await mergeAddonPackageJson(targetDirectory, addon);
}

type ScaffoldPackageJson = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
};

type ScaffoldPackageJsonSection = "scripts" | "dependencies" | "devDependencies";

function mergePackageJsonSection(
  packageJson: ScaffoldPackageJson,
  section: ScaffoldPackageJsonSection,
  additions: Readonly<Record<string, string>> | undefined,
): void {
  if (!additions || Object.keys(additions).length === 0) {
    return;
  }

  packageJson[section] = {
    ...(packageJson[section] ?? {}),
    ...additions,
  };
}

async function mergeAddonPackageJson(targetDirectory: string, addon: AddonInfo): Promise<void> {
  const packageJsonPath = joinPath(targetDirectory, "package.json");

  try {
    const rawPackageJson = await readTextFile(packageJsonPath);
    const packageJson = JSON.parse(rawPackageJson) as ScaffoldPackageJson;

    mergePackageJsonSection(packageJson, "scripts", addon.scripts);
    mergePackageJsonSection(packageJson, "dependencies", addon.dependencies);
    mergePackageJsonSection(packageJson, "devDependencies", addon.devDependencies);

    await writeTextFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return;
    }

    throw error;
  }
}

function isNodeErrorWithCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { readonly code?: string }).code === code
  );
}

async function installAgentSkills(
  targetDirectory: string,
  baseTemplate: BaseTemplateInfo,
  selectedAddons: readonly AddonInfo[],
  packageManager: PackageManager,
): Promise<void> {
  const skillSpecs = getSkillInstallSpecs(
    baseTemplate.id,
    selectedAddons.map((addon) => addon.id),
  );

  if (skillSpecs.length === 0) {
    return;
  }

  const executor = getPackageManagerDlxCommand(packageManager);
  console.log(pc.cyan(`Installing agent skills with ${packageManager}...`));

  for (const skillSpec of skillSpecs) {
    await runScaffoldCommand(
      executor.command,
      [...executor.args, ...skillSpec.args],
      targetDirectory,
    );

    if (skillSpec.id === SHADCN_SKILL_ID) {
      await cleanupInstalledShadcnSkill(targetDirectory);
    }
  }
}

async function cleanupInstalledShadcnSkill(targetDirectory: string): Promise<void> {
  for (const rootDirectory of SHADCN_SKILL_ROOT_DIRECTORIES) {
    const skillDirectory = joinPath(targetDirectory, rootDirectory, "skills", "shadcn");

    for (const removedEntry of SHADCN_SKILL_REMOVED_ENTRIES) {
      await rm(joinPath(skillDirectory, removedEntry), { recursive: true, force: true });
    }

    const skillFilePath = joinPath(skillDirectory, "SKILL.md");

    let skillFileContent: string;
    try {
      skillFileContent = await readTextFile(skillFilePath);
    } catch (error) {
      if (isNodeErrorWithCode(error, "ENOENT")) {
        continue;
      }

      throw error;
    }

    const cleanedSkillFileContent = skillFileContent.replace(
      SHADCN_SKILL_USER_INVOCABLE_PATTERN,
      "",
    );

    if (cleanedSkillFileContent !== skillFileContent) {
      await writeTextFile(skillFilePath, cleanedSkillFileContent);
    }
  }
}

function shouldCopyAddonPath(addonFilesDirectory: string, sourcePath: string): boolean {
  const relativeSourcePath = relativePath(addonFilesDirectory, sourcePath);

  if (relativeSourcePath.length === 0) {
    return true;
  }

  const [topLevelEntry = ""] = relativeSourcePath.split(/[\\/]/);
  return !LEGACY_SKILL_TEMPLATE_ENTRIES.has(topLevelEntry);
}

function runScaffoldCommand(command: string, args: readonly string[], cwd: string): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    let child: ReturnType<typeof Bun.spawn>;

    try {
      child = Bun.spawn([command, ...args], {
        cwd,
        env: process.env,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown spawn error";
      rejectPromise(new Error(`Failed to run "${command}": ${reason}`));
      return;
    }

    child.exited
      .then((code) => {
        if (code === 0) {
          resolvePromise();
          return;
        }

        rejectPromise(
          new Error(
            `Command "${[command, ...args].join(" ")}" failed with exit code ${code ?? "unknown"}.`,
          ),
        );
      })
      .catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : "Unknown spawn error";
        rejectPromise(new Error(`Failed to run "${command}": ${reason}`));
      });
  });
}

type TemplateSymlink = {
  readonly relativePath: string;
  readonly linkTarget: string;
};

async function restoreTemplateSymlinks(
  sourceRoot: string,
  destinationRoot: string,
  ignoredRelativePaths: readonly string[] = [],
): Promise<void> {
  const ignoredPathSet = new Set(ignoredRelativePaths);
  const templateSymlinks = await collectTemplateSymlinks(sourceRoot, sourceRoot, ignoredPathSet);

  for (const templateSymlink of templateSymlinks) {
    const destinationPath = joinPath(destinationRoot, templateSymlink.relativePath);
    await removeExistingPath(destinationPath);
    await mkdir(dirnamePath(destinationPath), { recursive: true });
    await symlink(templateSymlink.linkTarget, destinationPath);
  }
}

async function collectTemplateSymlinks(
  sourceRoot: string,
  currentDirectory: string,
  ignoredPathSet: ReadonlySet<string>,
): Promise<TemplateSymlink[]> {
  const entries = await readdir(currentDirectory, {
    withFileTypes: true,
    encoding: "utf8",
  });

  const symlinks: TemplateSymlink[] = [];

  for (const entry of entries) {
    const sourcePath = joinPath(currentDirectory, entry.name);
    const relativePathValue = relativePath(sourceRoot, sourcePath);

    if (ignoredPathSet.has(relativePathValue)) {
      continue;
    }

    if (entry.isSymbolicLink()) {
      const linkTarget = await readlink(sourcePath, "utf8");
      symlinks.push({
        relativePath: relativePathValue,
        linkTarget,
      });
      continue;
    }

    if (entry.isDirectory()) {
      const nestedSymlinks = await collectTemplateSymlinks(sourceRoot, sourcePath, ignoredPathSet);
      symlinks.push(...nestedSymlinks);
    }
  }

  return symlinks;
}

async function removeExistingPath(path: string): Promise<void> {
  try {
    const stat = await lstat(path);
    const recursive = stat.isDirectory() && !stat.isSymbolicLink();
    await rm(path, {
      recursive,
      force: true,
    });
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }
}
