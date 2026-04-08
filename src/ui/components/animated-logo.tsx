import React from "react";
import { Box, Text } from "ink";
import {
  type AnimationConfig,
  calculateDiagonalIndex,
  isHighlighted,
} from "../../config/animation.js";

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
export interface AnimatedLogoProps {
  logoOffset: number;
  textOffset: number;
  config: AnimationConfig;
  /**
   * Maximum number of logo (G graphic) rows to display.
   * When the terminal is too short, rows are trimmed from the TOP
   * (the top rows are uniform filled blocks — the distinctive shape
   * is in the bottom rows). The "gyldlab" text part is never trimmed.
   * Pass 0 to hide the G graphic entirely. Defaults to all 16 rows.
   */
  maxLogoRows?: number;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  logoOffset,
  textOffset,
  config,
  maxLogoRows,
}) => {
  // Determine which logo rows to show. Trim from the top when constrained.
  const logoRows =
    maxLogoRows !== undefined
      ? GYLDLAB_LOGO_PART.slice(-Math.max(0, Math.min(maxLogoRows, GYLDLAB_LOGO_PART.length)))
      : GYLDLAB_LOGO_PART;
  // When the G graphic is fully hidden, skip top/bottom padding too
  const showLogoPart = logoRows.length > 0;

  return (
    <Box flexDirection="column">
      {/* Top spacing — only when logo graphic is visible */}
      {showLogoPart && <Text> </Text>}

      {/* Logo part - controlled by animation config, trimmed to fit viewport */}
      {showLogoPart &&
        logoRows.map((line, visibleIndex) => {
          // Map back to original row index for correct animation diagonal
          const rowIndex = GYLDLAB_LOGO_PART.length - logoRows.length + visibleIndex;
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

      {/* Bottom spacing */}
      <Text> </Text>
    </Box>
  );
};
