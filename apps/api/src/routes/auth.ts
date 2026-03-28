import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import type { Prisma } from "@prisma/client";
import { AuthCallbackError, type AgentSmithAuthService } from "../plugins/auth.js";
import { authAuditActions, type AuditService } from "../modules/audit/audit.service.js";

export type AuthRoutesDependencies = {
  authService: AgentSmithAuthService;
  auditService: Pick<AuditService, "write">;
  webOrigin: string;
};

type AuthRoutesOptions = FastifyPluginOptions & AuthRoutesDependencies;

export async function registerAuthRoutes(app: FastifyInstance, options: AuthRoutesOptions) {
  app.get("/auth/login", async (_request, reply) => {
    await options.authService.beginLogin(reply);
    return reply;
  });

  app.get("/auth/callback", async (request, reply) => {
    try {
      const completedLogin = await options.authService.completeCallback(request, reply);

      await options.auditService.write({
        timestamp: new Date(),
        actorId: completedLogin.session.user.id,
        action: authAuditActions.login,
        targetType: "session",
        targetId: completedLogin.session.sessionId,
        result: "success",
        metadata: {
          provider: "microsoft-entra-id",
          operatorSourceId: completedLogin.identity.sourceId,
          email: completedLogin.session.user.email,
          displayName: completedLogin.session.user.displayName,
        },
      });

      reply.redirect(buildWebUrl(options.webOrigin).href);
      return reply;
    } catch (error) {
      const callbackError =
        error instanceof AuthCallbackError
          ? error
          : new AuthCallbackError("Unexpected callback failure", null, {
              reason: "unexpected_callback_error",
              error: error instanceof Error ? error.message : "Unknown callback error",
            });

      await options.auditService.write({
        timestamp: new Date(),
        actorId: null,
        action: authAuditActions.loginFailed,
        targetType: "session",
        targetId: callbackError.targetId,
        result: "failure",
        metadata: callbackError.metadata as Prisma.JsonObject,
      });

      const loginUrl = buildWebUrl(options.webOrigin, "/login");
      loginUrl.searchParams.set("error", "auth_failed");

      reply.redirect(loginUrl.href);
      return reply;
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    const session = await options.authService.getSession(request);
    options.authService.clearSession(reply);

    if (session) {
      await options.auditService.write({
        timestamp: new Date(),
        actorId: session.user.id,
        action: authAuditActions.logout,
        targetType: "session",
        targetId: session.sessionId,
        result: "signed_out",
        metadata: {
          provider: "microsoft-entra-id",
          email: session.user.email,
          displayName: session.user.displayName,
        },
      });
    }

    reply.code(204);
    return null;
  });
}

function buildWebUrl(origin: string, pathname = "/") {
  return new URL(pathname, origin.endsWith("/") ? origin : `${origin}/`);
}
