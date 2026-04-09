import { status } from "elysia";

import { getDb } from "../../lib/db/client";
import type { AuthModel } from "./model";

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

export abstract class Auth {
  static async signIn({ username, password }: AuthModel["signInBody"]) {
    const identifier = normalizeIdentifier(username);
    const normalizedPassword = password.trim();

    if (identifier.length === 0 || normalizedPassword.length === 0) {
      return null;
    }

    const adminUser = await getDb().query.adminUsers.findFirst({
      where: (table, { eq, or }) => or(eq(table.username, identifier), eq(table.email, identifier)),
    });

    if (!adminUser?.isActive) {
      return null;
    }

    const passwordMatches = await Bun.password.verify(normalizedPassword, adminUser.passwordHash);

    if (!passwordMatches) {
      return null;
    }

    return {
      username: adminUser.username,
      token: `${adminUser.id}.${crypto.randomUUID()}`,
    };
  }
}
