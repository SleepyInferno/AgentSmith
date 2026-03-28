import type { Prisma, PrismaClient } from "@prisma/client";

export const authAuditActions = {
  login: "auth.login",
  loginFailed: "auth.login_failed",
  logout: "auth.logout",
} as const;

export type AuditWriteInput = {
  timestamp: Date | string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  result: string;
  metadata: Prisma.JsonObject;
};

export class AuditService {
  constructor(private readonly prisma: Pick<PrismaClient, "auditEvent">) {}

  async write(input: AuditWriteInput) {
    return this.prisma.auditEvent.create({
      data: {
        timestamp: normalizeTimestamp(input.timestamp),
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        result: input.result,
        metadata: input.metadata,
      },
    });
  }
}

function normalizeTimestamp(timestamp: Date | string) {
  return timestamp instanceof Date ? timestamp : new Date(timestamp);
}
