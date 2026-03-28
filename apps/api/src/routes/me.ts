import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import type { AgentSmithAuthService } from "../plugins/auth.js";

export type MeRoutesDependencies = {
  authService: Pick<AgentSmithAuthService, "getSession">;
};

type MeRoutesOptions = FastifyPluginOptions & MeRoutesDependencies;

export async function registerMeRoutes(app: FastifyInstance, options: MeRoutesOptions) {
  app.get("/api/me", async (request, reply) => {
    const session = await options.authService.getSession(request);

    if (!session) {
      reply.code(401);
      return {
        authenticated: false,
      };
    }

    return {
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName,
      },
    };
  });
}
