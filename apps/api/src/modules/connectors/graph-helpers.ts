import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";
import type { PrismaClient } from "@prisma/client";
import { decryptCredential } from "../../lib/credential-crypto.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GraphPagedResponse<T> = {
  value: T[];
  "@odata.nextLink"?: string;
};

// Shape of the Graph client we need — allows injecting fakes in tests
type GraphClientLike = {
  api: (path: string) => { get: () => Promise<unknown> };
};

// ---------------------------------------------------------------------------
// buildGraphClient
// ---------------------------------------------------------------------------

/**
 * Build an authenticated Microsoft Graph client using credentials stored in
 * the IntegrationCredential table (key = "intune").
 */
export async function buildGraphClient(
  prisma: Pick<PrismaClient, "integrationCredential">,
  systemKey: Buffer
): Promise<Client> {
  const row = await prisma.integrationCredential.findUnique({ where: { key: "intune" } });
  if (!row) {
    throw new Error("Intune credentials not configured");
  }

  const plainJson = decryptCredential(systemKey, row.encryptedValue, row.iv, row.authTag);
  const cred = JSON.parse(plainJson) as { tenantId: string; clientId: string; clientSecret: string };

  const credential = new ClientSecretCredential(cred.tenantId, cred.clientId, cred.clientSecret);
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"],
  });

  return Client.initWithMiddleware({ authProvider });
}

// ---------------------------------------------------------------------------
// graphPageAll
// ---------------------------------------------------------------------------

/**
 * Fetch all items from a paginated Graph API endpoint, following
 * @odata.nextLink until all pages are retrieved.
 *
 * IMPORTANT: Pass the full nextLink URL unchanged — do not strip the domain.
 */
export async function graphPageAll<T>(client: GraphClientLike, path: string): Promise<T[]> {
  const results: T[] = [];

  let current = (await client.api(path).get()) as GraphPagedResponse<T>;
  results.push(...(current.value ?? []));

  while (current["@odata.nextLink"]) {
    current = (await client.api(current["@odata.nextLink"]).get()) as GraphPagedResponse<T>;
    results.push(...(current.value ?? []));
  }

  return results;
}

// ---------------------------------------------------------------------------
// withRetry
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrap an async function with retry logic for 429 (Too Many Requests).
 *
 * - Respects `Retry-After` header (in seconds) when present.
 * - Uses exponential backoff (2s, 4s, 8s, ...) when Retry-After is absent.
 * - Rethrows immediately on non-429 errors.
 * - Throws after maxRetries consecutive 429s.
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMultiplier = 1): Promise<T> {
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;

      if (statusCode !== 429 || attempt >= maxRetries) {
        throw err;
      }

      const retryAfterHeader = (err as { responseHeaders?: Record<string, string> }).responseHeaders?.["retry-after"];
      const delayMs = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1000 * delayMultiplier
        : Math.pow(2, attempt + 1) * 1000 * delayMultiplier;

      await sleep(delayMs);
      attempt++;
    }
  }
}
