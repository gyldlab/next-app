export type SkillInstallSpec = {
  readonly id: string;
  readonly args: readonly string[];
};

const BASE_TEMPLATE_SKILL_SPECS: Readonly<Record<string, readonly SkillInstallSpec[]>> = {
  next: [
    {
      id: "vercel-labs/agent-skills",
      args: [
        "skills",
        "add",
        "vercel-labs/agent-skills",
        "--skill",
        "vercel-composition-patterns",
        "vercel-react-best-practices",
        "vercel-react-view-transitions",
        "web-design-guidelines",
        "-a",
        "amp",
        "-a",
        "claude-code",
        "-y",
      ],
    },
  ],
};

const ADDON_SKILL_SPECS: Readonly<Record<string, readonly SkillInstallSpec[]>> = {
  elysia: [
    {
      id: "elysiajs/skills",
      args: ["skills", "add", "elysiajs/skills", "-a", "amp", "-a", "claude-code", "-y"],
    },
  ],
  "gsap-lenis": [
    {
      id: "greensock/gsap-skills",
      args: [
        "skills",
        "add",
        "greensock/gsap-skills",
        "--skill",
        "gsap-core",
        "gsap-performance",
        "gsap-plugins",
        "gsap-react",
        "gsap-scrolltrigger",
        "gsap-timeline",
        "gsap-utils",
        "-a",
        "amp",
        "-a",
        "claude-code",
        "-y",
      ],
    },
  ],
  shadcn: [
    {
      id: "shadcn/ui",
      args: ["skills", "add", "shadcn/ui", "-a", "amp", "-a", "claude-code", "-y"],
    },
  ],
};

export function getSkillInstallSpecs(
  baseTemplateId: string,
  addonIds: readonly string[],
): SkillInstallSpec[] {
  const specs: SkillInstallSpec[] = [];
  const seenIds = new Set<string>();

  const addSpecs = (entries: readonly SkillInstallSpec[] | undefined): void => {
    for (const entry of entries ?? []) {
      if (seenIds.has(entry.id)) {
        continue;
      }

      seenIds.add(entry.id);
      specs.push(entry);
    }
  };

  addSpecs(BASE_TEMPLATE_SKILL_SPECS[baseTemplateId]);

  for (const addonId of addonIds) {
    addSpecs(ADDON_SKILL_SPECS[addonId]);
  }

  return specs;
}
