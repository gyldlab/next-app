# Elysia Add-on

Type-safe, high-performance backend framework integrated with Next.js App Router.

## Structure (Official Elysia Pattern)

```
src/
├── modules/              # Feature-based modules
│   ├── auth/
│   │   ├── index.ts      # Controller (Elysia instance)
│   │   ├── service.ts    # Business logic
│   │   └── model.ts      # TypeBox schemas/DTOs
│   └── index.ts          # Re-exports all modules
├── lib/
│   └── eden.ts           # Eden Treaty client

app/api/[[...slugs]]/
└── route.ts              # Next.js API route mounting Elysia
```

## Dependencies

- `elysia` - Core framework
- `@elysiajs/eden` - End-to-end type-safe client

## Usage

### Adding a New Module

1. Create folder: `src/modules/posts/`
2. Add files: `index.ts`, `service.ts`, `model.ts`
3. Export from `src/modules/index.ts`
4. Use in `app/api/[[...slugs]]/route.ts`

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

## Skills

The bundled `elysiajs` skill provides:

- MVC pattern guidance
- TypeBox validation
- Plugin integration
- Testing patterns
- Deployment guides

Skills source: `https://github.com/elysiajs/documentation`
