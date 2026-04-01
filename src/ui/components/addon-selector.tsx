import React from "react";
import { Box, Text } from "ink";
import { type AddonInfo, type BaseTemplateInfo } from "../../core/templates.js";

export interface AddonSelectorProps {
  selectedTemplate: BaseTemplateInfo;
  addons: AddonInfo[];
  selectedAddons: ReadonlySet<string>;
  focusedIndex: number;
}

export const AddonSelector: React.FC<AddonSelectorProps> = ({
  selectedTemplate,
  addons,
  selectedAddons,
  focusedIndex,
}) => {
  const selectedCount = selectedAddons.size;

  return (
    <>
      <Text> </Text>
      <Text>
        Template: <Text color="green">{selectedTemplate.name}</Text>
      </Text>
      <Text> </Text>
      <Text bold>Select optional add-ons (↑/↓ navigate, space toggle, a toggle all):</Text>
      <Text dimColor>
        Press Enter to continue{" "}
        {selectedCount > 0
          ? `with ${selectedCount} add-on${selectedCount > 1 ? "s" : ""}`
          : "without add-ons (base only)"}
      </Text>
      <Text> </Text>
      {addons.map((addon, index) => {
        const isSelected = selectedAddons.has(addon.id);
        const isFocused = index === focusedIndex;
        return (
          <Box key={addon.id} flexDirection="column">
            <Text>
              {isFocused ? <Text color="cyan">{"❯ "}</Text> : <Text>{"  "}</Text>}
              <Text color={isSelected ? "green" : "gray"}>{isSelected ? "◉" : "◯"}</Text>
              <Text> </Text>
              {isSelected ? (
                <Text color="green" bold={isFocused}>
                  {addon.name}
                </Text>
              ) : (
                <Text bold={isFocused}>{addon.name}</Text>
              )}
              <Text dimColor> ({addon.id})</Text>
            </Text>
            {isFocused && addon.description && <Text dimColor> {addon.description}</Text>}
          </Box>
        );
      })}
      <Text> </Text>
      <Text dimColor>Press Escape to go back, 'q' to quit</Text>
    </>
  );
};
