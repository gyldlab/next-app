import { edenTreaty } from "@elysiajs/eden";
import type { app as App } from "../app/api/[[...slugs]]/route";

export const api = edenTreaty<App>("http://localhost:3000").api;
