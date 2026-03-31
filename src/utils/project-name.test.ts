import { describe, expect, it } from "bun:test";
import { toValidPackageName } from "./project-name.js";

describe("toValidPackageName", () => {
  it("normalizes spaces and casing", () => {
    expect(toValidPackageName("My Platform App")).toBe("my-platform-app");
  });

  it("strips invalid leading characters", () => {
    expect(toValidPackageName(".._My App")).toBe("my-app");
  });

  it("falls back for empty values", () => {
    expect(toValidPackageName(".._")).toBe("next-app");
  });
});
