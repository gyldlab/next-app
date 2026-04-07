import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import pc from "picocolors";
import prompts from "prompts";
import {
  getAddons,
  getBaseTemplates,
  type AddonInfo,
  type BaseTemplateInfo,
} from "../core/templates.js";
import {
  detectPackageManager,
  formatRunDevCommand,
  installDependencies,
  type PackageManager,
} from "../utils/package-manager.js";
import { toValidPackageName } from "../utils/project-name.js";

export type CreateCommandOptions = {
  readonly projectName: string | undefined;
  readonly templateId: string | undefined;
  readonly addons: string | undefined;
  readonly install: boolean;
  readonly packageManager?: PackageManager | undefined;
};

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
  const targetDirectory = resolve(process.cwd(), projectName);
  // For ".", use current directory name as package name
  const packageName = projectName === "." ? basename(process.cwd()) : projectName;

  await ensureTargetDirectoryIsUsable(targetDirectory);

  console.log(pc.cyan(`Scaffolding ${packageName} using base template ${baseTemplate.id}...`));

  await cp(baseTemplate.directory, targetDirectory, {
    recursive: true,
    force: false,
    filter: (source) => basename(source) !== "template.json",
  });
  await restoreTemplateSymlinks(baseTemplate.directory, targetDirectory, ["template.json"]);

  if (selectedAddons.length > 0) {
    console.log(
      pc.cyan(`Applying add-ons: ${selectedAddons.map((addon) => addon.id).join(", ")}...`),
    );
    for (const addon of selectedAddons) {
      await applyAddon(targetDirectory, addon);
    }
    await syncClaudeSkillsSymlinks(targetDirectory);
  }

  await renameIfExists(join(targetDirectory, "gitignore"), join(targetDirectory, ".gitignore"));

  await rewritePackageName(targetDirectory, packageName);

  // Use explicit package manager if provided, otherwise auto-detect
  const packageManager = options.packageManager ?? detectPackageManager();

  if (options.install) {
    console.log(pc.cyan(`Installing dependencies with ${packageManager}...`));
    await installDependencies(packageManager, targetDirectory);
  }

  const relativeTargetDirectory = relative(process.cwd(), targetDirectory) || ".";
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

async function ensureTargetDirectoryIsUsable(targetDirectory: string): Promise<void> {
  try {
    const entries = await readdir(targetDirectory);
    if (entries.length > 0) {
      throw new Error(`Target directory "${targetDirectory}" is not empty.`);
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
  const packageJsonPath = join(targetDirectory, "package.json");

  try {
    const rawPackageJson = await readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(rawPackageJson) as Record<string, unknown>;
    packageJson.name = toValidPackageName(projectName);

    await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return;
    }

    throw error;
  }
}

async function applyAddon(targetDirectory: string, addon: AddonInfo): Promise<void> {
  const addonFilesDirectory = join(addon.directory, "files");

  try {
    // First, merge skills-lock.json if it exists (before cp overwrites it)
    await mergeSkillsLockfile(targetDirectory, addonFilesDirectory);

    await cp(addonFilesDirectory, targetDirectory, {
      recursive: true,
      force: true,
      // Skip skills-lock.json since we handle it separately via merge
      filter: (src) => !src.endsWith("skills-lock.json"),
    });
    await restoreTemplateSymlinks(addonFilesDirectory, targetDirectory);
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }

  await mergeAddonDependencies(targetDirectory, addon);
}

type SkillsLockfile = {
  lockfileVersion?: number;
  version?: number;
  skills?: Record<string, unknown>;
};

async function mergeSkillsLockfile(
  targetDirectory: string,
  addonFilesDirectory: string,
): Promise<void> {
  const targetLockPath = join(targetDirectory, "skills-lock.json");
  const addonLockPath = join(addonFilesDirectory, "skills-lock.json");

  // Check if addon has a skills-lock.json
  let addonLockfile: SkillsLockfile;
  try {
    const rawAddonLock = await readFile(addonLockPath, "utf8");
    addonLockfile = JSON.parse(rawAddonLock) as SkillsLockfile;
  } catch {
    // Addon doesn't have a skills-lock.json, nothing to merge
    return;
  }

  // Check if target already has a skills-lock.json
  let targetLockfile: SkillsLockfile;
  try {
    const rawTargetLock = await readFile(targetLockPath, "utf8");
    targetLockfile = JSON.parse(rawTargetLock) as SkillsLockfile;
  } catch {
    // Target doesn't have one yet, just copy the addon's lockfile
    await writeFile(targetLockPath, JSON.stringify(addonLockfile, null, 2) + "\n", "utf8");
    return;
  }

  // Merge skills from both lockfiles
  const mergedSkills = {
    ...(targetLockfile.skills ?? {}),
    ...(addonLockfile.skills ?? {}),
  };

  // Build merged lockfile, only including defined version keys
  const mergedLockfile: Record<string, unknown> = {
    skills: mergedSkills,
  };

  // Prefer lockfileVersion, fall back to version
  const lockVersion = targetLockfile.lockfileVersion ?? addonLockfile.lockfileVersion;
  const version = targetLockfile.version ?? addonLockfile.version;

  if (lockVersion !== undefined) {
    mergedLockfile.lockfileVersion = lockVersion;
  } else if (version !== undefined) {
    mergedLockfile.version = version;
  }

  await writeFile(targetLockPath, JSON.stringify(mergedLockfile, null, 2) + "\n", "utf8");
}

async function mergeAddonDependencies(targetDirectory: string, addon: AddonInfo): Promise<void> {
  const packageJsonPath = join(targetDirectory, "package.json");

  try {
    const rawPackageJson = await readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(rawPackageJson) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      [key: string]: unknown;
    };

    const addonDependencies = addon.dependencies ?? {};
    if (Object.keys(addonDependencies).length > 0) {
      packageJson.dependencies = {
        ...(packageJson.dependencies ?? {}),
        ...addonDependencies,
      };
    }

    const addonDevDependencies = addon.devDependencies ?? {};
    if (Object.keys(addonDevDependencies).length > 0) {
      packageJson.devDependencies = {
        ...(packageJson.devDependencies ?? {}),
        ...addonDevDependencies,
      };
    }

    await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
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

async function syncClaudeSkillsSymlinks(targetDirectory: string): Promise<void> {
  const agentsSkillsDir = join(targetDirectory, ".agents", "skills");
  const claudeSkillsDir = join(targetDirectory, ".claude", "skills");

  let entries: import("node:fs").Dirent<string>[];
  try {
    entries = await readdir(agentsSkillsDir, { withFileTypes: true, encoding: "utf8" });
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return;
    }
    throw error;
  }

  const skillDirs = entries.filter((e) => e.isDirectory());
  if (skillDirs.length === 0) {
    return;
  }

  await mkdir(claudeSkillsDir, { recursive: true });

  for (const skill of skillDirs) {
    const symlinkPath = join(claudeSkillsDir, skill.name);
    const symlinkTarget = join("..", "..", ".agents", "skills", skill.name);
    await removeExistingPath(symlinkPath);
    await symlink(symlinkTarget, symlinkPath);
  }
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
    const destinationPath = join(destinationRoot, templateSymlink.relativePath);
    await removeExistingPath(destinationPath);
    await mkdir(dirname(destinationPath), { recursive: true });
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
    const sourcePath = join(currentDirectory, entry.name);
    const relativePath = relative(sourceRoot, sourcePath);

    if (ignoredPathSet.has(relativePath)) {
      continue;
    }

    if (entry.isSymbolicLink()) {
      const linkTarget = await readlink(sourcePath, "utf8");
      symlinks.push({
        relativePath,
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
