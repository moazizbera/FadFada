-- CreateTable
CREATE TABLE "ChildProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parentId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "avatarPreference" TEXT NOT NULL,
    "gamePoints" INTEGER NOT NULL DEFAULT 0,
    "dailyTimeLimitMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChildProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChildProfile_parentId_idx" ON "ChildProfile"("parentId");

-- CreateIndex
CREATE INDEX "ChildProfile_parentId_createdAt_idx" ON "ChildProfile"("parentId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChildProfile" ADD CONSTRAINT "ChildProfile_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
