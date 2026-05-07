import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { PackageManager } from "../../src/types/package-manager.js";
import { joinPath } from "../../src/utils/path.js";
import {
  chmod,
  mkdir,
  readTextFile,
  readdir,
  rm,
  writeTextFile,
} from "../../src/utils/runtime-fs.js";
import { runCreateCommand } from "../../src/commands/create.js";

const TEST_DIR = "/tmp/gyldlab-create-test";
const ORIGINAL_PATH = process.env.PATH ?? "";
const BASE_SKILL_ARGS =
  "skills add vercel-labs/agent-skills --skill vercel-composition-patterns vercel-react-best-practices vercel-react-view-transitions web-design-guidelines -a amp -a claude-code -y";
const ELYSIA_SKILL_ARGS = "skills add elysiajs/skills -a amp -a claude-code -y";
const GSAP_SKILL_ARGS =
  "skills add greensock/gsap-skills --skill gsap-core gsap-performance gsap-plugins gsap-react gsap-scrolltrigger gsap-timeline gsap-utils -a amp -a claude-code -y";
const SHADCN_SKILL_ARGS = "skills add shadcn/ui -a amp -a claude-code -y";

function getMockBinDirectory(): string {
  return joinPath(TEST_DIR, "mock-bin");
}

function getMockExecutorLogPath(): string {
  return joinPath(TEST_DIR, "mock-package-exec.log");
}

function getExecutorPrefix(packageManager: PackageManager): string {
  switch (packageManager) {
    case "bun":
      return "bunx";
    case "npm":
      return "npx";
    case "pnpm":
      return "pnpm dlx";
    case "yarn":
      return "yarn dlx";
  }
}

function getExpectedSkillCommands(
  packageManager: PackageManager,
  addonIds: readonly string[] = [],
): string[] {
  const prefix = getExecutorPrefix(packageManager);
  const commands = [`${prefix} ${BASE_SKILL_ARGS}`];

  for (const addonId of addonIds) {
    if (addonId === "elysia") {
      commands.push(`${prefix} ${ELYSIA_SKILL_ARGS}`);
    }

    if (addonId === "gsap-lenis") {
      commands.push(`${prefix} ${GSAP_SKILL_ARGS}`);
    }

    if (addonId === "shadcn") {
      commands.push(`${prefix} ${SHADCN_SKILL_ARGS}`);
    }
  }

  return commands;
}

async function installMockPackageExecutors(): Promise<void> {
  const mockBinDirectory = getMockBinDirectory();
  const logPath = getMockExecutorLogPath();
  const executables = ["bunx", "npx", "pnpm", "yarn"] as const;

  await mkdir(mockBinDirectory, { recursive: true });

  for (const executableName of executables) {
    const executablePath = joinPath(mockBinDirectory, executableName);
    await writeTextFile(
      executablePath,
      [
        "#!/bin/sh",
        `printf \"%s\\n\" \"${executableName} $*\" >> \"${logPath}\"`,
        "exit 0",
        "",
      ].join("\n"),
    );
    await chmod(executablePath, 0o755);
  }

  process.env.PATH = `${mockBinDirectory}:${ORIGINAL_PATH}`;
}

async function readMockExecutorInvocations(): Promise<string[]> {
  try {
    const rawLog = await readTextFile(getMockExecutorLogPath());
    return rawLog
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if ((error as { readonly code?: string }).code === "ENOENT") {
        return [];
      }
    }

    throw error;
  }
}

async function expectNoLegacySkillArtifacts(projectPath: string): Promise<void> {
  const entries = await readdir(projectPath);
  expect(entries).not.toContain(".agents");
  expect(entries).not.toContain(".claude");
  expect(entries).not.toContain("skills-lock.json");
}

