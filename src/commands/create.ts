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
} from "../utils/package-manager.js";
import { toValidPackageName } from "../utils/project-name.js";

export type CreateCommandOptions = {
  readonly projectName: string | undefined;
  readonly templateId: string | undefined;
  readonly addons: string | undefined;
  readonly install: boolean;
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

  await ensureTargetDirectoryIsUsable(targetDirectory);

  console.log(pc.cyan(`Scaffolding ${projectName} using base template ${baseTemplate.id}...`));

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
  }

  await renameIfExists(join(targetDirectory, "gitignore"), join(targetDirectory, ".gitignore"));

  await rewritePackageName(targetDirectory, projectName);

  const packageManager = detectPackageManager();

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
        `Base template "${providedTemplateId}" was not found. Run "create-gyld-next templates" to view all options.`,
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

  if (providedAddonList?.trim()) {
    const requestedAddonIds = providedAddonList
      .split(",")
      .map((addonId) => addonId.trim())
      .filter((addonId) => addonId.length > 0);

    const selectedAddons: AddonInfo[] = [];

    for (const addonId of requestedAddonIds) {
      const addon = addons.find((candidate) => candidate.id === addonId);
      if (!addon) {
        throw new Error(
          `Add-on "${addonId}" was not found. Run "create-gyld-next templates" to view all options.`,
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

function validateProjectName(projectName: string): string {
  if (projectName.length === 0) {
    throw new Error("Project name is required.");
  }

  if (projectName === "." || projectName === "..") {
    throw new Error('Project name cannot be "." or "..".');
  }

  if (/[\\/]/.test(projectName)) {
    throw new Error("Project name cannot contain path separators.");
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
    await cp(addonFilesDirectory, targetDirectory, {
      recursive: true,
      force: true,
    });
    await restoreTemplateSymlinks(addonFilesDirectory, targetDirectory);
  } catch (error) {
    if (!isNodeErrorWithCode(error, "ENOENT")) {
      throw error;
    }
  }

  await mergeAddonDependencies(targetDirectory, addon);
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
