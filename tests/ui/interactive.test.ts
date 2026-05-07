import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

const cleanupCalls: string[] = [];
const renderCleanup = mock(() => {
  cleanupCalls.push("cleanup");
});
const renderUnmount = mock(() => {
  cleanupCalls.push("unmount");
});
const waitUntilExit = mock(async () => undefined);
const renderMock = mock((node?: { props?: { onComplete?: (result: unknown) => void } }) => {
  void node;

  return {
    cleanup: renderCleanup,
    unmount: renderUnmount,
    waitUntilExit,
  };
});
const runCreateCommandMock = mock(async () => {
  cleanupCalls.push("create");
});
const getBaseTemplatesMock = mock(async () => [
  {
    id: "next",
    name: "Next",
    description: "Base template",
    directory: "/tmp/base-template",
  },
]);
const getAddonsMock = mock(async () => []);
const setInteractiveActiveMock = mock(() => undefined);
const originalStdoutWrite = process.stdout.write.bind(process.stdout);

mock.module("react", () => ({
  default: {},
  useCallback: (callback: unknown) => callback,
  useEffect: () => undefined,
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => [value, () => undefined],
}));

mock.module("react/jsx-dev-runtime", () => ({
  Fragment: Symbol.for("react.fragment"),
  jsxDEV: (type: unknown, props: Record<string, unknown>) => ({ type, props }),
}));

mock.module("ink", () => ({
  Text: () => null,
  render: renderMock,
  useApp: () => ({
    exit: mock(() => undefined),
  }),
  useInput: () => undefined,
}));

mock.module("../../src/ui/components/app-layout.js", () => ({
  AppLayout: () => null,
}));

mock.module("../../src/ui/components/template-selector.js", () => ({
  TemplateSelector: () => null,
}));

mock.module("../../src/ui/components/addon-selector.js", () => ({
  AddonSelector: () => null,
}));

mock.module("../../src/ui/components/name-input.js", () => ({
  NameInput: () => null,
}));

mock.module("../../src/ui/components/list-mode.js", () => ({
  ListMode: () => null,
}));

describe("runInteractiveMode", () => {
  beforeEach(() => {
    cleanupCalls.length = 0;
    renderCleanup.mockClear();
    renderUnmount.mockClear();
    waitUntilExit.mockClear();
    renderMock.mockClear();
    runCreateCommandMock.mockClear();
    getBaseTemplatesMock.mockClear();
    getAddonsMock.mockClear();
    setInteractiveActiveMock.mockClear();
    process.stdout.write = mock(() => true) as typeof process.stdout.write;
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite as typeof process.stdout.write;
    mock.restore();
  });

  it("cleans up Ink before running the scaffold command on normal exit", async () => {
    const createModule = await import("../../src/commands/create.js");
    const templatesModule = await import("../../src/core/templates.js");
    const cliModule = await import("../../src/cli.js");

    spyOn(createModule, "runCreateCommand").mockImplementation(runCreateCommandMock);
    spyOn(templatesModule, "getBaseTemplates").mockImplementation(getBaseTemplatesMock);
    spyOn(templatesModule, "getAddons").mockImplementation(getAddonsMock);
    spyOn(cliModule, "setInteractiveActive").mockImplementation(setInteractiveActiveMock);

    const { runInteractiveMode } = await import("../../src/ui/interactive.js");

    renderMock.mockImplementationOnce(
      (node?: { props?: { onComplete?: (result: unknown) => void } }) => {
        cleanupCalls.push("render");
        node?.props?.onComplete?.({
          addonIds: [],
          projectName: "demo-app",
          templateId: "next",
        });

        return {
          cleanup: renderCleanup,
          unmount: renderUnmount,
          waitUntilExit: mock(async () => {
            cleanupCalls.push("exit");
            return undefined;
          }),
        };
      },
    );

    await runInteractiveMode("demo-app", false, "create", "bun");

    expect(renderCleanup).toHaveBeenCalledTimes(1);
    expect(renderUnmount).not.toHaveBeenCalled();
    expect(runCreateCommandMock).toHaveBeenCalledWith({
      addons: "",
      install: false,
      packageManager: "bun",
      projectName: "demo-app",
      templateId: "next",
    });
    expect(cleanupCalls).toEqual(["render", "exit", "cleanup", "create"]);
    expect(setInteractiveActiveMock).toHaveBeenNthCalledWith(1, true);
    expect(setInteractiveActiveMock).toHaveBeenNthCalledWith(2, false);
  });
});
