# gsap-lenis add-on

This add-on installs:

- gsap
- @gsap/react
- lenis

It also adds:

- `src/lib/gsap.ts` to register `useGSAP` with `gsap.registerPlugin(...)` once.
- `src/components/gsap-lenis-provider.tsx` to initialize `ReactLenis` from `lenis/react` on the client.
- `src/app/layout.tsx` overlay to wrap the app with the provider.

Generated projects also install the GSAP agent skills with the scaffold command, using the active package manager executor (`bunx`, `npx`, `pnpm dlx`, or `yarn dlx`).

Skills source: `https://github.com/greensock/gsap-skills`
