import Fastify from "fastify";
import { parseServerEnv } from "@agentsmith/shared/env";
import { registerHealthRoute } from "./routes/health.js";

export function buildServer() {
  const env = parseServerEnv();
  const app = Fastify({
    logger: true,
  });

  app.register(registerHealthRoute);

  app.get("/", async () => ({
    name: "AgentSmith API",
    webOrigin: env.WEB_ORIGIN,
    phase: "foundations",
  }));

  return { app, env };
}

async function start() {
  const { app, env } = buildServer();

  try {
    await app.listen({
      host: "0.0.0.0",
      port: env.PORT,
    });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

void start();
