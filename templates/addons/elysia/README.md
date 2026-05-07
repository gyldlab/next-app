# Elysia Add-on

Type-safe, high-performance backend framework integrated with Next.js App Router.

## Structure (Official Elysia Pattern)

```
drizzle.config.ts          # Drizzle ORM configuration for PostgreSQL
scripts/                   # Bun-native backend utility scripts and shared runtime
├── runtime.ts             # Effect-based config, hashing, and DB lifecycle helpers
├── db-seed.ts             # Default seed entry point
└── ...                    # Auth + database operations

src/
├── modules/              # Feature-based modules
│   ├── auth/
│   │   ├── index.ts      # Controller (Elysia instance)
│   │   ├── service.ts    # Business logic
│   │   └── model.ts      # TypeBox schemas/DTOs
│   └── index.ts          # Re-exports all modules
├── lib/
│   ├── db/
│   │   └── schema.ts     # Drizzle schema entry point
│   └── eden.ts           # Eden Treaty client

src/app/api/[[...slugs]]/
└── route.ts              # Next.js API route mounting Elysia

.env.example              # Environment variable template
```

## Dependencies

- `elysia` - Core framework
- `@elysiajs/eden` - End-to-end type-safe client
- `drizzle-orm` - PostgreSQL schema definition
- `effect` - Operational config, lifecycle, and error handling for scripts
- `postgres` - PostgreSQL client for scripts and backend work
- `drizzle-kit` - Schema generation, migration, and studio tooling
- `@types/bun` - Bun runtime typings for generated TypeScript scripts

## Usage

### Adding a New Module

1. Create folder: `src/modules/posts/`
2. Add files: `index.ts`, `service.ts`, `model.ts`
3. Export from `src/modules/index.ts`
4. Use in `src/app/api/[[...slugs]]/route.ts`

### Example Module

```typescript
// src/modules/posts/model.ts
import { t, type UnwrapSchema } from "elysia";

export const PostModel = {
  create: t.Object({
    title: t.String(),
    content: t.String(),
  }),
  response: t.Object({
    id: t.String(),
    title: t.String(),
  }),
} as const;

export type PostModel = {
  [k in keyof typeof PostModel]: UnwrapSchema<(typeof PostModel)[k]>;
};
```

```typescript
// src/modules/posts/service.ts
import type { PostModel } from "./model";

export abstract class Posts {
  static async create(data: PostModel["create"]) {
    return { id: crypto.randomUUID(), title: data.title };
  }
}
```

```typescript
// src/modules/posts/index.ts
import { Elysia } from "elysia";
import { Posts } from "./service";
import { PostModel } from "./model";

export const postsModule = new Elysia({ prefix: "/posts" }).post(
  "/",
  ({ body }) => Posts.create(body),
  {
    body: PostModel.create,
    response: { 200: PostModel.response },
  },
);
```

### Using Eden Client

```tsx
// In any component
import { api } from "@/lib/eden";

const { data } = await api.auth["sign-in"].post({
  username: "user",
  password: "pass",
});
```

## Backend Utility Scripts

Generated projects include these commands in `package.json` when the Elysia add-on is selected:

- `bun run auth:hash`
- `bun run auth:register-admin`
- `bun run auth:remove-admin`
- `bun run db:connect`
- `bun run db:status`
- `bun run db:verify`
- `bun run db:seed`
- `bun run db:reset`
- `bun run db:export`
- `bun run db:generate`
- `bun run db:migrate`
- `bun run db:push`
- `bun run db:studio`

### Recommended Bootstrap Flow

1. Copy `.env.example` to `.env.local`.
2. Set `DATABASE_URL` and the optional `AUTH_ADMIN_*` overrides.
3. Run `bun run db:push` for a quick start, or `bun run db:generate && bun run db:migrate` if you want to keep migrations.
4. Run `bun run db:seed` to create the default admin user.

Run these commands through `bun run ...` so Bun auto-loads `.env.local` and the generated scripts stay on Bun-native primitives.

Keep `scripts/db-seed.ts` synchronized with `src/lib/db/schema.ts` as the project grows.

## Skills

Generated projects install the `elysiajs/skills` package through the scaffold command, using the active package manager executor (`bunx`, `npx`, `pnpm dlx`, or `yarn dlx`).

The installed `elysiajs` skill provides:

- MVC pattern guidance
- TypeBox validation
- Plugin integration
- Testing patterns
- Deployment guides

Skills source: `https://github.com/elysiajs/documentation`
