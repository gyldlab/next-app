import React from "react";
import { Box, Text } from "ink";
import type { BaseTemplateInfo } from "../../types/templates.js";

export interface TemplateSelectorProps {
  templates: BaseTemplateInfo[];
  selectedIndex: number;
  viewportLines?: number;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedIndex,
  viewportLines,
}) => {
  const chromeLines = 3;
  const maxVisibleItems = viewportLines
    ? Math.max(1, viewportLines - chromeLines)
    : templates.length;
  const clampedSelected = Math.max(0, Math.min(selectedIndex, templates.length - 1));
  const maxStart = Math.max(0, templates.length - maxVisibleItems);
  const start = Math.max(0, Math.min(clampedSelected - Math.floor(maxVisibleItems / 2), maxStart));
  const visibleTemplates = templates.slice(start, start + maxVisibleItems);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="cyan" wrap="truncate-end">
        Select a template (↑/↓ then Enter):
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {visibleTemplates.map((template, localIndex) => {
          const index = start + localIndex;
          const isSelected = index === selectedIndex;
          return (
            <Text key={template.id} wrap="truncate-end">
              <Text color={isSelected ? "green" : "white"}>{isSelected ? "❯ " : "  "}</Text>
              <Text color={isSelected ? "green" : "white"} bold={isSelected}>
                {template.name}
              </Text>
              <Text color="gray"> - {template.description}</Text>
            </Text>
          );
        })}
      </Box>
    </Box>
  );
};
