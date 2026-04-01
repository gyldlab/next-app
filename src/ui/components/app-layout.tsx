import React from "react";
import { Box, Text } from "ink";
import { AnimatedLogo } from "./animated-logo.js";
import { type AnimationConfig } from "../../config/animation.js";

// Common layout wrapper: animated logo + tagline + children
export interface AppLayoutProps {
  logoOffset: number;
  textOffset: number;
  config: AnimationConfig;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  logoOffset,
  textOffset,
  config,
  children,
}) => (
  <Box flexDirection="column">
    <AnimatedLogo logoOffset={logoOffset} textOffset={textOffset} config={config} />
    <Text dimColor>create-gyldlab-next :: templates + addons + skills</Text>
    {children}
  </Box>
);
