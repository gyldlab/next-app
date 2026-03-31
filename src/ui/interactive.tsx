import React, { useState, useEffect, useCallback } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import {
  getBaseTemplates,
  getAddons,
  type BaseTemplateInfo,
  type AddonInfo,
} from "../core/templates.js";
import { runCreateCommand } from "../commands/create.js";
import animationConfig, {
  type AnimationConfig,
  calculateDiagonalIndex,
  isHighlighted,
} from "../config/animation.js";

// Custom GYLDLAB ASCII logo - split into logo (G) and text parts
const GYLDLAB_LOGO_PART = [
  "                      ++++++++++++++++++++++++++++++++++++++      ",
  "                      ++++++++++++++++++++++++++++++++++++++      ",
  "                      ++++++++++++++++++++++++++++++++++++++      ",
  "                      ++++++++++++++++++++++++++++++++++++++      ",
  "            +++++++++++++++++++++++++++++++++++++++++++++++       ",
  "            +++++++++++                                           ",
  "            +++++++++++                               ++++++++++  ",
  "            +++++++++++                              +++++++++++  ",
  "            +++++++++++                              +++++++++++  ",
  "            +++++++++++++++++++++++++++++++          +++++++++++  ",
  "            ++++++++++++++++++++++++++++++++++       +++++++++++  ",
  "              ++++++++++++++++++++++++++++++++++     +++++++++++  ",
  "                 +++++++++++++++++++++++++++++++++++++++++++++++  ",
  "                   +++++++++++++++++++++++++++++++++++++++++++++  ",
  "                     +++++++++++++++++++++++++++++++++++++++++++  ",
  "                                                                  ",
];

const GYLDLAB_TEXT_PART = [
  "                               88           88  88              88",
  "                               88           88  88              88",
  "                               88           88  88              88",
  "      ,adPPYb,d8  8b       d8  88   ,adPPYb,88  88  ,adPPYYba,  88,dPPYba,",
  '     a8"    `Y88  `8b     d8\'  88  a8"    `Y88  88  ""     `Y8  88P\'    "8a',
  "     8b       88   `8b   d8'   88  8b       88  88  ,adPPPPP88  88       d8",
  '     "8a,   ,d88    `8b,d8\'    88  "8a,   ,d88  88  88,    ,88  88b,   ,a8"',
  '      `"YbbdP"Y8      Y88\'     88   `"8bbdP"Y8  88  `"8bbdP"Y8  8Y"Ybbd8"\'',
  "      aa,    ,88      d8'                                                  ",
  '       "Y8bbdP"      d8\'                                                   ',
];

// Animated logo component - settings controlled by config props
const AnimatedLogo: React.FC<{
  logoOffset: number;
  textOffset: number;
  config: AnimationConfig;
}> = ({ logoOffset, textOffset, config }) => {
  return (
    <Box flexDirection="column">
      {/* Logo part - controlled by animation config */}
      {GYLDLAB_LOGO_PART.map((line, rowIndex) => {
        const chars = line.split("");
        return (
          <Text key={`logo-${rowIndex}`}>
            {chars.map((char, colIndex) => {
              if (!config.logo.enabled) {
                // Static white logo
                return (
                  <Text key={colIndex} color={config.logo.defaultColor}>
                    {char}
                  </Text>
                );
              }

              // Animated logo with sweep line
              const diagonalIndex = calculateDiagonalIndex(
                rowIndex,
                colIndex,
                config.logo.direction,
                config.logo.bandWidth,
              );

              const highlighted = isHighlighted(
                diagonalIndex,
                logoOffset,
                config.logo.sweepThickness,
              );

              const color = highlighted ? config.logo.highlightColor : config.logo.defaultColor;

              return (
                <Text key={colIndex} color={color}>
                  {char}
                </Text>
              );
            })}
          </Text>
        );
      })}

      {/* Text part - rainbow animation controlled by config */}
      {GYLDLAB_TEXT_PART.map((line, rowIndex) => {
        const chars = line.split("");
        return (
          <Text key={`text-${rowIndex}`}>
            {chars.map((char, colIndex) => {
              if (!config.text.enabled) {
                // Static rainbow - use first color set based on position
                const staticIndex = calculateDiagonalIndex(
                  rowIndex,
                  colIndex,
                  config.text.direction,
                  config.text.bandWidth,
                );
                const totalColors = config.text.colors.length;
                const colorIndex = (totalColors - (staticIndex % totalColors)) % totalColors;
                const color = config.text.colors[colorIndex]!;
                return (
                  <Text key={colIndex} color={color}>
                    {char}
                  </Text>
                );
              }

              // Animated rainbow
              // Use (offset - diagonalIndex) so direction matches logo sweep behavior
              const diagonalIndex = calculateDiagonalIndex(
                rowIndex,
                colIndex,
                config.text.direction,
                config.text.bandWidth,
              );

              // Ensure positive modulo
              const totalColors = config.text.colors.length;
              const colorIndex =
                (((textOffset - diagonalIndex) % totalColors) + totalColors) % totalColors;
              const color = config.text.colors[colorIndex]!;

              return (
                <Text key={colIndex} color={color}>
                  {char}
                </Text>
              );
            })}
          </Text>
        );
      })}
    </Box>
  );
};

