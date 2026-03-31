-- CreateTable
CREATE TABLE "DeviceCompliancePolicy" (
    "id" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceCompliancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCompliancePolicy_sourceSystem_sourceId_key" ON "DeviceCompliancePolicy"("sourceSystem", "sourceId");

-- CreateTable
CREATE TABLE "DeviceComplianceAssignment" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastReportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceComplianceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "DeviceComplianceAssignment_deviceId_policyId_key" ON "DeviceComplianceAssignment"("deviceId", "policyId");

-- CreateIndex
CREATE INDEX "DeviceComplianceAssignment_deviceId_idx" ON "DeviceComplianceAssignment"("deviceId");

-- AddForeignKey
ALTER TABLE "DeviceComplianceAssignment" ADD CONSTRAINT "DeviceComplianceAssignment_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceComplianceAssignment" ADD CONSTRAINT "DeviceComplianceAssignment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "DeviceCompliancePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
