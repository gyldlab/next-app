import React, { useEffect, useMemo, useState } from "react";
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

const LOGO_ROWS = GYLDLAB_LOGO_PART.map((line, rowIndex) => ({
  chars: line.split(""),
  rowIndex,
}));

const TEXT_ROWS = GYLDLAB_TEXT_PART.map((line, rowIndex) => ({
  chars: line.split(""),
  rowIndex,
}));

/** Batch consecutive chars that share the same color into single runs. */
function buildColorRuns(
  chars: string[],
  getColor: (colIndex: number) => string,
): { text: string; color: string }[] {
  if (chars.length === 0) return [];
  const runs: { text: string; color: string }[] = [];
  let color = getColor(0);
  let text = chars[0]!;
  for (let i = 1; i < chars.length; i++) {
    const c = getColor(i);
    if (c === color) {
      text += chars[i];
    } else {
      runs.push({ text, color });
      color = c;
      text = chars[i]!;
    }
  }
  runs.push({ text, color });
  return runs;
}

// Animated logo component - settings controlled by config props
export interface AnimatedLogoProps {
  config: AnimationConfig;
  /**
   * Maximum number of logo (G graphic) rows to display.
   * When the terminal is too short, rows are trimmed from the TOP
   * (the top rows are uniform filled blocks — the distinctive shape
   * is in the bottom rows). The "gyldlab" text part is never trimmed.
   * Pass 0 to hide the G graphic entirely. Defaults to all 16 rows.
   */
  maxLogoRows?: number;
  /**
   * Maximum number of text rows to display.
   * Rows are trimmed from the TOP so the lower, more distinctive
   * part of the wordmark stays visible first.
   */
  maxTextRows?: number;
  showTopPadding?: boolean;
  showBottomPadding?: boolean;
}

function useAnimationOffsets(config: AnimationConfig) {
  const [logoOffset, setLogoOffset] = useState(0);
  const [textOffset, setTextOffset] = useState(0);

  useEffect(() => {
    const logoEnabled = config.logo.enabled;
    const textEnabled = config.text.enabled;
    if (!logoEnabled && !textEnabled) return;

    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const tickMs =
      logoEnabled && textEnabled
        ? gcd(config.logo.speedMs, config.text.speedMs)
        : logoEnabled
          ? config.logo.speedMs
          : config.text.speedMs;

    let logoAccum = 0;
    let textAccum = 0;

    const id = setInterval(() => {
      logoAccum += tickMs;
      textAccum += tickMs;

      if (logoEnabled && logoAccum >= config.logo.speedMs) {
        logoAccum = 0;
        setLogoOffset((prev) => (prev + 1) % config.logo.cycleLength);
      }

      if (textEnabled && textAccum >= config.text.speedMs) {
        textAccum = 0;
        setTextOffset((prev) => (prev + 1) % config.text.cycleLength);
      }
    }, tickMs);

    return () => clearInterval(id);
  }, [
    config.logo.enabled,
    config.logo.speedMs,
    config.logo.cycleLength,
    config.text.enabled,
    config.text.speedMs,
    config.text.cycleLength,
  ]);

  return { logoOffset, textOffset };
}

function AnimatedLogoComponent({
  config,
  maxLogoRows,
  maxTextRows,
  showTopPadding = false,
  showBottomPadding = false,
}: AnimatedLogoProps) {
  const { logoOffset, textOffset } = useAnimationOffsets(config);
  const logoRows = useMemo(() => {
    if (maxLogoRows === undefined) {
      return LOGO_ROWS;
    }

    return LOGO_ROWS.slice(-Math.max(0, Math.min(maxLogoRows, LOGO_ROWS.length)));
  }, [maxLogoRows]);

  const textRows = useMemo(() => {
    if (maxTextRows === undefined) {
      return TEXT_ROWS;
    }

    return TEXT_ROWS.slice(-Math.max(0, Math.min(maxTextRows, TEXT_ROWS.length)));
  }, [maxTextRows]);

  // When the G graphic is fully hidden, skip top/bottom padding too
  const showLogoPart = logoRows.length > 0;
  const showTextPart = textRows.length > 0;

  return (
    <Box flexDirection="column">
      {/* Top spacing — only when logo graphic is visible */}
      {showLogoPart && showTopPadding && <Text> </Text>}

      {/* Logo part - batched into color runs for minimal React elements */}
      {showLogoPart &&
        logoRows.map(({ chars, rowIndex }) => {
          const runs = config.logo.enabled
            ? buildColorRuns(chars, (colIndex) => {
                const di = calculateDiagonalIndex(
                  rowIndex,
                  colIndex,
                  config.logo.direction,
                  config.logo.bandWidth,
                );
                return isHighlighted(di, logoOffset, config.logo.sweepThickness)
                  ? config.logo.highlightColor
                  : config.logo.defaultColor;
              })
            : [{ text: chars.join(""), color: config.logo.defaultColor }];

          return (
            <Text key={`logo-${rowIndex}`} wrap="truncate-end">
              {runs.map((run, i) => (
                <Text key={i} color={run.color}>
                  {run.text}
                </Text>
              ))}
            </Text>
          );
        })}

      {/* Text part - batched into color runs for minimal React elements */}
      {showTextPart &&
        textRows.map(({ chars, rowIndex }) => {
          const runs = buildColorRuns(chars, (colIndex) => {
            const di = calculateDiagonalIndex(
              rowIndex,
              colIndex,
              config.text.direction,
              config.text.bandWidth,
            );
            if (!config.text.enabled) {
              const totalColors = config.text.colors.length;
              const colorIndex = (totalColors - (di % totalColors)) % totalColors;
              return config.text.colors[colorIndex]!;
            }
            const totalColors = config.text.colors.length;
            const colorIndex = (((textOffset - di) % totalColors) + totalColors) % totalColors;
            return config.text.colors[colorIndex]!;
          });

          return (
            <Text key={`text-${rowIndex}`} wrap="truncate-end">
              {runs.map((run, i) => (
                <Text key={i} color={run.color}>
                  {run.text}
                </Text>
              ))}
            </Text>
          );
        })}

      {/* Bottom spacing */}
      {showBottomPadding && <Text> </Text>}
    </Box>
  );
}

AnimatedLogoComponent.displayName = "AnimatedLogo";

export const AnimatedLogo = React.memo(AnimatedLogoComponent);
