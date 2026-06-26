CREATE TABLE "InteractionEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "metadataJson" TEXT,
    "geographicRegion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InteractionEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InteractionEvent_eventType_createdAt_idx" ON "InteractionEvent"("eventType", "createdAt");
CREATE INDEX "InteractionEvent_geographicRegion_createdAt_idx" ON "InteractionEvent"("geographicRegion", "createdAt");
CREATE INDEX "InteractionEvent_userId_createdAt_idx" ON "InteractionEvent"("userId", "createdAt");

ALTER TABLE "InteractionEvent" ADD CONSTRAINT "InteractionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;