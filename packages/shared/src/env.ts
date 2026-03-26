import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.string().url(),
  ENTRA_TENANT_ID: z.string(),
  ENTRA_CLIENT_ID: z.string(),
  ENTRA_CLIENT_SECRET: z.string(),
  ENTRA_REDIRECT_URI: z.string().url(),
  SESSION_SECRET: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  return serverEnvSchema.parse(env);
}
