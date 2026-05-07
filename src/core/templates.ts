import { joinPath, resolvePath } from "../utils/path.js";
import { readdir, readTextFile, type Dirent } from "../utils/runtime-fs.js";
import type {
  BaseTemplateManifest,
  BaseTemplateInfo,
  AddonManifest,
  AddonInfo,
} from "../types/templates.js";

export type { BaseTemplateManifest, BaseTemplateInfo, AddonManifest, AddonInfo };

const currentDirectory = import.meta.dir;
const repositoryRoot = resolvePath(currentDirectory, "..", "..");
const templatesRoot = joinPath(repositoryRoot, "templates");
const baseTemplatesRoot = joinPath(templatesRoot, "base");
const addonsRoot = joinPath(templatesRoot, "addons");

export async function getBaseTemplates(): Promise<BaseTemplateInfo[]> {
  let entries: Dirent<string>[];

  try {
    entries = await readdir(baseTemplatesRoot, {
      withFileTypes: true,
      encoding: "utf8",
    });
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return [];
    }
    throw error;
  }

  const templates: BaseTemplateInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const directory = joinPath(baseTemplatesRoot, entry.name);
    const manifestPath = joinPath(directory, "template.json");
    const manifest = await readBaseManifest(manifestPath, entry.name);

    templates.push({
      ...manifest,
      directory,
    });
  }

  templates.sort((left, right) => left.id.localeCompare(right.id));
  return templates;
}

export async function getAddons(): Promise<AddonInfo[]> {
  let entries: Dirent<string>[];

  try {
    entries = await readdir(addonsRoot, {
      withFileTypes: true,
      encoding: "utf8",
    });
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return [];
    }
    throw error;
  }

  const addons: AddonInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const directory = joinPath(addonsRoot, entry.name);
    const manifestPath = joinPath(directory, "addon.json");
    const manifest = await readAddonManifest(manifestPath, entry.name);

    addons.push({
      ...manifest,
      directory,
    });
  }

  addons.sort((left, right) => left.id.localeCompare(right.id));
  return addons;
}

async function readBaseManifest(
  manifestPath: string,
  fallbackId: string,
): Promise<BaseTemplateManifest> {
  try {
    const content = await readTextFile(manifestPath);
    const raw = JSON.parse(content) as Partial<BaseTemplateManifest>;

    return {
      id: raw.id?.trim() || fallbackId,
      name: raw.name?.trim() || fallbackId,
      description: raw.description?.trim() || "No description provided.",
      default: raw.default ?? false,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read template manifest at ${manifestPath}: ${reason}`);
  }
}

async function readAddonManifest(manifestPath: string, fallbackId: string): Promise<AddonManifest> {
  try {
    const content = await readTextFile(manifestPath);
    const raw = JSON.parse(content) as Partial<AddonManifest>;

    return {
      id: raw.id?.trim() || fallbackId,
      name: raw.name?.trim() || fallbackId,
      description: raw.description?.trim() || "No description provided.",
      scripts: raw.scripts ?? {},
      dependencies: raw.dependencies ?? {},
      devDependencies: raw.devDependencies ?? {},
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read addon manifest at ${manifestPath}: ${reason}`);
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
