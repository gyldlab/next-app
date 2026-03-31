import { treaty } from "@elysiajs/eden";
import type { app } from "@/app/api/[[...slugs]]/route";

export const api =
  typeof process !== "undefined"
    ? treaty<app>("http://localhost:3000").api
    : treaty<app>("http://localhost:3000").api;
