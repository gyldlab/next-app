import React, { useState, useEffect, useCallback, useRef } from "react";
import { render, Text, useApp, useInput } from "ink";
import {
  getBaseTemplates,
  getAddons,
  type BaseTemplateInfo,
  type AddonInfo,
} from "../core/templates.js";
import { runCreateCommand } from "../commands/create.js";
import animationConfig, { type AnimationConfig } from "../config/animation.js";
import { type InteractiveResult } from "./types.js";
import { type PackageManager } from "../utils/package-manager.js";
import { setInteractiveActive } from "../cli.js";
import { AppLayout } from "./components/app-layout.js";
import { TemplateSelector } from "./components/template-selector.js";
import { AddonSelector } from "./components/addon-selector.js";
import { NameInput } from "./components/name-input.js";
import { ListMode } from "./components/list-mode.js";

// ── Hooks ───────────────────────────────────────────────────────────

/** Drives the logo + text sweep animations via two offset counters.
 *  Both counters advance inside a single shared interval so React can
 *  batch the setState calls into one render – preventing jitter from
 *  two independent intervals firing close together. */
function useLogoAnimation(config: AnimationConfig) {
  const [logoOffset, setLogoOffset] = useState(0);
  const [textOffset, setTextOffset] = useState(0);

  useEffect(() => {
    const logoEnabled = config.logo.enabled;
    const textEnabled = config.text.enabled;
    if (!logoEnabled && !textEnabled) return;

    // Run one interval at the GCD of both speeds so each animation
    // still advances at its own rate, but within the same callback.
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const tickMs =
      logoEnabled && textEnabled
        ? gcd(config.logo.speedMs, config.text.speedMs)
        : logoEnabled
          ? config.logo.speedMs
          : config.text.speedMs;

    let logoAccum = 0;
    let textAccum = 0;

    const id = setInterval(() => {
      logoAccum += tickMs;
      textAccum += tickMs;

      // Both setState calls inside one callback → React batches → one render
      if (logoEnabled && logoAccum >= config.logo.speedMs) {
        logoAccum = 0;
        setLogoOffset((prev) => (prev + 1) % config.logo.cycleLength);
      }
      if (textEnabled && textAccum >= config.text.speedMs) {
        textAccum = 0;
        setTextOffset((prev) => (prev + 1) % config.text.cycleLength);
      }
    }, tickMs);

    return () => clearInterval(id);
  }, [
    config.logo.enabled,
    config.logo.speedMs,
    config.logo.cycleLength,
    config.text.enabled,
    config.text.speedMs,
    config.text.cycleLength,
  ]);

  return { logoOffset, textOffset };
}

// ── InteractiveApp ──────────────────────────────────────────────────

type Phase = "enteringName" | "selectingTemplate" | "selectingAddons" | "creating";

interface InteractiveAppProps {
  projectName: string | undefined;
  mode: "create" | "list";
  templates: BaseTemplateInfo[];
  addons: AddonInfo[];
  config: AnimationConfig;
  onComplete: (result: InteractiveResult) => void;
}

