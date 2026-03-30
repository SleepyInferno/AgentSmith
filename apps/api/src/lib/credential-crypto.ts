import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const WRAP_ALGORITHM = "aes-256-gcm" as const;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const HKDF_SALT = Buffer.alloc(32); // Fixed empty salt — acceptable for HKDF with high-entropy input
const HKDF_INFO = "agentsmith-system-key-wrap";

/** Derive a stable 32-byte wrapping key from SESSION_SECRET using HKDF-SHA256. */
function deriveWrappingKey(sessionSecret: string): Buffer {
  return Buffer.from(
    hkdfSync("sha256", sessionSecret, HKDF_SALT, HKDF_INFO, KEY_LENGTH)
  );
}

/**
 * Wrap (encrypt) a 32-byte data key using a wrapping key derived from sessionSecret.
 * Returns a hex-encoded string in "iv:authTag:ciphertext" format.
 */
export function wrapKey(sessionSecret: string, dataKey: Buffer): string {
  const wrappingKey = deriveWrappingKey(sessionSecret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(WRAP_ALGORITHM, wrappingKey, iv);
  const encrypted = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Unwrap (decrypt) a wrapped key string produced by wrapKey().
 * Returns the original 32-byte data key as a Buffer.
 * Throws if sessionSecret is wrong or data is tampered.
 */
export function unwrapKey(sessionSecret: string, wrapped: string): Buffer {
  const [ivHex, authTagHex, encryptedHex] = wrapped.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Malformed wrapped key");
  }
  const wrappingKey = deriveWrappingKey(sessionSecret);
  const decipher = createDecipheriv(WRAP_ALGORITHM, wrappingKey, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]);
}

/**
 * Encrypt a JSON credential string using AES-256-GCM with the data key.
 * Generates a fresh IV per call (critical — IV reuse breaks GCM security).
 * Returns hex-encoded encryptedValue, iv, and authTag for DB storage.
 */
export function encryptCredential(dataKey: Buffer, plainJson: string): {
  encryptedValue: string;
  iv: string;
  authTag: string;
} {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(WRAP_ALGORITHM, dataKey, iv);
  const encrypted = Buffer.concat([cipher.update(plainJson, "utf8"), cipher.final()]);
  return {
    encryptedValue: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

/**
 * Decrypt a credential from hex-encoded DB fields back to the original JSON string.
 * Throws if the data key, IV, or auth tag do not match (tamper detection).
 */
export function decryptCredential(
  dataKey: Buffer,
  encryptedValue: string,
  iv: string,
  authTag: string
): string {
  const decipher = createDecipheriv(WRAP_ALGORITHM, dataKey, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
