import type { FastifyInstance, FastifyPluginOptions, preHandlerHookHandler } from "fastify";
import type { LifecycleRepository } from "../modules/lifecycle/lifecycle.repository.js";

export type LifecycleRoutesDependencies = {
  lifecycleRepository: Pick<
    LifecycleRepository,
    "listTemplates" | "listActiveRuns" | "startRun" | "getRun" | "updateRunStep" | "getRunSummary" | "closeRun"
  >;
  preHandler?: preHandlerHookHandler | preHandlerHookHandler[];
};

type LifecycleRoutesOptions = FastifyPluginOptions & LifecycleRoutesDependencies;

export async function registerLifecycleRoutes(_app: FastifyInstance, _options: LifecycleRoutesOptions) {}
