-- IntegrationCredential table: stores AES-256-GCM encrypted integration secrets
-- One row per integration group (e.g. "intune", "openai"). Key is unique.
CREATE TABLE "IntegrationCredential" (
  "id"             TEXT NOT NULL,
  "key"            TEXT NOT NULL,
  "encryptedValue" TEXT NOT NULL,
  "iv"             TEXT NOT NULL,
  "authTag"        TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationCredential_key_key" ON "IntegrationCredential"("key");

-- SystemKey table: stores the wrapped encryption key used for IntegrationCredential values.
-- The key is wrapped with SESSION_SECRET (AES-GCM). One row per purpose.
CREATE TABLE "SystemKey" (
  "id"         TEXT NOT NULL,
  "purpose"    TEXT NOT NULL,
  "wrappedKey" TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SystemKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemKey_purpose_key" ON "SystemKey"("purpose");
