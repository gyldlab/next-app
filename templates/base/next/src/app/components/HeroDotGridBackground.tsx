import DotGrid from "./DotGrid";

const sharedGridProps = {
  dotSize: 6,
  gap: 18,
  proximity: 140,
  speedTrigger: 90,
  shockRadius: 220,
  shockStrength: 4,
} as const;

export default function HeroDotGridBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <DotGrid
        {...sharedGridProps}
        baseColor="#ddd6cb"
        activeColor="#a99cff"
        className="h-full w-full opacity-80 dark:hidden"
      />
      <DotGrid
        {...sharedGridProps}
        baseColor="#1b1815"
        activeColor="#6e63d9"
        className="hidden h-full w-full opacity-75 dark:block"
      />
    </div>
  );
}
