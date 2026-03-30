# gsap-lenis add-on

This add-on installs:

- gsap
- @gsap/react
- lenis

It also adds:

- `src/lib/gsap.ts` to register `useGSAP` with `gsap.registerPlugin(...)` once.
- `src/components/gsap-lenis-provider.tsx` to initialize `ReactLenis` from `lenis/react` on the client.
- `src/app/layout.tsx` overlay to wrap the app with the provider.
- `.agents/skills/gsap-*` skill folders bundled by default in generated projects.
- `.claude/skills/gsap-*` symlinks that point to `.agents/skills/gsap-*`.

Skills source: `https://github.com/greensock/gsap-skills`

To check for updates later, run in the generated project:

- `npx skills check`
