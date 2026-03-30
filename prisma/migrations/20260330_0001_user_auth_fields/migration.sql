-- Add passwordHash and role fields to User table for local auth support (Phase 10)
-- Both fields are nullable so existing Entra-authenticated users are unaffected.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT;
