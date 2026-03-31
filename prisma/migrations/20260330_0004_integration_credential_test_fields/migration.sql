-- Add health-check persistence fields to IntegrationCredential (D-07)
ALTER TABLE "IntegrationCredential"
  ADD COLUMN "lastTestedAt"   TIMESTAMP(3),
  ADD COLUMN "lastTestResult" TEXT;
