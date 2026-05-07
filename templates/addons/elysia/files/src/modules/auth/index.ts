import { Elysia } from "elysia";
import { Auth } from "./service";
import { AuthModel } from "./model";

export const authModule = new Elysia({ prefix: "/auth" }).post(
  "/sign-in",
  async ({ body, cookie: { session }, status }) => {
    const response = await Auth.signIn(body);

    if (!response) {
      return status(400, "Invalid username or password" satisfies AuthModel["signInInvalid"]);
    }

    if (session) {
      session.value = response.token;
    }

    return response;
  },
  {
    body: AuthModel.signInBody,
    response: {
      200: AuthModel.signInResponse,
      400: AuthModel.signInInvalid,
    },
  },
);
