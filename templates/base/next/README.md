# Project Name

Built on a foundation of _SOVEREIGN ALCHEMY_, this project utilizes [`bun create @gyldlab/next`](https://github.com/gyldlab/next-app) to turn vision into high-performance digital reality.

## Getting Started

Install dependencies (if you didn't use `--install` during scaffolding):

```bash
bun install
```

Run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## What's Included

This scaffold ships with a production-ready Next.js base and optional add-on tracks.

### Base Stack

- **[Next.js](https://nextjs.org)** — React framework with App Router
- **[TypeScript](https://www.typescriptlang.org)** — Strict type-checking
- **[Tailwind CSS v4](https://tailwindcss.com)** — Utility-first CSS
- **[ESLint](https://eslint.org)** — Linting with Next.js and import-sort rules
- **[Prettier](https://prettier.io)** — Code formatting with Tailwind plugin
- **[Husky](https://typicode.github.io/husky)** + **lint-staged** — Pre-commit hooks

### Optional Add-ons

Add-ons stay opt-in during scaffolding, but the template supports these tracks out of the box:

- **shadcn** — shadcn/ui component library (`components.json`, `src/lib/utils.ts`)
- **elysia** — Type-safe backend with Eden Treaty, Drizzle-backed `admin_users` auth, and Bun-native backend utility scripts powered by Effect (`src/app/api/[[...slugs]]/route.ts`, `src/modules/`, `src/lib/db/`, `scripts/`, `drizzle.config.ts`)
- **gsap-lenis** — GSAP animations + Lenis smooth scrolling (`src/lib/gsap.ts`, `src/components/gsap-lenis-provider.tsx`)

If you scaffolded with add-ons, see their generated files and local documentation for the full contract.

## Scripts

| Command                | Description               |
| ---------------------- | ------------------------- |
| `bun dev`              | Start development server  |
| `bun run build`        | Build for production      |
| `bun run start`        | Start production server   |
| `bun run lint`         | Run ESLint                |
| `bun run lint:fix`     | Auto-fix ESLint issues    |
| `bun run format`       | Format code with Prettier |
| `bun run format:check` | Check formatting          |
| `bun run check`        | Run lint + build          |

> **Tip:** If you intentionally switch package managers later, use the matching script runner for the same commands.

If you included the **Elysia** add-on, the scaffold also includes backend operations scripts out of the box:

| Command                       | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| `bun run auth:hash`           | Generate an Argon2id password hash with Bun.password    |
| `bun run auth:register-admin` | Create or update the configured admin record            |
| `bun run auth:remove-admin`   | Remove the configured admin record                      |
| `bun run db:connect`          | Verify the PostgreSQL connection                        |
| `bun run db:status`           | Show database size, table counts, and totals            |
| `bun run db:verify`           | List public tables and enum types                       |
| `bun run db:seed`             | Seed the default admin record                           |
| `bun run db:reset`            | Drop the public schema after interactive confirmation   |
| `bun run db:export`           | Export the database with `pg_dump`                      |
| `bun run db:generate`         | Generate Drizzle migrations from `src/lib/db/schema.ts` |
| `bun run db:migrate`          | Apply generated Drizzle migrations                      |
| `bun run db:push`             | Push the current schema directly to PostgreSQL          |
| `bun run db:studio`           | Open Drizzle Studio                                     |

### Elysia Backend Setup

If you scaffolded with the Elysia add-on:

1. Copy values from `.env.example` into `.env.local` and set `DATABASE_URL`.
2. Run `bun run db:push` for a quick bootstrap, or `bun run db:generate && bun run db:migrate` if you want migrations first.
3. Run `bun run db:seed` to create the default admin record.

The generated scripts use Bun-native APIs and Effect for config validation, password hashing, and database lifecycle handling.

Keep `scripts/db-seed.ts` aligned with `src/lib/db/schema.ts` as your tables and bootstrap data evolve.

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
