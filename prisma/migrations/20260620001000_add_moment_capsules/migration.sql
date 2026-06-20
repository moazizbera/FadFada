-- CreateTable
CREATE TABLE "MomentCapsule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "templateJson" TEXT NOT NULL,
    "fulfillmentPartner" TEXT NOT NULL DEFAULT 'printful',
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MomentCapsule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MomentCapsule" ADD CONSTRAINT "MomentCapsule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "MomentCapsule_stripeSessionId_key" ON "MomentCapsule"("stripeSessionId");
