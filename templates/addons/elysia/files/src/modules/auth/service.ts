import { status } from "elysia";
import type { AuthModel } from "./model";

export abstract class Auth {
  static async signIn({ username, password }: AuthModel["signInBody"]) {
    if (Math.random() > 0.5)
      return status(400, "Invalid username or password" satisfies AuthModel["signInInvalid"]);

    return {
      username: "saltyaom",
      token: "token",
    };
  }
}
