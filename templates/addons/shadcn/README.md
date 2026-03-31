# shadcn/ui add-on

This add-on installs shadcn/ui with the following:

**Dependencies:**

- shadcn (CLI)
- radix-ui (component primitives)
- @hugeicons/react (icon library)
- class-variance-authority (variant management)
- clsx + tailwind-merge (className utilities)

**Files added:**

- `components.json` - shadcn configuration
- `src/lib/utils.ts` - `cn()` utility function
- `.agents/skills/shadcn/` - AI agent skill with rules and examples
- `.claude/skills/shadcn` - Symlink to agent skill

## Configuration

The `components.json` is pre-configured with:

- **Style:** radix-maia
- **RSC:** Enabled
- **Icon Library:** hugeicons
- **Base Color:** neutral
- **CSS Variables:** Enabled

## Usage

### Adding Components

```bash
bunx --bun shadcn@latest add button
bunx --bun shadcn@latest add card dialog
bunx --bun shadcn@latest search form
```

### Using the cn() Utility

```tsx
import { cn } from "@/lib/utils";

<div className={cn("base-class", condition && "conditional-class")} />;
```

### Searching Components

```bash
bunx --bun shadcn@latest search
bunx --bun shadcn@latest search form
```

## Skills

The bundled `shadcn` skill provides:

- Component composition patterns
- Form handling with Field/FieldGroup
- Styling rules (no `space-*`, use `gap-*`)
- Icon usage patterns
- Semantic color tokens
- Common mistakes and fixes

Skills source: `https://github.com/shadcn-ui/ui`

To check for updates:

```bash
bun x skills check
```
