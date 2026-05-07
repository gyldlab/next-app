import { describe, expect, it } from "bun:test";

const ruleModuleUrl = new URL(
  "../../../../../templates/base/next/eslint-rules/prefer-src-alias.ts",
  import.meta.url,
).href;

async function loadRuleHelpers() {
  const ruleModule = (await import(ruleModuleUrl)) as {
    getAliasImportPath: (filename: string, importSource: string, srcRoot: string) => string | null;
    isPathInsideRoot: (pathValue: string, rootValue: string) => boolean;
  };

  return ruleModule;
}

describe("prefer-src-alias path handling", () => {
  it("matches Windows src roots case-insensitively", async () => {
    const srcRoot = "c:/repo/src";
    const filename = "C:\\Repo\\Src\\lib\\file.ts";
    const { getAliasImportPath, isPathInsideRoot } = await loadRuleHelpers();

    expect(isPathInsideRoot(filename, srcRoot)).toBe(true);
    expect(getAliasImportPath(filename, "../utils", srcRoot)).toBe("utils");
  });

  it("preserves UNC roots when resolving relative imports", async () => {
    const srcRoot = "//server/share/repo/src";
    const filename = "\\\\server\\share\\repo\\src\\lib\\file.ts";
    const { getAliasImportPath, isPathInsideRoot } = await loadRuleHelpers();

    expect(isPathInsideRoot(filename, srcRoot)).toBe(true);
    expect(getAliasImportPath(filename, "../utils", srcRoot)).toBe("utils");
  });
});
