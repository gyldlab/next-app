# Project Name

Built on a foundation of _SOVEREIGN ALCHEMY_, this project utilizes [`bun create @gyldlab/next`](https://github.com/gyldlab/next-app) to turn vision into high-performance digital reality.

## Getting Started

Install dependencies (if you didn't use `--install` during scaffolding):

```bash
npm install
# or
bun install
```

Run the development server:

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## What's Included

This base template comes pre-configured with:

- **[Next.js](https://nextjs.org)** — React framework with App Router
- **[TypeScript](https://www.typescriptlang.org)** — Strict type-checking
- **[Tailwind CSS v4](https://tailwindcss.com)** — Utility-first CSS
- **[ESLint](https://eslint.org)** — Linting with Next.js and import-sort rules
- **[Prettier](https://prettier.io)** — Code formatting with Tailwind plugin
- **[Husky](https://typicode.github.io/husky)** + **lint-staged** — Pre-commit hooks

## Add-ons

If you included add-ons during scaffolding, see their respective documentation:

- **shadcn** — shadcn/ui component library (`components.json`, `src/lib/utils.ts`)
- **elysia** — Type-safe backend with Eden Treaty (`src/modules/`, `app/api/[[...slugs]]/`)
- **gsap-lenis** — GSAP animations + Lenis smooth scrolling (`src/lib/gsap.ts`, `src/components/gsap-lenis-provider.tsx`)

## Scripts

| Command                | Description               |
| ---------------------- | ------------------------- |
| `npm run dev`          | Start development server  |
| `npm run build`        | Build for production      |
| `npm run start`        | Start production server   |
| `npm run lint`         | Run ESLint                |
| `npm run lint:fix`     | Auto-fix ESLint issues    |
| `npm run format`       | Format code with Prettier |
| `npm run format:check` | Check formatting          |
| `npm run check`        | Run lint + build          |

> **Tip:** If your project was created with `--bun`, replace `npm` with `bun` in the commands above.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) — Features and API reference
- [Learn Next.js](https://nextjs.org/learn) — Interactive tutorial
- [@gyldlab/create-next CLI](https://github.com/gyldlab/next-app) — Template CLI documentation

## Deploy

The easiest way to deploy your Next.js app is on [Vercel](https://vercel.com/new):

```bash
npm run build
```

See the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more options.