const InteractiveApp: React.FC<InteractiveAppProps> = ({
  projectName,
  mode,
  templates,
  addons,
  config,
  onComplete,
}) => {
  const { exit } = useApp();
  const { logoOffset, textOffset } = useLogoAnimation(config);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(projectName ? "selectingTemplate" : "enteringName");
  const [inputProjectName, setInputProjectName] = useState(projectName ?? "");
  const [selectedTemplate, setSelectedTemplate] = useState<BaseTemplateInfo | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [addonIndex, setAddonIndex] = useState(0);

  // Ref avoids stale closure issues with project name
  const projectNameRef = useRef(projectName ?? "");

  useEffect(() => {
    projectNameRef.current = projectName ?? inputProjectName;
  }, [projectName, inputProjectName]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleComplete = useCallback(
    (template: BaseTemplateInfo, addonList: AddonInfo[]) => {
      const name = projectNameRef.current;
      if (!name) {
        console.error("\nError: Project name is required.");
        process.exitCode = 1;
        exit();
        return;
      }
      setPhase("creating");
      onComplete({
        projectName: name,
        templateId: template.id,
        addonIds: addonList.map((a) => a.id),
      });
      exit();
    },
    [onComplete, exit],
  );

  const handleTemplateSelect = useCallback(() => {
    const template = templates[selectedIndex];
    if (template) {
      setSelectedTemplate(template);
      if (addons.length > 0) {
        setPhase("selectingAddons");
        setAddonIndex(0);
      } else {
        handleComplete(template, []);
      }
    }
  }, [selectedIndex, templates, addons, handleComplete]);

  const handleAddonComplete = useCallback(() => {
    if (selectedTemplate) {
      const list = addons.filter((a) => selectedAddons.has(a.id));
      handleComplete(selectedTemplate, list);
    }
  }, [selectedTemplate, addons, selectedAddons, handleComplete]);

  // ── Input ───────────────────────────────────────────────────────

  useInput((input, key) => {
    if (mode === "list") return;

    // Project name entry
    if (phase === "enteringName") {
      if (key.return) {
        if (inputProjectName.trim().length > 0) setPhase("selectingTemplate");
      } else if (key.backspace || key.delete) {
        setInputProjectName((prev) => prev.slice(0, -1));
      } else if (key.escape || input === "q") {
        if (inputProjectName.length === 0) exit();
      } else if (input && !key.ctrl && !key.meta && input.length === 1) {
        if (/[a-zA-Z0-9._-]/.test(input)) {
          setInputProjectName((prev) => prev + input);
        }
      }
      return;
    }

    // Template selection
    if (phase === "selectingTemplate") {
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : templates.length - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => (prev < templates.length - 1 ? prev + 1 : 0));
      } else if (key.return) {
        handleTemplateSelect();
      } else if (input === "q" || key.escape) {
        exit();
      }
    }

    // Addon selection
    if (phase === "selectingAddons") {
      if (key.upArrow) {
        setAddonIndex((prev) => (prev > 0 ? prev - 1 : addons.length - 1));
      } else if (key.downArrow) {
        setAddonIndex((prev) => (prev < addons.length - 1 ? prev + 1 : 0));
      } else if (input === " ") {
        const addon = addons[addonIndex];
        if (addon) {
          setSelectedAddons((prev) => {
            const next = new Set(prev);
            if (next.has(addon.id)) next.delete(addon.id);
            else next.add(addon.id);
            return next;
          });
        }
      } else if (input === "a") {
        if (selectedAddons.size === addons.length) setSelectedAddons(new Set());
        else setSelectedAddons(new Set(addons.map((a) => a.id)));
      } else if (key.return) {
        handleAddonComplete();
      } else if (key.escape) {
        setPhase("selectingTemplate");
        setSelectedTemplate(null);
      } else if (input === "q") {
        exit();
      }
    }
  });

  // ── Render ──────────────────────────────────────────────────────

  if (mode === "list") {
    return (
      <ListMode
        logoOffset={logoOffset}
        textOffset={textOffset}
        templates={templates}
        addons={addons}
        config={config}
      />
    );
  }

  if (phase === "enteringName") {
    return (
      <AppLayout logoOffset={logoOffset} textOffset={textOffset} config={config}>
        <NameInput value={inputProjectName} />
      </AppLayout>
    );
  }

  if (phase === "creating") {
    return (
      <AppLayout logoOffset={logoOffset} textOffset={textOffset} config={config}>
        <Text> </Text>
        <Text color="green">Creating project with template: {selectedTemplate?.id}...</Text>
      </AppLayout>
    );
  }

  if (phase === "selectingAddons" && selectedTemplate) {
    return (
      <AppLayout logoOffset={logoOffset} textOffset={textOffset} config={config}>
        <AddonSelector
          selectedTemplate={selectedTemplate}
          addons={addons}
          selectedAddons={selectedAddons}
          focusedIndex={addonIndex}
        />
      </AppLayout>
    );
  }

  // Default: template selection
  return (
    <AppLayout logoOffset={logoOffset} textOffset={textOffset} config={config}>
      <TemplateSelector templates={templates} selectedIndex={selectedIndex} />
      <Text> </Text>
      <Text dimColor>Press 'q' or Escape to exit</Text>
    </AppLayout>
  );
};

// ── Entry point ─────────────────────────────────────────────────────

export async function runInteractiveMode(
  projectName: string | undefined,
  install: boolean,
  mode: "create" | "list" = "create",
  packageManager?: PackageManager,
): Promise<void> {
  const [templates, addons] = await Promise.all([getBaseTemplates(), getAddons()]);

  // Mutable container so TS doesn't narrow to `never` after await
  const ref: { result: InteractiveResult } = { result: null };

  const onComplete = (r: InteractiveResult): void => {
    ref.result = r;
  };

  // ── Alternate screen buffer ──────────────────────────────────────
  // Switch to the terminal's alternate screen buffer (like vim/htop).
  // This isolates the UI from the scrollback buffer so scrolling cannot
  // shift the viewport away from Ink's output — eliminating ghost artifacts.
  // On exit, the primary buffer is restored and the user's prior output reappears.
  const stdout = process.stdout;
  const enterAltScreen = "\x1B[?1049h"; // smcup — switch to alternate buffer
  const leaveAltScreen = "\x1B[?1049l"; // rmcup — restore primary buffer
  const hideCursor = "\x1B[?25l";
  const showCursor = "\x1B[?25h";

  // Tell cli.ts to skip its global cleanup (process.exit) while we own the terminal
  setInteractiveActive(true);
  stdout.write(enterAltScreen + hideCursor);

  const { waitUntilExit, unmount, cleanup } = render(
    <InteractiveApp
      projectName={projectName}
      mode={mode}
      templates={templates}
      addons={addons}
      config={animationConfig}
      onComplete={onComplete}
    />,
  );

  // Ensure clean teardown on unexpected signals: restore primary screen buffer,
  // show cursor, etc. so the terminal is never left in a corrupted state.
  const teardown = () => {
    unmount();
    cleanup();
    stdout.write(showCursor + leaveAltScreen);
    setInteractiveActive(false);
  };
  process.once("SIGINT", teardown);
  process.once("SIGTERM", teardown);

  await waitUntilExit();

  // Normal exit: restore terminal
  stdout.write(showCursor + leaveAltScreen);
  setInteractiveActive(false);

  // Remove our listeners so they don't fire after Ink has already exited
  process.removeListener("SIGINT", teardown);
  process.removeListener("SIGTERM", teardown);

  // After Ink exits, run the create command if we have a result
  if (ref.result) {
    await runCreateCommand({
      projectName: ref.result.projectName,
      templateId: ref.result.templateId,
      addons: ref.result.addonIds.length > 0 ? ref.result.addonIds.join(",") : "",
      install,
      packageManager,
    });
  }
}
