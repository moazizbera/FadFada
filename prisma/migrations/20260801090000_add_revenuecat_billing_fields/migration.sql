-- Add RevenueCat billing columns (schema drift fix)

ALTER TABLE "User" ADD COLUMN "revenuecatAppUserId" TEXT;
ALTER TABLE "User" ADD COLUMN "revenuecatEntitlementId" TEXT;
ALTER TABLE "User" ADD COLUMN "revenuecatExpiresAt" TIMESTAMP(3);
