import React from "react";
import { Box, Text } from "ink";
import { type AddonInfo, type BaseTemplateInfo } from "../../core/templates.js";

export interface AddonSelectorProps {
  selectedTemplate: BaseTemplateInfo;
  addons: AddonInfo[];
  selectedAddons: ReadonlySet<string>;
  focusedIndex: number;
  viewportLines?: number;
}

export const AddonSelector: React.FC<AddonSelectorProps> = ({
  selectedTemplate,
  addons,
  selectedAddons,
  focusedIndex,
  viewportLines,
}) => {
  const selectedCount = selectedAddons.size;
  const budget = viewportLines ? Math.max(4, viewportLines) : Number.POSITIVE_INFINITY;

  const mandatoryChromeLines = 4; // template + heading + continue text + footer
  const availableForItems = Number.isFinite(budget)
    ? Math.max(0, budget - mandatoryChromeLines)
    : addons.length * 2;
  const visibleAddonCount = Math.max(0, Math.floor(availableForItems / 2));

  const clampedFocused = Math.max(0, Math.min(focusedIndex, addons.length - 1));
  const maxStart = Math.max(0, addons.length - visibleAddonCount);
  const start = Math.max(0, Math.min(clampedFocused - Math.floor(visibleAddonCount / 2), maxStart));
  const visibleAddons = addons.slice(start, start + visibleAddonCount);

  const usedLines = mandatoryChromeLines + visibleAddons.length * 2;
  const spacerBudget = Number.isFinite(budget) ? Math.max(0, budget - usedLines) : 4;
  const showTopSpace = spacerBudget >= 1;
  const showMidSpaceOne = spacerBudget >= 2;
  const showMidSpaceTwo = spacerBudget >= 3;
  const showBottomSpace = spacerBudget >= 4;

  return (
    <>
      {showTopSpace && <Text> </Text>}
      <Text wrap="truncate-end">
        Template: <Text color="green">{selectedTemplate.name}</Text>
      </Text>
      {showMidSpaceOne && <Text> </Text>}
      <Text bold wrap="truncate-end">
        Select optional add-ons (↑/↓ navigate, space toggle, a toggle all):
      </Text>
      <Text dimColor wrap="truncate-end">
        Press Enter to continue{" "}
        {selectedCount > 0
          ? `with ${selectedCount} add-on${selectedCount > 1 ? "s" : ""}`
          : "without add-ons (base only)"}
      </Text>
      {showMidSpaceTwo && <Text> </Text>}
      {visibleAddons.map((addon, localIndex) => {
        const index = start + localIndex;
        const isSelected = selectedAddons.has(addon.id);
        const isFocused = index === focusedIndex;
        return (
          <Box key={addon.id} flexDirection="column">
            <Text wrap="truncate-end">
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
            {/* Always render description line (even if empty) so total height
                stays constant while navigating — prevents Ink cursor-up miscounts */}
            <Text dimColor wrap="truncate-end">
              {isFocused && addon.description ? ` ${addon.description}` : " "}
            </Text>
          </Box>
        );
      })}
      {showBottomSpace && <Text> </Text>}
      <Text dimColor wrap="truncate-end">
        {visibleAddons.length < addons.length
          ? `Showing ${start + 1}-${start + visibleAddons.length} of ${addons.length} • Esc back, q quit`
          : "Press Escape to go back, 'q' to quit"}
      </Text>
    </>
  );
};
