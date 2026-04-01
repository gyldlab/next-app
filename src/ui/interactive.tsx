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
import { AppLayout } from "./components/app-layout.js";
import { TemplateSelector } from "./components/template-selector.js";
import { AddonSelector } from "./components/addon-selector.js";
import { NameInput } from "./components/name-input.js";
import { ListMode } from "./components/list-mode.js";

// ── Hooks ───────────────────────────────────────────────────────────

/** Drives the logo + text sweep animations via two offset counters. */
function useLogoAnimation(config: AnimationConfig) {
  const [logoOffset, setLogoOffset] = useState(0);
  const [textOffset, setTextOffset] = useState(0);

  useEffect(() => {
    if (!config.logo.enabled) return;
    const interval = setInterval(() => {
      setLogoOffset((prev) => (prev + 1) % config.logo.cycleLength);
    }, config.logo.speedMs);
    return () => clearInterval(interval);
  }, [config.logo.enabled, config.logo.cycleLength, config.logo.speedMs]);

  useEffect(() => {
    if (!config.text.enabled) return;
    const interval = setInterval(() => {
      setTextOffset((prev) => (prev + 1) % config.text.cycleLength);
    }, config.text.speedMs);
    return () => clearInterval(interval);
  }, [config.text.enabled, config.text.cycleLength, config.text.speedMs]);

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

  const { waitUntilExit } = render(
    <InteractiveApp
      projectName={projectName}
      mode={mode}
      templates={templates}
      addons={addons}
      config={animationConfig}
      onComplete={onComplete}
    />,
  );

  await waitUntilExit();

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
