import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import bcrypt from "bcryptjs";
import type { AgentSmithAuthService } from "../plugins/auth.js";
import type { AuditService } from "../modules/audit/audit.service.js";
import type { PrismaClient } from "@prisma/client";

const BCRYPT_ROUNDS = 12;
// Dummy hash used for timing-safe comparison when user is not found.
// This prevents timing oracle attacks that would reveal whether a username exists.
const DUMMY_HASH = "$2b$12$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

export type BootstrapRoutesDependencies = {
  authService: AgentSmithAuthService;
  auditService: Pick<AuditService, "write">;
  prisma: Pick<PrismaClient, "user">;
};

type BootstrapRoutesOptions = FastifyPluginOptions & BootstrapRoutesDependencies;

export async function registerBootstrapRoutes(app: FastifyInstance, options: BootstrapRoutesOptions) {
  // GET /api/bootstrap-status — no auth required
  // Returns whether the application needs first-run setup
  app.get("/api/bootstrap-status", async () => {
    const adminCount = await options.prisma.user.count({ where: { role: "admin" } });
    return { bootstrapRequired: adminCount === 0 };
  });

  // POST /api/bootstrap — one-time admin creation, no auth required
  // DB-locked: checks prisma.user.count, not a config flag
  app.post("/api/bootstrap", async (request, reply) => {
    const adminCount = await options.prisma.user.count({ where: { role: "admin" } });
    if (adminCount > 0) {
      reply.code(409);
      return { error: "bootstrap_already_completed" };
    }

    const body = request.body as { username?: unknown; password?: unknown } | null;
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username || username.length < 3) {
      reply.code(400);
      return { error: "invalid_username", message: "Username must be at least 3 characters" };
    }
    if (!password || password.length < 8) {
      reply.code(400);
      return { error: "invalid_password", message: "Password must be at least 8 characters" };
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await options.prisma.user.create({
      data: {
        sourceSystem: "local",
        sourceId: username,
        displayName: username,
        passwordHash,
        role: "admin",
      },
    });

    // Set session cookie with fresh UUID (session ID regeneration per security invariant)
    options.authService.loginLocal(reply, user.id);

    await options.auditService.write({
      timestamp: new Date(),
      actorId: user.id,
      action: "auth.bootstrap",
      targetType: "user",
      targetId: user.id,
      result: "success",
      metadata: { provider: "local", username },
    });

    reply.code(201);
    return { userId: user.id };
  });

  // POST /api/auth/local/login — local credential authentication
  // Timing-safe: always runs bcrypt.compare even when user is not found
  app.post("/api/auth/local/login", async (request, reply) => {
    const body = request.body as { username?: unknown; password?: unknown } | null;
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      reply.code(400);
      return { error: "missing_credentials" };
    }

    const user = await options.prisma.user.findFirst({
      where: { sourceSystem: "local", sourceId: username },
      select: { id: true, passwordHash: true, displayName: true, email: true },
    });

    // Always run bcrypt.compare to prevent timing oracle attacks
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      await options.auditService.write({
        timestamp: new Date(),
        actorId: null,
        action: "auth.login_failed",
        targetType: "session",
        targetId: null,
        result: "failure",
        metadata: { provider: "local", reason: "invalid_credentials" },
      });
      reply.code(401);
      return { error: "invalid_credentials" };
    }

    // Set session cookie with fresh UUID (session ID regeneration per security invariant)
    options.authService.loginLocal(reply, user.id);

    await options.auditService.write({
      timestamp: new Date(),
      actorId: user.id,
      action: "auth.login",
      targetType: "session",
      targetId: user.id,
      result: "success",
      metadata: { provider: "local" },
    });

    reply.code(200);
    return { redirectPath: "/" };
  });
}
