import React from "react";
import { Box, Text, useApp, useInput } from "ink";
import { type AnimationConfig } from "../../config/animation.js";
import type { BaseTemplateInfo, AddonInfo } from "../../types/templates.js";
import { AppLayout } from "./app-layout.js";

export interface ListModeProps {
  templates: BaseTemplateInfo[];
  addons: AddonInfo[];
  config: AnimationConfig;
}

export const ListMode: React.FC<ListModeProps> = ({ templates, addons, config }) => {
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      exit();
    }
  });

  // Each template = 3 lines, each addon = 3 lines, plus headings/spacing
  const listLines = 6 + templates.length * 3 + addons.length * 3;

  return (
    <AppLayout config={config} childrenLines={listLines}>
      {(bodyLines) => {
        let remaining = Math.max(1, bodyLines);
        const lines: React.ReactNode[] = [];

        const push = (node: React.ReactNode) => {
          if (remaining <= 0) return;
          lines.push(node);
          remaining -= 1;
        };

        push(<Text key="space-top"> </Text>);
        push(
          <Text key="templates-title" bold color="cyan" wrap="truncate-end">
            Base templates:
          </Text>,
        );

        for (const template of templates) {
          if (remaining < 3) break;
          push(
            <Text key={`template-id-${template.id}`} color="yellow" wrap="truncate-end">
              • {template.id} {template.default ? "(default)" : ""}
            </Text>,
          );
          push(
            <Text key={`template-name-${template.id}`} wrap="truncate-end">
              {template.name}
            </Text>,
          );
          push(
            <Text key={`template-desc-${template.id}`} dimColor wrap="truncate-end">
              {template.description}
            </Text>,
          );
        }

        if (remaining > 0) {
          push(<Text key="space-mid"> </Text>);
        }

        if (remaining > 0) {
          push(
            <Text key="addons-title" bold color="cyan" wrap="truncate-end">
              Add-ons:
            </Text>,
          );
        }

        for (const addon of addons) {
          if (remaining < 3) break;
          push(
            <Text key={`addon-id-${addon.id}`} color="yellow" wrap="truncate-end">
              • {addon.id}
            </Text>,
          );
          push(
            <Text key={`addon-name-${addon.id}`} wrap="truncate-end">
              {addon.name}
            </Text>,
          );
          push(
            <Text key={`addon-desc-${addon.id}`} dimColor wrap="truncate-end">
              {addon.description}
            </Text>,
          );
        }

        if (remaining > 0) {
          push(<Text key="space-bottom"> </Text>);
        }

        push(
          <Text key="footer" dimColor wrap="truncate-end">
            Press 'q' or Escape to exit
          </Text>,
        );

        return <>{lines}</>;
      }}
    </AppLayout>
  );
};
