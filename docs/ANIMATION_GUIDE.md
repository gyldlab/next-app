# Animation Configuration Guide

Customize the GYLDLAB CLI animation in `src/config/animation.ts`.

---

## Quick Reference

```typescript
// animation.ts
const animationConfig = {
  logo: {
    enabled: true,
    speedMs: 300, // Animation speed (lower = faster)
    cycleLength: 30, // Sweep length (higher = smoother)
    direction: "TLBR", // ↘ diagonal sweep
    defaultColor: "white",
    highlightColor: "#888888",
    sweepThickness: 1, // 0=thin, 1=medium, 2=thick
    bandWidth: 6, // 4=steep, 6=balanced, 10=shallow
  },
  text: {
    enabled: true,
    speedMs: 300,
    cycleLength: 21,
    direction: "TLBR",
    colors: ["#FF0000", "#FF8C00", "#FFD700", "#00FF00", "#00CED1", "#0066FF", "#9932CC"],
    bandWidth: 6,
  },
};
```

---

## Directions

| Code   | Direction               | Arrow |
| ------ | ----------------------- | ----- |
| `TLBR` | Top-Left → Bottom-Right | ↘     |
| `TRBL` | Top-Right → Bottom-Left | ↙     |
| `BLTR` | Bottom-Left → Top-Right | ↗     |
| `BRTL` | Bottom-Right → Top-Left | ↖     |
| `LR`   | Left → Right            | →     |
| `RL`   | Right → Left            | ←     |
| `TB`   | Top → Bottom            | ↓     |
| `BT`   | Bottom → Top            | ↑     |

---

## Logo Settings

| Property         | Values       | Description                    |
| ---------------- | ------------ | ------------------------------ |
| `enabled`        | `true/false` | Toggle animation               |
| `speedMs`        | `100-1000`   | 100=fast, 300=smooth, 500=slow |
| `cycleLength`    | `20-50`      | Higher = smoother sweep        |
| `direction`      | See above    | Sweep direction                |
| `defaultColor`   | `"white"`    | Main logo color                |
| `highlightColor` | `"#888888"`  | Sweep line color               |
| `sweepThickness` | `0-3`        | Line thickness                 |
| `bandWidth`      | `4-10`       | Diagonal angle                 |

---

## Text Settings

| Property      | Values       | Description                    |
| ------------- | ------------ | ------------------------------ |
| `enabled`     | `true/false` | Toggle animation               |
| `speedMs`     | `100-1000`   | 100=fast, 300=smooth, 500=slow |
| `cycleLength` | `14-35`      | Higher = smoother flow         |
| `direction`   | See above    | Rainbow flow direction         |
| `colors`      | `string[]`   | Rainbow colors                 |
| `bandWidth`   | `4-10`       | Diagonal angle                 |

---

## Examples

### Subtle Logo + Fast Text

```typescript
logo: { speedMs: 500, sweepThickness: 0 },
text: { speedMs: 100, direction: "LR" },
```

### Different Directions

```typescript
logo: { direction: "TB" },    // ↓ vertical sweep
text: { direction: "LR" },    // → horizontal rainbow
```

### Premium Slow

```typescript
logo: { speedMs: 500 },
text: { speedMs: 400 },
```

### Static Logo Only

```typescript
logo: { enabled: false },
text: { enabled: true },
```

---

## Testing

```bash
bun run build
node ./dist/cli.js templates
```

Press `q` to exit.
