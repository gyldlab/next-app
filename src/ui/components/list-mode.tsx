import React from "react";
import { Box, Text, useApp, useInput } from "ink";
import { type AnimationConfig } from "../../config/animation.js";
import { type BaseTemplateInfo, type AddonInfo } from "../../core/templates.js";
import { AppLayout } from "./app-layout.js";

export interface ListModeProps {
  logoOffset: number;
  textOffset: number;
  templates: BaseTemplateInfo[];
  addons: AddonInfo[];
  config: AnimationConfig;
}

export const ListMode: React.FC<ListModeProps> = ({
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
    <AppLayout logoOffset={logoOffset} textOffset={textOffset} config={config}>
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
    </AppLayout>
  );
};
