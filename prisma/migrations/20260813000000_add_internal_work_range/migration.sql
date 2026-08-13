-- CreateTable
CREATE TABLE "InternalWorkRange" (
    "id" TEXT NOT NULL,
    "projectMemberId" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "dedicationPercentage" DOUBLE PRECISION NOT NULL,
    "holidaysCount" INTEGER NOT NULL DEFAULT 0,
    "manualHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalWorkRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalWorkRange_projectMemberId_idx" ON "InternalWorkRange"("projectMemberId");

-- AddForeignKey
ALTER TABLE "InternalWorkRange" ADD CONSTRAINT "InternalWorkRange_projectMemberId_fkey" FOREIGN KEY ("projectMemberId") REFERENCES "ProjectMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
