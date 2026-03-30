import { randomBytes } from "node:crypto";
import { wrapKey, unwrapKey } from "./credential-crypto.js";

const SYSTEM_KEY_PURPOSE = "credential_encryption";

type SystemKeyPrisma = {
  systemKey: {
    findUnique(args: { where: { purpose: string } }): Promise<{ wrappedKey: string } | null>;
    create(args: { data: { purpose: string; wrappedKey: string } }): Promise<unknown>;
  };
};

/**
 * Ensure a credential encryption key exists in the SystemKey table.
 *
 * - If no row exists for "credential_encryption", generates a random 32-byte
 *   data key, wraps it with SESSION_SECRET via AES-256-GCM, and persists it.
 * - If a row exists, loads and unwraps the stored key.
 *
 * Returns the unwrapped 32-byte data key for use with encryptCredential/decryptCredential.
 *
 * Per D-01 through D-05: the data key is wrapped by SESSION_SECRET so that
 * rotating SESSION_SECRET requires only a re-wrap, not re-encryption of all
 * stored credentials.
 */
export async function ensureSystemKey(
  prisma: SystemKeyPrisma,
  sessionSecret: string
): Promise<Buffer> {
  const row = await prisma.systemKey.findUnique({
    where: { purpose: SYSTEM_KEY_PURPOSE },
  });

  if (!row) {
    const dataKey = randomBytes(32);
    const wrappedKey = wrapKey(sessionSecret, dataKey);
    await prisma.systemKey.create({
      data: { purpose: SYSTEM_KEY_PURPOSE, wrappedKey },
    });
    return dataKey;
  }

  return unwrapKey(sessionSecret, row.wrappedKey);
}
