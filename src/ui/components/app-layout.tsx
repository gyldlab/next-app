import React, { useEffect, useState } from "react";
import { Box, Text, useStdout } from "ink";
import { AnimatedLogo } from "./animated-logo.js";
import { type AnimationConfig } from "../../config/animation.js";
import { computeBrandLayout, countBrandLines, VIEWPORT_SAFETY_ROWS } from "../layout.js";

// Common layout wrapper: animated logo + tagline + children
export interface AppLayoutProps {
  config: AnimationConfig;
  children: React.ReactNode | ((bodyLines: number) => React.ReactNode);
  /**
   * How many lines the children section will consume.
   * Used to compute how many logo rows can be shown without
   * exceeding the terminal height. Defaults to 8 (covers most phases).
   */
  childrenLines?: number;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ config, children, childrenLines = 8 }) => {
  const { stdout } = useStdout();
  const [rows, setRows] = useState(() => stdout?.rows ?? 24);

  useEffect(() => {
    const update = () => setRows(stdout?.rows ?? 24);
    stdout?.on("resize", update);
    return () => {
      stdout?.off("resize", update);
    };
  }, [stdout]);

  const brandLayout = computeBrandLayout(rows, childrenLines);
  const bodyLines = Math.max(1, rows - countBrandLines(brandLayout) - VIEWPORT_SAFETY_ROWS);
  const content = typeof children === "function" ? children(bodyLines) : children;

  return (
    <Box flexDirection="column" height={Math.max(1, rows - VIEWPORT_SAFETY_ROWS)} overflow="hidden">
      <AnimatedLogo
        config={config}
        maxLogoRows={brandLayout.logoRows}
        maxTextRows={brandLayout.textRows}
        showTopPadding={brandLayout.showTopPadding}
        showBottomPadding={brandLayout.showBottomPadding}
      />
      {brandLayout.showTagline && (
        <Text dimColor wrap="truncate-end">
          @gyldlab/next :: templates + addons + skills
        </Text>
      )}
      {content}
    </Box>
  );
};
