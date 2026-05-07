import { describe, expect, it } from "bun:test";
import { CliUsageError, parseCliArgs } from "../src/cli-args.js";

describe("parseCliArgs", () => {
  it("parses root create usage with options", () => {
    expect(parseCliArgs(["my-app", "--template", "next", "--addons=elysia,shadcn", "-b"])).toEqual({
      kind: "create",
      projectName: "my-app",
      options: {
        template: "next",
        addons: "elysia,shadcn",
        install: true,
        bun: true,
      },
    });
  });

  it("parses templates command", () => {
    expect(parseCliArgs(["templates"])).toEqual({ kind: "templates" });
  });

  it("supports the explicit create command", () => {
    expect(parseCliArgs(["create", "my-app", "--no-install", "-y"])).toEqual({
      kind: "create",
      projectName: "my-app",
      options: {
        install: false,
        yarn: true,
      },
    });
  });

  it("returns help and version commands", () => {
    expect(parseCliArgs(["--help"])).toEqual({ kind: "help" });
    expect(parseCliArgs(["-V"])).toEqual({ kind: "version" });
  });

  it("rejects conflicting package manager flags", () => {
    expect(() => parseCliArgs(["my-app", "-b", "-p"])).toThrow(CliUsageError);
  });

  it("rejects missing option values", () => {
    expect(() => parseCliArgs(["--template"])).toThrow('Option "template" requires a value.');
  });
});
