/**
 * Animation Configuration for GYLDLAB CLI Branding
 * 
 * Edit the `animationConfig` object below to customize animations.
 * Full TypeScript autocomplete and type safety included.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Animation Direction
 * 
 * DIAGONAL:
 *   "TLBR" - Top-Left to Bottom-Right ↘
 *   "TRBL" - Top-Right to Bottom-Left ↙
 *   "BLTR" - Bottom-Left to Top-Right ↗
 *   "BRTL" - Bottom-Right to Top-Left ↖
 * 
 * STRAIGHT:
 *   "LR" - Left to Right →
 *   "RL" - Right to Left ←
 *   "TB" - Top to Bottom ↓
 *   "BT" - Bottom to Top ↑
 */
export type AnimationDirection = 
  | "TLBR" | "TRBL" | "BLTR" | "BRTL"
  | "LR" | "RL" | "TB" | "BT";

/**
 * Logo Animation Config
 */
export interface LogoAnimationConfig {
  /** Enable animation (false = static) */
  enabled: boolean;
  /** Speed in ms (lower = faster). 100=fast, 300=smooth, 500=slow */
  speedMs: number;
  /** Cycle length (larger = smoother sweep) */
  cycleLength: number;
  /** Direction: "TLBR" | "TRBL" | "BLTR" | "BRTL" | "LR" | "RL" | "TB" | "BT" */
  direction: AnimationDirection;
  /** Main color */
  defaultColor: string;
  /** Sweep highlight color */
  highlightColor: string;
  /** Sweep thickness (0=thin, 1=medium, 2=thick) */
  sweepThickness: number;
  /** Band width (4=steep, 6=balanced, 10=shallow) */
  bandWidth: number;
}

/**
 * Text Animation Config
 */
export interface TextAnimationConfig {
  /** Enable animation (false = static rainbow) */
  enabled: boolean;
  /** Speed in ms (lower = faster). 100=fast, 300=smooth, 500=slow */
  speedMs: number;
  /** Cycle length (larger = smoother flow) */
  cycleLength: number;
  /** Direction: "TLBR" | "TRBL" | "BLTR" | "BRTL" | "LR" | "RL" | "TB" | "BT" */
  direction: AnimationDirection;
  /** Rainbow colors array */
  colors: string[];
  /** Band width (4=steep, 6=balanced, 10=shallow) */
  bandWidth: number;
}

/**
 * Complete Animation Config
 */
export interface AnimationConfig {
  logo: LogoAnimationConfig;
  text: TextAnimationConfig;
}

// ============================================================================
// CONFIGURATION - Edit values below
// ============================================================================

const animationConfig: AnimationConfig = {
  
  // LOGO (G shape) - White with sweep line
  logo: {
    enabled: true,
    speedMs: 200,              // Animation speed
    cycleLength: 20,           // Sweep cycle length
    direction: "LR",           // STRAIGHT
    defaultColor: "white",     // Main logo color
    highlightColor: "#888888", // Sweep line color
    sweepThickness: 1,         // Line thickness
    bandWidth: 6,              // Diagonal angle
  },
  
  // TEXT (gyldlab) - Rainbow animation
  text: {
    enabled: true,
    speedMs: 100,              // Animation speed
    cycleLength: 21,           // Rainbow cycle (7 colors × 3)
    direction: "LR",           // STRAIGHT
    colors: [
      "#FF0000", // red
      "#FF8C00", // orange
      "#FFD700", // gold
      "#00FF00", // green
      "#00CED1", // cyan
      "#0066FF", // blue
      "#9932CC", // purple
    ],
    bandWidth: 6,              // Diagonal angle
  },
};

export default animationConfig;

// ============================================================================
// HELPERS (internal use)
// ============================================================================

export function calculateDiagonalIndex(
  row: number,
  col: number,
  direction: AnimationDirection,
  bandWidth: number,
  totalCols = 70,
  totalRows = 26
): number {
  // Lower index = gets animated first as offset increases
  // So: starting corner needs LOW value, ending corner needs HIGH value
  
  switch (direction) {
    // TLBR ↘: top-left=low, bottom-right=high
    case "TLBR": return row + Math.floor(col / bandWidth);
    
    // TRBL ↙: top-right=low, bottom-left=high  
    case "TRBL": return row + Math.floor((totalCols - col) / bandWidth);
    
    // BLTR ↗: bottom-left=low, top-right=high
    case "BLTR": return (totalRows - row) + Math.floor(col / bandWidth);
    
    // BRTL ↖: bottom-right=low, top-left=high
    case "BRTL": return (totalRows - row) + Math.floor((totalCols - col) / bandWidth);
    
    // LR →: left=low, right=high
    case "LR": return Math.floor(col / bandWidth);
    
    // RL ←: right=low, left=high
    case "RL": return Math.floor((totalCols - col) / bandWidth);
    
    // TB ↓: top=low, bottom=high
    case "TB": return row;
    
    // BT ↑: bottom=low, top=high
    case "BT": return totalRows - row;
    
    default: return row + Math.floor(col / bandWidth);
  }
}

export function isHighlighted(index: number, offset: number, thickness: number): boolean {
  return Math.abs(index - offset) <= thickness;
}