describe("runCreateCommand", () => {
  beforeEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
    await mkdir(TEST_DIR, { recursive: true });
    await installMockPackageExecutors();
  });

  afterEach(async () => {
    process.env.PATH = ORIGINAL_PATH;
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("base template only (no addons)", () => {
    it("should create project with base template only", async () => {
      const projectPath = joinPath(TEST_DIR, "base-only-project");

      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: "",
        install: false,
        packageManager: undefined,
      });

      const entries = await readdir(projectPath);
      expect(entries.length).toBeGreaterThan(0);

      const packageJsonPath = joinPath(projectPath, "package.json");
      const packageJson = await readTextFile(packageJsonPath);
      expect(packageJson).toBeTruthy();
      expect(await readMockExecutorInvocations()).toEqual(getExpectedSkillCommands("bun"));
    });

    it("should create project in current directory with '.'", async () => {
      const projectPath = joinPath(TEST_DIR, "dot-project");
      await mkdir(projectPath, { recursive: true });

      const originalCwd = process.cwd();
      process.chdir(projectPath);

      try {
        await runCreateCommand({
          projectName: ".",
          templateId: "next",
          addons: "",
          install: false,
          packageManager: undefined,
        });

        const entries = await readdir(projectPath);
        expect(entries.length).toBeGreaterThan(0);
        expect(await readMockExecutorInvocations()).toEqual(getExpectedSkillCommands("bun"));
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should create project in current directory when only .git and unrelated files exist", async () => {
      const projectPath = joinPath(TEST_DIR, "dot-project-with-git");
      await mkdir(joinPath(projectPath, ".git"), { recursive: true });
      await writeTextFile(joinPath(projectPath, "notes.txt"), "keep me");

      const originalCwd = process.cwd();
      process.chdir(projectPath);

      try {
        await runCreateCommand({
          projectName: ".",
          templateId: "next",
          addons: "",
          install: false,
          packageManager: undefined,
        });

        const packageJson = await readTextFile(joinPath(projectPath, "package.json"));
        expect(packageJson).toContain('"name": "dot-project-with-git"');
        expect(await readTextFile(joinPath(projectPath, "notes.txt"))).toBe("keep me");
        expect(await readMockExecutorInvocations()).toEqual(getExpectedSkillCommands("bun"));
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("with single addon", () => {
    it("should create project with shadcn addon", async () => {
      const projectPath = joinPath(TEST_DIR, "shadcn-project");

      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: "shadcn",
        install: false,
        packageManager: undefined,
      });

      const entries = await readdir(projectPath);
      expect(entries.length).toBeGreaterThan(0);
      await expectNoLegacySkillArtifacts(projectPath);
      expect(await readMockExecutorInvocations()).toEqual(
        getExpectedSkillCommands("bun", ["shadcn"]),
      );
    });

    it("should create project with gsap-lenis addon", async () => {
      const projectPath = joinPath(TEST_DIR, "gsap-project");

      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: "gsap-lenis",
        install: false,
        packageManager: undefined,
      });

      await expectNoLegacySkillArtifacts(projectPath);
      expect(await readMockExecutorInvocations()).toEqual(
        getExpectedSkillCommands("bun", ["gsap-lenis"]),
      );
    });
  });

  describe("with multiple addons", () => {
    it("should install skills for multiple addons", async () => {
      const projectPath = joinPath(TEST_DIR, "multi-addon-project");

      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: "elysia,gsap-lenis",
        install: false,
        packageManager: undefined,
      });

      await expectNoLegacySkillArtifacts(projectPath);
      expect(await readMockExecutorInvocations()).toEqual(
        getExpectedSkillCommands("bun", ["elysia", "gsap-lenis"]),
      );
    });

    it("should install skills for all three addons", async () => {
      const projectPath = joinPath(TEST_DIR, "all-addons-project");

      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: "shadcn,elysia,gsap-lenis",
        install: false,
        packageManager: undefined,
      });

      await expectNoLegacySkillArtifacts(projectPath);
      expect(await readMockExecutorInvocations()).toEqual(
        getExpectedSkillCommands("bun", ["shadcn", "elysia", "gsap-lenis"]),
      );
    });
  });

  describe("package manager flag", () => {
    it("should use bunx for bun", async () => {
      const projectPath = joinPath(TEST_DIR, "bun-project");

      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: "",
        install: false,
        packageManager: "bun",
      });

      expect(await readMockExecutorInvocations()).toEqual(getExpectedSkillCommands("bun"));
    });

    it("should use npx for npm", async () => {
      const projectPath = joinPath(TEST_DIR, "npm-project");

      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: "",
        install: false,
        packageManager: "npm",
      });

      expect(await readMockExecutorInvocations()).toEqual(getExpectedSkillCommands("npm"));
    });

    it("should use pnpm dlx for pnpm", async () => {
      const projectPath = joinPath(TEST_DIR, "pnpm-project");

      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: "",
        install: false,
        packageManager: "pnpm",
      });

      expect(await readMockExecutorInvocations()).toEqual(getExpectedSkillCommands("pnpm"));
    });

    it("should use yarn dlx for yarn", async () => {
      const projectPath = joinPath(TEST_DIR, "yarn-project");

      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: "",
        install: false,
        packageManager: "yarn",
      });

      expect(await readMockExecutorInvocations()).toEqual(getExpectedSkillCommands("yarn"));
    });
  });

  describe("error handling", () => {
    it("should throw error for parent directory project name", async () => {
      await expect(
        runCreateCommand({
          projectName: "..",
          templateId: "next",
          addons: "",
          install: false,
          packageManager: undefined,
        }),
      ).rejects.toThrow('cannot be ".."');
    });

    it("should throw error for invalid template", async () => {
      const projectPath = joinPath(TEST_DIR, "invalid-template");

      await expect(
        runCreateCommand({
          projectName: projectPath,
          templateId: "nonexistent-template",
          addons: "",
          install: false,
          packageManager: undefined,
        }),
      ).rejects.toThrow();
    });

    it("should throw error for non-empty directory", async () => {
      const projectPath = joinPath(TEST_DIR, "non-empty");
      await mkdir(projectPath, { recursive: true });
      await writeTextFile(joinPath(projectPath, "package.json"), "{}\n");

      await expect(
        runCreateCommand({
          projectName: projectPath,
          templateId: "next",
          addons: "",
          install: false,
          packageManager: undefined,
        }),
      ).rejects.toThrow("contains existing project files");
    });

    it("should throw error for current directory with project markers", async () => {
      const projectPath = joinPath(TEST_DIR, "current-project-dir");
      await mkdir(joinPath(projectPath, "src"), { recursive: true });

      const originalCwd = process.cwd();
      process.chdir(projectPath);

      try {
        await expect(
          runCreateCommand({
            projectName: ".",
            templateId: "next",
            addons: "",
            install: false,
            packageManager: undefined,
          }),
        ).rejects.toThrow("contains existing project files");
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should throw error for reserved project names", async () => {
      await expect(
        runCreateCommand({
          projectName: "node_modules",
          templateId: "next",
          addons: "",
          install: false,
          packageManager: undefined,
        }),
      ).rejects.toThrow("reserved");
    });

    it("should throw error for invalid characters in project name", async () => {
      await expect(
        runCreateCommand({
          projectName: "my project!",
          templateId: "next",
          addons: "",
          install: false,
          packageManager: undefined,
        }),
      ).rejects.toThrow("can only contain");
    });
  });
});
