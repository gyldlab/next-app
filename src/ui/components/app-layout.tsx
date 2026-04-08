import React, { useState, useEffect } from "react";
import { Box, Text, useStdout } from "ink";
import { AnimatedLogo } from "./animated-logo.js";
import { type AnimationConfig } from "../../config/animation.js";

// Common layout wrapper: animated logo + tagline + children
export interface AppLayoutProps {
  logoOffset: number;
  textOffset: number;
  config: AnimationConfig;
  children: React.ReactNode;
  /**
   * How many lines the children section will consume.
   * Used to compute how many logo rows can be shown without
   * exceeding the terminal height. Defaults to 8 (covers most phases).
   */
  childrenLines?: number;
}

// Fixed line counts that never change:
// "gyldlab" ASCII text = 10 lines,  tagline = 1 line,  bottom pad = 1 line
const FIXED_LINES = 10 + 1 + 1;
// Top pad (1 line when logo graphic is visible)
const LOGO_PAD = 1;
// Total logo G rows available
const MAX_G_ROWS = 16;

export const AppLayout: React.FC<AppLayoutProps> = ({
  logoOffset,
  textOffset,
  config,
  children,
  childrenLines = 8,
}) => {
  const { stdout } = useStdout();
  const [rows, setRows] = useState(() => stdout?.rows ?? 24);

  useEffect(() => {
    const update = () => setRows(stdout?.rows ?? 24);
    stdout?.on("resize", update);
    return () => {
      stdout?.off("resize", update);
    };
  }, [stdout]);

  // Budget: rows = LOGO_PAD + maxLogoRows + FIXED_LINES + childrenLines
  // → maxLogoRows = rows - FIXED_LINES - childrenLines - LOGO_PAD
  const availableForLogo = rows - FIXED_LINES - childrenLines - LOGO_PAD;
  // Clamp between 0..16.  When ≤ 0 the G graphic is hidden entirely.
  const maxLogoRows = Math.max(0, Math.min(MAX_G_ROWS, availableForLogo));

  return (
    <Box flexDirection="column">
      <AnimatedLogo
        logoOffset={logoOffset}
        textOffset={textOffset}
        config={config}
        maxLogoRows={maxLogoRows}
      />
      <Text dimColor>@gyldlab/next :: templates + addons + skills</Text>
      {children}
    </Box>
  );
};
