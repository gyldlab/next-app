import React from "react";
import { Box, Text } from "ink";
import { type BaseTemplateInfo } from "../../core/templates.js";

export interface TemplateSelectorProps {
  templates: BaseTemplateInfo[];
  selectedIndex: number;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ templates, selectedIndex }) => {
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