// Template selector component
interface TemplateSelectorProps {
  templates: BaseTemplateInfo[];
  selectedIndex: number;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ templates, selectedIndex }) => {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="cyan">
        Select a template (↑/↓ then Enter):
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {templates.map((template, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box key={template.id}>
              <Text color={isSelected ? "green" : "white"}>{isSelected ? "❯ " : "  "}</Text>
              <Text color={isSelected ? "green" : "white"} bold={isSelected}>
                {template.name}
              </Text>
              <Text color="gray"> - {template.description}</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// List mode component - shows templates and addons
interface ListModeProps {
  logoOffset: number;
  textOffset: number;
  templates: BaseTemplateInfo[];
  addons: AddonInfo[];
  config: AnimationConfig;
}

const ListMode: React.FC<ListModeProps> = ({
  logoOffset,
  textOffset,
  templates,
  addons,
  config,
}) => {
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      exit();
    }
  });

  return (
    <Box flexDirection="column">
      <AnimatedLogo logoOffset={logoOffset} textOffset={textOffset} config={config} />
      <Text dimColor>create-gyld-next :: templates + addons + skills</Text>
      <Text> </Text>
      <Text bold color="cyan">
        Base templates:
      </Text>
      {templates.map((t) => (
        <Box key={t.id} flexDirection="column" marginLeft={1}>
          <Text color="yellow">
            • {t.id} {t.default ? "(default)" : ""}
          </Text>
          <Text> {t.name}</Text>
          <Text dimColor> {t.description}</Text>
        </Box>
      ))}
      <Text> </Text>
      <Text bold color="cyan">
        Add-ons:
      </Text>
      {addons.map((a) => (
        <Box key={a.id} flexDirection="column" marginLeft={1}>
          <Text color="yellow">• {a.id}</Text>
          <Text> {a.name}</Text>
          <Text dimColor> {a.description}</Text>
        </Box>
      ))}
      <Text> </Text>
      <Text dimColor>Press 'q' or Escape to exit</Text>
    </Box>
  );
};

// Main interactive app
interface InteractiveAppProps {
  projectName: string | undefined;
  install: boolean;
  mode: "create" | "list";
  templates: BaseTemplateInfo[];
  addons: AddonInfo[];
  config: AnimationConfig;
}

const InteractiveApp: React.FC<InteractiveAppProps> = ({
  projectName,
  install,
  mode,
  templates,
  addons,
  config,
}) => {
  const { exit } = useApp();
  const [logoOffset, setLogoOffset] = useState(0);
  const [textOffset, setTextOffset] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [phase, setPhase] = useState<"selecting" | "creating" | "done">("selecting");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Logo animation - controlled by config.logo
  useEffect(() => {
    if (!config.logo.enabled) return;

    const interval = setInterval(() => {
      setLogoOffset((prev) => (prev + 1) % config.logo.cycleLength);
    }, config.logo.speedMs);

    return () => clearInterval(interval);
  }, [config.logo.enabled, config.logo.cycleLength, config.logo.speedMs]);

  // Text animation - controlled by config.text
  useEffect(() => {
    if (!config.text.enabled) return;

    const interval = setInterval(() => {
      setTextOffset((prev) => (prev + 1) % config.text.cycleLength);
    }, config.text.speedMs);

    return () => clearInterval(interval);
  }, [config.text.enabled, config.text.cycleLength, config.text.speedMs]);

  // Handle template selection
  const handleSelect = useCallback(async () => {
    const template = templates[selectedIndex];
    if (template && projectName) {
      setSelectedTemplate(template.id);
      setPhase("creating");

      // Exit ink and run the create command
      exit();

      // Small delay to let ink cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      await runCreateCommand({
        projectName,
        templateId: template.id,
        addons: undefined,
        install,
      });
    }
  }, [selectedIndex, templates, projectName, install, exit]);

  // Keyboard input handling
  useInput((input, key) => {
    if (mode === "list") return; // List mode handles its own input

    if (phase !== "selecting") return;

    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : templates.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < templates.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      void handleSelect();
    } else if (input === "q" || key.escape) {
      exit();
    }
  });

  // List mode
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

  // Create mode
  if (phase === "creating") {
    return (
      <Box flexDirection="column">
        <AnimatedLogo logoOffset={logoOffset} textOffset={textOffset} config={config} />
        <Text dimColor>create-gyld-next :: templates + addons + skills</Text>
        <Text> </Text>
        <Text color="green">Creating project with template: {selectedTemplate}...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <AnimatedLogo logoOffset={logoOffset} textOffset={textOffset} config={config} />
      <Text dimColor>create-gyld-next :: templates + addons + skills</Text>
      <TemplateSelector templates={templates} selectedIndex={selectedIndex} />
      <Text> </Text>
      <Text dimColor>Press 'q' or Escape to exit</Text>
    </Box>
  );
};

// Export function to run interactive mode
export async function runInteractiveMode(
  projectName: string | undefined,
  install: boolean,
  mode: "create" | "list" = "create",
): Promise<void> {
  // Load templates and addons first
  const [templates, addons] = await Promise.all([getBaseTemplates(), getAddons()]);

  const { waitUntilExit } = render(
    <InteractiveApp
      projectName={projectName}
      install={install}
      mode={mode}
      templates={templates}
      addons={addons}
      config={animationConfig}
    />,
  );

  await waitUntilExit();
}
