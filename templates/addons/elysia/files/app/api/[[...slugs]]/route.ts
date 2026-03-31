import { Elysia } from "elysia";
import { authModule } from "@/modules";

export const app = new Elysia({ prefix: "/api" }).use(authModule);

export type app = typeof app;

export const GET = app.handle;
export const POST = app.handle;
export const PUT = app.handle;
export const PATCH = app.handle;
export const DELETE = app.handle;
