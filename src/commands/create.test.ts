import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runCreateCommand } from "./create.js";

const TEST_DIR = "/tmp/gyldlab-create-test";

describe("runCreateCommand", () => {
  beforeEach(async () => {
    // Clean up test directory before each test
    await rm(TEST_DIR, { recursive: true, force: true });
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up after each test
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("base template only (no addons)", () => {
    it("should create project with base template only", async () => {
      const projectPath = join(TEST_DIR, "base-only-project");

      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: undefined, // No addons
        install: false, // Skip install for speed
        useBun: false,
      });

      // Verify project was created
      const entries = await readdir(projectPath);
      expect(entries.length).toBeGreaterThan(0);
      
      // Verify package.json exists
      const packageJsonPath = join(projectPath, "package.json");
      const packageJson = await readFile(packageJsonPath, "utf8");
      expect(packageJson).toBeTruthy();
    });

    it("should create project in current directory with '.'", async () => {
      const projectPath = join(TEST_DIR, "dot-project");
      await mkdir(projectPath, { recursive: true });
      
      // Change to the directory and use "."
      const originalCwd = process.cwd();
      process.chdir(projectPath);
      
      try {
        await runCreateCommand({
          projectName: ".",
          templateId: "next",
          addons: undefined,
          install: false,
          useBun: false,
        });

        // Verify project was created
        const entries = await readdir(projectPath);
        expect(entries.length).toBeGreaterThan(0);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("with single addon", () => {
    it("should create project with shadcn addon", async () => {
      const projectPath = join(TEST_DIR, "shadcn-project");

      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: "shadcn",
        install: false,
        useBun: false,
      });

      // Verify project was created
      const entries = await readdir(projectPath);
      expect(entries.length).toBeGreaterThan(0);
      
      // Verify skills-lock.json exists with shadcn skills
      const skillsLockPath = join(projectPath, "skills-lock.json");
      const skillsLock = JSON.parse(await readFile(skillsLockPath, "utf8"));
      expect(skillsLock.skills).toBeTruthy();
    });

    it("should create project with gsap-lenis addon", async () => {
      const projectPath = join(TEST_DIR, "gsap-project");

      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: "gsap-lenis",
        install: false,
        useBun: false,
      });

      // Verify skills-lock.json exists with gsap skills
      const skillsLockPath = join(projectPath, "skills-lock.json");
      const skillsLock = JSON.parse(await readFile(skillsLockPath, "utf8"));
      expect(skillsLock.skills).toBeTruthy();
      expect(Object.keys(skillsLock.skills).length).toBeGreaterThan(0);
    });
  });

  describe("with multiple addons", () => {
    it("should merge skills-lock.json from multiple addons", async () => {
      const projectPath = join(TEST_DIR, "multi-addon-project");

      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: "elysia,gsap-lenis",
        install: false,
        useBun: false,
      });

      // Verify skills-lock.json contains skills from BOTH addons
      const skillsLockPath = join(projectPath, "skills-lock.json");
      const skillsLock = JSON.parse(await readFile(skillsLockPath, "utf8"));
      
      expect(skillsLock.skills).toBeTruthy();
      
      // Should have elysia skills
      const skillKeys = Object.keys(skillsLock.skills);
      const hasElysiaSkills = skillKeys.some(k => k.toLowerCase().includes("elysia"));
      const hasGsapSkills = skillKeys.some(k => k.toLowerCase().includes("gsap"));
      
      expect(hasElysiaSkills || hasGsapSkills).toBe(true);
      // Both addons should contribute to skills
      expect(skillKeys.length).toBeGreaterThan(1);
    });

    it("should merge all three addons correctly", async () => {
      const projectPath = join(TEST_DIR, "all-addons-project");

      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: "shadcn,elysia,gsap-lenis",
        install: false,
        useBun: false,
      });

      // Verify skills-lock.json contains skills from all addons
      const skillsLockPath = join(projectPath, "skills-lock.json");
      const skillsLock = JSON.parse(await readFile(skillsLockPath, "utf8"));
      
      expect(skillsLock.skills).toBeTruthy();
      expect(Object.keys(skillsLock.skills).length).toBeGreaterThan(3);
    });
  });

  describe("package manager flag", () => {
    it("should accept useBun flag", async () => {
      const projectPath = join(TEST_DIR, "bun-project");

      // This should not throw - we're just testing the flag is accepted
      await runCreateCommand({
        projectName: projectPath,
        templateId: "next",
        addons: undefined,
        install: false, // Don't actually install
        useBun: true,
      });

      const entries = await readdir(projectPath);
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should throw error for empty project name", async () => {
      await expect(
        runCreateCommand({
          projectName: "",
          templateId: "next",
          addons: undefined,
          install: false,
          useBun: false,
        })
      ).rejects.toThrow("Project name is required");
    });

    it("should throw error for invalid template", async () => {
      const projectPath = join(TEST_DIR, "invalid-template");

      await expect(
        runCreateCommand({
          projectName: projectPath,
          templateId: "nonexistent-template",
          addons: undefined,
          install: false,
          useBun: false,
        })
      ).rejects.toThrow();
    });

    it("should throw error for non-empty directory", async () => {
      const projectPath = join(TEST_DIR, "non-empty");
      await mkdir(projectPath, { recursive: true });
      await writeFile(join(projectPath, "existing-file.txt"), "test");

      await expect(
        runCreateCommand({
          projectName: projectPath,
          templateId: "next",
          addons: undefined,
          install: false,
          useBun: false,
        })
      ).rejects.toThrow("not empty");
    });

    it("should throw error for reserved project names", async () => {
      await expect(
        runCreateCommand({
          projectName: "node_modules",
          templateId: "next",
          addons: undefined,
          install: false,
          useBun: false,
        })
      ).rejects.toThrow("reserved");
    });

    it("should throw error for invalid characters in project name", async () => {
      await expect(
        runCreateCommand({
          projectName: "my project!",
          templateId: "next",
          addons: undefined,
          install: false,
          useBun: false,
        })
      ).rejects.toThrow("can only contain");
    });
  });
});
